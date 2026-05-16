import "server-only";
import { PDFDocument } from "pdf-lib";

export async function reorderPages(
  buffer: ArrayBuffer,
  pageOrder: number[]
): Promise<ArrayBuffer> {
  const srcDoc = await PDFDocument.load(buffer);
  const newDoc = await PDFDocument.create();

  // pageOrder is 1-indexed; convert to 0-indexed
  const indices = pageOrder.map((n) => n - 1);
  const copied = await newDoc.copyPages(srcDoc, indices);
  for (const page of copied) {
    newDoc.addPage(page);
  }

  const bytes = await newDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
