import type { Metadata } from "next";
import { Minimize2 } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { CompressTool } from "./_components/compress-tool";

export const metadata: Metadata = {
  title: "Compress PDF — UpdatePDF",
};

export default function CompressPage() {
  return (
    <ToolPageShell
      name="Compress PDF"
      description="Reduce PDF file size by removing redundant data and optimising structure."
      icon={Minimize2}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <CompressTool />
    </ToolPageShell>
  );
}
