import { pdfCoFillForm } from "@/lib/pdf-co";

export async function fillPdfForm(
  fileUrl: string,
  fields: Record<string, string>
): Promise<string> {
  return pdfCoFillForm(fileUrl, fields);
}
