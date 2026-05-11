import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { AIGeneratorCard } from "@/components/marketing/templates/ai-generator-card";
import { MarketingNav } from "@/components/marketing/templates/marketing-nav";
import {
  Breadcrumb,
  CollectionsSection,
  FinalCTA,
  Footer,
  PricingTeaser,
  StudioHero,
} from "@/components/marketing/templates/page-sections";
import { TemplateBrowser } from "@/components/marketing/templates/template-browser";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

const uiFont = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Document Studio — 100+ AI Templates | UpdatePDF",
  description:
    "Document Studio — 100+ AI templates for invoices, resumes, contracts, planners and more. Or describe what you need and AI generates it. By UpdatePDF.",
};

export default function TemplatesPage() {
  return (
    <main
      className={`${displayFont.variable} ${uiFont.variable} ${monoFont.variable} relative min-h-screen overflow-x-hidden bg-white font-[var(--font-ui)] text-[#0F172A] antialiased before:pointer-events-none before:fixed before:-right-[150px] before:-top-[200px] before:z-0 before:h-[600px] before:w-[600px] before:rounded-full before:bg-emerald-500/10 before:blur-3xl after:pointer-events-none after:fixed after:-left-[200px] after:top-1/2 after:z-0 after:h-[500px] after:w-[500px] after:rounded-full after:bg-blue-500/10 after:blur-3xl`}
    >
      <div className="relative z-10">
        <MarketingNav />
        <Breadcrumb />
        <StudioHero />
        <AIGeneratorCard />
        <TemplateBrowser />
        <CollectionsSection />
        <PricingTeaser />
        <FinalCTA />
        <Footer />
      </div>
    </main>
  );
}
