export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    credits: 100,
    priceId: null as null,
    badge: "bg-slate-100 text-slate-600",
    features: [
      "100 credits / month",
      "All 9 basic PDF tools",
      "Files deleted after 1 hour",
    ],
    cta: "Get started free",
  },
  pro: {
    name: "Pro",
    price: 19,
    credits: 2000,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    badge: "bg-blue-100 text-blue-700",
    features: [
      "2,000 credits / month",
      "All basic + AI tools",
      "No watermarks",
      "Brand kit",
      "Priority processing",
    ],
    cta: "Upgrade to Pro",
  },
  business: {
    name: "Business",
    price: 49,
    credits: 10_000,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? "",
    badge: "bg-violet-100 text-violet-700",
    features: [
      "10,000 credits / month",
      "Everything in Pro",
      "Team brand kits",
      "Custom templates",
      "API access",
      "Audit logs",
    ],
    cta: "Upgrade to Business",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
