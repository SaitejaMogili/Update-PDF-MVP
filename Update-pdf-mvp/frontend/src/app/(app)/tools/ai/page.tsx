import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, MessageSquareText, Languages, Activity, Mic } from "lucide-react";

export const metadata: Metadata = {
  title: "AI PDF Tools — UpdatePDF",
};

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

const tools = [
  {
    slug: "summarize",
    name: "Summarize PDF",
    description: "AI-generated summary, key points, and document analysis.",
    icon: Sparkles,
    credits: 3,
    available: true,
  },
  {
    slug: "chat",
    name: "Chat with PDF",
    description: "Ask questions and get answers grounded in your document.",
    icon: MessageSquareText,
    credits: 5,
    available: true,
  },
  {
    slug: "translate",
    name: "Translate PDF",
    description: "Translate your PDF into 18 languages while preserving structure.",
    icon: Languages,
    credits: 5,
    available: true,
  },
  {
    slug: "health-score",
    name: "Document Health Score",
    description: "AI audit for readability, structure, compliance signals, and more.",
    icon: Activity,
    credits: 5,
    available: true,
  },
  {
    slug: "voice-to-doc",
    name: "Voice → Document",
    description: "Record or upload audio and get a formatted PDF document.",
    icon: Mic,
    credits: 10,
    available: true,
  },
];

export default function AIToolsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">AI PDF Tools</h1>
        <p className="mt-1 text-sm text-slate-500">
          Powered by Claude — understand, transform, and extract insights from any document.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;

          if (tool.available) {
            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: AI_GRADIENT }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    {tool.credits} cr
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                    {tool.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{tool.description}</p>
                </div>
              </Link>
            );
          }

          return (
            <div
              key={tool.slug}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-400">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  Soon
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400">{tool.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{tool.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
