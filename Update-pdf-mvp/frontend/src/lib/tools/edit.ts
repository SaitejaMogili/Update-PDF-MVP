import { pdfCoEditAdd, type PdfAnnotation } from "@/lib/pdf-co";

export interface EditTextAnnotation {
  type: "text";
  text: string;
  page: number;       // 1-indexed
  x: number;
  y: number;
  fontSize: number;
  fontColor: string;  // hex without #
  fontName: string;
  rotation: number;
}

export interface EditImageAnnotation {
  type: "image";
  imageUrl: string;   // signed URL for PDF.co to fetch
  page: number;       // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export type EditAnnotation = EditTextAnnotation | EditImageAnnotation;

export async function editPdf(fileUrl: string, annotations: EditAnnotation[]): Promise<string> {
  const mapped: PdfAnnotation[] = annotations.map((a) => {
    if (a.type === "image") {
      return {
        type: "image",
        url: a.imageUrl,
        page: a.page - 1,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        rotation: a.rotation,
      };
    }
    return {
      text: a.text,
      page: a.page - 1,
      x: a.x,
      y: a.y,
      width: 400,
      height: Math.ceil(a.fontSize * 1.5),
      fontSize: a.fontSize,
      fontColor: a.fontColor,
      fontName: a.fontName,
      rotation: a.rotation,
    };
  });
  return pdfCoEditAdd(fileUrl, mapped);
}
