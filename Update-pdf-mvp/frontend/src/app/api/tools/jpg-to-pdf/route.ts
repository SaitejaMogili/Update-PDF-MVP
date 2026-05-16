import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { imagesToPdf } from "@/lib/tools/image-to-pdf";

const CREDIT_COST = 1;
const TOOL = "jpg-to-pdf";

const bodySchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1).max(50),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { imageIds } = parsed.data;
  const service = createServiceClient();

  // Fetch in the original order requested
  const { data: imgs, error: imgsErr } = await service
    .from("files").select("id, storage_path, mime_type")
    .in("id", imageIds).eq("user_id", user.id);
  if (imgsErr || !imgs || imgs.length !== imageIds.length) {
    return NextResponse.json({ error: "One or more images not found" }, { status: 404 });
  }

  // Verify all are images
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (imgs.some((i) => !i.mime_type || !allowedTypes.has(i.mime_type))) {
    return NextResponse.json({ error: "All inputs must be PNG, JPG, or WebP images" }, { status: 400 });
  }

  const debit = await debitCredits(user.id, CREDIT_COST, TOOL, undefined);
  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" },
      { status: 402 }
    );
  }

  const { data: job, error: jobErr } = await service.from("tool_jobs").insert({
    user_id: user.id, tool_slug: TOOL, input_file_ids: imageIds,
    status: "processing", credits_charged: CREDIT_COST, started_at: new Date().toISOString(),
  }).select("id").single();

  if (jobErr || !job) {
    await refundCredits(user.id, CREDIT_COST, `${TOOL}_job_create_failed`);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    // Preserve client-supplied order
    const byId = new Map(imgs.map((i) => [i.id, i]));
    const ordered = imageIds.map((id) => byId.get(id)!).filter(Boolean);

    const images: Array<{ buffer: ArrayBuffer; mimeType: string }> = [];
    for (const img of ordered) {
      const { data: blob, error } = await service.storage.from("uploads").download(img.storage_path);
      if (error || !blob) throw new Error("Failed to download an image");
      images.push({ buffer: await blob.arrayBuffer(), mimeType: img.mime_type ?? "image/jpeg" });
    }

    const outBytes = new Uint8Array(await imagesToPdf(images));

    const outputPath = `${user.id}/${job.id}.pdf`;
    const { error: upErr } = await service.storage.from("outputs")
      .upload(outputPath, outBytes, { contentType: "application/pdf", upsert: false });
    if (upErr) throw new Error("Failed to upload output");

    const { data: outFile } = await service.from("files").insert({
      user_id: user.id, filename: "images.pdf", size_bytes: outBytes.byteLength,
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
    return NextResponse.json({ error: "Image-to-PDF conversion failed" }, { status: 500 });
  }
}
