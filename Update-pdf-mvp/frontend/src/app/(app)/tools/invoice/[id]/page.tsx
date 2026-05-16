import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { InvoiceForm, type InvoiceData } from "../_components/invoice-form";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Edit Invoice — UpdatePDF",
};

const FIN_GRADIENT = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";

type Params = { params: Promise<{ id: string }> };

export default async function EditInvoicePage({ params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inv, error } = await (service.from("invoices" as never) as any)
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !inv) {
    redirect("/tools/invoice");
  }

  const initialData: InvoiceData = {
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    dueDate: inv.due_date ?? undefined,
    fromName: inv.from_name,
    fromAddress: inv.from_address ?? undefined,
    fromEmail: inv.from_email ?? undefined,
    fromPhone: inv.from_phone ?? undefined,
    toName: inv.to_name,
    toAddress: inv.to_address ?? undefined,
    toEmail: inv.to_email ?? undefined,
    lineItems: inv.line_items ?? [],
    taxRateBps: inv.tax_rate_bps ?? 0,
    notes: inv.notes ?? undefined,
    currency: inv.currency ?? "USD",
    logoBase64: inv.logo_base64 ?? undefined,
    logoMimeType: inv.logo_mime_type ?? undefined,
  };

  return (
    <ToolPageShell
      name={`Invoice ${inv.invoice_number}`}
      description="Edit invoice details and regenerate the PDF."
      icon={FileSpreadsheet}
      gradient={FIN_GRADIENT}
      creditCost={1}
    >
      <InvoiceForm initialData={initialData} invoiceId={id} />
    </ToolPageShell>
  );
}
