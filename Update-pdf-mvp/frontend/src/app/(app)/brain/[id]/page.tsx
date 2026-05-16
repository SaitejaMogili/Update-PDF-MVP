import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { BrainWorkspace } from "./_components/brain-workspace";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BrainWorkspacePage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const service = createServiceClient();

  // Fetch workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace } = await (service.from("brain_workspaces" as never) as any)
    .select("id,name,description,file_ids,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!workspace) redirect("/brain");

  // Fetch documents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: documents } = await (service.from("brain_documents" as never) as any)
    .select("id,filename,page_count,chunk_count,status,error_message,created_at,file_id")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });

  // Fetch agents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agents } = await (service.from("brain_agents" as never) as any)
    .select("id,name,system_prompt,is_system")
    .or(`is_system.eq.true,user_id.eq.${user.id}`);

  return (
    <BrainWorkspace
      workspace={workspace}
      documents={documents ?? []}
      agents={agents ?? []}
    />
  );
}
