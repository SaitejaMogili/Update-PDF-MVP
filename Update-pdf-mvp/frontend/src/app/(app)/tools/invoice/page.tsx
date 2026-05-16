import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { ToolPageShell } from "@/components/tool/tool-page-shell";
import { InvoiceList } from "./_components/invoice-list";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Invoice Generator — UpdatePDF",
};

const FIN_GRADIENT = "linear-gradient(135deg, #DC2626 0%, #F87171 100%)";

export default async function InvoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoices } = await (service.from("invoices" as never) as any)
    .select("id, status, invoice_number, invoice_date, due_date, to_name, currency, total_cents, created_at, updated_at, output_file_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <ToolPageShell
      name="Invoice Generator"
      description="Create professional PDF invoices with line items, tax, and custom branding."
      icon={FileSpreadsheet}
      gradient={FIN_GRADIENT}
      creditCost={1}
    >
      <div className="space-y-5 max-w-3xl">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {invoices?.length ? `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}` : "No invoices yet"}
          </p>
          <Link href="/tools/invoice/new">
            <Button className="gap-2 text-white" style={{ background: FIN_GRADIENT }}>
              <Plus className="h-4 w-4" /> New invoice
            </Button>
          </Link>
        </div>

        <InvoiceList invoices={invoices ?? []} />
      </div>
    </ToolPageShell>
  );
}
