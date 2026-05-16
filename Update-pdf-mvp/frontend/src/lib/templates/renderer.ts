import "server-only";
import { PDFDocument, PDFPage, StandardFonts, rgb, grayscale, type PDFFont } from "pdf-lib";
import { generateInvoicePdf } from "@/lib/tools/invoice";
import { generateChequePdf } from "@/lib/tools/cheque";
import { openai } from "@/lib/openai";
import type { TemplateDefinition, TemplateField } from "./registry";

export type TemplateValues = Record<string, unknown>;

// ── Hex → pdf-lib rgb ────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

// ── wrapText ────────────────────────────────────────────────────
function wrapText(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

// ── Format date strings ──────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

// ── AI enhancement ───────────────────────────────────────────────
async function enhanceWithAI(
  template: TemplateDefinition,
  values: TemplateValues
): Promise<TemplateValues> {
  // Collect fields with "AI will..." hints
  const aiFields = template.fields.filter(
    (f) => f.hint && f.hint.toLowerCase().includes("ai will")
  );

  // Also collect subfield hints (e.g. resume experience description)
  const aiSubFields: Array<{ parentKey: string; field: TemplateField }> = [];
  for (const f of template.fields) {
    if (f.type === "array" && f.subFields) {
      for (const sf of f.subFields) {
        if (sf.hint && sf.hint.toLowerCase().includes("ai will")) {
          aiSubFields.push({ parentKey: f.key, field: sf });
        }
      }
    }
  }

  if (aiFields.length === 0 && aiSubFields.length === 0) return values;

  // Build relevant current values
  const relevant: Record<string, unknown> = {};
  for (const f of aiFields) {
    relevant[f.key] = values[f.key];
  }

  // For array sub-fields, include a summary
  for (const { parentKey, field } of aiSubFields) {
    const arr = values[parentKey];
    if (Array.isArray(arr)) {
      relevant[`${parentKey}_${field.key}_items`] = arr.map((item, i) => ({
        index: i,
        value: (item as Record<string, unknown>)[field.key],
      }));
    }
  }

  const fieldDescriptions = [
    ...aiFields.map((f) => `"${f.key}" (${f.hint})`),
    ...aiSubFields.map(({ parentKey, field }) => `"${parentKey}.${field.key}" (${field.hint})`),
  ].join(", ");

  const prompt = `You are a professional document writer. Enhance the following ${template.name} content.
Return a JSON object with ONLY these fields that need enhancement: ${fieldDescriptions}.
Make the language professional, concise, and impactful.
Keep facts and numbers unchanged. Only improve wording and structure.
For array item fields, return an array of enhanced strings in the same order.

Current values:
${JSON.stringify(relevant, null, 2)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional document writer. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const enhanced = JSON.parse(raw) as Record<string, unknown>;

    // Merge top-level fields
    const merged = { ...values };
    for (const f of aiFields) {
      if (enhanced[f.key] !== undefined) {
        merged[f.key] = enhanced[f.key];
      }
    }

    // Merge array sub-fields
    for (const { parentKey, field } of aiSubFields) {
      const enhancedArr = enhanced[`${parentKey}_${field.key}_items`];
      if (Array.isArray(enhancedArr)) {
        const origArr = Array.isArray(merged[parentKey]) ? (merged[parentKey] as Record<string, unknown>[]) : [];
        merged[parentKey] = origArr.map((item, i) => {
          const enhancedItem = enhancedArr[i];
          if (enhancedItem !== undefined) {
            return { ...item, [field.key]: typeof enhancedItem === "object" && enhancedItem !== null ? (enhancedItem as Record<string, unknown>).value : enhancedItem };
          }
          return item;
        });
      }
    }

    return merged;
  } catch {
    // On AI failure, return original values
    return values;
  }
}

// ── Page context for multi-page rendering ────────────────────────
interface PageCtx {
  pdfDoc: PDFDocument;
  page: PDFPage;
  y: number;
  W: number;
  H: number;
  M: number;
  reg: PDFFont;
  bold: PDFFont;
}

function newPage(ctx: PageCtx): PageCtx {
  const page = ctx.pdfDoc.addPage([ctx.W, ctx.H]);
  return { ...ctx, page, y: ctx.H - ctx.M };
}

function ensureSpace(ctx: PageCtx, needed: number): PageCtx {
  if (ctx.y - needed < ctx.M) return newPage(ctx);
  return ctx;
}

// ── Generic PDF builder ──────────────────────────────────────────
async function buildGenericPdf(
  template: TemplateDefinition,
  values: TemplateValues
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const W = 612;
  const H = 792;
  const M = 50;

  const reg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const accentRgb = hexToRgb(template.accentColor);
  const INK = rgb(0.05, 0.05, 0.1);
  const MUTED = grayscale(0.5);
  const LINE_COL = grayscale(0.82);
  const TEXT_W = W - M * 2;

  // ── Route to special layouts ───────────────────────────────────
  if (template.slug === "resume") {
    return buildResumePdf(pdfDoc, W, H, M, reg, bold, values, accentRgb, INK, MUTED, LINE_COL, TEXT_W);
  }
  if (template.slug === "salary-slip") {
    return buildSalarySlipPdf(pdfDoc, W, H, M, reg, bold, values, accentRgb, INK, MUTED, LINE_COL, TEXT_W);
  }
  if (template.slug === "content-calendar") {
    return buildContentCalendarPdf(pdfDoc, W, H, M, reg, bold, values, accentRgb, INK, MUTED, LINE_COL, TEXT_W);
  }
  if (template.slug === "daily-planner") {
    return buildDailyPlannerPdf(pdfDoc, W, H, M, reg, bold, values, accentRgb, INK, MUTED, LINE_COL, TEXT_W);
  }

  // ── Generic layout ─────────────────────────────────────────────
  let page = pdfDoc.addPage([W, H]);
  let ctx: PageCtx = { pdfDoc, page, y: H, W, H, M, reg, bold };

  // Header bar
  page.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: accentRgb });
  page.drawText(template.name, { x: M, y: H - 38, size: 20, font: bold, color: rgb(1, 1, 1) });
  const genBy = "Generated by UpdatePDF";
  page.drawText(genBy, {
    x: W - M - reg.widthOfTextAtSize(genBy, 8),
    y: H - 20,
    size: 8,
    font: reg,
    color: rgb(0.9, 0.9, 0.9),
  });

  ctx.y = H - 80;

  // Render fields
  for (const field of template.fields) {
    const val = values[field.key];
    if (val === undefined || val === null || val === "") continue;

    if (field.type === "array") {
      const arr = Array.isArray(val) ? val : [];
      if (arr.length === 0) continue;

      ctx = ensureSpace(ctx, 30);

      // Section header
      ctx.page.drawRectangle({
        x: M,
        y: ctx.y - 2,
        width: TEXT_W,
        height: 1,
        color: accentRgb,
      });
      ctx.page.drawText(field.label.toUpperCase(), {
        x: M,
        y: ctx.y - 16,
        size: 9,
        font: bold,
        color: accentRgb,
      });
      ctx.y -= 28;

      // Array items
      for (const item of arr as Record<string, unknown>[]) {
        ctx = ensureSpace(ctx, 20);
        const subFields = field.subFields ?? [];
        let first = true;
        for (const sf of subFields) {
          const sfVal = item[sf.key];
          if (sfVal === undefined || sfVal === null || sfVal === "") continue;
          const sfText = String(sfVal);
          const label = first ? `• ${sf.label}:` : `  ${sf.label}:`;
          first = false;

          ctx = ensureSpace(ctx, 14);
          const labelW = bold.widthOfTextAtSize(`${label} `, 8);
          ctx.page.drawText(`${label} `, { x: M + 8, y: ctx.y, size: 8, font: bold, color: MUTED });

          const wrapped = wrapText(sfText, TEXT_W - labelW - 16, reg, 9);
          for (let li = 0; li < wrapped.length; li++) {
            ctx = ensureSpace(ctx, 12);
            ctx.page.drawText(wrapped[li], {
              x: M + 8 + labelW,
              y: ctx.y,
              size: 9,
              font: reg,
              color: INK,
            });
            if (li === 0) ctx.y -= 14;
            else ctx.y -= 12;
            if (li > 0) ctx = ensureSpace(ctx, 12);
          }
          if (wrapped.length === 1) {
            // already decremented above for first line
          } else {
            // already handled in loop
          }
        }
        ctx.y -= 6;
      }
      ctx.y -= 6;
      continue;
    }

    // Scalar field
    const strVal = field.type === "date" ? fmtDate(String(val)) : String(val);
    if (!strVal) continue;

    // For textarea / long text
    if (field.type === "textarea" || strVal.length > 80) {
      ctx = ensureSpace(ctx, 30);
      ctx.page.drawText(field.label, { x: M, y: ctx.y, size: 8, font: bold, color: MUTED });
      ctx.y -= 14;

      const paragraphs = strVal.split(/\n+/);
      for (const para of paragraphs) {
        if (!para.trim()) {
          ctx.y -= 6;
          continue;
        }
        const lines = wrapText(para, TEXT_W, reg, 9);
        for (const line of lines) {
          ctx = ensureSpace(ctx, 12);
          ctx.page.drawText(line, { x: M, y: ctx.y, size: 9, font: reg, color: INK });
          ctx.y -= 13;
        }
      }
      ctx.y -= 8;
    } else {
      // Single-line label: value
      ctx = ensureSpace(ctx, 16);
      const labelText = `${field.label}: `;
      const labelW = bold.widthOfTextAtSize(labelText, 9);
      ctx.page.drawText(labelText, { x: M, y: ctx.y, size: 9, font: bold, color: MUTED });
      ctx.page.drawText(strVal, { x: M + labelW, y: ctx.y, size: 9, font: reg, color: INK });
      ctx.y -= 16;
    }
  }

  // Footer on last page
  ctx.page.drawLine({ start: { x: M, y: 36 }, end: { x: W - M, y: 36 }, thickness: 0.4, color: LINE_COL });
  ctx.page.drawText("Generated by UpdatePDF", {
    x: W - M - reg.widthOfTextAtSize("Generated by UpdatePDF", 7),
    y: 24,
    size: 7,
    font: reg,
    color: LINE_COL,
  });

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// ── Resume layout ────────────────────────────────────────────────
async function buildResumePdf(
  pdfDoc: PDFDocument,
  W: number, H: number, M: number,
  reg: PDFFont, bold: PDFFont,
  values: TemplateValues,
  accentRgb: ReturnType<typeof rgb>,
  INK: ReturnType<typeof rgb>,
  MUTED: ReturnType<typeof grayscale>,
  LINE_COL: ReturnType<typeof grayscale>,
  TEXT_W: number
): Promise<ArrayBuffer> {
  let page = pdfDoc.addPage([W, H]);
  let y = H - M;

  const ensureY = (needed: number) => {
    if (y - needed < M) {
      page = pdfDoc.addPage([W, H]);
      y = H - M;
    }
  };

  const drawSection = (title: string) => {
    ensureY(28);
    page.drawRectangle({ x: M, y: y - 2, width: TEXT_W, height: 1, color: accentRgb });
    page.drawText(title.toUpperCase(), { x: M, y: y - 16, size: 9, font: bold, color: accentRgb });
    y -= 26;
  };

  // Name header
  const name = String(values.fullName ?? "");
  page.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: accentRgb });
  page.drawText(name, { x: M, y: H - 44, size: 24, font: bold, color: rgb(1, 1, 1) });

  // Contact line
  const contactParts = [
    values.email, values.phone, values.location, values.linkedIn,
  ].filter(Boolean).map(String);
  const contactLine = contactParts.join("  |  ");
  page.drawText(contactLine.slice(0, 90), { x: M, y: H - 64, size: 8, font: reg, color: rgb(0.9, 0.9, 0.9) });
  y = H - 100;

  // Summary
  if (values.summary) {
    drawSection("Professional Summary");
    const lines = wrapText(String(values.summary), TEXT_W, reg, 9);
    for (const line of lines) {
      ensureY(13);
      page.drawText(line, { x: M, y, size: 9, font: reg, color: INK });
      y -= 13;
    }
    y -= 8;
  }

  // Experience
  const experience = Array.isArray(values.experience) ? values.experience as Record<string, unknown>[] : [];
  if (experience.length > 0) {
    drawSection("Work Experience");
    for (const exp of experience) {
      ensureY(30);
      const title = String(exp.title ?? "");
      const company = String(exp.company ?? "");
      const duration = String(exp.duration ?? "");
      page.drawText(title, { x: M, y, size: 11, font: bold, color: INK });
      if (duration) {
        page.drawText(duration, {
          x: W - M - reg.widthOfTextAtSize(duration, 9),
          y,
          size: 9,
          font: reg,
          color: MUTED,
        });
      }
      y -= 14;
      if (company) {
        ensureY(12);
        page.drawText(company, { x: M, y, size: 9, font: reg, color: accentRgb });
        y -= 14;
      }
      if (exp.description) {
        const descLines = wrapText(String(exp.description), TEXT_W - 10, reg, 9);
        for (const dl of descLines) {
          ensureY(12);
          page.drawText(dl, { x: M + 10, y, size: 9, font: reg, color: INK });
          y -= 12;
        }
      }
      y -= 8;
    }
  }

  // Education
  const education = Array.isArray(values.education) ? values.education as Record<string, unknown>[] : [];
  if (education.length > 0) {
    drawSection("Education");
    for (const edu of education) {
      ensureY(20);
      const degree = String(edu.degree ?? "");
      const institution = String(edu.institution ?? "");
      const year = String(edu.year ?? "");
      page.drawText(degree, { x: M, y, size: 10, font: bold, color: INK });
      if (year) {
        page.drawText(year, {
          x: W - M - reg.widthOfTextAtSize(year, 9),
          y,
          size: 9,
          font: reg,
          color: MUTED,
        });
      }
      y -= 13;
      if (institution) {
        ensureY(12);
        page.drawText(institution, { x: M, y, size: 9, font: reg, color: MUTED });
        y -= 13;
      }
      y -= 6;
    }
  }

  // Skills
  if (values.skills) {
    drawSection("Skills");
    const skillLines = wrapText(String(values.skills), TEXT_W, reg, 9);
    for (const sl of skillLines) {
      ensureY(13);
      page.drawText(sl, { x: M, y, size: 9, font: reg, color: INK });
      y -= 13;
    }
  }

  // Footer
  page.drawLine({ start: { x: M, y: 32 }, end: { x: W - M, y: 32 }, thickness: 0.4, color: LINE_COL });
  page.drawText("Generated by UpdatePDF", {
    x: W - M - reg.widthOfTextAtSize("Generated by UpdatePDF", 7),
    y: 20,
    size: 7,
    font: reg,
    color: LINE_COL,
  });

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// ── Salary Slip layout ───────────────────────────────────────────
async function buildSalarySlipPdf(
  pdfDoc: PDFDocument,
  W: number, H: number, M: number,
  reg: PDFFont, bold: PDFFont,
  values: TemplateValues,
  accentRgb: ReturnType<typeof rgb>,
  INK: ReturnType<typeof rgb>,
  MUTED: ReturnType<typeof grayscale>,
  LINE_COL: ReturnType<typeof grayscale>,
  TEXT_W: number
): Promise<ArrayBuffer> {
  const page = pdfDoc.addPage([W, H]);
  let y = H;

  const currencySymbol: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", CAD: "CA$", AUD: "A$" };
  const sym = currencySymbol[String(values.currency ?? "USD")] ?? "$";

  // Header bar
  page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: accentRgb });
  const companyName = String(values.companyName ?? "Company");
  page.drawText(companyName.toUpperCase(), { x: M, y: H - 35, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText("SALARY SLIP", {
    x: W - M - bold.widthOfTextAtSize("SALARY SLIP", 14),
    y: H - 35,
    size: 14,
    font: bold,
    color: rgb(1, 1, 1),
  });
  if (values.companyAddress) {
    page.drawText(String(values.companyAddress).replace(/\n/g, ", ").slice(0, 60), {
      x: M, y: H - 56, size: 8, font: reg, color: rgb(0.9, 0.9, 0.9),
    });
  }
  y = H - 80;

  // Employee info box
  const boxTop = y - 10;
  page.drawRectangle({ x: M, y: boxTop - 90, width: TEXT_W, height: 100, color: rgb(0.97, 0.97, 0.99) });
  page.drawRectangle({ x: M, y: boxTop - 90, width: TEXT_W, height: 100, borderColor: LINE_COL, borderWidth: 0.5 });

  // Left column: employee details
  const leftX = M + 12;
  let leftY = boxTop - 20;
  const empFields: [string, string][] = [
    ["Employee Name", String(values.employeeName ?? "")],
    ["Employee ID", String(values.employeeId ?? "")],
    ["Designation", String(values.designation ?? "")],
    ["Department", String(values.department ?? "")],
  ];
  for (const [label, val] of empFields) {
    if (!val) continue;
    page.drawText(`${label}:`, { x: leftX, y: leftY, size: 8, font: bold, color: MUTED });
    page.drawText(val, { x: leftX + 90, y: leftY, size: 8, font: reg, color: INK });
    leftY -= 16;
  }

  // Right column: pay period
  const rightX = M + TEXT_W / 2 + 10;
  let rightY = boxTop - 20;
  const payFields: [string, string][] = [
    ["Pay Period", String(values.payPeriod ?? "")],
    ["Pay Date", fmtDate(String(values.payDate ?? ""))],
  ];
  for (const [label, val] of payFields) {
    if (!val) continue;
    page.drawText(`${label}:`, { x: rightX, y: rightY, size: 8, font: bold, color: MUTED });
    page.drawText(val, { x: rightX + 76, y: rightY, size: 8, font: reg, color: INK });
    rightY -= 16;
  }

  y = boxTop - 110;

  // Earnings & Deductions tables side by side
  const earnings = Array.isArray(values.earnings) ? values.earnings as Record<string, unknown>[] : [];
  const deductions = Array.isArray(values.deductions) ? values.deductions as Record<string, unknown>[] : [];

  const COL_W = (TEXT_W - 10) / 2;
  const earnX = M;
  const dedX = M + COL_W + 10;

  // Table header helper
  const drawTableHeader = (x: number, label: string, colW: number) => {
    page.drawRectangle({ x, y: y - 22, width: colW, height: 22, color: accentRgb });
    page.drawText(label, { x: x + 8, y: y - 14, size: 9, font: bold, color: rgb(1, 1, 1) });
    page.drawText("AMOUNT", {
      x: x + colW - 8 - bold.widthOfTextAtSize("AMOUNT", 9),
      y: y - 14,
      size: 9,
      font: bold,
      color: rgb(1, 1, 1),
    });
  };

  drawTableHeader(earnX, "EARNINGS", COL_W);
  drawTableHeader(dedX, "DEDUCTIONS", COL_W);
  y -= 22;

  let totalEarnings = 0;
  let totalDeductions = 0;
  const maxRows = Math.max(earnings.length, deductions.length);

  for (let i = 0; i < maxRows; i++) {
    const rowBg = i % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.97, 0.97);
    page.drawRectangle({ x: earnX, y: y - 18, width: COL_W, height: 18, color: rowBg });
    page.drawRectangle({ x: dedX, y: y - 18, width: COL_W, height: 18, color: rowBg });

    if (i < earnings.length) {
      const e = earnings[i];
      const amt = Number(e.amount ?? 0);
      totalEarnings += amt;
      page.drawText(String(e.description ?? ""), { x: earnX + 8, y: y - 12, size: 8, font: reg, color: INK });
      const amtStr = `${sym}${amt.toFixed(2)}`;
      page.drawText(amtStr, {
        x: earnX + COL_W - 8 - reg.widthOfTextAtSize(amtStr, 8),
        y: y - 12, size: 8, font: reg, color: INK,
      });
    }

    if (i < deductions.length) {
      const d = deductions[i];
      const amt = Number(d.amount ?? 0);
      totalDeductions += amt;
      page.drawText(String(d.description ?? ""), { x: dedX + 8, y: y - 12, size: 8, font: reg, color: INK });
      const amtStr = `${sym}${amt.toFixed(2)}`;
      page.drawText(amtStr, {
        x: dedX + COL_W - 8 - reg.widthOfTextAtSize(amtStr, 8),
        y: y - 12, size: 8, font: reg, color: INK,
      });
    }
    y -= 18;
  }

  // Totals row
  page.drawRectangle({ x: earnX, y: y - 20, width: COL_W, height: 20, color: rgb(0.94, 0.96, 0.99) });
  page.drawRectangle({ x: dedX, y: y - 20, width: COL_W, height: 20, color: rgb(0.99, 0.94, 0.94) });
  page.drawText("Total Earnings", { x: earnX + 8, y: y - 13, size: 8, font: bold, color: INK });
  const teStr = `${sym}${totalEarnings.toFixed(2)}`;
  page.drawText(teStr, {
    x: earnX + COL_W - 8 - bold.widthOfTextAtSize(teStr, 9),
    y: y - 13, size: 9, font: bold, color: INK,
  });
  page.drawText("Total Deductions", { x: dedX + 8, y: y - 13, size: 8, font: bold, color: INK });
  const tdStr = `${sym}${totalDeductions.toFixed(2)}`;
  page.drawText(tdStr, {
    x: dedX + COL_W - 8 - bold.widthOfTextAtSize(tdStr, 9),
    y: y - 13, size: 9, font: bold, color: INK,
  });
  y -= 28;

  // NET PAY highlighted
  const netPay = totalEarnings - totalDeductions;
  page.drawRectangle({ x: M, y: y - 32, width: TEXT_W, height: 32, color: accentRgb });
  page.drawText("NET PAY", { x: M + 16, y: y - 20, size: 14, font: bold, color: rgb(1, 1, 1) });
  const netStr = `${sym}${netPay.toFixed(2)}`;
  page.drawText(netStr, {
    x: M + TEXT_W - 16 - bold.widthOfTextAtSize(netStr, 16),
    y: y - 22,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y -= 50;

  // Notes
  if (values.notes) {
    page.drawText("Notes:", { x: M, y, size: 8, font: bold, color: MUTED });
    y -= 14;
    const notesLines = wrapText(String(values.notes), TEXT_W, reg, 9);
    for (const nl of notesLines) {
      page.drawText(nl, { x: M, y, size: 9, font: reg, color: INK });
      y -= 13;
    }
  }

  // Footer
  page.drawLine({ start: { x: M, y: 36 }, end: { x: W - M, y: 36 }, thickness: 0.4, color: LINE_COL });
  page.drawText("Generated by UpdatePDF", {
    x: W - M - reg.widthOfTextAtSize("Generated by UpdatePDF", 7),
    y: 24, size: 7, font: reg, color: LINE_COL,
  });

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// ── Content Calendar layout ──────────────────────────────────────
async function buildContentCalendarPdf(
  pdfDoc: PDFDocument,
  W: number, H: number, M: number,
  reg: PDFFont, bold: PDFFont,
  values: TemplateValues,
  accentRgb: ReturnType<typeof rgb>,
  INK: ReturnType<typeof rgb>,
  MUTED: ReturnType<typeof grayscale>,
  LINE_COL: ReturnType<typeof grayscale>,
  TEXT_W: number
): Promise<ArrayBuffer> {
  let page = pdfDoc.addPage([W, H]);
  let y = H;

  const addPage = () => {
    page = pdfDoc.addPage([W, H]);
    y = H - M;
  };

  const ensureY = (needed: number) => { if (y - needed < M) addPage(); };

  // Header
  page.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: accentRgb });
  page.drawText("Content Calendar", { x: M, y: H - 38, size: 20, font: bold, color: rgb(1, 1, 1) });
  const weekStr = values.weekOf ? `Week of ${fmtDate(String(values.weekOf))}` : "";
  if (weekStr) {
    page.drawText(weekStr, {
      x: W - M - reg.widthOfTextAtSize(weekStr, 10),
      y: H - 38, size: 10, font: reg, color: rgb(0.9, 0.9, 0.9),
    });
  }
  y = H - 76;

  // Brand / Goal
  if (values.brand || values.goal) {
    page.drawText(`Brand: ${values.brand ?? ""}  |  Goal: ${values.goal ?? ""}`, {
      x: M, y, size: 9, font: reg, color: MUTED,
    });
    y -= 20;
  }

  // Table header
  const cols = [
    { label: "Day", x: M, w: 66 },
    { label: "Platform", x: M + 66, w: 78 },
    { label: "Topic / Caption", x: M + 144, w: 218 },
    { label: "Format", x: M + 362, w: 70 },
    { label: "Status", x: M + 432, w: 80 },
  ];

  page.drawRectangle({ x: M, y: y - 22, width: TEXT_W, height: 22, color: accentRgb });
  for (const col of cols) {
    page.drawText(col.label, { x: col.x + 4, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) });
  }
  y -= 22;

  const contentItems = Array.isArray(values.content) ? values.content as Record<string, unknown>[] : [];
  for (let i = 0; i < contentItems.length; i++) {
    ensureY(18);
    const item = contentItems[i];
    const rowBg = i % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.98, 0.97);
    page.drawRectangle({ x: M, y: y - 18, width: TEXT_W, height: 18, color: rowBg });

    const rowData = [
      { col: cols[0], val: String(item.day ?? "") },
      { col: cols[1], val: String(item.platform ?? "") },
      { col: cols[2], val: String(item.topic ?? "").slice(0, 50) },
      { col: cols[3], val: String(item.format ?? "") },
      { col: cols[4], val: String(item.status ?? "") },
    ];

    for (const { col, val } of rowData) {
      page.drawText(val, { x: col.x + 4, y: y - 12, size: 8, font: reg, color: INK, maxWidth: col.w - 6 });
    }

    // Column dividers
    for (let ci = 1; ci < cols.length; ci++) {
      page.drawLine({
        start: { x: cols[ci].x, y: y },
        end: { x: cols[ci].x, y: y - 18 },
        thickness: 0.3, color: LINE_COL,
      });
    }
    page.drawLine({ start: { x: M, y: y - 18 }, end: { x: M + TEXT_W, y: y - 18 }, thickness: 0.3, color: LINE_COL });

    y -= 18;
  }

  y -= 10;

  if (values.notes) {
    ensureY(30);
    page.drawText("Notes:", { x: M, y, size: 8, font: bold, color: MUTED });
    y -= 14;
    const nLines = wrapText(String(values.notes), TEXT_W, reg, 9);
    for (const nl of nLines) {
      ensureY(12);
      page.drawText(nl, { x: M, y, size: 9, font: reg, color: INK });
      y -= 13;
    }
  }

  // Footer
  page.drawLine({ start: { x: M, y: 32 }, end: { x: W - M, y: 32 }, thickness: 0.4, color: LINE_COL });
  page.drawText("Generated by UpdatePDF", {
    x: W - M - reg.widthOfTextAtSize("Generated by UpdatePDF", 7),
    y: 20, size: 7, font: reg, color: LINE_COL,
  });

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// ── Daily Planner layout ─────────────────────────────────────────
async function buildDailyPlannerPdf(
  pdfDoc: PDFDocument,
  W: number, H: number, M: number,
  reg: PDFFont, bold: PDFFont,
  values: TemplateValues,
  accentRgb: ReturnType<typeof rgb>,
  INK: ReturnType<typeof rgb>,
  MUTED: ReturnType<typeof grayscale>,
  LINE_COL: ReturnType<typeof grayscale>,
  TEXT_W: number
): Promise<ArrayBuffer> {
  const page = pdfDoc.addPage([W, H]);
  let y = H;

  // Date header
  const dateStr = values.plannerDate ? fmtDate(String(values.plannerDate)) : "Daily Planner";
  page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: accentRgb });
  page.drawText("DAILY PLANNER", { x: M, y: H - 30, size: 12, font: bold, color: rgb(0.9, 0.9, 0.9) });
  page.drawText(dateStr, { x: M, y: H - 56, size: 24, font: bold, color: rgb(1, 1, 1) });
  y = H - 86;

  // Priorities box
  const priorities = Array.isArray(values.topPriorities) ? values.topPriorities as Record<string, unknown>[] : [];
  if (priorities.length > 0) {
    page.drawRectangle({ x: M, y: y - 20 - priorities.length * 20, width: TEXT_W, height: 22 + priorities.length * 20, color: rgb(0.97, 0.98, 0.97) });
    page.drawRectangle({ x: M, y: y - 20 - priorities.length * 20, width: TEXT_W, height: 22 + priorities.length * 20, borderColor: accentRgb, borderWidth: 1.5 });
    page.drawText("TOP PRIORITIES", { x: M + 10, y: y - 14, size: 9, font: bold, color: accentRgb });
    y -= 22;
    for (let i = 0; i < priorities.length; i++) {
      const p = String(priorities[i].priority ?? "");
      page.drawText(`${i + 1}.`, { x: M + 14, y: y - 6, size: 10, font: bold, color: accentRgb });
      page.drawText(p, { x: M + 30, y: y - 6, size: 10, font: reg, color: INK });
      y -= 20;
    }
    y -= 14;
  }

  // Schedule table
  const schedule = Array.isArray(values.schedule) ? values.schedule as Record<string, unknown>[] : [];
  if (schedule.length > 0) {
    const timeColW = 90;
    page.drawRectangle({ x: M, y: y - 22, width: TEXT_W, height: 22, color: accentRgb });
    page.drawText("TIME", { x: M + 4, y: y - 14, size: 9, font: bold, color: rgb(1, 1, 1) });
    page.drawText("TASK", { x: M + timeColW + 4, y: y - 14, size: 9, font: bold, color: rgb(1, 1, 1) });
    y -= 22;

    for (let i = 0; i < schedule.length; i++) {
      const rowBg = i % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.98, 0.97);
      page.drawRectangle({ x: M, y: y - 20, width: TEXT_W, height: 20, color: rowBg });
      page.drawText(String(schedule[i].time ?? ""), { x: M + 4, y: y - 13, size: 9, font: bold, color: MUTED });
      page.drawText(String(schedule[i].task ?? ""), { x: M + timeColW + 4, y: y - 13, size: 9, font: reg, color: INK });
      page.drawLine({ start: { x: M + timeColW, y }, end: { x: M + timeColW, y: y - 20 }, thickness: 0.3, color: LINE_COL });
      page.drawLine({ start: { x: M, y: y - 20 }, end: { x: M + TEXT_W, y: y - 20 }, thickness: 0.3, color: LINE_COL });
      y -= 20;
    }
    y -= 14;
  }

  // Notes section
  if (values.notes) {
    page.drawText("NOTES / BRAIN DUMP", { x: M, y, size: 9, font: bold, color: accentRgb });
    y -= 16;
    const nLines = wrapText(String(values.notes), TEXT_W, reg, 9);
    for (const nl of nLines) {
      page.drawText(nl, { x: M, y, size: 9, font: reg, color: INK });
      y -= 13;
    }
    y -= 8;
  }

  // Gratitude
  if (values.gratitude) {
    page.drawText("GRATITUDE / WINS", { x: M, y, size: 9, font: bold, color: accentRgb });
    y -= 16;
    const gLines = wrapText(String(values.gratitude), TEXT_W, reg, 9);
    for (const gl of gLines) {
      page.drawText(gl, { x: M, y, size: 9, font: reg, color: INK });
      y -= 13;
    }
  }

  // Footer
  page.drawLine({ start: { x: M, y: 36 }, end: { x: W - M, y: 36 }, thickness: 0.4, color: LINE_COL });
  page.drawText("Generated by UpdatePDF", {
    x: W - M - reg.widthOfTextAtSize("Generated by UpdatePDF", 7),
    y: 24, size: 7, font: reg, color: LINE_COL,
  });

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// ── Main entry point ─────────────────────────────────────────────
export async function renderTemplate(
  template: TemplateDefinition,
  values: TemplateValues
): Promise<ArrayBuffer> {
  // Reuse existing invoice renderer
  if (template.slug === "invoice") {
    const items = Array.isArray(values.lineItems) ? values.lineItems as Record<string, unknown>[] : [];
    return generateInvoicePdf({
      invoiceNumber: String(values.invoiceNumber ?? "INV-001"),
      invoiceDate: String(values.invoiceDate ?? ""),
      dueDate: values.dueDate ? String(values.dueDate) : undefined,
      fromName: String(values.fromName ?? ""),
      fromAddress: values.fromAddress ? String(values.fromAddress) : undefined,
      fromEmail: values.fromEmail ? String(values.fromEmail) : undefined,
      toName: String(values.toName ?? ""),
      toAddress: values.toAddress ? String(values.toAddress) : undefined,
      toEmail: values.toEmail ? String(values.toEmail) : undefined,
      currency: String(values.currency ?? "USD"),
      taxRateBps: Math.round((Number(values.taxRate) || 0) * 100),
      notes: values.notes ? String(values.notes) : undefined,
      lineItems: items.map((item) => ({
        description: String(item.description ?? ""),
        quantity: Number(item.quantity ?? 1),
        unitPriceCents: Math.round(Number(item.unitPrice ?? 0) * 100),
      })),
    });
  }

  // Reuse existing cheque renderer
  if (template.slug === "cheque") {
    return generateChequePdf({
      payee: String(values.payee ?? ""),
      amountCents: Math.round(Number(values.amountNumeric ?? 0) * 100),
      date: String(values.date ?? ""),
      memo: values.memo ? String(values.memo) : undefined,
      bankName: values.bankName ? String(values.bankName) : undefined,
      routingNumber: values.routingNumber ? String(values.routingNumber) : undefined,
      accountNumber: values.accountNumber ? String(values.accountNumber) : undefined,
    });
  }

  // AI-assisted templates
  if (template.isAiAssisted) {
    const enhancedValues = await enhanceWithAI(template, values);
    return buildGenericPdf(template, enhancedValues);
  }

  // All other templates
  return buildGenericPdf(template, values);
}
