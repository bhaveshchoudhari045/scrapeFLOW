"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/* ── Icons ── */
const SunIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);
const MoonIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const PaletteIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

/**
 * 10 premium palettes — each dot shows left=primary, right=accent
 * Pairings inspired by top SaaS brands (Linear, Stripe, Vercel, Supabase, etc.)
 */
const PALETTES = [
  {
    id: "amber",
    label: "Amber Forge",
    primary: "#f59e0b",
    accent: "#3d5afe",
    desc: "Warm amber + Electric cobalt",
  },
  {
    id: "emerald",
    label: "Emerald Depths",
    primary: "#16a34a",
    accent: "#ef4444",
    desc: "Deep emerald + Rich coral",
  },
  {
    id: "indigo",
    label: "Electric Indigo",
    primary: "#6366f1",
    accent: "#eab308",
    desc: "Deep indigo + Vivid gold",
  },
  {
    id: "azure",
    label: "Neural Blue",
    primary: "#0ea5e9",
    accent: "#f97316",
    desc: "Bright azure + Warm amber",
  },
  {
    id: "violet",
    label: "Violet Aurora",
    primary: "#9333ea",
    accent: "#84cc16",
    desc: "Rich violet + Electric lime",
  },
  {
    id: "crimson",
    label: "Crimson Intelligence",
    primary: "#e11d48",
    accent: "#0d9488",
    desc: "Vivid rose + Deep teal",
  },
  {
    id: "cobalt",
    label: "Cobalt Storm",
    primary: "#3b5bdb",
    accent: "#fb923c",
    desc: "Deep cobalt + Warm peach",
  },
  {
    id: "teal",
    label: "Teal Matrix",
    primary: "#0f766e",
    accent: "#db2777",
    desc: "Premium teal + Hot magenta",
  },
  {
    id: "ocean",
    label: "Ocean Pulse",
    primary: "#0284c7",
    accent: "#ea580c",
    desc: "Deep ocean + Sunset orange",
  },
  {
    id: "mint",
    label: "Mint Neon",
    primary: "#059669",
    accent: "#be185d",
    desc: "Vivid mint + Deep berry",
  },
];

export default function ThemePaletteBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [palette, setPalette] = useState("amber");
  const [showPalettes, setShowPalettes] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("fs-palette") ?? "amber";
    setPalette(saved);
    document.documentElement.setAttribute("data-palette", saved);
  }, []);

  function applyPalette(id: string) {
    setPalette(id);
    localStorage.setItem("fs-palette", id);
    document.documentElement.setAttribute("data-palette", id);
    window.dispatchEvent(
      new CustomEvent("palette-change", { detail: { palette: id } }),
    );
  }

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  const barBg = isDark ? "rgba(23,27,36,0.96)" : "rgba(255,255,255,0.96)";
  const dividerClr = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const iconClr = isDark ? "#9299ad" : "#4a5068";
  const currentPalette = PALETTES.find((p) => p.id === palette);

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999]"
      role="toolbar"
      aria-label="Theme controls"
    >
      <div
        className="flex items-center gap-0.5 p-1.5 rounded-2xl transition-all duration-300"
        style={{
          background: barBg,
          border: `1px solid ${dividerClr}`,
          boxShadow: isDark
            ? "0 16px 48px rgba(0,0,0,0.65), 0 4px 16px var(--primary-glow, rgba(245,158,11,0.3))"
            : "0 8px 32px rgba(0,0,0,0.12), 0 2px 10px var(--primary-glow, rgba(245,158,11,0.15))",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{ color: iconClr, background: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "var(--primary-dim, rgba(245,158,11,0.10))";
            e.currentTarget.style.color = "var(--primary, #f59e0b)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = iconClr;
          }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        <div
          style={{
            width: 1,
            height: 20,
            background: dividerClr,
            margin: "0 2px",
          }}
        />

        {/* Palette toggle */}
        <button
          type="button"
          onClick={() => setShowPalettes((v) => !v)}
          title="Color palette"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            color: showPalettes ? "var(--primary, #f59e0b)" : iconClr,
            background: showPalettes
              ? "var(--primary-dim, rgba(245,158,11,0.10))"
              : "transparent",
            border: showPalettes
              ? "1px solid var(--primary-dim, rgba(245,158,11,0.20))"
              : "1px solid transparent",
          }}
          onMouseEnter={(e) => {
            if (!showPalettes) {
              e.currentTarget.style.background =
                "var(--primary-dim, rgba(245,158,11,0.10))";
              e.currentTarget.style.color = "var(--primary, #f59e0b)";
            }
          }}
          onMouseLeave={(e) => {
            if (!showPalettes) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = iconClr;
            }
          }}
        >
          <PaletteIcon />
        </button>

        {/* Palette dot row */}
        {showPalettes && (
          <>
            <div
              style={{
                width: 1,
                height: 20,
                background: dividerClr,
                margin: "0 2px",
              }}
            />
            <div className="flex items-center gap-1 px-1">
              {PALETTES.map((p) => {
                const isActive = palette === p.id;
                const isHovered = hoveredId === p.id;
                return (
                  <div key={p.id} className="relative">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full transition-all duration-200 focus:outline-none"
                      style={{
                        /* Left = primary, right = accent — clean 50/50 split */
                        background: `linear-gradient(90deg, ${p.primary} 50%, ${p.accent} 50%)`,
                        border: isActive
                          ? `2px solid ${isDark ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.50)"}`
                          : `2px solid ${isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.85)"}`,
                        transform: isActive
                          ? "scale(1.3)"
                          : isHovered
                            ? "scale(1.15)"
                            : "scale(1)",
                        boxShadow: isActive
                          ? `0 0 0 3px ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}, 0 4px 14px ${p.primary}66`
                          : `0 2px 6px ${p.primary}44`,
                      }}
                      onClick={() => applyPalette(p.id)}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      aria-label={`${p.label}: ${p.desc}`}
                    />
                    {/* Tooltip */}
                    {isHovered && (
                      <div
                        className="absolute bottom-8 left-1/2 pointer-events-none whitespace-nowrap"
                        style={{
                          transform: "translateX(-50%)",
                          background: isDark
                            ? "rgba(23,27,36,0.97)"
                            : "rgba(255,255,255,0.97)",
                          border: `1px solid ${dividerClr}`,
                          borderRadius: "8px",
                          padding: "0.35rem 0.625rem",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: isDark ? "#eef0f5" : "#0b0c10",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                          zIndex: 10,
                        }}
                      >
                        <div style={{ color: p.primary }}>{p.label}</div>
                        <div
                          style={{
                            opacity: 0.6,
                            fontWeight: 400,
                            marginTop: "0.1rem",
                          }}
                        >
                          {p.desc}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Active palette label */}
        {!showPalettes && currentPalette && (
          <div
            className="px-2 py-0.5 rounded-lg text-xs font-semibold"
            style={{
              background: `${currentPalette.primary}18`,
              color: currentPalette.primary,
              fontSize: "0.68rem",
              letterSpacing: "0.02em",
            }}
          >
            {currentPalette.label}
          </div>
        )}
      </div>
    </div>
  );
}
