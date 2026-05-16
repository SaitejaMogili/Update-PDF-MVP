import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { ChequeTool } from "./_components/cheque-tool";

export const metadata: Metadata = {
  title: "Cheque Printing — UpdatePDF",
};

const FIN_GRADIENT = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";

export default function ChequePage() {
  return (
    <ToolPageShell
      name="Cheque Printing"
      description="Generate print-ready cheque PDFs with live preview. Fill in payee, amount, bank details, and optional digital signature."
      icon={Landmark}
      gradient={FIN_GRADIENT}
      creditCost={1}
    >
      <ChequeTool />
    </ToolPageShell>
  );
}
