import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

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
    .select("id, status, output_file_id, files(storage_path)")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !job || job.status !== "done" || !job.output_file_id) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }

  const outputFile = Array.isArray(job.files) ? job.files[0] : job.files;
  if (!outputFile?.storage_path) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { data: signed } = await service.storage
    .from("outputs")
    .createSignedUrl(outputFile.storage_path, 3600);

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
