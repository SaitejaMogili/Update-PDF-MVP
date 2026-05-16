import "server-only";
import { PDFDocument } from "pdf-lib";

export async function imagesToPdf(
  images: Array<{ buffer: ArrayBuffer; mimeType: string }>
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();

  for (const { buffer, mimeType } of images) {
    const bytes = new Uint8Array(buffer);
    let embeddedImage;

    if (mimeType === "image/png") {
      embeddedImage = await pdfDoc.embedPng(bytes);
    } else {
      // jpeg or webp — pdf-lib handles jpeg natively; webp falls back to jpeg embed
      embeddedImage = await pdfDoc.embedJpg(bytes);
    }

    const { width, height } = embeddedImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
  }

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
