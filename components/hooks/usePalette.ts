"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export const PALETTE_COLORS: Record<
  string,
  { primary: string; accent: string }
> = {
  amber: { primary: "#f59e0b", accent: "#3d5afe" },
  emerald: { primary: "#16a34a", accent: "#ef4444" },
  indigo: { primary: "#6366f1", accent: "#eab308" },
  azure: { primary: "#0ea5e9", accent: "#f97316" },
  violet: { primary: "#9333ea", accent: "#84cc16" },
  crimson: { primary: "#f43f5e", accent: "#14b8a6" },
  cobalt: { primary: "#4169e1", accent: "#ff8c42" },
  teal: { primary: "#14b8a6", accent: "#e879f9" },
  ocean: { primary: "#0891b2", accent: "#ff7849" },
  mint: { primary: "#10b981", accent: "#ec4899" },
};

export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function usePalette() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [palette, setPalette] = useState("amber");

  useEffect(() => {
    const saved = localStorage.getItem("fs-palette") ?? "amber";
    setPalette(saved);
    const observer = new MutationObserver(() => {
      const attr =
        document.documentElement.getAttribute("data-palette") ?? "amber";
      setPalette(attr);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-palette"],
    });
    return () => observer.disconnect();
  }, []);

  const { primary, accent } = PALETTE_COLORS[palette] ?? PALETTE_COLORS.amber;
  const rgb = hexToRgb(primary);
  const accentRgb = hexToRgb(accent);

  return { palette, primary, accent, rgb, accentRgb, isDark };
}
