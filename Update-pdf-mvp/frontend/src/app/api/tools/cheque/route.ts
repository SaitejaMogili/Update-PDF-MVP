import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { generateChequePdf } from "@/lib/tools/cheque";

const CREDIT_COST = 1;

const bodySchema = z.object({
  payee: z.string().min(1).max(120),
  amountCents: z.number().int().min(1).max(99_999_999),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  chequeNumber: z.string().max(20).optional(),
  memo: z.string().max(80).optional(),
  bankName: z.string().max(80).optional(),
  bankAddress: z.string().max(120).optional(),
  routingNumber: z.string().max(20).optional(),
  accountNumber: z.string().max(20).optional(),
  signatureBase64: z.string().max(500_000).optional(), // ~375KB decoded
  signatureMimeType: z.enum(["image/png", "image/jpeg"]).optional(),
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

  const debit = await debitCredits(user.id, CREDIT_COST, "cheque");
  if (!debit.ok) {
    return NextResponse.json(
      { error: debit.error === "insufficient_credits" ? "Insufficient credits" : "Credit error" },
      { status: 402 }
    );
  }

  try {
    const pdfBuffer = await generateChequePdf(params);

    // Upload to outputs bucket
    const outputPath = `${user.id}/cheque-${Date.now()}.pdf`;
    const { error: uploadErr } = await service.storage
      .from("outputs")
      .upload(outputPath, pdfBuffer, { contentType: "application/pdf", upsert: false });
    if (uploadErr) throw new Error("Failed to upload cheque");

    const payeeSlug = params.payee.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
    const filename = `cheque-${payeeSlug}-${params.date}.pdf`;

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

    // Record in cheques table
    await service.from("cheques").insert({
      user_id: user.id,
      cheque_number: params.chequeNumber ?? null,
      payee: params.payee,
      amount_cents: params.amountCents,
      currency: "USD",
      memo: params.memo ?? null,
      bank_template: params.bankName ?? null,
      output_file_id: outputFile?.id ?? null,
    });

    const { data: signed } = await service.storage
      .from("outputs")
      .createSignedUrl(outputPath, 3600);

    return NextResponse.json({
      status: "done",
      downloadUrl: signed?.signedUrl ?? null,
      filename,
    });
  } catch (err) {
    await refundCredits(user.id, CREDIT_COST, "cheque_failed");
    console.error("[cheque]", err);
    return NextResponse.json({ error: "Cheque generation failed" }, { status: 500 });
  }
}
