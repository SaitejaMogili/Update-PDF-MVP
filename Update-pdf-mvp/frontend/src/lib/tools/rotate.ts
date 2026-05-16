import "server-only";
import { PDFDocument, degrees } from "pdf-lib";

function parsePageSpec(spec: string, total: number): number[] {
  if (spec.trim() === "all") {
    return Array.from({ length: total }, (_, i) => i);
  }
  const pages = new Set<number>();
  for (const part of spec.split(",")) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map(Number);
      for (let i = a; i <= Math.min(b, total); i++) pages.add(i - 1);
    } else {
      const n = Number(trimmed);
      if (n >= 1 && n <= total) pages.add(n - 1);
    }
  }
  return [...pages];
}

export async function rotatePdf(
  buffer: ArrayBuffer,
  angle: 90 | 180 | 270,
  pages: "all" | string
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(buffer);
  const total = pdfDoc.getPageCount();
  const pageIndices = parsePageSpec(pages === "all" ? "all" : pages, total);

  for (const idx of pageIndices) {
    const page = pdfDoc.getPage(idx);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + angle) % 360));
  }

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
