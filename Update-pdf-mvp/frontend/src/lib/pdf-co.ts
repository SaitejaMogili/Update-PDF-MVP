import "server-only";

const BASE_URL = "https://api.pdf.co/v1";
const API_KEY = process.env.PDF_CO_API_KEY!;

// ── Core helpers ─────────────────────────────────────────────────────────────

async function post(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`PDF.co request failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<PdfCoResponse>;
}

// Poll the job status URL until done or failed (max ~60s)
async function waitForJob(jobUrl: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const res = await fetch(jobUrl, {
      headers: { "x-api-key": API_KEY },
    });

    if (!res.ok) throw new Error(`PDF.co poll failed: ${res.status}`);

    const data = (await res.json()) as PdfCoJobStatus;

    if (data.status === "success") return data.url;
    if (data.status === "error") throw new Error(data.message ?? "PDF.co job failed");
    // status === "working" — keep polling
  }

  throw new Error("PDF.co job timed out after 60s");
}

// Start a job and wait for it, returning the result download URL
async function runJob(endpoint: string, body: Record<string, unknown>): Promise<string> {
  const data = await post(endpoint, { ...body, async: true });

  if (data.error) throw new Error(data.message ?? "PDF.co error");

  // Synchronous result (small files) — URL is returned immediately
  if (data.url && !data.jobId) return data.url;

  // Async result — poll until done
  if (!data.jobId) throw new Error("PDF.co returned no jobId");
  const pollUrl = `${BASE_URL}/job/check?jobid=${data.jobId}`;
  return waitForJob(pollUrl);
}

// ── Tool functions ────────────────────────────────────────────────────────────

/** Compress / optimise a PDF. fileUrl must be a presigned URL PDF.co can fetch. */
export async function pdfCoCompress(fileUrl: string): Promise<string> {
  return runJob("/pdf/optimize", {
    url: fileUrl,
    // Reduce image quality to 75% and downsample images above 150 DPI
    profiles: JSON.stringify({
      CompressImages: true,
      ImageQuality: 75,
      DownsampleImages: true,
      DownsampleResolution: 150,
    }),
  });
}

/** Convert PDF to DOCX. Returns a URL to the .docx file. */
export async function pdfCoToWord(fileUrl: string): Promise<string> {
  return runJob("/pdf/convert/to/docx", { url: fileUrl });
}

/** Convert PDF pages to JPG images. Returns a URL to a ZIP of images. */
export async function pdfCoToJpg(
  fileUrl: string,
  options: { pages?: string; resolution?: number } = {}
): Promise<string> {
  return runJob("/pdf/convert/to/jpg", {
    url: fileUrl,
    pages: options.pages ?? "0-",        // all pages
    resolution: options.resolution ?? 150,
  });
}

/** Run OCR on a scanned PDF to make it searchable. Returns a URL to the searchable PDF. */
export async function pdfCoOcr(fileUrl: string, language = "eng"): Promise<string> {
  return runJob("/pdf/makesearchable", {
    url: fileUrl,
    lang: language,
  });
}

/** Password-protect a PDF. Returns a URL to the protected PDF. */
export async function pdfCoProtect(
  fileUrl: string,
  password: string
): Promise<string> {
  return runJob("/pdf/security/add", {
    url: fileUrl,
    ownerPassword: password,
    userPassword: password,
    // Allow printing and reading; block editing and copying
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });
}

export interface PdfTextAnnotation {
  type?: "text";
  text: string;
  page: number;       // 0-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontColor: string;  // hex without #
  fontName?: string;  // e.g. "Helvetica-Bold"
  rotation?: number;  // 0 | 90 | 180 | 270
}

export interface PdfImageAnnotation {
  type: "image";
  url: string;        // publicly accessible image URL
  page: number;       // 0-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export type PdfAnnotation = PdfTextAnnotation | PdfImageAnnotation;

/** Add text and/or image annotations to a PDF. Returns a URL to the edited PDF. */
export async function pdfCoEditAdd(
  fileUrl: string,
  annotations: PdfAnnotation[]
): Promise<string> {
  return runJob("/pdf/edit/add", {
    url: fileUrl,
    annotations,
  });
}

/** Fill a PDF form with key-value pairs. Returns a URL to the filled PDF. */
export async function pdfCoFillForm(
  fileUrl: string,
  fields: Record<string, string>
): Promise<string> {
  return runJob("/pdf/form/fill", {
    url: fileUrl,
    fieldsString: Object.entries(fields)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n"),
  });
}

/** Convert PDF to XLSX (Excel). Returns a URL to the .xlsx file. */
export async function pdfCoToExcel(fileUrl: string): Promise<string> {
  return runJob("/pdf/convert/to/xlsx", { url: fileUrl });
}

/** Convert a Word/DOCX file to PDF. Returns a URL to the .pdf file. */
export async function pdfCoFromWord(fileUrl: string): Promise<string> {
  return runJob("/pdf/convert/from/doc", { url: fileUrl });
}

/** Remove password protection from a PDF. Returns a URL to the unlocked PDF. */
export async function pdfCoUnlock(fileUrl: string, password: string): Promise<string> {
  return runJob("/pdf/security/remove", { url: fileUrl, password });
}

/** Compare two PDFs and return a diff PDF. Returns a URL to the comparison PDF. */
export async function pdfCoCompare(file1Url: string, file2Url: string): Promise<string> {
  return runJob("/pdf/diff", { url: file1Url, url2: file2Url });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PdfCoResponse {
  error: boolean;
  status: number;
  message?: string;
  url?: string;
  jobId?: string;
}

interface PdfCoJobStatus {
  status: "working" | "success" | "error";
  url: string;
  message?: string;
}
