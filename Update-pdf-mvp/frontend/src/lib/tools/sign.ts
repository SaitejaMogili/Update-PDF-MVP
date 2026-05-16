import "server-only";
import { PDFDocument } from "pdf-lib";

export interface SignOpts {
  page: number;   // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function signPdf(
  pdfBuffer: ArrayBuffer,
  signatureBuffer: ArrayBuffer,
  signatureMimeType: string,
  opts: SignOpts
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const sigBytes = new Uint8Array(signatureBuffer);

  let embeddedImage;
  if (signatureMimeType === "image/png") {
    embeddedImage = await pdfDoc.embedPng(sigBytes);
  } else {
    embeddedImage = await pdfDoc.embedJpg(sigBytes);
  }

  const pageIndex = opts.page - 1;
  const pages = pdfDoc.getPages();
  const page = pages[Math.min(pageIndex, pages.length - 1)];

  page.drawImage(embeddedImage, {
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
  });

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
