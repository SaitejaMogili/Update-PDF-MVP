import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { deletePages } from "@/lib/tools/delete-pages";

const CREDIT_COST = 1;
const TOOL = "delete-pages";

const bodySchema = z.object({
  fileId: z.string().uuid(),
  pages: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { fileId, pages } = parsed.data;
  const service = createServiceClient();

  const { data: file, error: fileErr } = await service
    .from("files").select("id, storage_path, filename")
    .eq("id", fileId).eq("user_id", user.id).single();
  if (fileErr || !file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const debit = await debitCredits(user.id, CREDIT_COST, TOOL, undefined);
  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" },
      { status: 402 }
    );
  }

  const { data: job, error: jobErr } = await service.from("tool_jobs").insert({
    user_id: user.id, tool_slug: TOOL, input_file_ids: [fileId],
    status: "processing", credits_charged: CREDIT_COST, started_at: new Date().toISOString(),
  }).select("id").single();

  if (jobErr || !job) {
    await refundCredits(user.id, CREDIT_COST, `${TOOL}_job_create_failed`);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    const { data: blob, error: dlErr } = await service.storage.from("uploads").download(file.storage_path);
    if (dlErr || !blob) throw new Error("Failed to download source file");
    const inputBuffer = await blob.arrayBuffer();

    const outBytes = new Uint8Array(await deletePages(inputBuffer, pages));

    const outputPath = `${user.id}/${job.id}.pdf`;
    const { error: upErr } = await service.storage.from("outputs")
      .upload(outputPath, outBytes, { contentType: "application/pdf", upsert: false });
    if (upErr) throw new Error("Failed to upload output");

    const baseName = file.filename.replace(/\.pdf$/i, "");
    const { data: outFile } = await service.from("files").insert({
      user_id: user.id, filename: `${baseName}-trimmed.pdf`, size_bytes: outBytes.byteLength,
      mime_type: "application/pdf", storage_path: outputPath,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }).select("id").single();

    await service.from("tool_jobs").update({
      status: "done", output_file_id: outFile?.id ?? null, completed_at: new Date().toISOString(),
    }).eq("id", job.id);

    return NextResponse.json({ jobId: job.id, status: "done" }, { status: 202 });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, `${TOOL}_failed`, job.id);
    await service.from("tool_jobs").update({
      status: "failed", error_message: String(err), completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    console.error(`[${TOOL}]`, err);
    return NextResponse.json({ error: "Delete pages failed" }, { status: 500 });
  }
}
