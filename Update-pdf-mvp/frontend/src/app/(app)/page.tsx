// This route group root resolves to "/" — redirect authenticated users to the dashboard.
// The marketing homepage at src/app/page.tsx handles unauthenticated visitors.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppRootRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Redirect to dashboard if logged in, otherwise show marketing page (handled by Next.js routing)
  if (user) redirect("/dashboard");
  redirect("/");
}
