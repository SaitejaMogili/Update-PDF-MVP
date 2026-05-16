import { pdfCoToWord } from "@/lib/pdf-co";

export async function convertToWord(fileUrl: string): Promise<string> {
  return pdfCoToWord(fileUrl);
}
