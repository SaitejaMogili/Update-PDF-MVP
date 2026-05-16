import type { Metadata } from "next";
import { Droplet } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { WatermarkTool } from "./_components/watermark-tool";

export const metadata: Metadata = {
  title: "Watermark PDF — UpdatePDF",
};

export default function WatermarkPage() {
  return (
    <ToolPageShell
      name="Watermark PDF"
      description="Stamp a diagonal text watermark across every page — confidential, draft, paid, etc."
      icon={Droplet}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <WatermarkTool />
    </ToolPageShell>
  );
}
