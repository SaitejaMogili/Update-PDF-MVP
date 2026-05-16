import { PDFDocument } from "pdf-lib";

export async function splitPdf(
  pdfBytes: ArrayBuffer,
  pages: number[] // 0-indexed, must be sorted
): Promise<Uint8Array> {
  const src = await PDFDocument.load(pdfBytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pages);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

export function parsePageSpec(spec: string, totalPages: number): number[] | null {
  const pages = new Set<number>();
  const parts = spec.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) return null;
      for (let i = start; i <= end; i++) pages.add(i - 1);
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1 || page > totalPages) return null;
      pages.add(page - 1);
    }
  }

  return [...pages].sort((a, b) => a - b);
}
