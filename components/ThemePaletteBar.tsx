"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const GripIcon = () => (
  <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
    <circle cx="3" cy="3" r="1.2" fill="currentColor" />
    <circle cx="9" cy="3" r="1.2" fill="currentColor" />
    <circle cx="3" cy="8" r="1.2" fill="currentColor" />
    <circle cx="9" cy="8" r="1.2" fill="currentColor" />
    <circle cx="3" cy="13" r="1.2" fill="currentColor" />
    <circle cx="9" cy="13" r="1.2" fill="currentColor" />
  </svg>
);

const PALETTES = [
  { id: "amber", label: "Amber Forge", primary: "#f59e0b", accent: "#3d5afe" },
  {
    id: "emerald",
    label: "Emerald Depths",
    primary: "#16a34a",
    accent: "#ef4444",
  },
  {
    id: "indigo",
    label: "Electric Indigo",
    primary: "#6366f1",
    accent: "#eab308",
  },
  { id: "azure", label: "Neural Blue", primary: "#0ea5e9", accent: "#f97316" },
  {
    id: "violet",
    label: "Violet Aurora",
    primary: "#9333ea",
    accent: "#84cc16",
  },
  {
    id: "crimson",
    label: "Crimson Wave",
    primary: "#f43f5e",
    accent: "#14b8a6",
  },
  {
    id: "cobalt",
    label: "Cobalt Spark",
    primary: "#4169e1",
    accent: "#ff8c42",
  },
  {
    id: "teal",
    label: "Teal Breeze",
    primary: "#14b8a6",
    accent: "#e879f9",
  },
  {
    id: "ocean",
    label: "Ocean Deep",
    primary: "#0891b2",
    accent: "#ff7849",
  },
  {
    id: "mint",
    label: "Mint Fresh",
    primary: "#10b981",
    accent: "#ec4899",
  },
];

export default function ThemePaletteBar() {
  const { resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [palette, setPalette] = useState("amber");
  const [showPalettes, setShowPalettes] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [pos, setPos] = useState({ x: 0, y: 0 });

  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const posRef = useRef(pos);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    setMounted(true);

    const savedPalette = localStorage.getItem("fs-palette") ?? "amber";
    setPalette(savedPalette);
    document.documentElement.setAttribute("data-palette", savedPalette);

    const savedPos = localStorage.getItem("theme-bar-position");

    if (savedPos) {
      setPos(JSON.parse(savedPos));
    } else {
      setPos({
        x: window.innerWidth - 280,
        y: window.innerHeight - 90,
      });
    }
  }, []);

  const onGripMouseDown = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    dragging.current = true;
    setIsDragging(true);

    const rect = barRef.current.getBoundingClientRect();

    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;

      const toolbarWidth = barRef.current?.offsetWidth ?? 280;
      const toolbarHeight = barRef.current?.offsetHeight ?? 60;

      const x = Math.max(
        0,
        Math.min(
          window.innerWidth - toolbarWidth,
          e.clientX - dragOffset.current.x,
        ),
      );

      const y = Math.max(
        0,
        Math.min(
          window.innerHeight - toolbarHeight,
          e.clientY - dragOffset.current.y,
        ),
      );

      setPos({ x, y });
    };

    const onMouseUp = () => {
      if (!dragging.current) return;

      dragging.current = false;
      setIsDragging(false);

      localStorage.setItem(
        "theme-bar-position",
        JSON.stringify(posRef.current),
      );
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function applyPalette(id: string) {
    setPalette(id);
    localStorage.setItem("fs-palette", id);
    document.documentElement.setAttribute("data-palette", id);
  }

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  const iconClr = isDark ? "#9299ad" : "#4a5068";
  const dividerClr = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const barBg = isDark ? "rgba(23,27,36,0.96)" : "rgba(255,255,255,0.96)";
  const currentPalette = PALETTES.find((p) => p.id === palette);

  return (
    <div
      ref={barRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        userSelect: "none",
        transition: isDragging ? "none" : "all 0.2s ease",
      }}
    >
      <div
        className="flex items-center gap-1 p-2 rounded-2xl"
        style={{
          background: barBg,
          border: `1px solid ${dividerClr}`,
          backdropFilter: "blur(24px)",
        }}
      >
        <div
          onMouseDown={onGripMouseDown}
          className="w-5 h-8 flex items-center justify-center"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            color: iconClr,
          }}
        >
          <GripIcon />
        </div>

        <div style={{ width: 1, height: 20, background: dividerClr }} />

        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-8 h-8 flex items-center justify-center"
          style={{ color: iconClr }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        <button
          onClick={() => setShowPalettes((v) => !v)}
          className="w-8 h-8 flex items-center justify-center"
          style={{ color: iconClr }}
        >
          <PaletteIcon />
        </button>

        {showPalettes &&
          PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPalette(p.id)}
              className="w-6 h-6 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${p.primary} 50%, ${p.accent} 50%)`,
                border:
                  palette === p.id
                    ? "2px solid white"
                    : "2px solid transparent",
              }}
            />
          ))}

        {!showPalettes && currentPalette && (
          <div
            className="px-2 py-1 rounded-lg text-xs font-semibold"
            style={{
              background: `${currentPalette.primary}18`,
              color: currentPalette.primary,
            }}
          >
            {currentPalette.label}
          </div>
        )}
      </div>
    </div>
  );
}
