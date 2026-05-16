import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface PageNumberOpts {
  position: "header" | "footer";
  alignment: "left" | "center" | "right";
  startAt: number;
  fontSize: number;
  prefix: string;
}

export async function addPageNumbers(
  buffer: ArrayBuffer,
  opts: PageNumberOpts
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(buffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const margin = 30;

  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const label = `${opts.prefix}${opts.startAt + i}`;
    const textWidth = font.widthOfTextAtSize(label, opts.fontSize);

    let x: number;
    if (opts.alignment === "left") x = margin;
    else if (opts.alignment === "right") x = width - margin - textWidth;
    else x = (width - textWidth) / 2;

    const y = opts.position === "header" ? height - margin - opts.fontSize : margin;

    page.drawText(label, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  const bytes = await pdfDoc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
