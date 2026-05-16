import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface ToolPageShellProps {
  name: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  creditCost: number | { min: number; max: number };
  children: React.ReactNode;
}

function creditLabel(cost: number | { min: number; max: number }): string {
  if (typeof cost === "number") return `${cost} credit${cost !== 1 ? "s" : ""}`;
  return `${cost.min}–${cost.max} credits`;
}

export function ToolPageShell({
  name,
  description,
  icon: Icon,
  gradient,
  creditCost,
  children,
}: ToolPageShellProps) {
  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/tools" className="hover:text-slate-600 transition-colors">
          Tools
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-700 font-medium">{name}</span>
      </nav>

      {/* Tool header */}
      <div className="mb-8 flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: gradient }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{name}</h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {creditLabel(creditCost)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {/* Tool content */}
      {children}
    </div>
  );
}
