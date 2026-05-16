import type { Metadata } from "next";
import { Hash } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { PageNumbersTool } from "./_components/page-numbers-tool";

export const metadata: Metadata = {
  title: "Add Page Numbers — UpdatePDF",
};

export default function PageNumbersPage() {
  return (
    <ToolPageShell
      name="Add Page Numbers"
      description="Insert page numbers in the header or footer, with custom alignment and prefix."
      icon={Hash}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <PageNumbersTool />
    </ToolPageShell>
  );
}
