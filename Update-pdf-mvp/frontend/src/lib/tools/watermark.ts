import "server-only";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

export async function watermarkPdf(
  buffer: ArrayBuffer,
  text: string,
  opacity: number,
  color: string
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(buffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { r, g, b } = hexToRgb(color);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const diagonal = Math.sqrt(width * width + height * height);
    const fontSize = Math.max(40, Math.min(80, diagonal / 10));
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - fontSize / 2,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(45),
    });
  }

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
