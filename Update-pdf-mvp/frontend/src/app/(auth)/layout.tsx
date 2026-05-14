import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
            >
              U
            </div>
            <span className="text-xl font-bold text-slate-900">UpdatePDF</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
