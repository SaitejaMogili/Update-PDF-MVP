import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const lineItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().positive().max(99_999),
  unitPriceCents: z.number().int().min(0).max(999_999_999),
});

const invoiceBodySchema = z.object({
  action: z.literal("draft"),
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
});

/** GET /api/invoices — list invoices for the current user (max 50) */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 50);

  const service = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service.from("invoices" as never) as any)
    .select("id, status, invoice_number, invoice_date, due_date, to_name, currency, total_cents, created_at, updated_at, output_file_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[invoices GET]", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }

  return NextResponse.json({ invoices: data ?? [] });
}

/** POST /api/invoices — save a draft invoice (no credit charge) */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = invoiceBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const subtotalCents = p.lineItems.reduce(
    (s, i) => s + Math.round(i.quantity * i.unitPriceCents), 0
  );
  const taxCents = Math.round(subtotalCents * p.taxRateBps / 10_000);
  const totalCents = subtotalCents + taxCents;

  const service = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service.from("invoices" as never) as any)
    .insert({
      user_id: user.id,
      status: "draft",
      invoice_number: p.invoiceNumber,
      invoice_date: p.invoiceDate,
      due_date: p.dueDate ?? null,
      from_name: p.fromName,
      from_address: p.fromAddress ?? null,
      from_email: p.fromEmail ?? null,
      from_phone: p.fromPhone ?? null,
      to_name: p.toName,
      to_address: p.toAddress ?? null,
      to_email: p.toEmail ?? null,
      line_items: p.lineItems,
      tax_rate_bps: p.taxRateBps,
      notes: p.notes ?? null,
      currency: p.currency,
      logo_base64: p.logoBase64 ?? null,
      logo_mime_type: p.logoMimeType ?? null,
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      total_cents: totalCents,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[invoices POST]", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
