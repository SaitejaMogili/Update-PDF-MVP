import Link from "next/link";

import type { templates } from "./data";

type Template = (typeof templates)[number];

const tagStyles: Record<string, string> = {
  Free: "bg-[#ECFDF5] text-[#047857]",
  AI: "bg-[#F5F3FF] text-[#6D28D9]",
  Pro: "bg-[#EFF6FF] text-[#1D4ED8]",
  Popular: "bg-red-50 text-[#DC2626]",
};

export function TemplateCard({ template }: { template: Template }) {
  return (
    <Link
      href={template.title === "Invoice Generator" ? "/templates/invoice-generator" : "#"}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#059669] hover:shadow-[0_8px_28px_-8px_rgba(15,23,42,.10),0_2px_6px_rgba(15,23,42,.04)]"
    >
      <div className="relative grid h-[200px] place-items-center overflow-hidden border-b border-[#EEF2F7] bg-[#F8FAFC] after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-br after:from-emerald-500/5 after:to-transparent group-hover:after:from-emerald-500/10">
        <DocumentPreview accent={template.accent} variant={template.category} />
      </div>
      <div className="flex flex-1 flex-col gap-[5px] p-[16px_18px_18px]">
        <div className="mb-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.06em] text-[#475569]">
          {template.label}
        </div>
        <div className="font-[var(--font-display)] text-[15.5px] font-semibold tracking-[-0.005em] text-[#0F172A]">
          {template.title}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 rounded-full px-[7px] py-0.5 font-[var(--font-mono)] text-[9.5px] font-medium uppercase tracking-[0.06em] ${tagStyles[tag]}`}
            >
              {tag === "Popular" ? "★ Popular" : tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function DocumentPreview({ accent, variant }: { accent: string; variant: Template["category"] }) {
  const isGrid = variant === "productivity";
  const isCheque = variant === "finance";

  return (
    <svg className="block max-h-[84%] max-w-[78%]" viewBox="0 0 100 130" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="88" height="118" rx="4" fill="white" stroke="#E2E8F0" />
      <rect x="14" y="16" width="46" height="5" rx="1.5" fill={variant === "hr" ? "#0F172A" : accent} />
      <rect x="14" y="28" width="32" height="2.5" rx="1" fill="#94A3B8" />
      {isGrid ? (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x="14" y={38 + i * 10} width="72" height="6" rx="1" fill={i === 2 ? "#DBEAFE" : "#F8FAFC"} stroke={i === 2 ? accent : "#E2E8F0"} />
          ))}
        </>
      ) : isCheque ? (
        <>
          <rect x="12" y="54" width="76" height="38" rx="2" fill="white" stroke={accent} />
          <rect x="18" y="64" width="36" height="3" rx="1" fill="#0F172A" />
          <rect x="18" y="73" width="52" height="2" rx="1" fill="#94A3B8" />
          <rect x="62" y="62" width="20" height="8" rx="1" fill="#FEE2E2" />
          <line x1="14" y1="86" x2="86" y2="86" stroke="#0F172A" strokeWidth="0.4" />
        </>
      ) : (
        <>
          <rect x="14" y="44" width="72" height="2" rx="1" fill="#E2E8F0" />
          <rect x="14" y="51" width="62" height="2" rx="1" fill="#E2E8F0" />
          <rect x="14" y="66" width="20" height="2.5" rx="1" fill={accent} />
          <rect x="14" y="76" width="72" height="1.5" rx="0.7" fill="#E2E8F0" />
          <rect x="14" y="83" width="72" height="1.5" rx="0.7" fill="#E2E8F0" />
          <rect x="14" y="90" width="56" height="1.5" rx="0.7" fill="#E2E8F0" />
          <rect x="62" y="106" width="24" height="9" rx="1.5" fill="#DBEAFE" />
        </>
      )}
    </svg>
  );
}
