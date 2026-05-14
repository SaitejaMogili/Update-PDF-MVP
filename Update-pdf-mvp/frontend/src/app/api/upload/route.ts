import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(52_428_800), // 50 MB
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

  const { filename, sizeBytes } = parsed.data;
  const service = createServiceClient();

  // Create the files record first to get a stable ID
  const { data: file, error: dbError } = await service
    .from("files")
    .insert({
      user_id: user.id,
      filename,
      size_bytes: sizeBytes,
      mime_type: "application/pdf",
      storage_path: "", // filled below
    })
    .select("id")
    .single();

  if (dbError || !file) {
    return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
  }

  const storagePath = `${user.id}/${file.id}.pdf`;

  // Update with the real storage path
  await service.from("files").update({ storage_path: storagePath }).eq("id", file.id);

  // Generate signed upload URL (server-side; client PUTs directly to Storage)
  const { data: signed, error: urlError } = await service.storage
    .from("uploads")
    .createSignedUploadUrl(storagePath);

  if (urlError || !signed) {
    await service.from("files").delete().eq("id", file.id);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  return NextResponse.json({
    fileId: file.id,
    uploadUrl: signed.signedUrl,
    storagePath,
  });
}
