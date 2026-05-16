import { PdfToJpgTool } from "./_components/pdf-to-jpg-tool";

export const metadata = { title: "PDF to JPG — UpdatePDF" };

export default function PdfToJpgPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">PDF to JPG</h1>
        <p className="mt-2 text-slate-500">Convert every page of your PDF into high-quality JPG images.</p>
      </div>
      <PdfToJpgTool />
    </div>
  );
}
