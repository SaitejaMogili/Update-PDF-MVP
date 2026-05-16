import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { openai } from "@/lib/openai";
import { extractPdfPages } from "@/lib/pdf-text";

// Re-export shared constants so API routes can import from one place
export { LANGUAGES, needsFontWarning, type LanguageCode } from "@/lib/tools/translate-shared";
import { LANGUAGES, type LanguageCode } from "@/lib/tools/translate-shared";

export async function translatePdf(
  buffer: ArrayBuffer,
  targetLang: LanguageCode,
  originalFilename: string
): Promise<ArrayBuffer> {
  const pages = await extractPdfPages(buffer);
  if (pages.length === 0) {
    throw new Error("No readable text found. Run OCR on this PDF first.");
  }

  const fullText = pages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
    .join("\n\n")
    .slice(0, 50_000);

  const langName = LANGUAGES[targetLang];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional translator. Translate the document text below into ${langName}.
Keep "--- Page N ---" markers in place. Translate all body text faithfully. Do not add comments or explanations.`,
      },
      { role: "user", content: fullText },
    ],
  });

  const translated = completion.choices[0]?.message?.content ?? "";
  return buildPdf(translated, langName, originalFilename);
}

// ── PDF builder ────────────────────────────────────────────────

async function buildPdf(
  text: string,
  langName: string,
  originalFilename: string
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595; // A4 points
  const H = 842;
  const MARGIN = 50;
  const TEXT_W = W - MARGIN * 2;
  const FONT_SIZE = 10;
  const LINE_H = FONT_SIZE * 1.6;

  // Split translated text into page sections, then into lines
  const sections = text.split(/---\s*Page\s*\d+\s*---/i).filter((s) => s.trim());
  const content = sections.length > 0 ? sections : [text];

  let page = pdfDoc.addPage([W, H]);
  let y = H - MARGIN;
  let isFirstPage = true;

  const newPage = () => {
    page = pdfDoc.addPage([W, H]);
    y = H - MARGIN;
  };

  const drawLine = (line: string) => {
    if (y < MARGIN + LINE_H) newPage();
    if (line) {
      try {
        page.drawText(line, {
          x: MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0.05, 0.05, 0.05),
        });
      } catch {
        // skip unsupported glyphs
      }
    }
    y -= LINE_H;
  };

  for (const section of content) {
    // Header on the very first content page
    if (isFirstPage) {
      isFirstPage = false;
      page.drawText(`Translated to ${langName}`, {
        x: MARGIN,
        y,
        size: 13,
        font: bold,
        color: rgb(0.09, 0.35, 0.92),
      });
      y -= 18;
      page.drawText(`Source: ${originalFilename}`, {
        x: MARGIN,
        y,
        size: 8,
        font,
        color: rgb(0.55, 0.55, 0.55),
      });
      y -= LINE_H * 1.5;
    }

    const paragraphs = section.trim().split(/\n+/);
    for (const para of paragraphs) {
      if (!para.trim()) {
        y -= LINE_H * 0.5;
        continue;
      }
      for (const line of wrapText(para.trim(), TEXT_W, font, FONT_SIZE)) {
        drawLine(line);
      }
      y -= LINE_H * 0.3; // paragraph gap
    }
  }

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function wrapText(
  text: string,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    let width = 0;
    try {
      width = font.widthOfTextAtSize(candidate, size);
    } catch {
      width = candidate.length * size * 0.5; // rough fallback
    }
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
