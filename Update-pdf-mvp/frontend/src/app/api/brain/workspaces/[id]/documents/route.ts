import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestPdf } from "@/lib/tools/chat";

export const dynamic = "force-dynamic";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workspaceId } = await params;
  const service = createServiceClient();

  // Verify workspace ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace } = await (service.from("brain_workspaces" as never) as any)
    .select("id,file_ids")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const pdfFile = formData.get("pdf") as File | null;
  if (!pdfFile) {
    return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
  }

  if (pdfFile.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  if (pdfFile.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 400 });
  }

  const filename = pdfFile.name;
  const buffer = await pdfFile.arrayBuffer();

  // Insert brain_documents row with status=ingesting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: docRow, error: docInsertError } = await (service.from("brain_documents" as never) as any)
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      filename,
      status: "ingesting",
    })
    .select("id")
    .single();

  if (docInsertError || !docRow) {
    return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
  }

  const docId: string = docRow.id;

  try {
    // Upload PDF to "uploads" storage
    const storagePath = `${user.id}/brain-${Date.now()}.pdf`;
    const { error: storageError } = await service.storage
      .from("uploads")
      .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });

    if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

    // Insert into files table (30-day TTL for brain files)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: fileRow, error: fileInsertError } = await service
      .from("files")
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        filename,
        size_bytes: pdfFile.size,
        mime_type: "application/pdf",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (fileInsertError || !fileRow) {
      throw new Error("Failed to insert file record");
    }

    const fileId: string = fileRow.id;

    // Update brain_documents with file_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("brain_documents" as never) as any)
      .update({ file_id: fileId })
      .eq("id", docId);

    // Ingest PDF (embed chunks into chat_embeddings)
    const chunkCount = await ingestPdf(buffer, fileId);

    // Update brain_documents: status=ready, chunk_count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("brain_documents" as never) as any)
      .update({ status: "ready", chunk_count: chunkCount })
      .eq("id", docId);

    // Append file_id to brain_workspaces.file_ids
    const currentFileIds: string[] = workspace.file_ids ?? [];
    const newFileIds = [...currentFileIds, fileId];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("brain_workspaces" as never) as any)
      .update({ file_ids: newFileIds, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: finalDoc } = await (service.from("brain_documents" as never) as any)
      .select("id,filename,status,chunk_count,page_count,created_at")
      .eq("id", docId)
      .single();

    return NextResponse.json({ document: finalDoc }, { status: 201 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Ingestion failed";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("brain_documents" as never) as any)
      .update({ status: "failed", error_message: errorMessage })
      .eq("id", docId);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
