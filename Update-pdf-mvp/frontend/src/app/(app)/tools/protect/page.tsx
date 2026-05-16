import { ProtectTool } from "./_components/protect-tool";

export const metadata = { title: "Protect PDF — UpdatePDF" };

export default function ProtectPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Protect PDF</h1>
        <p className="mt-2 text-slate-500">Add a password to prevent unauthorized access to your PDF.</p>
      </div>
      <ProtectTool />
    </div>
  );
}
