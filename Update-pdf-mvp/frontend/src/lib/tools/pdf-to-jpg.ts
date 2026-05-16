import { pdfCoToJpg } from "@/lib/pdf-co";

export async function convertToJpg(fileUrl: string): Promise<string> {
  return pdfCoToJpg(fileUrl);
}
