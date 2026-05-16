import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { SummarizeTool } from "./_components/summarize-tool";

export const metadata: Metadata = {
  title: "Summarize PDF — UpdatePDF",
};

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

export default function SummarizePage() {
  return (
    <ToolPageShell
      name="Summarize PDF"
      description="Get an AI-generated summary, key points, and document type analysis in seconds."
      icon={Sparkles}
      gradient={AI_GRADIENT}
      creditCost={3}
    >
      <SummarizeTool />
    </ToolPageShell>
  );
}
