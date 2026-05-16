import { pdfCoCompress } from "@/lib/pdf-co";

/**
 * Compress a PDF via PDF.co.
 * Takes a presigned URL that PDF.co can fetch, returns a PDF.co result URL
 * from which the caller can download the compressed bytes.
 */
export async function compressPdf(fileUrl: string): Promise<string> {
  return pdfCoCompress(fileUrl);
}
