import "server-only";
import { PDFDocument, StandardFonts, rgb, grayscale } from "pdf-lib";

export interface ChequeParams {
  payee: string;
  amountCents: number;
  date: string; // YYYY-MM-DD
  chequeNumber?: string;
  memo?: string;
  bankName?: string;
  bankAddress?: string;
  routingNumber?: string;
  accountNumber?: string;
  signatureBase64?: string; // raw base64, no data URL prefix
  signatureMimeType?: "image/png" | "image/jpeg";
}

// ── Amount to words ────────────────────────────────────────────

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function hundreds(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + hundreds(n % 100) : "");
}

export function amountToWords(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainingCents = cents % 100;

  let words = "";
  if (dollars >= 1_000_000) {
    words += hundreds(Math.floor(dollars / 1_000_000)) + " Million ";
    words += dollars % 1_000_000 ? hundreds(Math.floor((dollars % 1_000_000) / 1000)) + " Thousand " : "";
    words += hundreds(dollars % 1000);
  } else if (dollars >= 1000) {
    words += hundreds(Math.floor(dollars / 1000)) + " Thousand";
    if (dollars % 1000) words += " " + hundreds(dollars % 1000);
  } else {
    words = hundreds(dollars) || "Zero";
  }

  return `${words.trim()} and ${String(remainingCents).padStart(2, "0")}/100`;
}

// ── PDF generation ─────────────────────────────────────────────

export async function generateChequePdf(params: ChequeParams): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();

  // Standard US business cheque: 8.5" × 3.667" = 612 × 264 pt
  const W = 612;
  const H = 264;
  const page = pdfDoc.addPage([W, H]);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 18;
  const INK = rgb(0.04, 0.04, 0.12);
  const LIGHT = grayscale(0.55);
  const BLUE = rgb(0.09, 0.35, 0.92);

  // ── Border ─────────────────────────────────────────────────
  page.drawRectangle({
    x: 2, y: 2, width: W - 4, height: H - 4,
    borderColor: grayscale(0.75), borderWidth: 0.75,
  });

  // ── Accent bar top ─────────────────────────────────────────
  page.drawRectangle({ x: 2, y: H - 22, width: W - 4, height: 20, color: BLUE });

  // ── Bank name in accent bar ────────────────────────────────
  const bankLabel = params.bankName || "YOUR BANK NAME";
  page.drawText(bankLabel.toUpperCase(), {
    x: MARGIN, y: H - 16, size: 9, font: helveticaBold, color: rgb(1, 1, 1),
  });

  // ── Cheque number (top-right) ──────────────────────────────
  const chequeNum = params.chequeNumber ? `No. ${params.chequeNumber}` : "";
  if (chequeNum) {
    page.drawText(chequeNum, {
      x: W - MARGIN - helvetica.widthOfTextAtSize(chequeNum, 8), y: H - 15,
      size: 8, font: helveticaBold, color: rgb(1, 1, 1),
    });
  }

  // ── Bank address (below accent bar) ───────────────────────
  if (params.bankAddress) {
    page.drawText(params.bankAddress, {
      x: MARGIN, y: H - 35, size: 7, font: helvetica, color: LIGHT,
    });
  }

  // ── Date ──────────────────────────────────────────────────
  const dateLabel = "DATE";
  const dateValue = formatDate(params.date);
  page.drawText(dateLabel, { x: W - 130, y: H - 34, size: 7, font: helvetica, color: LIGHT });
  page.drawText(dateValue, { x: W - 100, y: H - 34, size: 9, font: helveticaBold, color: INK });
  page.drawLine({ start: { x: W - 105, y: H - 37 }, end: { x: W - MARGIN, y: H - 37 }, thickness: 0.5, color: LIGHT });

  // ── Pay to the order of ────────────────────────────────────
  const PAY_Y = H - 65;
  page.drawText("PAY TO THE ORDER OF", { x: MARGIN, y: PAY_Y + 2, size: 7, font: helvetica, color: LIGHT });
  page.drawText(params.payee, { x: MARGIN, y: PAY_Y - 12, size: 11, font: helveticaBold, color: INK });
  page.drawLine({ start: { x: MARGIN, y: PAY_Y - 16 }, end: { x: W - 110, y: PAY_Y - 16 }, thickness: 0.5, color: LIGHT });

  // ── Amount box ────────────────────────────────────────────
  const amountStr = `$ ${(params.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  page.drawRectangle({ x: W - 105, y: PAY_Y - 20, width: 87, height: 22, borderColor: BLUE, borderWidth: 1 });
  page.drawText(amountStr, {
    x: W - 100, y: PAY_Y - 13, size: 11, font: helveticaBold, color: INK,
  });

  // ── Amount in words ────────────────────────────────────────
  const WORDS_Y = PAY_Y - 34;
  const amountWords = amountToWords(params.amountCents).toUpperCase() + " DOLLARS";
  // Truncate if too long
  let wordsDisplay = amountWords;
  while (helvetica.widthOfTextAtSize(wordsDisplay + "***", 9) > W - MARGIN * 2 - 10) {
    wordsDisplay = wordsDisplay.slice(0, -1);
  }
  page.drawText(wordsDisplay, { x: MARGIN, y: WORDS_Y, size: 9, font: helveticaBold, color: INK });
  page.drawLine({ start: { x: MARGIN, y: WORDS_Y - 4 }, end: { x: W - MARGIN, y: WORDS_Y - 4 }, thickness: 0.5, color: LIGHT });

  // ── Signature area ────────────────────────────────────────
  const SIG_Y = 60;
  page.drawLine({ start: { x: W - 165, y: SIG_Y }, end: { x: W - MARGIN, y: SIG_Y }, thickness: 0.75, color: INK });
  page.drawText("AUTHORIZED SIGNATURE", {
    x: W - 165 + (148 - helvetica.widthOfTextAtSize("AUTHORIZED SIGNATURE", 6)) / 2,
    y: SIG_Y - 9, size: 6, font: helvetica, color: LIGHT,
  });

  // Embed signature image if provided
  if (params.signatureBase64) {
    try {
      const sigBytes = Buffer.from(params.signatureBase64, "base64");
      const sigImage = params.signatureMimeType === "image/png"
        ? await pdfDoc.embedPng(sigBytes)
        : await pdfDoc.embedJpg(sigBytes);
      const sigDims = sigImage.scale(1);
      const maxW = 140;
      const maxH = 36;
      const scale = Math.min(maxW / sigDims.width, maxH / sigDims.height, 1);
      const sw = sigDims.width * scale;
      const sh = sigDims.height * scale;
      page.drawImage(sigImage, {
        x: W - MARGIN - sw,
        y: SIG_Y + 2,
        width: sw,
        height: sh,
      });
    } catch {
      // Skip bad signature data silently
    }
  }

  // ── Memo ──────────────────────────────────────────────────
  page.drawText("FOR", { x: MARGIN, y: SIG_Y + 4, size: 7, font: helvetica, color: LIGHT });
  if (params.memo) {
    page.drawText(params.memo, { x: MARGIN + 22, y: SIG_Y + 4, size: 9, font: helvetica, color: INK });
  }
  page.drawLine({ start: { x: MARGIN + 18, y: SIG_Y }, end: { x: W - 185, y: SIG_Y }, thickness: 0.5, color: LIGHT });

  // ── MICR line (bottom) ────────────────────────────────────
  const MICR_Y = 20;
  page.drawRectangle({ x: 2, y: MICR_Y - 4, width: W - 4, height: 22, color: grayscale(0.97) });

  const routing = params.routingNumber ? `⑆${params.routingNumber}⑆` : "⑆000000000⑆";
  const account = params.accountNumber ? `${params.accountNumber}⑆` : "0000000000⑆";
  const checkNum = params.chequeNumber ? `${params.chequeNumber.padStart(4, "0")}` : "0001";

  const micrText = `${routing}  ${account}  ${checkNum}`;
  page.drawText(micrText, {
    x: MARGIN, y: MICR_Y + 2, size: 9, font: helvetica, color: grayscale(0.25),
  });

  // ── Void watermark band ───────────────────────────────────
  // (intentionally omitted — this is a valid cheque template)

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${m}/${d}/${y}`;
}
