import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestPdf } from "@/lib/tools/chat";

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

  // Verify file ownership
  const { data: file } = await service
    .from("files")
    .select("id, storage_path, filename")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  try {
    // Download PDF and ingest (idempotent — skips if already done)
    const { data: blob, error: dlErr } = await service.storage
      .from("uploads")
      .download(file.storage_path);

    if (dlErr || !blob) throw new Error("Failed to download file");

    const buffer = await blob.arrayBuffer();
    const chunksCount = await ingestPdf(buffer, fileId);

    if (chunksCount === 0) {
      return NextResponse.json(
        { error: "No readable text found. Run OCR on the PDF first." },
        { status: 422 }
      );
    }

    // Create or reuse chat session for this file
    const { data: existing } = await service
      .from("chat_sessions")
      .select("id")
      .eq("user_id", user.id)
      .contains("file_ids", [fileId])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ sessionId: existing.id, chunksCount });
    }

    const { data: session, error: sessionErr } = await service
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        file_ids: [fileId],
        title: file.filename,
      })
      .select("id")
      .single();

    if (sessionErr || !session) throw new Error("Failed to create session");

    return NextResponse.json({ sessionId: session.id, chunksCount });
  } catch (err) {
    console.error("[chat/ingest]", err);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
