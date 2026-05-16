import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;
  const service = createServiceClient();

  const { data: job, error } = await service
    .from("tool_jobs")
    .select("id, status, error_message, output_file_id, files(storage_path, size_bytes)")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let downloadUrl: string | null = null;
  let outputSizeBytes: number | null = null;

  if (job.status === "done" && job.output_file_id) {
    const outputFile = Array.isArray(job.files) ? job.files[0] : job.files;
    if (outputFile?.storage_path) {
      const { data: signed } = await service.storage
        .from("outputs")
        .createSignedUrl(outputFile.storage_path, 3600);
      downloadUrl = signed?.signedUrl ?? null;
      outputSizeBytes = outputFile.size_bytes ?? null;
    }
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    error: job.error_message ?? null,
    downloadUrl,
    outputSizeBytes,
  });
}
