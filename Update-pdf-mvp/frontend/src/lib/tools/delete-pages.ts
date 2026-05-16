import "server-only";
import { PDFDocument } from "pdf-lib";

function parsePageSpec(spec: string, total: number): Set<number> {
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
  return set;
}

/**
 * Delete pages by 1-indexed spec. Returns the remaining pages as a new PDF.
 * Throws if the spec would delete every page.
 */
export async function deletePages(
  buffer: ArrayBuffer,
  pages: string
): Promise<ArrayBuffer> {
  const src = await PDFDocument.load(buffer);
  const total = src.getPageCount();
  const toRemove = parsePageSpec(pages, total);

  if (toRemove.size === 0) {
    throw new Error("No valid pages selected for deletion");
  }
  if (toRemove.size >= total) {
    throw new Error("Cannot delete every page — at least one must remain");
  }

  const keepIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!toRemove.has(i)) keepIndices.push(i);
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, keepIndices);
  for (const p of copied) out.addPage(p);

  const bytes = await out.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
