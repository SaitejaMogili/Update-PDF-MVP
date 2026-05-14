import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./_components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan, credits_balance")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        email={user.email ?? ""}
        fullName={profile?.full_name ?? null}
        plan={profile?.plan ?? "free"}
        creditsBalance={profile?.credits_balance ?? 0}
      />
      <div className="flex flex-1 flex-col pl-60">
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
