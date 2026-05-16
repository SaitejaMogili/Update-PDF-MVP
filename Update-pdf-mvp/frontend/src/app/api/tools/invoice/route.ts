import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { generateInvoicePdf } from "@/lib/tools/invoice";

const CREDIT_COST = 1;

const lineItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().positive().max(99_999),
  unitPriceCents: z.number().int().min(0).max(999_999_999),
});

const bodySchema = z.object({
  invoiceNumber: z.string().min(1).max(50),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fromName: z.string().min(1).max(120),
  fromAddress: z.string().max(200).optional(),
  fromEmail: z.string().max(120).optional(),
  fromPhone: z.string().max(30).optional(),
  toName: z.string().min(1).max(120),
  toAddress: z.string().max(200).optional(),
  toEmail: z.string().max(120).optional(),
  lineItems: z.array(lineItemSchema).min(1).max(50),
  taxRateBps: z.number().int().min(0).max(10_000),
  notes: z.string().max(500).optional(),
  currency: z.string().length(3).default("USD"),
  logoBase64: z.string().max(500_000).optional(),
  logoMimeType: z.enum(["image/png", "image/jpeg"]).optional(),
  // If generating from an existing draft, pass the draft ID to update it
  invoiceId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const params = parsed.data;
  const service = createServiceClient();

  const subtotalCents = params.lineItems.reduce(
    (s, i) => s + Math.round(i.quantity * i.unitPriceCents), 0
  );
  const taxCents = Math.round(subtotalCents * params.taxRateBps / 10_000);
  const totalCents = subtotalCents + taxCents;

  const debit = await debitCredits(user.id, CREDIT_COST, "invoice");
  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" },
      { status: 402 }
    );
  }

  try {
    const pdfBuffer = await generateInvoicePdf(params);

    const outputPath = `${user.id}/invoice-${Date.now()}.pdf`;
    const { error: uploadErr } = await service.storage
      .from("outputs")
      .upload(outputPath, pdfBuffer, { contentType: "application/pdf", upsert: false });
    if (uploadErr) throw new Error("Failed to upload invoice");

    const filename = `invoice-${params.invoiceNumber}-${params.invoiceDate}.pdf`;

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

    // Upsert into invoices table for history tracking
    const invoiceRow = {
      user_id: user.id,
      status: "generated",
      invoice_number: params.invoiceNumber,
      invoice_date: params.invoiceDate,
      due_date: params.dueDate ?? null,
      from_name: params.fromName,
      from_address: params.fromAddress ?? null,
      from_email: params.fromEmail ?? null,
      from_phone: params.fromPhone ?? null,
      to_name: params.toName,
      to_address: params.toAddress ?? null,
      to_email: params.toEmail ?? null,
      line_items: params.lineItems,
      tax_rate_bps: params.taxRateBps,
      notes: params.notes ?? null,
      currency: params.currency,
      logo_base64: params.logoBase64 ?? null,
      logo_mime_type: params.logoMimeType ?? null,
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      total_cents: totalCents,
      output_file_id: outputFile?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoicesTable = service.from("invoices" as never) as any;
    if (params.invoiceId) {
      await invoicesTable.update(invoiceRow).eq("id", params.invoiceId).eq("user_id", user.id);
    } else {
      await invoicesTable.insert(invoiceRow);
    }

    const { data: signed } = await service.storage
      .from("outputs")
      .createSignedUrl(outputPath, 3600);

    return NextResponse.json({ status: "done", downloadUrl: signed?.signedUrl ?? null, filename });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, "invoice_failed");
    console.error("[invoice]", err);
    return NextResponse.json({ error: "Invoice generation failed" }, { status: 500 });
  }
}
