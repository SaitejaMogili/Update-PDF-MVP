import "server-only";
import { PDFDocument } from "pdf-lib";

/**
 * Parse a page spec like "1,3,5-8" → zero-indexed sorted unique indices.
 * Ignores out-of-range entries silently.
 */
function parsePageSpec(spec: string, total: number): number[] {
  const set = new Set<number>();
  for (const part of spec.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map((s) => parseInt(s.trim(), 10));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const lo = Math.max(1, Math.min(a, b));
        const hi = Math.min(total, Math.max(a, b));
        for (let i = lo; i <= hi; i++) set.add(i - 1);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (Number.isFinite(n) && n >= 1 && n <= total) set.add(n - 1);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Extract a subset of pages (by 1-indexed spec) into a new PDF.
 * Preserves order specified in the spec.
 */
export async function extractPages(
  buffer: ArrayBuffer,
  pages: string
): Promise<ArrayBuffer> {
  const src = await PDFDocument.load(buffer);
  const total = src.getPageCount();
  const indices = parsePageSpec(pages, total);

  if (indices.length === 0) {
    throw new Error("No valid pages selected");
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  for (const p of copied) out.addPage(p);

  const bytes = await out.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
