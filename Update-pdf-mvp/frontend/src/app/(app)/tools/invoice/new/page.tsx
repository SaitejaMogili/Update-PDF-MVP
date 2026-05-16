import type { Metadata } from "next";
import { FileSpreadsheet } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { InvoiceForm } from "../_components/invoice-form";

export const metadata: Metadata = {
  title: "New Invoice — UpdatePDF",
};

const FIN_GRADIENT = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";

export default function NewInvoicePage() {
  return (
    <ToolPageShell
      name="New Invoice"
      description="Fill in the details below to create a professional PDF invoice."
      icon={FileSpreadsheet}
      gradient={FIN_GRADIENT}
      creditCost={1}
    >
      <InvoiceForm />
    </ToolPageShell>
  );
}
