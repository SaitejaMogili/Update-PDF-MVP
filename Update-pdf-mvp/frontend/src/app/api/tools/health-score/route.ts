import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { healthScorePdf } from "@/lib/tools/health-score";

const CREDIT_COST = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const bodySchema = z.object({
  fileId: z.string().uuid(),
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

  const { fileId } = parsed.data;
  const service = createServiceClient();

  const { data: file, error: fileError } = await service
    .from("files")
    .select("id, storage_path, filename, size_bytes")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if ((file.size_bytes ?? 0) > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 10 MB for Document Health Score)" },
      { status: 413 }
    );
  }

  const debit = await debitCredits(user.id, CREDIT_COST, "health-score", fileId);
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
      tool_slug: "health-score",
      input_file_ids: [fileId],
      status: "processing",
      credits_charged: CREDIT_COST,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    await refundCredits(user.id, CREDIT_COST, "health_score_job_create_failed");
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    const { data: blob, error: downloadError } = await service.storage
      .from("uploads")
      .download(file.storage_path);

    if (downloadError || !blob) throw new Error("Failed to download file");

    const pdfBuffer = await blob.arrayBuffer();
    const result = await healthScorePdf(pdfBuffer);

    await service
      .from("tool_jobs")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({ jobId: job.id, status: "done", result }, { status: 200 });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, "health_score_failed", job.id);
    await service
      .from("tool_jobs")
      .update({
        status: "failed",
        error_message: String(err),
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    console.error("[health-score]", err);
    return NextResponse.json({ error: "Health score analysis failed" }, { status: 500 });
  }
}
