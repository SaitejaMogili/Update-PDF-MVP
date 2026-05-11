"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
};

export function Reveal({ children, className = "", stagger = false }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (stagger) {
    return (
      <div
        ref={ref}
        className={[
          "[&>*]:transition-all [&>*]:duration-500 [&>*]:ease-out",
          isVisible ? "[&>*]:translate-y-0 [&>*]:opacity-100" : "[&>*]:translate-y-4 [&>*]:opacity-0",
          className,
        ].join(" ")}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
