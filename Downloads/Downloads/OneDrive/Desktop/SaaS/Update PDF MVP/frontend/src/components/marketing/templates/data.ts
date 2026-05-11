import {
  BankIcon,
  CalendarIcon,
  GraduationIcon,
  GridIcon,
  HeartIcon,
  TaskIcon,
  UserIcon,
} from "./icons";

export type TemplateCategory = "all" | "business" | "hr" | "finance" | "productivity" | "education" | "personal";

export const categories = [
  { id: "all", label: "All Templates", count: 100, icon: GridIcon, tone: "from-[#2563EB] to-[#38BDF8]" },
  { id: "business", label: "Business", count: 22, icon: UserIcon, tone: "from-[#2563EB] to-[#38BDF8]" },
  { id: "hr", label: "HR", count: 18, icon: CalendarIcon, tone: "from-[#7C3AED] to-[#A78BFA]" },
  { id: "finance", label: "Finance", count: 14, icon: BankIcon, tone: "from-[#DC2626] to-[#F87171]" },
  { id: "productivity", label: "Productivity", count: 16, icon: TaskIcon, tone: "from-[#4F46E5] to-[#06B6D4]" },
  { id: "education", label: "Education", count: 16, icon: GraduationIcon, tone: "from-[#D97706] to-[#FBBF24]" },
  { id: "personal", label: "Personal", count: 14, icon: HeartIcon, tone: "from-[#059669] to-[#34D399]" },
] satisfies Array<{
  id: TemplateCategory;
  label: string;
  count: number;
  icon: typeof GridIcon;
  tone: string;
}>;

export const categoryTitles: Record<TemplateCategory, string> = {
  all: "Most popular templates",
  business: "Business templates",
  hr: "HR & Recruitment templates",
  finance: "Finance templates",
  productivity: "Productivity templates",
  education: "Education templates",
  personal: "Personal templates",
};

export const templates = [
  { title: "Invoice Generator", category: "finance", label: "FINANCE", tags: ["Free", "Popular"], accent: "#2563EB" },
  { title: "AI Resume Builder", category: "hr", label: "HR & RECRUITMENT", tags: ["AI", "Popular"], accent: "#7C3AED" },
  { title: "Contract Generator", category: "business", label: "BUSINESS", tags: ["AI"], accent: "#2563EB" },
  { title: "Proposal Generator", category: "business", label: "BUSINESS", tags: ["AI"], accent: "#7C3AED" },
  { title: "Salary Slip Generator", category: "finance", label: "FINANCE", tags: ["Free"], accent: "#DC2626" },
  { title: "Daily Planner", category: "productivity", label: "PRODUCTIVITY", tags: ["Free"], accent: "#2563EB" },
  { title: "Content Calendar", category: "productivity", label: "PRODUCTIVITY", tags: ["AI"], accent: "#4F46E5" },
  { title: "Business Plan", category: "business", label: "BUSINESS", tags: ["AI"], accent: "#2563EB" },
  { title: "Cheque Template", category: "finance", label: "FINANCE", tags: ["Free", "Popular"], accent: "#DC2626" },
  { title: "Job Description", category: "hr", label: "HR & RECRUITMENT", tags: ["AI"], accent: "#7C3AED" },
  { title: "Cover Letter", category: "hr", label: "HR & RECRUITMENT", tags: ["AI"], accent: "#7C3AED" },
  { title: "Pitch Deck", category: "business", label: "BUSINESS", tags: ["Pro", "AI"], accent: "#7C3AED" },
] satisfies Array<{
  title: string;
  category: Exclude<TemplateCategory, "all">;
  label: string;
  tags: string[];
  accent: string;
}>;

export const collections = [
  {
    title: "Startup Founder Pack",
    description:
      "Everything you need from idea to seed round — pitch deck, business plan, founder agreement, NDA, investor update template.",
    items: ["Pitch Deck", "Business Plan", "NDA", "+5 more"],
    tone: "from-[#2563EB] to-[#38BDF8]",
  },
  {
    title: "Freelancer Bundle",
    description:
      "Send invoices, lock in clients, get paid. The freelance starter kit — from first cold email to GST-ready invoices.",
    items: ["Invoice", "Contract", "Proposal", "+4 more"],
    tone: "from-[#7C3AED] to-[#A78BFA]",
  },
  {
    title: "Recruiter Toolkit",
    description:
      "From sourcing to onboarding. Job descriptions, candidate submissions, interview scorecards, offer letters, onboarding checklists.",
    items: ["Job Description", "Offer Letter", "Scorecard", "+5 more"],
    tone: "from-[#4F46E5] to-[#06B6D4]",
  },
];

export const pricingPlans = [
  {
    tier: "FREE",
    price: "$0",
    unit: "/mo",
    title: "For occasional use",
    cta: "Start Free",
    featured: false,
    features: ["30+ free templates", "3 AI generations / month", "UpdatePDF watermark"],
    muted: ["Brand kits", "Premium templates"],
  },
  {
    tier: "PRO",
    price: "$19",
    unit: "/seat/mo",
    title: "For freelancers & teams",
    cta: "Start 14-Day Trial",
    featured: true,
    features: ["All 100+ templates", "Unlimited AI generations", "No watermark", "1 brand kit", "Save unlimited drafts"],
    muted: [],
  },
  {
    tier: "BUSINESS",
    price: "$49",
    unit: "/seat/mo",
    title: "For full teams",
    cta: "Contact Sales",
    featured: false,
    features: ["Everything in Pro", "Multiple brand kits", "Team templates library", "Bulk generation API", "Saved company info"],
    muted: [],
  },
];
