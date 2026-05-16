import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspaces, error } = await (service.from("brain_workspaces" as never) as any)
    .select("id,name,description,file_ids,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }

  // Attach doc counts
  const workspacesWithCounts = await Promise.all(
    (workspaces ?? []).map(async (ws: { id: string; [key: string]: unknown }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (service.from("brain_documents" as never) as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws.id);
      return { ...ws, doc_count: count ?? 0 };
    })
  );

  return NextResponse.json({ workspaces: workspacesWithCounts });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description } = parsed.data;
  const service = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service.from("brain_workspaces" as never) as any)
    .insert({ user_id: user.id, name, description: description ?? null, file_ids: [] })
    .select("id,name")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
