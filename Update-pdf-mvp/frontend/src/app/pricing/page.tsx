"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/config/pricing";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: "pro" | "business") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        window.location.href = `/login?next=/pricing`;
        return;
      }
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-20">
        {/* Header */}
        <div className="mb-14 text-center">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
            ← Back to UpdatePDF
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Start free. Upgrade when you need more power.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">{PLANS.free.name}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">$0</span>
              <span className="text-slate-400">/mo</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Perfect for occasional use.</p>

            <ul className="mt-8 flex-1 space-y-3">
              {PLANS.free.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/signup" className="mt-8">
              <Button variant="outline" className="w-full">Get started free</Button>
            </Link>
          </div>

          {/* Pro — highlighted */}
          <div className="relative flex flex-col rounded-2xl border-2 border-blue-600 bg-white p-8 shadow-lg">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            </div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">{PLANS.pro.name}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">${PLANS.pro.price}</span>
              <span className="text-slate-400">/seat/mo</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">For professionals who live in PDFs.</p>

            <ul className="mt-8 flex-1 space-y-3">
              {PLANS.pro.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleUpgrade("pro")}
              disabled={!!loading}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {loading === "pro" && <Loader2 className="h-4 w-4 animate-spin" />}
              Upgrade to Pro
            </Button>
          </div>

          {/* Business */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">{PLANS.business.name}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">${PLANS.business.price}</span>
              <span className="text-slate-400">/seat/mo</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">For teams with high-volume document workflows.</p>

            <ul className="mt-8 flex-1 space-y-3">
              {PLANS.business.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleUpgrade("business")}
              disabled={!!loading}
              className="mt-8 w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {loading === "business" && <Loader2 className="h-4 w-4 animate-spin" />}
              Upgrade to Business
            </Button>
          </div>
        </div>

        {/* FAQ row */}
        <div className="mt-16 grid gap-6 md:grid-cols-3 text-sm">
          <div>
            <p className="font-semibold text-slate-900">What counts as a credit?</p>
            <p className="mt-1 text-slate-500">Each tool use costs credits — basic tools cost 1, OCR costs 5, AI tools cost 3–10. Credits reset monthly.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Can I cancel anytime?</p>
            <p className="mt-1 text-slate-500">Yes. Cancel from your settings page and your plan stays active until the end of the billing period.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Are my files safe?</p>
            <p className="mt-1 text-slate-500">All files are encrypted in transit and automatically deleted after 1 hour. We never read your documents.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
