import { pdfCoOcr } from "@/lib/pdf-co";

export async function runOcr(fileUrl: string, language = "eng"): Promise<string> {
  return pdfCoOcr(fileUrl, language);
}
