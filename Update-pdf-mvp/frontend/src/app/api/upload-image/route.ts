import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_TYPES),
  sizeBytes: z.number().int().positive().max(10_485_760), // 10 MB
});

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { filename, contentType, sizeBytes } = parsed.data;
  const service = createServiceClient();

  const { data: file, error: dbError } = await service
    .from("files")
    .insert({ user_id: user.id, filename, size_bytes: sizeBytes, mime_type: contentType, storage_path: "" })
    .select("id")
    .single();

  if (dbError || !file) return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });

  const storagePath = `${user.id}/${file.id}.${EXT[contentType]}`;
  await service.from("files").update({ storage_path: storagePath }).eq("id", file.id);

  const { data: signed, error: urlError } = await service.storage
    .from("uploads")
    .createSignedUploadUrl(storagePath);

  if (urlError || !signed) {
    await service.from("files").delete().eq("id", file.id);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  return NextResponse.json({ imageId: file.id, uploadUrl: signed.signedUrl, storagePath });
}
