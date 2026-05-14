"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  FileText,
  LayoutTemplate,
  Brain,
  Settings,
  LogOut,
  Merge,
  Sparkles,
  DollarSign,
} from "lucide-react";

const nav = [
  {
    label: "Tools",
    href: "/app/tools",
    icon: FileText,
    children: [
      { label: "Basic", href: "/app/tools/basic", icon: Merge },
      { label: "AI Tools", href: "/app/tools/ai", icon: Sparkles },
      { label: "Finance", href: "/app/tools/finance", icon: DollarSign },
    ],
  },
  { label: "Templates", href: "/app/templates", icon: LayoutTemplate },
  { label: "Brain", href: "/app/brain", icon: Brain },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

const planColors: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-blue-100 text-blue-700",
  business: "bg-violet-100 text-violet-700",
};

interface SidebarProps {
  email: string;
  fullName: string | null;
  plan: string;
  creditsBalance: number;
}

export function Sidebar({ email, fullName, plan, creditsBalance }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-4">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)" }}
        >
          U
        </div>
        <span className="text-[15px] font-bold tracking-tight text-slate-900">
          UpdatePDF
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
              {item.children && active && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                          childActive
                            ? "text-blue-700"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Credits */}
      <div className="border-t border-slate-200 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">Credits</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              planColors[plan] ?? planColors.free
            }`}
          >
            {plan}
          </span>
        </div>
        <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min((creditsBalance / (plan === "pro" ? 2000 : plan === "business" ? 10000 : 100)) * 100, 100)}%`,
              background: "linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)",
            }}
          />
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{creditsBalance}</span>{" "}
          credits remaining
        </p>
      </div>

      {/* User */}
      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {(fullName ?? email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              {fullName ?? email}
            </p>
            <p className="truncate text-[11px] text-slate-400">{email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
