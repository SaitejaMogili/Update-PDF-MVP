import { NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { splitPdf, parsePageSpec } from "@/lib/tools/split";

const CREDIT_COST = 1;

const bodySchema = z.object({
  fileId: z.string().uuid(),
  pageSpec: z.string().min(1).max(200),
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

  const { fileId, pageSpec } = parsed.data;
  const service = createServiceClient();

  // ── Verify file belongs to this user ────────────────────────
  const { data: file, error: fileError } = await service
    .from("files")
    .select("id, storage_path, filename")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // ── Download source PDF ──────────────────────────────────────
  const { data: blob, error: downloadError } = await service.storage
    .from("uploads")
    .download(file.storage_path);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }

  const pdfBytes = await blob.arrayBuffer();

  // ── Validate page spec against actual page count ─────────────
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();
  const pages = parsePageSpec(pageSpec, totalPages);

  if (!pages || pages.length === 0) {
    return NextResponse.json(
      { error: `Invalid page range. File has ${totalPages} page${totalPages !== 1 ? "s" : ""}.` },
      { status: 400 }
    );
  }

  // ── Debit credits BEFORE processing ─────────────────────────
  const debit = await debitCredits(user.id, CREDIT_COST, "split", undefined);
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
      tool_slug: "split",
      input_file_ids: [fileId],
      status: "processing",
      credits_charged: CREDIT_COST,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    await refundCredits(user.id, CREDIT_COST, "split_job_create_failed");
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    // ── Extract pages ──────────────────────────────────────────
    const outputBytes = await splitPdf(pdfBytes, pages);

    // ── Upload result ──────────────────────────────────────────
    const outputPath = `${user.id}/${job.id}.pdf`;
    const { error: uploadError } = await service.storage
      .from("outputs")
      .upload(outputPath, outputBytes, { contentType: "application/pdf", upsert: false });

    if (uploadError) throw new Error("Failed to upload output file");

    // ── Record output file ─────────────────────────────────────
    const safeSpec = pageSpec.replace(/[^0-9,\-]/g, "").slice(0, 30);
    const { data: outputFile } = await service
      .from("files")
      .insert({
        user_id: user.id,
        filename: `split-p${safeSpec}.pdf`,
        size_bytes: outputBytes.byteLength,
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
    await refundCredits(user.id, CREDIT_COST, "split_failed", job.id);
    await service
      .from("tool_jobs")
      .update({ status: "failed", error_message: String(err), completed_at: new Date().toISOString() })
      .eq("id", job.id);

    console.error("[split]", err);
    return NextResponse.json({ error: "Split failed" }, { status: 500 });
  }
}
