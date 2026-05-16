import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { HealthScoreTool } from "./_components/health-score-tool";

export const metadata: Metadata = {
  title: "Document Health Score — UpdatePDF",
};

const AI_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)";

export default function HealthScorePage() {
  return (
    <ToolPageShell
      name="Document Health Score"
      description="AI audit for readability, structure, language quality, and completeness — with actionable improvement tips."
      icon={Activity}
      gradient={AI_GRADIENT}
      creditCost={5}
    >
      <HealthScoreTool />
    </ToolPageShell>
  );
}
