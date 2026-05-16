import "server-only";
import { PDFDocument, StandardFonts, rgb, grayscale } from "pdf-lib";

export interface LineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface InvoiceParams {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string;
  fromName: string;
  fromAddress?: string;
  fromEmail?: string;
  fromPhone?: string;
  toName: string;
  toAddress?: string;
  toEmail?: string;
  lineItems: LineItem[];
  taxRateBps: number; // basis points: 1000 = 10%
  notes?: string;
  currency: string;
  logoBase64?: string;
  logoMimeType?: "image/png" | "image/jpeg";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", INR: "₹",
};

function fmt(cents: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  return sym + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export async function generateInvoicePdf(p: InvoiceParams): Promise<ArrayBuffer> {
  const subtotalCents = p.lineItems.reduce((s, i) => s + Math.round(i.quantity * i.unitPriceCents), 0);
  const taxCents = Math.round(subtotalCents * p.taxRateBps / 10_000);
  const totalCents = subtotalCents + taxCents;

  const pdfDoc = await PDFDocument.create();
  const W = 595; // A4
  const H = 842;
  const page = pdfDoc.addPage([W, H]);

  const reg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const M = 45; // margin
  const RED = rgb(0.86, 0.15, 0.15);
  const INK = rgb(0.04, 0.04, 0.10);
  const MUTED = grayscale(0.50);
  const LINE = grayscale(0.82);

  // ── Header (logo or plain accent bar) ────────────────────────
  if (p.logoBase64 && p.logoMimeType) {
    // White header section (80pt) + red accent bar (30pt)
    const WHITE_H = 80;
    const BAR_H = 30;

    // White header background
    page.drawRectangle({ x: 0, y: H - WHITE_H, width: W, height: WHITE_H, color: rgb(1, 1, 1) });

    // Embed logo and scale proportionally to max 200×60
    const logoBytes = Buffer.from(p.logoBase64, "base64");
    const logoImage = p.logoMimeType === "image/png"
      ? await pdfDoc.embedPng(logoBytes)
      : await pdfDoc.embedJpg(logoBytes);

    const MAX_W = 200;
    const MAX_H = 60;
    const scale = Math.min(MAX_W / logoImage.width, MAX_H / logoImage.height, 1);
    const lW = logoImage.width * scale;
    const lH = logoImage.height * scale;
    const logoY = H - WHITE_H + (WHITE_H - lH) / 2;

    page.drawImage(logoImage, { x: M, y: logoY, width: lW, height: lH });

    // "INVOICE" text top-right in white area
    page.drawText("INVOICE", {
      x: W - M - bold.widthOfTextAtSize("INVOICE", 22), y: H - WHITE_H + (WHITE_H - 22) / 2 + 4,
      size: 22, font: bold, color: RED,
    });

    // Red accent bar below white header showing company name
    page.drawRectangle({ x: 0, y: H - WHITE_H - BAR_H, width: W, height: BAR_H, color: RED });
    page.drawText(p.fromName.toUpperCase(), {
      x: M, y: H - WHITE_H - BAR_H + 9, size: 10, font: bold, color: rgb(1, 1, 1),
    });
  } else {
    // ── Plain accent bar (no logo) ─────────────────────────────
    page.drawRectangle({ x: 0, y: H - 56, width: W, height: 56, color: RED });

    page.drawText(p.fromName.toUpperCase(), {
      x: M, y: H - 34, size: 14, font: bold, color: rgb(1, 1, 1),
    });

    page.drawText("INVOICE", {
      x: W - M - bold.widthOfTextAtSize("INVOICE", 20), y: H - 38,
      size: 20, font: bold, color: rgb(1, 1, 1),
    });
  }

  // ── Calculate top offset based on whether logo was used ──────
  const headerH = p.logoBase64 && p.logoMimeType ? 110 : 56;

  // ── From details (below bar, left) ───────────────────────────
  let fromY = H - headerH - 20;
  const fromLines = [p.fromAddress, p.fromEmail, p.fromPhone].filter(Boolean) as string[];
  for (const line of fromLines) {
    page.drawText(line, { x: M, y: fromY, size: 8, font: reg, color: MUTED });
    fromY -= 12;
  }

  // ── Invoice meta (below bar, right) ──────────────────────────
  const metaX = W - M - 160;
  let metaY = H - headerH - 20;
  const metaRows: [string, string][] = [
    ["Invoice No.", p.invoiceNumber],
    ["Date", fmtDate(p.invoiceDate)],
    ...(p.dueDate ? [["Due Date", fmtDate(p.dueDate)] as [string, string]] : []),
  ];
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: metaX, y: metaY, size: 8, font: reg, color: MUTED });
    page.drawText(value, { x: metaX + 70, y: metaY, size: 8, font: bold, color: INK });
    metaY -= 14;
  }

  // ── Divider ────────────────────────────────────────────────
  const divY = Math.min(fromY, metaY) - 10;
  page.drawLine({ start: { x: M, y: divY }, end: { x: W - M, y: divY }, thickness: 0.5, color: LINE });

  // ── Billed To ─────────────────────────────────────────────
  let billY = divY - 18;
  page.drawText("BILLED TO", { x: M, y: billY, size: 7, font: bold, color: MUTED });
  billY -= 14;
  page.drawText(p.toName, { x: M, y: billY, size: 10, font: bold, color: INK });
  billY -= 13;
  const toLines = [p.toAddress, p.toEmail].filter(Boolean) as string[];
  for (const line of toLines) {
    page.drawText(line, { x: M, y: billY, size: 8, font: reg, color: MUTED });
    billY -= 12;
  }

  // ── Line items table ───────────────────────────────────────
  const tableTop = billY - 20;
  const COL = { num: M, desc: M + 28, qty: M + 300, price: M + 370, amount: M + 440 };
  const ROW_H = 22;

  // Header row
  page.drawRectangle({ x: M, y: tableTop - 20, width: W - M * 2, height: 22, color: rgb(0.97, 0.97, 0.97) });
  const headers: [string, number][] = [["#", COL.num], ["DESCRIPTION", COL.desc], ["QTY", COL.qty], ["UNIT PRICE", COL.price], ["AMOUNT", COL.amount]];
  for (const [label, x] of headers) {
    page.drawText(label, { x, y: tableTop - 13, size: 7, font: bold, color: MUTED });
  }

  // Item rows
  let rowY = tableTop - ROW_H;
  p.lineItems.forEach((item, i) => {
    const rowTotal = Math.round(item.quantity * item.unitPriceCents);
    const bg = i % 2 === 1 ? rgb(0.99, 0.99, 0.99) : rgb(1, 1, 1);
    page.drawRectangle({ x: M, y: rowY - ROW_H + 4, width: W - M * 2, height: ROW_H, color: bg });

    const desc = item.description.length > 42 ? item.description.slice(0, 42) + "…" : item.description;
    page.drawText(String(i + 1), { x: COL.num, y: rowY - 10, size: 8, font: reg, color: MUTED });
    page.drawText(desc, { x: COL.desc, y: rowY - 10, size: 8, font: reg, color: INK });
    page.drawText(String(item.quantity), { x: COL.qty, y: rowY - 10, size: 8, font: reg, color: INK });
    page.drawText(fmt(item.unitPriceCents, p.currency), { x: COL.price, y: rowY - 10, size: 8, font: reg, color: INK });
    page.drawText(fmt(rowTotal, p.currency), { x: COL.amount, y: rowY - 10, size: 8, font: bold, color: INK });

    page.drawLine({ start: { x: M, y: rowY - ROW_H + 4 }, end: { x: W - M, y: rowY - ROW_H + 4 }, thickness: 0.3, color: LINE });
    rowY -= ROW_H;
  });

  // ── Totals ─────────────────────────────────────────────────
  const totalsX = W - M - 160;
  let totY = rowY - 20;

  const totRows: [string, string, boolean][] = [
    ["Subtotal", fmt(subtotalCents, p.currency), false],
    [`Tax (${(p.taxRateBps / 100).toFixed(1)}%)`, fmt(taxCents, p.currency), false],
    ["TOTAL", fmt(totalCents, p.currency), true],
  ];

  for (const [label, value, isTotal] of totRows) {
    if (isTotal) {
      page.drawRectangle({ x: totalsX - 8, y: totY - 14, width: W - M - totalsX + 8, height: 22, color: RED });
      page.drawText(label, { x: totalsX, y: totY - 5, size: 9, font: bold, color: rgb(1, 1, 1) });
      page.drawText(value, { x: W - M - bold.widthOfTextAtSize(value, 11), y: totY - 6, size: 11, font: bold, color: rgb(1, 1, 1) });
    } else {
      page.drawText(label, { x: totalsX, y: totY - 5, size: 8, font: reg, color: MUTED });
      page.drawText(value, { x: W - M - reg.widthOfTextAtSize(value, 8), y: totY - 5, size: 8, font: reg, color: INK });
    }
    totY -= 24;
  }

  // ── Notes ──────────────────────────────────────────────────
  if (p.notes) {
    const notesY = Math.min(rowY, totY) - 30;
    page.drawLine({ start: { x: M, y: notesY + 14 }, end: { x: W - M, y: notesY + 14 }, thickness: 0.5, color: LINE });
    page.drawText("NOTES", { x: M, y: notesY, size: 7, font: bold, color: MUTED });
    page.drawText(p.notes.slice(0, 300), { x: M, y: notesY - 14, size: 8, font: reg, color: INK, maxWidth: W - M * 2 });
  }

  // ── Footer ─────────────────────────────────────────────────
  page.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.5, color: LINE });
  page.drawText("Thank you for your business.", { x: M, y: 26, size: 8, font: reg, color: MUTED });
  page.drawText(`Generated by UpdatePDF`, { x: W - M - reg.widthOfTextAtSize("Generated by UpdatePDF", 7), y: 26, size: 7, font: reg, color: LINE });

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
