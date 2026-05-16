import { EditTool } from "./_components/edit-tool";

export const metadata = { title: "Edit PDF — UpdatePDF" };

export default function EditPdfPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Edit PDF</h1>
        <p className="mt-2 text-slate-500">Add text annotations to any page of your PDF.</p>
      </div>
      <EditTool />
    </div>
  );
}
