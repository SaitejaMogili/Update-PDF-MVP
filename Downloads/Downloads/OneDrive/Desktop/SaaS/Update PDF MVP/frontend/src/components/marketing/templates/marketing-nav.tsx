"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowRightIcon } from "./icons";
import { Brand, Button } from "./ui";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={[
        "sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl backdrop-saturate-150 transition-colors",
        scrolled ? "border-[#E2E8F0]" : "border-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-8 px-6 py-4">
        <Brand />
        <div className="hidden items-center gap-8 md:flex">
          <Link className="text-sm font-medium text-[#1E293B] transition-colors hover:text-[#059669]" href="/#tools">
            Tools
          </Link>
          <Link className="text-sm font-medium text-[#059669]" href="/templates">
            Studio
          </Link>
          <Link className="text-sm font-medium text-[#1E293B] transition-colors hover:text-[#059669]" href="/brain">
            Brain
          </Link>
          <Link className="text-sm font-medium text-[#1E293B] transition-colors hover:text-[#059669]" href="/#pricing">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button href="#" variant="ghost">
            Sign in
          </Button>
          <Button href="#" className="group hidden sm:inline-flex">
            Start Free <ArrowRightIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
