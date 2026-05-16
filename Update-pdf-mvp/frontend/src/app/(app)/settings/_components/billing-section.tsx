"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  plan: string;
  creditsBalance: number;
  planCredits: number;
  refreshDate: string;
  planLabel: string;
  planColor: string;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
}

export function BillingSection({
  plan,
  creditsBalance,
  planCredits,
  refreshDate,
  planLabel,
  planColor,
  subscriptionStatus,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  hasStripeCustomer,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const goToCheckout = async (targetPlan: "pro" | "business") => {
    setLoading(targetPlan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  };

  const goToPortal = async () => {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  };

  const cancelDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="space-y-5">
      {/* Plan row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Current plan</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${planColor}`}>
              {planLabel}
            </span>
            <span className="text-xs text-slate-400">
              {planCredits.toLocaleString()} credits / month
            </span>
            {subscriptionStatus === "active" && cancelAtPeriodEnd && cancelDate && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                Cancels {cancelDate}
              </span>
            )}
            {subscriptionStatus === "past_due" && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                Payment past due
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap gap-2">
          {plan === "free" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToCheckout("pro")}
                disabled={!!loading}
                className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {loading === "pro" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Pro — $19/mo
              </Button>
              <Button
                size="sm"
                onClick={() => goToCheckout("business")}
                disabled={!!loading}
                className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {loading === "business" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Business — $49/mo
              </Button>
            </>
          )}

          {plan === "pro" && !cancelAtPeriodEnd && (
            <>
              <Button
                size="sm"
                onClick={() => goToCheckout("business")}
                disabled={!!loading}
                className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {loading === "business" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Upgrade to Business
              </Button>
              <Button size="sm" variant="outline" onClick={goToPortal} disabled={!!loading}>
                {loading === "portal" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Manage
              </Button>
            </>
          )}

          {(plan === "business" || cancelAtPeriodEnd) && hasStripeCustomer && (
            <Button size="sm" variant="outline" onClick={goToPortal} disabled={!!loading}>
              {loading === "portal" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Manage subscription
            </Button>
          )}
        </div>
      </div>

      {/* Credits bar */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-slate-500">Credits remaining</p>
          <p className="text-sm font-semibold text-slate-700">
            {creditsBalance.toLocaleString()} / {planCredits.toLocaleString()}
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((creditsBalance / planCredits) * 100, 100)}%`,
              background: "linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)",
            }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">Resets on {refreshDate}</p>
      </div>
    </div>
  );
}
