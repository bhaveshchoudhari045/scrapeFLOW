// ============================================================
// Logo.tsx — single-hue primary gradient, no cross-color bleed
// ============================================================
"use client";

import { cn } from "@/lib/utils";
import { SquareDashedMousePointer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface LogoProps {
  fontSize?: string;
  iconSize?: number;
}

export default function Logo({
  fontSize = "text-2xl",
  iconSize = 20,
}: LogoProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.03] select-none",
        fontSize,
      )}
    >
      {/* Icon — PRIMARY single-hue gradient */}
      <div className="logo-icon-bg relative rounded-xl p-2 shrink-0 transition-all duration-300">
        <SquareDashedMousePointer size={iconSize} className="stroke-white" />
        {/* Bloom on hover */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg -z-10"
          style={{ background: "var(--primary-lt)" }}
        />
      </div>

      {/* "Flow" = PRIMARY gradient, "Scrape" = neutral */}
      <div className="flex items-center">
        <span className="font-black logo-text-gradient transition-all duration-300">
          Flow
        </span>
        <span
          className="font-black transition-colors duration-300"
          style={{ color: "var(--tx2)" }}
        >
          Scrape
        </span>
      </div>
    </Link>
  );
}
