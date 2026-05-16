import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { editPdf, type EditAnnotation } from "@/lib/tools/edit";

const CREDIT_COST = 1;
const VALID_FONTS = ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique"];
const VALID_ROTATIONS = [0, 90, 180, 270];

const textAnnotationSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
  page: z.number().int().min(1),
  x: z.number().min(0),
  y: z.number().min(0),
  fontSize: z.number().int().min(6).max(144),
  fontColor: z.string().regex(/^[0-9A-Fa-f]{6}$/),
  fontName: z.string().refine((v) => VALID_FONTS.includes(v), "Invalid font name").default("Helvetica"),
  rotation: z.number().int().refine((v) => VALID_ROTATIONS.includes(v), "Rotation must be 0, 90, 180, or 270").default(0),
});

const imageAnnotationSchema = z.object({
  type: z.literal("image"),
  imageId: z.string().uuid(),
  page: z.number().int().min(1),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive().max(2000),
  height: z.number().positive().max(2000),
  rotation: z.number().int().refine((v) => VALID_ROTATIONS.includes(v), "Rotation must be 0, 90, 180, or 270").default(0),
});

const bodySchema = z.object({
  fileId: z.string().uuid(),
  annotations: z.array(z.discriminatedUnion("type", [textAnnotationSchema, imageAnnotationSchema])).min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { fileId, annotations } = parsed.data;
  const service = createServiceClient();

  // Verify the source PDF belongs to this user
  const { data: file, error: fileError } = await service
    .from("files").select("id, storage_path, filename")
    .eq("id", fileId).eq("user_id", user.id).single();
  if (fileError || !file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Collect unique image IDs and verify ownership
  const imageIds = [...new Set(annotations.filter((a) => a.type === "image").map((a) => (a as { imageId: string }).imageId))];

  const imageSignedUrls = new Map<string, string>();
  for (const imageId of imageIds) {
    const { data: imgFile, error: imgError } = await service
      .from("files").select("id, storage_path")
      .eq("id", imageId).eq("user_id", user.id).single();
    if (imgError || !imgFile) return NextResponse.json({ error: `Image file ${imageId} not found` }, { status: 404 });

    const { data: signed, error: signErr } = await service.storage
      .from("uploads").createSignedUrl(imgFile.storage_path, 300);
    if (signErr || !signed?.signedUrl) return NextResponse.json({ error: "Failed to sign image URL" }, { status: 500 });

    imageSignedUrls.set(imageId, signed.signedUrl);
  }

  const debit = await debitCredits(user.id, CREDIT_COST, "edit", undefined);
  if (!debit.ok) return NextResponse.json({ error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" }, { status: 402 });

  const { data: job, error: jobError } = await service.from("tool_jobs").insert({
    user_id: user.id, tool_slug: "edit", input_file_ids: [fileId],
    status: "processing", credits_charged: CREDIT_COST, started_at: new Date().toISOString(),
  }).select("id").single();

  if (jobError || !job) {
    await refundCredits(user.id, CREDIT_COST, "edit_job_create_failed");
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    const { data: signed, error: signError } = await service.storage
      .from("uploads").createSignedUrl(file.storage_path, 300);
    if (signError || !signed?.signedUrl) throw new Error("Failed to generate signed URL");

    // Build the annotation list, resolving imageId → signed URL
    const resolvedAnnotations: EditAnnotation[] = annotations.map((a) => {
      if (a.type === "image") {
        return {
          type: "image",
          imageUrl: imageSignedUrls.get(a.imageId)!,
          page: a.page,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          rotation: a.rotation,
        };
      }
      return {
        type: "text",
        text: a.text,
        page: a.page,
        x: a.x,
        y: a.y,
        fontSize: a.fontSize,
        fontColor: a.fontColor,
        fontName: a.fontName,
        rotation: a.rotation,
      };
    });

    const resultUrl = await editPdf(signed.signedUrl, resolvedAnnotations);
    const resultRes = await fetch(resultUrl);
    if (!resultRes.ok) throw new Error("Failed to download result from PDF.co");
    const outputBytes = new Uint8Array(await resultRes.arrayBuffer());

    const outputPath = `${user.id}/${job.id}.pdf`;
    const { error: uploadError } = await service.storage.from("outputs")
      .upload(outputPath, outputBytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw new Error("Failed to upload output");

    const baseName = file.filename.replace(/\.pdf$/i, "");
    const { data: outputFile } = await service.from("files").insert({
      user_id: user.id, filename: `${baseName}-edited.pdf`, size_bytes: outputBytes.byteLength,
      mime_type: "application/pdf", storage_path: outputPath,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }).select("id").single();

    await service.from("tool_jobs").update({
      status: "done", output_file_id: outputFile?.id ?? null, completed_at: new Date().toISOString(),
    }).eq("id", job.id);

    return NextResponse.json({ jobId: job.id, status: "done" }, { status: 202 });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, "edit_failed", job.id);
    await service.from("tool_jobs").update({ status: "failed", error_message: String(err), completed_at: new Date().toISOString() }).eq("id", job.id);
    console.error("[edit]", err);
    return NextResponse.json({ error: "Edit failed" }, { status: 500 });
  }
}
