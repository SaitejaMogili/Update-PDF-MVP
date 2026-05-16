import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { generateVoiceDoc, DOC_TYPES, type DocTypeKey } from "@/lib/tools/voice-to-doc";

const CREDIT_COST = 10;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB — Whisper limit

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = form.get("audio") as File | null;
  const docType = form.get("docType") as string | null;

  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (!docType || !(docType in DOC_TYPES)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_SIZE) {
    return NextResponse.json({ error: "Audio file too large (max 25 MB)" }, { status: 413 });
  }

  const service = createServiceClient();

  const debit = await debitCredits(user.id, CREDIT_COST, "voice-to-doc");
  if (!debit.ok) {
    return NextResponse.json(
      {
        error:
          debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error",
      },
      { status: 402 }
    );
  }

  const { data: job, error: jobError } = await service
    .from("tool_jobs")
    .insert({
      user_id: user.id,
      tool_slug: "voice-to-doc",
      status: "processing",
      credits_charged: CREDIT_COST,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    await refundCredits(user.id, CREDIT_COST, "voice_to_doc_job_create_failed");
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    const audioBuffer = await audio.arrayBuffer();
    const outputFilename = `voice-${docType}-${Date.now()}.pdf`;
    const outputPath = `${user.id}/voice-${Date.now()}.pdf`;

    const pdfBuffer = await generateVoiceDoc(
      audioBuffer,
      audio.type || "audio/webm",
      docType as DocTypeKey,
      audio.name || `recording.${audio.type?.split("/")[1] ?? "webm"}`
    );

    const { error: uploadErr } = await service.storage
      .from("outputs")
      .upload(outputPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadErr) throw new Error("Failed to upload output file");

    await service
      .from("tool_jobs")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    const { data: signed } = await service.storage
      .from("outputs")
      .createSignedUrl(outputPath, 3600);

    return NextResponse.json({
      jobId: job.id,
      status: "done",
      downloadUrl: signed?.signedUrl ?? null,
      filename: outputFilename,
    });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, "voice_to_doc_failed", job.id);
    await service
      .from("tool_jobs")
      .update({
        status: "failed",
        error_message: String(err),
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    console.error("[voice-to-doc]", err);
    return NextResponse.json({ error: "Processing failed. Please try again." }, { status: 500 });
  }
}
