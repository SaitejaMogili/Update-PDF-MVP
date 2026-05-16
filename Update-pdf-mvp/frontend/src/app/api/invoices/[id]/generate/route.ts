import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { generateInvoicePdf } from "@/lib/tools/invoice";
import type { LineItem } from "@/lib/tools/invoice";

const CREDIT_COST = 1;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // Load invoice and verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inv, error: fetchErr } = await (service.from("invoices" as never) as any)
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Debit 1 credit
  const debit = await debitCredits(user.id, CREDIT_COST, "invoice");
  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" },
      { status: 402 }
    );
  }

  try {
    // Build InvoiceParams from stored invoice row
    const pdfParams = {
      invoiceNumber: inv.invoice_number as string,
      invoiceDate: inv.invoice_date as string,
      dueDate: inv.due_date as string | undefined,
      fromName: inv.from_name as string,
      fromAddress: inv.from_address as string | undefined,
      fromEmail: inv.from_email as string | undefined,
      fromPhone: inv.from_phone as string | undefined,
      toName: inv.to_name as string,
      toAddress: inv.to_address as string | undefined,
      toEmail: inv.to_email as string | undefined,
      lineItems: inv.line_items as LineItem[],
      taxRateBps: inv.tax_rate_bps as number,
      notes: inv.notes as string | undefined,
      currency: inv.currency as string,
      logoBase64: inv.logo_base64 as string | undefined,
      logoMimeType: inv.logo_mime_type as "image/png" | "image/jpeg" | undefined,
    };

    const pdfBuffer = await generateInvoicePdf(pdfParams);

    const outputPath = `${user.id}/invoice-${Date.now()}.pdf`;
    const { error: uploadErr } = await service.storage
      .from("outputs")
      .upload(outputPath, pdfBuffer, { contentType: "application/pdf", upsert: false });
    if (uploadErr) throw new Error("Failed to upload invoice PDF");

    const filename = `invoice-${inv.invoice_number}-${inv.invoice_date}.pdf`;

    const { data: outputFile } = await service
      .from("files")
      .insert({
        user_id: user.id,
        filename,
        size_bytes: pdfBuffer.byteLength,
        mime_type: "application/pdf",
        storage_path: outputPath,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    // Record in tool_jobs for audit
    await service.from("tool_jobs").insert({
      user_id: user.id,
      tool_slug: "invoice",
      output_file_id: outputFile?.id ?? null,
      status: "done",
      credits_charged: CREDIT_COST,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    // Update invoice: status = 'generated', output_file_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service.from("invoices" as never) as any)
      .update({
        status: "generated",
        output_file_id: outputFile?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    const { data: signed } = await service.storage
      .from("outputs")
      .createSignedUrl(outputPath, 3600);

    return NextResponse.json({ downloadUrl: signed?.signedUrl ?? null, filename });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, "invoice_failed");
    console.error("[invoices/generate]", err);
    return NextResponse.json({ error: "Invoice generation failed" }, { status: 500 });
  }
}
