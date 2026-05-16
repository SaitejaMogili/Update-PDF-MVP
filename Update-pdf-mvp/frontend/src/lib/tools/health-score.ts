import "server-only";
import { openai } from "@/lib/openai";
import { extractPdfPages, pagesToText } from "@/lib/pdf-text";

export interface CategoryScore {
  name: string;
  score: number; // 0-100
  insight: string; // 1-2 sentence explanation
}

export interface HealthScoreResult {
  overallScore: number; // 0-100
  grade: string; // "A", "B", "C", "D", "F"
  categories: CategoryScore[]; // exactly 4 categories
  strengths: string[]; // 2-3 bullet points
  improvements: string[]; // 2-3 actionable suggestions
  summary: string; // 2-3 sentence executive summary
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export async function healthScorePdf(buffer: ArrayBuffer): Promise<HealthScoreResult> {
  const pages = await extractPdfPages(buffer);
  const text = pagesToText(pages).slice(0, 12_000);

  if (!text) {
    return {
      overallScore: 0,
      grade: "F",
      categories: [
        { name: "Readability", score: 0, insight: "No extractable text found in this document." },
        { name: "Structure", score: 0, insight: "Cannot assess structure without selectable text." },
        { name: "Language Quality", score: 0, insight: "Cannot assess language without selectable text." },
        { name: "Completeness", score: 0, insight: "Cannot assess completeness without selectable text." },
      ],
      strengths: [],
      improvements: [
        "Use the OCR tool first to extract text from this scanned/image PDF before running a health analysis.",
      ],
      summary:
        "This PDF contains no extractable text — it is likely a scanned image or image-only PDF. Run the OCR tool to convert it to a searchable document, then re-analyze.",
    };
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a document quality analyst. You analyze documents and return structured JSON health assessments. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: `Analyze this document text and return a JSON object with EXACTLY these fields:
{
  "overallScore": a single integer 0-100 representing overall document health,
  "categories": [
    {
      "name": "Readability",
      "score": integer 0-100,
      "insight": "1-2 sentence explanation of the readability quality"
    },
    {
      "name": "Structure",
      "score": integer 0-100,
      "insight": "1-2 sentence explanation of how well the document is organized"
    },
    {
      "name": "Language Quality",
      "score": integer 0-100,
      "insight": "1-2 sentence explanation of grammar, tone, and clarity"
    },
    {
      "name": "Completeness",
      "score": integer 0-100,
      "insight": "1-2 sentence explanation of whether the document covers its topic thoroughly"
    }
  ],
  "strengths": ["2-3 specific strengths of this document as short strings"],
  "improvements": ["2-3 actionable improvement suggestions as short strings"],
  "summary": "2-3 sentence executive summary of the document's overall quality and purpose"
}

Score guidelines:
- Readability: sentence complexity, paragraph length, use of jargon, logical flow
- Structure: headings, sections, consistent formatting, logical organization
- Language Quality: grammar, spelling, professional tone, clarity and precision
- Completeness: coverage of the subject matter, missing sections, depth of content

Document text:
${text}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as Omit<HealthScoreResult, "grade">;
    const overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore ?? 0)));
    return {
      ...parsed,
      overallScore,
      grade: scoreToGrade(overallScore),
      categories: (parsed.categories ?? []).slice(0, 4).map((c) => ({
        ...c,
        score: Math.max(0, Math.min(100, Math.round(c.score ?? 0))),
      })),
    };
  } catch {
    // Fallback if JSON parse fails — still return a valid result shape
    return {
      overallScore: 50,
      grade: "C",
      categories: [
        { name: "Readability", score: 50, insight: "Analysis could not be fully parsed." },
        { name: "Structure", score: 50, insight: "Analysis could not be fully parsed." },
        { name: "Language Quality", score: 50, insight: "Analysis could not be fully parsed." },
        { name: "Completeness", score: 50, insight: "Analysis could not be fully parsed." },
      ],
      strengths: ["Document contains readable text."],
      improvements: ["Re-run the analysis for a more detailed assessment."],
      summary: "The AI analysis encountered an issue parsing the result. The document appears to contain text content.",
    };
  }
}
