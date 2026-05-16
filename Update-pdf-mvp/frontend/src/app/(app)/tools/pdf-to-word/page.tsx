import { PdfToWordTool } from "./_components/pdf-to-word-tool";

export const metadata = { title: "PDF to Word — UpdatePDF" };

export default function PdfToWordPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">PDF to Word</h1>
        <p className="mt-2 text-slate-500">Convert your PDF to an editable Word document (.docx).</p>
      </div>
      <PdfToWordTool />
    </div>
  );
}
