import type { Metadata } from "next";
import { Merge } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { MergeTool } from "./_components/merge-tool";

export const metadata: Metadata = {
  title: "Merge PDF — UpdatePDF",
};

export default function MergePage() {
  return (
    <ToolPageShell
      name="Merge PDF"
      description="Combine multiple PDF files into one document. Drag to reorder, then merge."
      icon={Merge}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <MergeTool />
    </ToolPageShell>
  );
}
