import type { Metadata } from "next";
import Link from "next/link";
import {
  Merge,
  Scissors,
  Minimize2,
  FileText,
  Image,
  Lock,
  ScanText,
  PenLine,
  ClipboardEdit,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Basic PDF Tools — UpdatePDF",
};

const tools = [
  {
    slug: "merge",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one document.",
    icon: Merge,
    credits: 1,
    available: true,
  },
  {
    slug: "split",
    name: "Split PDF",
    description: "Extract specific pages or ranges from a PDF.",
    icon: Scissors,
    credits: 1,
    available: true,
  },
  {
    slug: "compress",
    name: "Compress PDF",
    description: "Reduce file size without losing quality.",
    icon: Minimize2,
    credits: 1,
    available: true,
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert PDF documents to editable Word files.",
    icon: FileText,
    credits: 1,
    available: true,
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Export every page as a high-resolution image.",
    icon: Image,
    credits: 1,
    available: true,
  },
  {
    slug: "protect",
    name: "Protect PDF",
    description: "Add a password to lock your PDF.",
    icon: Lock,
    credits: 1,
    available: true,
  },
  {
    slug: "ocr",
    name: "OCR",
    description: "Make scanned PDFs searchable and copyable.",
    icon: ScanText,
    credits: 5,
    available: true,
  },
  {
    slug: "edit",
    name: "Edit PDF",
    description: "Annotate, highlight, and add text to any PDF.",
    icon: PenLine,
    credits: 1,
    available: true,
  },
  {
    slug: "fill-form",
    name: "Fill PDF Form",
    description: "Fill interactive PDF form fields digitally.",
    icon: ClipboardEdit,
    credits: 1,
    available: true,
  },
];

export default function BasicToolsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Basic PDF Tools</h1>
        <p className="mt-1 text-sm text-slate-500">
          Essential tools for everyday PDF tasks — all starting at 1 credit.
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
                className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {tool.credits} cr
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
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
