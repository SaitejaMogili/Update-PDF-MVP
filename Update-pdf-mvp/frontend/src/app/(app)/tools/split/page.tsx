import type { Metadata } from "next";
import { Scissors } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { SplitTool } from "./_components/split-tool";

export const metadata: Metadata = {
  title: "Split PDF — UpdatePDF",
};

export default function SplitPage() {
  return (
    <ToolPageShell
      name="Split PDF"
      description="Extract specific pages or ranges from a PDF into a new document."
      icon={Scissors}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <SplitTool />
    </ToolPageShell>
  );
}
