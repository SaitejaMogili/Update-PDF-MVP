import Link from "next/link";

import { collections, pricingPlans } from "./data";
import { ArrowRightIcon, CheckIcon, GridIcon, SparklesIcon } from "./icons";
import { Reveal } from "./reveal";
import { Brand, Button, GradientText, SectionHeader, containerClass, narrowContainerClass } from "./ui";

export function Breadcrumb() {
  return (
    <div className={containerClass}>
      <nav className="flex flex-wrap items-center gap-2 pt-6 text-[13px] text-[#475569]">
        <Link className="transition-colors hover:text-[#059669]" href="/">
          Home
        </Link>
        <span className="text-[#94A3B8]">›</span>
        <span className="font-medium text-[#0F172A]">Document Studio</span>
      </nav>
    </div>
  );
}

export function StudioHero() {
  return (
    <section className="px-0 py-[56px] pb-[72px] text-center">
      <div className={narrowContainerClass}>
        <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3.5 py-[5px] font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[#047857]">
          <GridIcon className="h-3 w-3 text-[#059669]" />
          Document Studio · 100+ Templates
        </span>
        <h1 className="mb-[22px] font-[var(--font-display)] text-[clamp(44px,6vw,72px)] font-bold leading-[1.05] tracking-[-0.035em] text-[#0F172A]">
          Pick a template.
          <br />
          Or just <GradientText>describe one.</GradientText>
        </h1>
        <p className="mx-auto mb-8 max-w-[620px] text-[19px] leading-[1.5] text-[#475569]">
          Designer-grade templates for every business document — invoices, resumes, contracts, planners, pitch decks,
          and more. Or type a prompt and let AI design, write, and brand the entire thing in 30 seconds.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button href="#ai-generator" variant="emerald" size="lg" arrow>
            Try AI Generator
          </Button>
          <Button href="#templates" variant="outline" size="lg">
            Browse 100+ templates
          </Button>
        </div>
      </div>
    </section>
  );
}

export function CollectionsSection() {
  return (
    <section className="bg-[#F8FAFC] py-20">
      <div className={containerClass}>
        <SectionHeader
          eyebrow="Curated bundles"
          title={
            <>
              Or grab a <GradientText>whole bundle.</GradientText>
            </>
          }
          subtitle="Hand-picked template stacks for the role you're stepping into. One click, every doc you need."
        />
        <Reveal stagger className="grid gap-4 md:grid-cols-3">
          {collections.map((collection) => (
            <Link
              href="#"
              key={collection.title}
              className="group flex flex-col gap-3.5 overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#059669] hover:shadow-[0_8px_28px_-8px_rgba(15,23,42,.10),0_2px_6px_rgba(15,23,42,.04)]"
            >
              <div className={`relative grid h-11 w-11 place-items-center overflow-hidden rounded-[11px] bg-gradient-to-br ${collection.tone} text-white shadow-[0_6px_16px_-4px_rgba(37,99,235,.3)]`}>
                <SparklesIcon className="relative z-10 h-[22px] w-[22px] drop-shadow" />
                <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
              <h3 className="font-[var(--font-display)] text-lg font-bold tracking-[-0.01em] text-[#0F172A]">
                {collection.title}
              </h3>
              <p className="text-sm leading-[1.5] text-[#475569]">{collection.description}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {collection.items.map((item) => (
                  <span key={item} className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-[9px] py-[3px] text-[11px] font-medium text-[#1E293B]">
                    {item}
                  </span>
                ))}
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[13.5px] font-semibold text-[#059669] transition-all group-hover:gap-2.5">
                Open the pack <ArrowRightIcon className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function PricingTeaser() {
  return (
    <section className="py-20 pb-[100px]" id="pricing">
      <div className={containerClass}>
        <SectionHeader
          eyebrow="Studio pricing"
          title={
            <>
              Free templates for everyone.
              <br />
              <GradientText>Premium for pros.</GradientText>
            </>
          }
          subtitle="Studio pricing folds into your UpdatePDF plan. No separate subscription, no per-template fees, no surprise charges."
        />
        <Reveal stagger className="grid gap-4 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.tier}
              className={[
                "relative flex flex-col gap-4 rounded-[20px] border bg-white p-8 transition-all duration-300",
                plan.featured ? "border-[#059669] shadow-[0_12px_32px_-10px_rgba(5,150,105,.20)]" : "border-[#E2E8F0]",
              ].join(" ")}
            >
              {plan.featured ? (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#059669] px-3 py-1 font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                  Most Popular
                </div>
              ) : null}
              <div className="font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.1em] text-[#475569]">
                {plan.tier}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-[var(--font-display)] text-[42px] font-bold tracking-[-0.025em] text-[#0F172A]">
                  {plan.price}
                </span>
                <span className="text-[13px] text-[#475569]">{plan.unit}</span>
              </div>
              <h4 className="font-[var(--font-display)] text-[17px] font-semibold text-[#0F172A]">{plan.title}</h4>
              <ul className="mt-2 grid gap-[9px]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#1E293B]">
                    <CheckIcon className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-[#059669]" />
                    {feature}
                  </li>
                ))}
                {plan.muted.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <span className="mt-0.5 text-base leading-none">×</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button href="#" variant={plan.featured ? "emerald" : "outline"} className="mt-auto justify-center">
                {plan.cta}
              </Button>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="px-0 py-20 pb-[100px] text-center">
      <div className={containerClass}>
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] px-8 py-16 text-white before:absolute before:-right-36 before:-top-36 before:h-[500px] before:w-[500px] before:rounded-full before:bg-emerald-500/40 before:blur-3xl after:absolute after:-bottom-36 after:-left-36 after:h-[500px] after:w-[500px] after:rounded-full after:bg-blue-500/30 after:blur-3xl">
          <div className="relative z-10">
            <h2 className="mb-3.5 font-[var(--font-display)] text-[clamp(30px,4vw,44px)] font-bold leading-[1.05] tracking-[-0.025em]">
              Stop staring at blank pages.
              <br />
              <span className="bg-gradient-to-br from-[#6EE7B7] to-[#93C5FD] bg-clip-text text-transparent">
                Start with a template.
              </span>
            </h2>
            <p className="mx-auto mb-7 max-w-[480px] text-base text-white/65">
              Pick from 100+ designer-grade templates. Or describe what you need and let AI design it. Free to try, no card needed.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button href="#" variant="emerald" size="lg" arrow>
                Start Free
              </Button>
              <Button href="/" variant="outline" size="lg" className="border-white/20 bg-transparent text-white hover:border-white hover:bg-white/5 hover:text-white">
                See all 80+ tools
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const columns = [
    { title: "Studio", links: ["Browse all 100+", "AI Generator", "Brand Kits", "Bundles"] },
    { title: "Categories", links: ["Business", "HR & Recruitment", "Finance", "Productivity"] },
    { title: "Tools", links: ["Cheque Printing", "Document Brain", "Chat with PDF", "All 80+ tools"] },
    { title: "Company", links: ["About", "Pricing", "Security", "Contact"] },
  ];

  return (
    <footer className="border-t border-[#E2E8F0] bg-[#F8FAFC] py-12 pb-8">
      <div className={containerClass}>
        <div className="mb-10 grid gap-8 md:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-10">
          <div className="max-w-[280px]">
            <div className="mb-3.5">
              <Brand />
            </div>
            <p className="text-[13.5px] leading-[1.55] text-[#475569]">
              The AI document workspace for modern professionals. Built by WestHive.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-4 font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.12em] text-[#475569]">
                {column.title}
              </h4>
              <ul className="grid gap-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-[13.5px] text-[#1E293B] transition-colors hover:text-[#059669]">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E2E8F0] pt-7 text-[12.5px] text-[#475569]">
          <div>© 2026 WestHive LLC · UpdatePDF · All rights reserved · Terms · Privacy</div>
          <div>Made for teams that ship.</div>
        </div>
      </div>
    </footer>
  );
}
