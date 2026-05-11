"use client";

import { useEffect, useState } from "react";

import { CheckIcon, SparklesIcon } from "./icons";
import { Button, GradientText } from "./ui";

const prompts = [
  "Create a professional invoice for my recruitment company",
  "Generate a 12-month business plan for a kids book startup",
  "Draft a contract for a freelance designer in 3 milestones",
  "Build a daily planner with habit tracking and meal blocks",
  "Make a salary slip template for an Indian SaaS company",
];

export function AIGeneratorCard() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [length, setLength] = useState(0);

  useEffect(() => {
    const current = prompts[promptIndex];
    if (!current) return;

    if (length < current.length) {
      const timeout = window.setTimeout(() => setLength((value) => value + 1), 28);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => {
      setPromptIndex((value) => (value + 1) % prompts.length);
      setLength(0);
    }, 2400);
    return () => window.clearTimeout(timeout);
  }, [length, promptIndex]);

  const currentPrompt = prompts[promptIndex]?.slice(0, length) ?? "";

  return (
    <section className="mx-auto max-w-[1240px] px-6" id="ai-generator">
      <div className="relative mb-20 grid items-center gap-10 overflow-hidden rounded-[20px] border border-[#D1FAE5] bg-gradient-to-br from-white to-[#ECFDF5] p-7 before:absolute before:-right-24 before:-top-24 before:h-80 before:w-80 before:rounded-full before:bg-emerald-500/20 before:blur-3xl md:grid-cols-2 md:p-10">
        <div className="relative z-10">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-[#059669] px-2.5 py-1 font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
            <SparklesIcon className="h-[11px] w-[11px]" />
            AI Template Generator
          </span>
          <h2 className="mb-3.5 font-[var(--font-display)] text-[clamp(28px,3.5vw,38px)] font-bold leading-[1.12] tracking-[-0.025em] text-[#0F172A]">
            Don&apos;t see what you need? <GradientText>Just describe it.</GradientText>
          </h2>
          <p className="mb-[22px] text-base leading-[1.55] text-[#475569]">
            Tell the AI what document you need. It picks the right layout, writes the content, applies your brand kit,
            and gives you an editable PDF in under 30 seconds. Costs 10 credits.
          </p>
          <ul className="mb-6 grid gap-[9px]">
            {[
              "Picks layout, fonts, and colors automatically",
              "Writes content from your prompt + brand kit",
              "Edit any field, regenerate any section",
              "Saves to your library, exports to PDF",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm font-medium text-[#1E293B]">
                <CheckIcon className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-[#059669]" />
                {item}
              </li>
            ))}
          </ul>
          <Button href="#" variant="emerald" arrow>
            Generate a template
          </Button>
        </div>

        <div className="relative z-10 overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white shadow-[0_8px_28px_-8px_rgba(15,23,42,.10),0_2px_6px_rgba(15,23,42,.04)]">
          <div className="flex items-center gap-2 border-b border-[#EEF2F7] bg-[#F8FAFC] px-[18px] py-3 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[#475569] before:h-2 before:w-2 before:animate-ping before:rounded-full before:bg-[#059669]">
            Prompt · Live
          </div>
          <div className="p-[22px]">
            <div className="min-h-14 text-[15px] leading-[1.5] text-[#0F172A]">
              &quot;{currentPrompt}
              <span className="ml-0.5 inline-block h-[17px] w-0.5 animate-pulse bg-[#059669] align-[-3px]" />
            </div>
            <div className="mt-[18px] flex items-center gap-3 border-t border-dashed border-[#E2E8F0] pt-[18px] text-[13px] text-[#475569]">
              <div className="grid h-10 w-8 flex-shrink-0 place-items-center rounded border border-[#D1FAE5] bg-[#ECFDF5] font-[var(--font-mono)] text-[9px] font-bold text-[#059669]">
                PDF
              </div>
              <div>
                <strong className="font-semibold text-[#047857]">Generated</strong> · Invoice template applied
                <br />
                <span className="text-[#94A3B8]">Brand colors, line items, totals, signature block</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
