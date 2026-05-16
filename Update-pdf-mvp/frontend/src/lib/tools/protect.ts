import { pdfCoProtect } from "@/lib/pdf-co";

export async function protectPdf(fileUrl: string, password: string): Promise<string> {
  return pdfCoProtect(fileUrl, password);
}
