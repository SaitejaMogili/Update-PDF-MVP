import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workspaceId, docId } = await params;
  const service = createServiceClient();

  // Fetch brain_documents row and verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: doc } = await (service.from("brain_documents" as never) as any)
    .select("id,file_id,user_id")
    .eq("id", docId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!doc || doc.user_id !== user.id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const fileId: string | null = doc.file_id;

  // Remove file_id from workspace.file_ids
  if (fileId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ws } = await (service.from("brain_workspaces" as never) as any)
      .select("file_ids")
      .eq("id", workspaceId)
      .single();

    if (ws) {
      const updatedFileIds = ((ws.file_ids as string[]) ?? []).filter((fid) => fid !== fileId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service.from("brain_workspaces" as never) as any)
        .update({ file_ids: updatedFileIds, updated_at: new Date().toISOString() })
        .eq("id", workspaceId);
    }

    // Delete chat_embeddings for this file
    await service.from("chat_embeddings").delete().eq("file_id", fileId);

    // Delete files row
    await service.from("files").delete().eq("id", fileId);
  }

  // Delete brain_documents row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service.from("brain_documents" as never) as any).delete().eq("id", docId);

  return NextResponse.json({ ok: true });
}
