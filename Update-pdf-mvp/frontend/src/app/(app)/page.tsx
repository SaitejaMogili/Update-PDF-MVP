import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Merge,
  Scissors,
  FileOutput,
  FileText,
  MessageSquare,
  Sparkles,
  Languages,
  HeartPulse,
  Mic,
  DollarSign,
  Receipt,
  Brain,
  ArrowRight,
} from "lucide-react";

const toolCategories = [
  {
    label: "Basic Tools",
    color: "#2563EB",
    gradient: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)",
    href: "/app/tools/basic",
    tools: ["Merge", "Split", "Compress", "PDF→Word", "PDF→JPG", "Protect", "OCR"],
    icon: Merge,
  },
  {
    label: "AI Tools",
    color: "#7C3AED",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)",
    href: "/app/tools/ai",
    tools: ["Chat with PDF", "Summarize", "Translate", "Health Score", "Voice→Doc"],
    icon: Sparkles,
  },
  {
    label: "Finance",
    color: "#DC2626",
    gradient: "linear-gradient(135deg, #DC2626 0%, #F87171 100%)",
    href: "/app/tools/finance",
    tools: ["Cheque Printing", "Invoice Generator"],
    icon: DollarSign,
  },
  {
    label: "Document Brain",
    color: "#4F46E5",
    gradient: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
    href: "/app/brain",
    tools: ["Cross-doc Search", "Multi-doc Chat", "AI Agents", "Knowledge Graph"],
    icon: Brain,
  },
];

const quickTools = [
  { label: "Merge PDF", href: "/app/tools/merge", icon: Merge, credits: 1 },
  { label: "Split PDF", href: "/app/tools/split", icon: Scissors, credits: 1 },
  { label: "Compress", href: "/app/tools/compress", icon: FileOutput, credits: 1 },
  { label: "Chat with PDF", href: "/app/tools/chat", icon: MessageSquare, credits: 5 },
  { label: "Summarize", href: "/app/tools/summarize", icon: FileText, credits: 3 },
  { label: "Translate", href: "/app/tools/translate", icon: Languages, credits: 3 },
  { label: "Health Score", href: "/app/tools/health-score", icon: HeartPulse, credits: 5 },
  { label: "Voice→Doc", href: "/app/tools/voice", icon: Mic, credits: 10 },
  { label: "Cheque Print", href: "/app/tools/cheque", icon: Receipt, credits: 1 },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan, credits_balance")
    .eq("id", user.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Good day, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          What would you like to do with your documents today?
        </p>
      </div>

      {/* Quick tools grid */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Quick tools
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                  {tool.label}
                </span>
                <span className="text-[10px] text-slate-400">{tool.credits} cr</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Category cards */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Explore
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {toolCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.href}
                href={cat.href}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ background: cat.gradient }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-slate-900">{cat.label}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cat.tools.join(" · ")}
                </p>
                <ArrowRight className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent activity — empty state */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Recent activity
        </h2>
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No documents yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Upload a PDF above to get started
          </p>
        </div>
      </section>
    </div>
  );
}
