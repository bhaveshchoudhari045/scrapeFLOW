"use client";

import { cn } from "@/lib/utils";
import { SquareDashedMousePointer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface LogoProps {
  fontSize?: string;
  iconSize?: number;
}

function Logo({ fontSize = "text-2xl", iconSize = 20 }: LogoProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Prevent hydration mismatch by showing nothing during SSR
    return null;
  }

  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 group transition-transform duration-200 hover:scale-105",
        fontSize,
      )}
    >
      {/* Logo Icon with Dual-Color Gradient */}
      <div
        className="relative rounded-xl p-2 transition-all duration-300 shadow-md group-hover:shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          boxShadow: "0 4px 14px var(--primary-glow)",
        }}
      >
        <SquareDashedMousePointer size={iconSize} className="stroke-white" />

        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md -z-10"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          }}
        />
      </div>

      {/* Logo Text with Dual-Color */}
      <div className="flex items-center">
        <span
          className="font-bold transition-all duration-300"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Flow
        </span>
        <span className="font-bold text-stone-700 dark:text-stone-300 transition-colors duration-300">
          Scrape
        </span>
      </div>
    </Link>
  );
}

export default Logo;
