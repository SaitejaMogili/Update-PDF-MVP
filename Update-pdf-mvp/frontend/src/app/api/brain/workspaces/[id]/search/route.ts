import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { embedQuery, searchBrain } from "@/lib/brain";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workspaceId } = await params;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify workspace ownership and get file_ids
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace } = await (service.from("brain_workspaces" as never) as any)
    .select("id,file_ids")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const fileIds: string[] = workspace.file_ids ?? [];
  if (fileIds.length === 0) {
    return NextResponse.json({ results: [], query: q });
  }

  const embedding = await embedQuery(q);
  const results = await searchBrain(embedding, fileIds, 12);

  return NextResponse.json({ results, query: q });
}
