"use client";

import { useState } from "react";
import Link from "next/link";
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
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { TemplateDefinition } from "@/lib/templates/registry";

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

const CATEGORY_COLORS: Record<string, string> = {
  business: "bg-blue-50 text-blue-700",
  hr: "bg-violet-50 text-violet-700",
  finance: "bg-red-50 text-red-700",
  productivity: "bg-emerald-50 text-emerald-700",
  personal: "bg-amber-50 text-amber-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  business: "Business",
  hr: "HR",
  finance: "Finance",
  productivity: "Productivity",
  personal: "Personal",
};

type Category = "all" | "business" | "hr" | "finance" | "productivity" | "personal";

interface Props {
  templates: TemplateDefinition[];
}

export function TemplateCatalog({ templates }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");

  const filtered =
    selectedCategory === "all"
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  const categories: Category[] = ["all", "business", "hr", "finance", "productivity", "personal"];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Templates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill in your details and download a professional PDF in seconds.
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: TEMPLATES_GRADIENT }}
        >
          <LayoutGrid className="h-5 w-5" />
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-slate-400">No templates in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const Icon = ICON_MAP[template.icon] ?? FileSpreadsheet;
            return (
              <div
                key={template.slug}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Card header */}
                <div className="mb-4 flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: TEMPLATES_GRADIENT }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {template.name}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      CATEGORY_COLORS[template.category] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {template.category}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {template.credits} credit{template.credits !== 1 ? "s" : ""}
                  </span>
                  {template.isAiAssisted && (
                    <span className="flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                      <Sparkles className="h-3 w-3" />
                      AI Enhanced
                    </span>
                  )}
                  {template.tier === "pro" && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      Pro
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-auto">
                  <Link
                    href={`/templates/${template.slug}`}
                    className="block w-full rounded-lg py-2 text-center text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition-colors hover:bg-emerald-50"
                  >
                    Use Template
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
