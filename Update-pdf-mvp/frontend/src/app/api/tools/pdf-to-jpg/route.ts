import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { convertToJpg } from "@/lib/tools/pdf-to-jpg";

const CREDIT_COST = 1;
const bodySchema = z.object({ fileId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { fileId } = parsed.data;
  const service = createServiceClient();

  const { data: file, error: fileError } = await service
    .from("files").select("id, storage_path, filename")
    .eq("id", fileId).eq("user_id", user.id).single();
  if (fileError || !file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const debit = await debitCredits(user.id, CREDIT_COST, "pdf-to-jpg", undefined);
  if (!debit.ok) return NextResponse.json({ error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" }, { status: 402 });

  const { data: job, error: jobError } = await service.from("tool_jobs").insert({
    user_id: user.id, tool_slug: "pdf-to-jpg", input_file_ids: [fileId],
    status: "processing", credits_charged: CREDIT_COST, started_at: new Date().toISOString(),
  }).select("id").single();

  if (jobError || !job) {
    await refundCredits(user.id, CREDIT_COST, "pdf-to-jpg_job_create_failed");
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    const { data: signed, error: signError } = await service.storage
      .from("uploads").createSignedUrl(file.storage_path, 300);
    if (signError || !signed?.signedUrl) throw new Error("Failed to generate signed URL");

    const resultUrl = await convertToJpg(signed.signedUrl);
    const resultRes = await fetch(resultUrl);
    if (!resultRes.ok) throw new Error("Failed to download result from PDF.co");
    const outputBytes = new Uint8Array(await resultRes.arrayBuffer());

    const outputPath = `${user.id}/${job.id}.zip`;
    const { error: uploadError } = await service.storage.from("outputs")
      .upload(outputPath, outputBytes, { contentType: "application/zip", upsert: false });
    if (uploadError) throw new Error("Failed to upload output");

    const baseName = file.filename.replace(/\.pdf$/i, "");
    const { data: outputFile } = await service.from("files").insert({
      user_id: user.id, filename: `${baseName}-images.zip`, size_bytes: outputBytes.byteLength,
      mime_type: "application/zip", storage_path: outputPath,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }).select("id").single();

    await service.from("tool_jobs").update({
      status: "done", output_file_id: outputFile?.id ?? null, completed_at: new Date().toISOString(),
    }).eq("id", job.id);

    return NextResponse.json({ jobId: job.id, status: "done" }, { status: 202 });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, "pdf-to-jpg_failed", job.id);
    await service.from("tool_jobs").update({ status: "failed", error_message: String(err), completed_at: new Date().toISOString() }).eq("id", job.id);
    console.error("[pdf-to-jpg]", err);
    return NextResponse.json({ error: "Conversion failed" }, { status: 500 });
  }
}
