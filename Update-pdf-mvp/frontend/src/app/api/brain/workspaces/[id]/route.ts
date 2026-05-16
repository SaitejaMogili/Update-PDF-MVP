import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const service = createServiceClient();

  // Fetch workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace, error: wsError } = await (service.from("brain_workspaces" as never) as any)
    .select("id,name,description,file_ids,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (wsError || !workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Fetch documents for workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: documents } = await (service.from("brain_documents" as never) as any)
    .select("id,filename,page_count,chunk_count,status,error_message,created_at,file_id")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });

  // Fetch agents (system + user's own)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agents } = await (service.from("brain_agents" as never) as any)
    .select("id,name,system_prompt,is_system")
    .or(`is_system.eq.true,user_id.eq.${user.id}`);

  return NextResponse.json({
    workspace,
    documents: documents ?? [],
    agents: agents ?? [],
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (service.from("brain_workspaces" as never) as any)
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service.from("brain_workspaces" as never) as any)
    .update(updates)
    .eq("id", id)
    .select("id,name,description")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const service = createServiceClient();

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (service.from("brain_workspaces" as never) as any)
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Cascade will handle brain_documents, brain_sessions, brain_messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service.from("brain_workspaces" as never) as any)
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
