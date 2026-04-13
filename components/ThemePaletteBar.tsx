"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
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
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
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
}

function PaletteIcon() {
  return (
    <svg
      width="16"
      height="16"
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
}

// Premium Dual-Color Palettes (PRIMARY + TRUE COMPLEMENTARY)
const PALETTES = [
  {
    id: "emerald",
    label: "Emerald + Coral",
    primary: "#22c55e",
    secondary: "#ff6f61", // Complementary: Red-Orange
  },
  {
    id: "sapphire",
    label: "Sapphire + Gold",
    primary: "#3b82f6",
    secondary: "#ffd700", // Complementary: Yellow/Gold
  },
  {
    id: "violet",
    label: "Violet + Lime",
    primary: "#a78bfa",
    secondary: "#84cc16", // Complementary: Yellow-Green
  },
  {
    id: "indigo",
    label: "Indigo + Orange",
    primary: "#6366f1",
    secondary: "#fb923c", // Complementary: Orange
  },
  {
    id: "rose",
    label: "Rose + Cyan",
    primary: "#f43f5e",
    secondary: "#06b6d4", // Complementary: Cyan
  },
  {
    id: "amber",
    label: "Amber + Indigo",
    primary: "#f59e0b",
    secondary: "#6366f1", // Complementary: Blue-Purple
  },
  {
    id: "cobalt",
    label: "Cobalt + Peach",
    primary: "#3d5afe",
    secondary: "#ffab91", // Complementary: Peach
  },
  {
    id: "teal",
    label: "Teal + Magenta",
    primary: "#14b8a6",
    secondary: "#ec4899", // Complementary: Pink/Magenta
  },
  {
    id: "ocean",
    label: "Ocean + Sunset",
    primary: "#0ea5e9",
    secondary: "#ff7043", // Complementary: Orange-Red
  },
  {
    id: "mint",
    label: "Mint + Berry",
    primary: "#10b981",
    secondary: "#f43f5e", // Complementary: Berry Pink
  },
];

export default function ThemePaletteBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [palette, setPalette] = useState("emerald");
  const [showPalettes, setShowPalettes] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("fs-palette") ?? "emerald";
    setPalette(saved);
    document.documentElement.setAttribute("data-palette", saved);
  }, []);

  function applyPalette(id: string) {
    setPalette(id);
    localStorage.setItem("fs-palette", id);
    document.documentElement.setAttribute("data-palette", id);

    // Dispatch custom event
    window.dispatchEvent(
      new CustomEvent("palette-change", { detail: { palette: id } }),
    );
  }

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999]"
      role="toolbar"
      aria-label="Theme controls"
      style={{
        animation: "scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-full transition-all duration-300"
        style={{
          background: isDark
            ? "rgba(28, 31, 43, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
          borderWidth: "1px",
          borderStyle: "solid",
          boxShadow: isDark
            ? "0 12px 48px rgba(0, 0, 0, 0.6), 0 4px 16px var(--primary-glow)"
            : "0 12px 48px rgba(0, 0, 0, 0.15), 0 4px 16px var(--primary-glow)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Theme Toggle Button */}
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
          type="button"
          style={{
            color: isDark ? "#d4d4d8" : "#09090b",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--primary-dim)";
            e.currentTarget.style.color = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = isDark ? "#d4d4d8" : "#09090b";
          }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Divider */}
        <div
          className="w-px h-5 mx-0.5"
          style={{
            background: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          }}
        />

        {/* Palette Toggle Button */}
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          onClick={() => setShowPalettes((v) => !v)}
          title="Color palette"
          aria-label="Toggle color palette"
          aria-expanded={showPalettes}
          type="button"
          style={{
            color: showPalettes
              ? "var(--primary)"
              : isDark
                ? "#d4d4d8"
                : "#09090b",
            background: showPalettes ? "var(--primary-dim)" : "transparent",
            borderColor: showPalettes ? "var(--primary)" : "transparent",
            borderWidth: "1px",
          }}
          onMouseEnter={(e) => {
            if (!showPalettes) {
              e.currentTarget.style.background = "var(--primary-dim)";
              e.currentTarget.style.color = "var(--primary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!showPalettes) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#d4d4d8" : "#09090b";
            }
          }}
        >
          <PaletteIcon />
        </button>

        {/* Palette Dots - Dual Color Display */}
        {showPalettes && (
          <>
            <div
              className="w-px h-5 mx-0.5"
              style={{
                background: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              }}
            />
            <div className="flex items-center gap-1.5 px-1">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  className="relative w-6 h-6 rounded-full transition-all duration-300 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)`,
                    borderColor:
                      palette === p.id
                        ? isDark
                          ? "rgba(255, 255, 255, 0.8)"
                          : "rgba(0, 0, 0, 0.5)"
                        : isDark
                          ? "rgba(0, 0, 0, 0.3)"
                          : "rgba(255, 255, 255, 0.8)",
                    borderWidth: "2px",
                    borderStyle: "solid",
                    transform: palette === p.id ? "scale(1.2)" : "scale(1)",
                    boxShadow:
                      palette === p.id
                        ? `0 0 20px ${p.primary}60, 0 0 0 4px ${isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"}`
                        : `0 2px 8px ${p.primary}40`,
                  }}
                  onClick={() => applyPalette(p.id)}
                  title={p.label}
                  aria-label={`Select ${p.label} palette`}
                  type="button"
                >
                  {/* Split indicator for dual colors */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from 0deg, ${p.primary} 0deg, ${p.primary} 180deg, ${p.secondary} 180deg, ${p.secondary} 360deg)`,
                    }}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
