import type { Metadata } from "next";
import { Images } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { JpgToPdfTool } from "./_components/jpg-to-pdf-tool";

export const metadata: Metadata = {
  title: "JPG to PDF — UpdatePDF",
};

export default function JpgToPdfPage() {
  return (
    <ToolPageShell
      name="JPG to PDF"
      description="Combine JPG, PNG, or WebP images into a single PDF — one image per page."
      icon={Images}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <JpgToPdfTool />
    </ToolPageShell>
  );
}
