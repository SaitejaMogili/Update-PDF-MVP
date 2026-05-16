import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS } from "@/lib/config/pricing";
import { ProfileForm } from "./_components/profile-form";
import { PasswordForm } from "./_components/password-form";
import { EmailForm } from "./_components/email-form";
import { DeleteAccount } from "./_components/delete-account";
import { BillingSection } from "./_components/billing-section";

export const metadata: Metadata = {
  title: "Settings — UpdatePDF",
};

const planMeta: Record<string, { label: string; color: string }> = {
  free:     { label: "Free",     color: "bg-slate-100 text-slate-600" },
  pro:      { label: "Pro",      color: "bg-blue-100 text-blue-700" },
  business: { label: "Business", color: "bg-violet-100 text-violet-700" },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const { billing } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, plan, credits_balance, credits_refresh_at, created_at")
      .eq("id", user.id)
      .single(),
    service
      .from("subscriptions")
      .select("stripe_customer_id, status, current_period_end, cancel_at_period_end, plan")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!profile) redirect("/login");

  const planKey = profile.plan as keyof typeof PLANS;
  const planConfig = PLANS[planKey] ?? PLANS.free;
  const meta = planMeta[profile.plan] ?? planMeta.free;

  const refreshDate = new Date(profile.credits_refresh_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account and plan.</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white">
              {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {profile.full_name ?? profile.email}
              </p>
              <p className="text-xs text-slate-400">Member since {memberSince}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5">
          <ProfileForm fullName={profile.full_name} email={profile.email} />
        </div>
      </section>

      {/* ── Plan & Credits ───────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Plan & Credits</h2>
          {billing === "success" && (
            <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700">
              ✓ Subscription activated
            </span>
          )}
        </div>
        <div className="px-6 py-5">
          <BillingSection
            plan={profile.plan}
            creditsBalance={profile.credits_balance}
            planCredits={planConfig.credits}
            refreshDate={refreshDate}
            planLabel={meta.label}
            planColor={meta.color}
            subscriptionStatus={subscription?.status ?? null}
            cancelAtPeriodEnd={subscription?.cancel_at_period_end ?? false}
            currentPeriodEnd={subscription?.current_period_end ?? null}
            hasStripeCustomer={!!subscription?.stripe_customer_id}
          />
        </div>
      </section>

      {/* ── Change password ──────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
        </div>
        <div className="px-6 py-5">
          <PasswordForm />
        </div>
      </section>

      {/* ── Change email ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Change email</h2>
        </div>
        <div className="px-6 py-5">
          <EmailForm currentEmail={profile.email} />
        </div>
      </section>

      {/* ── Danger zone ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-red-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-red-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
        </div>

        {/* Sign out */}
        <div className="flex items-center justify-between border-b border-red-50 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-slate-700">Sign out</p>
            <p className="text-xs text-slate-400">You will be redirected to the login page.</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Delete account */}
        <div className="px-6 py-5">
          <p className="mb-4 text-sm font-medium text-slate-700">Delete account</p>
          <DeleteAccount />
        </div>
      </section>
    </div>
  );
}
