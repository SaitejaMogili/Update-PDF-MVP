import type { Metadata } from "next";
import { Languages } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { TranslateTool } from "./_components/translate-tool";

export const metadata: Metadata = {
  title: "Translate PDF — UpdatePDF",
};

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

export default function TranslatePage() {
  return (
    <ToolPageShell
      name="Translate PDF"
      description="Translate your PDF into 18 languages while preserving document structure."
      icon={Languages}
      gradient={AI_GRADIENT}
      creditCost={5}
    >
      <TranslateTool />
    </ToolPageShell>
  );
}
