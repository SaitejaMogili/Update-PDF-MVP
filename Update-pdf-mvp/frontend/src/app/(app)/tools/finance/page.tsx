import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, FileSpreadsheet } from "lucide-react";

export const metadata: Metadata = {
  title: "Finance Tools — UpdatePDF",
};

const FIN_GRADIENT = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";

const tools = [
  {
    slug: "cheque",
    name: "Cheque Printing",
    description: "Generate print-ready cheque PDFs with live preview and digital signature support.",
    icon: Landmark,
    credits: 1,
    available: true,
  },
  {
    slug: "invoice",
    name: "Invoice Generator",
    description: "Create professional invoices with your branding, line items, and tax calculations.",
    icon: FileSpreadsheet,
    credits: 1,
    available: true,
  },
];

export default function FinanceToolsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Finance Tools</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate financial documents — cheques, invoices, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;

          if (tool.available) {
            return (
              <Link
                key={tool.slug}
                href={`/app/tools/${tool.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-red-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: FIN_GRADIENT }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    {tool.credits} cr
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-red-700 transition-colors">
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
