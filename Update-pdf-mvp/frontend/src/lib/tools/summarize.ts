import { openai } from "@/lib/openai";
import { extractPdfPages, pagesToText } from "@/lib/pdf-text";

export interface SummaryResult {
  title: string;
  summary: string;
  keyPoints: string[];
  documentType: string;
  wordCountEstimate: number;
}

export async function summarizePdf(pdfBuffer: ArrayBuffer): Promise<SummaryResult> {
  const pages = await extractPdfPages(pdfBuffer);
  const text = pagesToText(pages).slice(0, 50_000);

  if (!text) {
    return {
      title: "Unreadable Document",
      summary:
        "This PDF does not contain selectable text (it may be a scanned image). Use the OCR tool first to extract text.",
      keyPoints: [],
      documentType: "other",
      wordCountEstimate: 0,
    };
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You analyze documents and return structured JSON summaries. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: `Analyze this document text and return a JSON object with exactly these fields:
{
  "title": "the document title or a descriptive title if none is visible",
  "summary": "a clear 2-4 sentence summary of what this document is about",
  "keyPoints": ["3-6 bullet points covering the most important information"],
  "documentType": "one of: report, article, contract, invoice, form, presentation, manual, letter, or other",
  "wordCountEstimate": estimated total word count as a number
}

Document text:
${text}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(raw) as SummaryResult;
  } catch {
    return {
      title: "Document Summary",
      summary: raw.slice(0, 500),
      keyPoints: [],
      documentType: "other",
      wordCountEstimate: 0,
    };
  }
}
