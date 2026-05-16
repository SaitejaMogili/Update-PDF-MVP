import "server-only";

export interface PageText {
  text: string;
  pageNumber: number;
}

export async function extractPdfPages(buffer: ArrayBuffer): Promise<PageText[]> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "";

  const doc = await (pdfjsLib as any)
    .getDocument({ data: new Uint8Array(buffer) })
    .promise;

  const pages: PageText[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str?: string }>)
      .map((item) => item.str ?? "")
      .join(" ")
      .trim();
    if (text) pages.push({ text, pageNumber: i });
  }

  return pages;
}

export function pagesToText(pages: PageText[]): string {
  return pages.map((p) => p.text).join("\n\n");
}
