import Link from "next/link";
import {
  Merge, Scissors, Minimize2, FileText, Image, Lock, ScanText, PenLine,
  ClipboardList, MessageSquare, Sparkles, Languages, HeartPulse, Mic,
  Receipt, BarChart2, Brain, ChevronRight, CheckCircle2, Zap,
} from "lucide-react";

const COBALT = "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)";
const VIOLET = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";
const RED    = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";
const BRAIN  = "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)";
const EMERALD = "linear-gradient(135deg, #059669 0%, #34D399 100%)";

const tools = [
  { icon: Merge,       label: "Merge PDF",       href: "/app/tools/merge",        gradient: COBALT },
  { icon: Scissors,    label: "Split PDF",        href: "/app/tools/split",        gradient: COBALT },
  { icon: Minimize2,   label: "Compress",         href: "/app/tools/compress",     gradient: COBALT },
  { icon: FileText,    label: "PDF → Word",       href: "/app/tools/pdf-to-word",  gradient: COBALT },
  { icon: Image,       label: "PDF → JPG",        href: "/app/tools/pdf-to-jpg",   gradient: COBALT },
  { icon: Lock,        label: "Protect PDF",      href: "/app/tools/protect",      gradient: COBALT },
  { icon: ScanText,    label: "OCR",              href: "/app/tools/ocr",          gradient: COBALT },
  { icon: PenLine,     label: "Edit PDF",         href: "/app/tools/edit",         gradient: COBALT },
  { icon: ClipboardList, label: "Fill Form",      href: "/app/tools/fill-form",    gradient: COBALT },
  { icon: MessageSquare, label: "Chat with PDF",  href: "/app/tools/chat",         gradient: VIOLET },
  { icon: Sparkles,    label: "Summarize",        href: "/app/tools/summarize",    gradient: VIOLET },
  { icon: Languages,   label: "Translate",        href: "/app/tools/translate",    gradient: VIOLET },
  { icon: HeartPulse,  label: "Health Score",     href: "/app/tools/health-score", gradient: VIOLET },
  { icon: Mic,         label: "Voice → Doc",      href: "/app/tools/voice-to-doc", gradient: VIOLET },
  { icon: Receipt,     label: "Cheque Printing",  href: "/app/tools/cheque",       gradient: RED },
  { icon: BarChart2,   label: "Invoice Generator",href: "/app/tools/invoice",      gradient: RED },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    gradient: COBALT,
    credits: "100 credits / mo",
    features: ["9 basic tools", "5 Brain documents", "Free templates"],
    cta: "Get started free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ seat / mo",
    gradient: VIOLET,
    credits: "2,000 credits / mo",
    features: ["All 22 tools", "50 Brain documents", "All templates", "Brand kit", "No watermark"],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    highlight: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/ seat / mo",
    gradient: EMERALD,
    credits: "10,000 credits / mo",
    features: ["Everything in Pro", "Unlimited Brain docs", "Team brand kits", "Custom templates", "Priority support"],
    cta: "Start Business",
    href: "/signup?plan=business",
    highlight: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold"
              style={{ background: COBALT }}
            >
              U
            </div>
            <span className="text-sm font-semibold text-slate-900">UpdatePDF</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <Link href="#tools" className="hover:text-slate-900 transition-colors">Tools</Link>
            <Link href="#brain" className="hover:text-slate-900 transition-colors">Brain</Link>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: COBALT }}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-6 pt-20 pb-28 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #2563EB 0, transparent 50%), radial-gradient(circle at 80% 20%, #7C3AED 0, transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <div
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
          >
            <Zap className="h-3 w-3" /> AI-powered PDF tools — free to start
          </div>
          <h1 className="mb-5 text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl">
            Everything you need<br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: COBALT }}
            >
              to work with PDFs
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-slate-500">
            22 tools. AI chat, summaries, translation, cheque printing, and a Document Brain
            that reasons across your entire library.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-blue-300"
              style={{ background: COBALT }}
            >
              Start for free <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="#tools"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Browse all tools
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">100 free credits every month. No card needed.</p>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              gradient: COBALT,
              icon: <Minimize2 className="h-5 w-5" />,
              title: "9 Essential Tools",
              desc: "Merge, split, compress, convert, protect, OCR, edit, and fill PDF forms — all in one place.",
            },
            {
              gradient: VIOLET,
              icon: <Sparkles className="h-5 w-5" />,
              title: "AI-Powered",
              desc: "Chat with any PDF, get instant summaries, translate to 18 languages, and score document health.",
            },
            {
              gradient: BRAIN,
              icon: <Brain className="h-5 w-5" />,
              title: "Document Brain",
              desc: "Upload your entire document library. Ask questions across all files. Get cited answers instantly.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: f.gradient }}
              >
                {f.icon}
              </div>
              <h3 className="mb-2 font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools grid */}
      <section id="tools" className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">22 tools, one platform</h2>
            <p className="text-slate-500">Every PDF operation you&apos;ll ever need.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex flex-col items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                    style={{ background: tool.gradient }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 leading-tight">
                    {tool.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Brain section */}
      <section id="brain" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-cyan-50 p-10 lg:p-16">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
              <div className="flex-1">
                <div
                  className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                  style={{ background: BRAIN }}
                >
                  <Brain className="h-7 w-7" />
                </div>
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">
                  Document Brain
                </h2>
                <p className="mb-6 text-slate-600 leading-relaxed">
                  Upload your entire document library — contracts, reports, manuals — and chat
                  across all of them at once. Get cited answers with exact file and page references.
                </p>
                <ul className="mb-8 space-y-2.5">
                  {[
                    "Cross-document search with vector embeddings",
                    "Multi-doc chat with GPT-4o-mini",
                    "Specialized agents: Legal, HR, Finance, General",
                    "Knowledge graph visualization",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: BRAIN }}
                >
                  Try Document Brain <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="w-full max-w-sm shrink-0 lg:w-80">
                <div className="rounded-2xl border border-indigo-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded text-white text-[10px] font-bold"
                      style={{ background: BRAIN }}
                    >
                      B
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Brain Workspace · Q4 Contracts</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { role: "user",      msg: "What are the payment terms across all vendor contracts?" },
                      { role: "assistant", msg: "Three vendors require net-30: Acme Corp (VendorA-MSA.pdf, p.4), TechCo (TechCo-Contract.pdf, p.7), and SupplyInc (SI-Agreement.pdf, p.3)." },
                    ].map((m, i) => (
                      <div key={i} className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${m.role === "user" ? "bg-indigo-50 text-indigo-800" : "bg-slate-50 text-slate-700"}`}>
                        <span className="font-semibold">{m.role === "user" ? "You" : "Brain"}:</span> {m.msg}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">Simple, transparent pricing</h2>
            <p className="text-slate-500">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border bg-white p-7 shadow-sm ${plan.highlight ? "border-violet-300 shadow-lg shadow-violet-100 ring-1 ring-violet-300" : "border-slate-200"}`}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[11px] font-semibold text-white"
                    style={{ background: plan.gradient }}
                  >
                    Most popular
                  </div>
                )}
                <div
                  className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{ background: plan.gradient }}
                >
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="mb-1 font-bold text-slate-900">{plan.name}</h3>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-400">{plan.period}</span>
                </div>
                <p className="mb-5 text-xs text-slate-500">{plan.credits}</p>
                <ul className="mb-7 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className="block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition hover:opacity-90"
                  style={
                    plan.highlight
                      ? { background: plan.gradient, color: "#fff" }
                      : { background: "#F1F5F9", color: "#334155" }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">
            Ready to upgrade your document workflow?
          </h2>
          <p className="mb-8 text-slate-500">
            Join thousands of professionals who use UpdatePDF every day. Free to start, no card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5"
            style={{ background: COBALT }}
          >
            Create free account <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-slate-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <div
              className="flex h-5 w-5 items-center justify-center rounded text-white text-[9px] font-bold"
              style={{ background: COBALT }}
            >
              U
            </div>
            <span className="font-medium text-slate-500">UpdatePDF</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/pricing" className="hover:text-slate-600 transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-slate-600 transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-slate-600 transition-colors">Sign up</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
