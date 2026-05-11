"use client";

import { useMemo, useState } from "react";

import { categories, categoryTitles, templates, type TemplateCategory } from "./data";
import { SearchIcon } from "./icons";
import { TemplateCard } from "./template-card";

export function TemplateBrowser() {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const [query, setQuery] = useState("");

  const visibleTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesCategory = activeCategory === "all" || template.category === activeCategory;
      const matchesQuery =
        normalized.length === 0 ||
        template.title.toLowerCase().includes(normalized) ||
        template.label.toLowerCase().includes(normalized);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  const activeCount = categories.find((category) => category.id === activeCategory)?.count ?? templates.length;

  return (
    <>
      <div className="mx-auto mb-12 max-w-[720px] rounded-[20px] border border-[#E2E8F0] bg-white p-[14px_18px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_1px_rgba(15,23,42,.03)] transition-all focus-within:border-[#059669] focus-within:shadow-[0_0_0_4px_#D1FAE5,0_8px_28px_-8px_rgba(15,23,42,.10)]">
        <div className="flex items-center gap-3">
          <SearchIcon className="h-[18px] w-[18px] flex-shrink-0 text-[#475569]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
            placeholder="Search 100+ templates — try 'invoice', 'resume', 'meal plan'..."
            type="text"
          />
          <span className="hidden rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-[7px] py-[3px] font-[var(--font-mono)] text-[11px] font-medium text-[#475569] sm:inline-flex">
            ⌘ K
          </span>
        </div>
      </div>

      <section className="pb-20 pt-8" id="templates">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="mb-8 flex gap-1.5 overflow-x-auto rounded-xl bg-[#F1F5F9] p-[5px]">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={[
                    "flex flex-shrink-0 items-center gap-2 rounded-[9px] px-[18px] py-[11px] text-sm font-medium text-[#475569] transition-all hover:text-[#0F172A]",
                    isActive ? "bg-white font-semibold text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,.05)]" : "",
                  ].join(" ")}
                >
                  <span className={`relative grid h-[22px] w-[22px] place-items-center overflow-hidden rounded-md bg-gradient-to-br ${category.tone}`}>
                    <Icon className="relative z-10 h-[13px] w-[13px] text-white drop-shadow" />
                    <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                  </span>
                  {category.label}
                  <span
                    className={[
                      "rounded-full px-[7px] py-0.5 font-[var(--font-mono)] text-[11px] font-medium",
                      isActive ? "bg-[#D1FAE5] text-[#047857]" : "bg-[#E2E8F0] text-[#94A3B8]",
                    ].join(" ")}
                  >
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="font-[var(--font-display)] text-[22px] font-bold tracking-[-0.02em] text-[#0F172A]">
              {categoryTitles[activeCategory]}
            </div>
            <div className="font-[var(--font-mono)] text-xs tracking-[0.05em] text-[#475569]">
              SHOWING {visibleTemplates.length} OF {query ? visibleTemplates.length : activeCount}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {visibleTemplates.map((template) => (
              <TemplateCard key={template.title} template={template} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
