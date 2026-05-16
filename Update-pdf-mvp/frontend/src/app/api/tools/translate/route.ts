import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { translatePdf, LANGUAGES } from "@/lib/tools/translate";

const CREDIT_COST = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const bodySchema = z.object({
  fileId: z.string().uuid(),
  targetLang: z.enum(Object.keys(LANGUAGES) as [string, ...string[]]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fileId, targetLang } = parsed.data;
  const service = createServiceClient();

  const { data: file } = await service
    .from("files")
    .select("id, storage_path, filename, size_bytes")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
  if ((file.size_bytes ?? 0) > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
  }

  const debit = await debitCredits(user.id, CREDIT_COST, "translate", fileId);
  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" },
      { status: 402 }
    );
  }

  const { data: job, error: jobError } = await service
    .from("tool_jobs")
    .insert({
      user_id: user.id,
      tool_slug: "translate",
      input_file_ids: [fileId],
      status: "processing",
      credits_charged: CREDIT_COST,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    await refundCredits(user.id, CREDIT_COST, "translate_job_create_failed");
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    const { data: blob, error: dlErr } = await service.storage
      .from("uploads")
      .download(file.storage_path);
    if (dlErr || !blob) throw new Error("Failed to download file");

    const pdfBuffer = await blob.arrayBuffer();
    const translated = await translatePdf(
      pdfBuffer,
      targetLang as keyof typeof LANGUAGES,
      file.filename
    );

    const langSuffix = LANGUAGES[targetLang as keyof typeof LANGUAGES].toLowerCase().replace(/\s+/g, "-");
    const outputPath = `${user.id}/${job.id}.pdf`;

    const { error: uploadErr } = await service.storage
      .from("outputs")
      .upload(outputPath, translated, { contentType: "application/pdf", upsert: false });
    if (uploadErr) throw new Error("Failed to upload translated file");

    const baseName = file.filename.replace(/\.pdf$/i, "");
    const { data: outputFile } = await service
      .from("files")
      .insert({
        user_id: user.id,
        filename: `${baseName}-${langSuffix}.pdf`,
        size_bytes: translated.byteLength,
        mime_type: "application/pdf",
        storage_path: outputPath,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    await service
      .from("tool_jobs")
      .update({
        status: "done",
        output_file_id: outputFile?.id ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // Generate signed download URL immediately
    const { data: signed } = await service.storage
      .from("outputs")
      .createSignedUrl(outputPath, 3600);

    return NextResponse.json({
      jobId: job.id,
      status: "done",
      downloadUrl: signed?.signedUrl ?? null,
      filename: `${file.filename.replace(/\.pdf$/i, "")}-${langSuffix}.pdf`,
    });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, "translate_failed", job.id);
    await service
      .from("tool_jobs")
      .update({ status: "failed", error_message: String(err), completed_at: new Date().toISOString() })
      .eq("id", job.id);
    console.error("[translate]", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
