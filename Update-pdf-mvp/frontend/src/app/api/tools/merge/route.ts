import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { mergePdfs } from "@/lib/tools/merge";

const CREDIT_COST = 1;

const bodySchema = z.object({
  fileIds: z
    .array(z.string().uuid())
    .min(2, "At least 2 files required")
    .max(20, "Maximum 20 files"),
});

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Validate body ────────────────────────────────────────────
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fileIds } = parsed.data;
  const service = createServiceClient();

  // ── Verify files belong to this user ────────────────────────
  const { data: files, error: filesError } = await service
    .from("files")
    .select("id, storage_path, filename")
    .in("id", fileIds)
    .eq("user_id", user.id);

  if (filesError || !files || files.length !== fileIds.length) {
    return NextResponse.json({ error: "One or more files not found" }, { status: 404 });
  }

  // ── Debit credits BEFORE processing ─────────────────────────
  const debit = await debitCredits(user.id, CREDIT_COST, "merge", undefined);
  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" },
      { status: 402 }
    );
  }

  // ── Create job record ────────────────────────────────────────
  const { data: job, error: jobError } = await service
    .from("tool_jobs")
    .insert({
      user_id: user.id,
      tool_slug: "merge",
      input_file_ids: fileIds,
      status: "processing",
      credits_charged: CREDIT_COST,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    await refundCredits(user.id, CREDIT_COST, "merge_job_create_failed");
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    // ── Download all source PDFs ───────────────────────────────
    const buffers: ArrayBuffer[] = [];
    for (const file of files) {
      const { data: blob, error } = await service.storage
        .from("uploads")
        .download(file.storage_path);
      if (error || !blob) throw new Error(`Failed to download ${file.filename}`);
      buffers.push(await blob.arrayBuffer());
    }

    // ── Merge ──────────────────────────────────────────────────
    const mergedPdf = await mergePdfs(buffers);

    // ── Upload result ──────────────────────────────────────────
    const outputPath = `${user.id}/${job.id}.pdf`;
    const { error: uploadError } = await service.storage
      .from("outputs")
      .upload(outputPath, mergedPdf, { contentType: "application/pdf", upsert: false });

    if (uploadError) throw new Error("Failed to upload merged file");

    // ── Record output file ─────────────────────────────────────
    const { data: outputFile } = await service
      .from("files")
      .insert({
        user_id: user.id,
        filename: "merged.pdf",
        size_bytes: mergedPdf.byteLength,
        mime_type: "application/pdf",
        storage_path: outputPath,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    // ── Mark job done ──────────────────────────────────────────
    await service
      .from("tool_jobs")
      .update({
        status: "done",
        output_file_id: outputFile?.id ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({ jobId: job.id, status: "done" }, { status: 202 });
  } catch (err) {
    // Refund on any processing failure
    await refundCredits(user.id, CREDIT_COST, "merge_failed", job.id);
    await service
      .from("tool_jobs")
      .update({ status: "failed", error_message: String(err), completed_at: new Date().toISOString() })
      .eq("id", job.id);

    console.error("[merge]", err);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
