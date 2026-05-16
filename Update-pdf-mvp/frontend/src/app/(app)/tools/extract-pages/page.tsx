import type { Metadata } from "next";
import { FileOutput } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { ExtractPagesTool } from "./_components/extract-pages-tool";

export const metadata: Metadata = {
  title: "Extract PDF Pages — UpdatePDF",
};

export default function ExtractPagesPage() {
  return (
    <ToolPageShell
      name="Extract Pages"
      description="Pull selected pages out of a PDF into a brand-new document."
      icon={FileOutput}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <ExtractPagesTool />
    </ToolPageShell>
  );
}
