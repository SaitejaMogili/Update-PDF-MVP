import { FillFormTool } from "./_components/fill-form-tool";

export const metadata = { title: "Fill PDF Form — UpdatePDF" };

export default function FillFormPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Fill PDF Form</h1>
        <p className="mt-2 text-slate-500">Programmatically fill PDF form fields with your data.</p>
      </div>
      <FillFormTool />
    </div>
  );
}
