import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  FileSpreadsheet,
  UserCheck,
  FileSignature,
  Presentation,
  Banknote,
  CalendarDays,
  LayoutGrid,
  TrendingUp,
  Landmark,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { getTemplate } from "@/lib/templates/registry";
import { TemplateEditor } from "./_components/template-editor";

const ICON_MAP: Record<string, LucideIcon> = {
  FileSpreadsheet,
  UserCheck,
  FileSignature,
  Presentation,
  Banknote,
  CalendarDays,
  LayoutGrid,
  TrendingUp,
  Landmark,
  Briefcase,
};

const TEMPLATES_GRADIENT = "linear-gradient(135deg, #059669 0%, #34D399 100%)";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplate(slug);
  return {
    title: template
      ? `${template.name} — UpdatePDF Templates`
      : "Template — UpdatePDF",
  };
}

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) redirect("/templates");

  const Icon = ICON_MAP[template.icon] ?? FileSpreadsheet;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: TEMPLATES_GRADIENT }}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
          <p className="text-sm text-slate-500">{template.description}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {template.credits} credit{template.credits !== 1 ? "s" : ""}
          </span>
          {template.isAiAssisted && (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              AI Enhanced
            </span>
          )}
        </div>
      </div>

      <TemplateEditor template={template} />
    </div>
  );
}
