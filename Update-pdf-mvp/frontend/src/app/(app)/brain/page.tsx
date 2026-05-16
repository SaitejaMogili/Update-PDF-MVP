import { redirect } from "next/navigation";
import { Brain } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { WorkspaceList } from "./_components/workspace-list";

const BRAIN_GRADIENT = "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)";

export default async function BrainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspaces } = await (service.from("brain_workspaces" as never) as any)
    .select("id,name,description,file_ids,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Attach doc counts
  const workspacesWithCounts = await Promise.all(
    ((workspaces ?? []) as Array<{ id: string; [key: string]: unknown }>).map(async (ws) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (service.from("brain_documents" as never) as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws.id);
      return { ...ws, doc_count: count ?? 0 } as { id: string; name: string; description?: string | null; file_ids: string[]; doc_count: number; updated_at: string };
    })
  );

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: BRAIN_GRADIENT }}
        >
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Brain</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Multi-doc chat, cross-document search, and AI agents for your document library
          </p>
        </div>
      </div>

      {workspacesWithCounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: BRAIN_GRADIENT }}
          >
            <Brain className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            Create your first Brain workspace
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            Workspaces let you chat across multiple PDFs, search your document library, and use
            specialized AI agents for Legal, HR, and Finance documents.
          </p>
          <WorkspaceList workspaces={[]} />
        </div>
      ) : (
        <WorkspaceList workspaces={workspacesWithCounts} />
      )}
    </div>
  );
}
