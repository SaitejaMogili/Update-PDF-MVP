import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { debitCredits, refundCredits } from "@/lib/credits";
import { getTemplate } from "@/lib/templates/registry";
import { renderTemplate } from "@/lib/templates/renderer";

const bodySchema = z.object({
  values: z.record(z.string(), z.unknown()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Resolve template
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // 3. Parse body
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { values } = parsed.data;

  // 4. Basic required field validation
  const missingFields: string[] = [];
  for (const field of template.fields) {
    if (!field.required) continue;
    const val = values[field.key];
    if (field.type === "array") {
      if (!Array.isArray(val) || val.length === 0) {
        missingFields.push(field.label);
      }
    } else if (val === undefined || val === null || val === "") {
      missingFields.push(field.label);
    }
  }
  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missingFields.join(", ")}` },
      { status: 400 }
    );
  }

  // 5. Debit credits
  const debit = await debitCredits(
    user.id,
    template.credits,
    `template-${slug}`
  );
  if (!debit.ok) {
    return NextResponse.json(
      {
        error:
          debit.error === "insufficient_credits"
            ? "Insufficient credits"
            : "Credit error",
      },
      { status: 402 }
    );
  }

  const service = createServiceClient();

  try {
    // 6. Render PDF
    const pdfBuffer = await renderTemplate(template, values);

    // 7. Upload to outputs bucket
    const outputPath = `${user.id}/template-${slug}-${Date.now()}.pdf`;
    const { error: uploadErr } = await service.storage
      .from("outputs")
      .upload(outputPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const filename = `${template.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;

    // 8. Insert into files table (expires in 1 hour)
    await service.from("files").insert({
      user_id: user.id,
      filename,
      size_bytes: pdfBuffer.byteLength,
      mime_type: "application/pdf",
      storage_path: outputPath,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    // 9. Insert tool_job record
    await service.from("tool_jobs").insert({
      user_id: user.id,
      tool_slug: `template-${slug}`,
      status: "done",
      credits_charged: template.credits,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    // 10. Create signed URL
    const { data: signed } = await service.storage
      .from("outputs")
      .createSignedUrl(outputPath, 3600);

    return NextResponse.json({
      downloadUrl: signed?.signedUrl ?? null,
      filename,
    });
  } catch (err) {
    await refundCredits(user.id, template.credits, `template-${slug}-failed`);
    console.error(`[template-${slug}]`, err);
    return NextResponse.json(
      { error: "Template generation failed" },
      { status: 500 }
    );
  }
}
