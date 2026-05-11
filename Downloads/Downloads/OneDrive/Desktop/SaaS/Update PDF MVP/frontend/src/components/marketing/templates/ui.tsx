import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { ArrowRightIcon } from "./icons";

export const containerClass = "mx-auto max-w-[1240px] px-6";
export const narrowContainerClass = "mx-auto max-w-[880px] px-6";

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: "primary" | "emerald" | "outline" | "ghost";
  size?: "default" | "lg";
  arrow?: boolean;
};

export function Button({ href, children, variant = "primary", size = "default", arrow = false, className = "", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-[#2563EB] text-white shadow-[0_12px_32px_-8px_rgba(37,99,235,.35)] hover:bg-[#1D4ED8]",
    emerald: "bg-[#059669] text-white shadow-[0_12px_32px_-8px_rgba(5,150,105,.35)] hover:bg-[#047857] hover:shadow-[0_16px_36px_-8px_rgba(5,150,105,.45)]",
    outline: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#059669] hover:text-[#059669]",
    ghost: "text-[#1E293B] hover:text-[#059669]",
  };
  const sizes = {
    default: "h-[38px] px-4 text-sm",
    lg: "h-12 px-[22px] text-[15px] font-semibold",
  };

  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-[7px] whitespace-nowrap rounded-[10px] font-medium transition-all duration-200 hover:-translate-y-px",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
      {arrow ? <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" /> : null}
    </Link>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-[9px] font-[var(--font-display)] text-[17px] font-bold tracking-[-0.02em]">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#38BDF8] text-sm font-bold text-white shadow-[0_12px_32px_-8px_rgba(37,99,235,.35)]">
        U
      </span>
      <span>UpdatePDF</span>
    </Link>
  );
}

export function GradientText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-br from-[#059669] to-[#34D399] bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-[720px] text-center">
      <div className="mb-[18px] flex items-center justify-center gap-2.5">
        <span className="h-px w-6 bg-[#059669]" />
        <span className="font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.14em] text-[#059669]">
          {eyebrow}
        </span>
        <span className="h-px w-6 bg-[#059669]" />
      </div>
      <h2 className="mb-3.5 font-[var(--font-display)] text-[clamp(30px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] text-[#0F172A]">
        {title}
      </h2>
      {subtitle ? <p className="mx-auto max-w-[580px] text-[16.5px] leading-[1.55] text-[#475569]">{subtitle}</p> : null}
    </div>
  );
}
