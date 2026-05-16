import type { Metadata } from "next";
import { RotateCw } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { RotateTool } from "./_components/rotate-tool";

export const metadata: Metadata = {
  title: "Rotate PDF — UpdatePDF",
};

export default function RotatePage() {
  return (
    <ToolPageShell
      name="Rotate PDF"
      description="Rotate every page or specific pages by 90°, 180°, or 270°."
      icon={RotateCw}
      gradient="linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)"
      creditCost={1}
    >
      <RotateTool />
    </ToolPageShell>
  );
}
