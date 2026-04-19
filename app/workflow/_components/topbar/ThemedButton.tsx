"use client";

import React from "react";
import { usePalette } from "@/components/hooks/usePalette";

type Variant = "primary" | "accent" | "danger" | "ghost";

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function ThemedButton({
  variant = "ghost",
  loading = false,
  icon,
  children,
  disabled,
  ...props
}: ThemedButtonProps) {
  const { primary, rgb, accent, accentRgb, isDark } = usePalette();

  const isDisabled = disabled || loading;

  const styles: Record<Variant, React.CSSProperties> = {
    primary: {
      background: isDark
        ? `linear-gradient(135deg, rgba(${rgb}, 0.30) 0%, rgba(${rgb}, 0.18) 100%)`
        : `linear-gradient(135deg, rgba(${rgb}, 0.18) 0%, rgba(${rgb}, 0.10) 100%)`,
      border: `1px solid rgba(${rgb}, ${isDark ? 0.45 : 0.35})`,
      color: primary,
      boxShadow: `0 2px 8px rgba(${rgb}, ${isDark ? 0.2 : 0.12}), inset 0 1px 0 rgba(255,255,255,${isDark ? 0.08 : 0.5})`,
    },
    accent: {
      background: isDark
        ? `linear-gradient(135deg, rgba(${accentRgb}, 0.25) 0%, rgba(${accentRgb}, 0.15) 100%)`
        : `linear-gradient(135deg, rgba(${accentRgb}, 0.15) 0%, rgba(${accentRgb}, 0.08) 100%)`,
      border: `1px solid rgba(${accentRgb}, ${isDark ? 0.4 : 0.3})`,
      color: accent,
      boxShadow: `0 2px 8px rgba(${accentRgb}, ${isDark ? 0.18 : 0.1}), inset 0 1px 0 rgba(255,255,255,${isDark ? 0.08 : 0.5})`,
    },
    danger: {
      background: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)",
      border: `1px solid rgba(239,68,68,${isDark ? 0.35 : 0.25})`,
      color: "#ef4444",
      boxShadow: `0 2px 8px rgba(239,68,68,${isDark ? 0.15 : 0.08})`,
    },
    ghost: {
      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
      color: isDark ? "#9299ad" : "#4a5068",
      boxShadow: "none",
    },
  };

  const base = styles[variant];

  return (
    <button
      {...props}
      disabled={isDisabled}
      className="flex items-center gap-2 px-3 h-8 text-sm font-medium rounded-lg transition-all duration-150 flex-shrink-0"
      style={{
        ...base,
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        const el = e.currentTarget;
        if (variant === "primary") {
          el.style.boxShadow = `0 4px 14px rgba(${rgb}, ${isDark ? 0.35 : 0.22}), inset 0 1px 0 rgba(255,255,255,${isDark ? 0.1 : 0.6})`;
          el.style.borderColor = `rgba(${rgb}, ${isDark ? 0.65 : 0.55})`;
          el.style.transform = "translateY(-1px)";
        } else if (variant === "accent") {
          el.style.boxShadow = `0 4px 14px rgba(${accentRgb}, ${isDark ? 0.3 : 0.18}), inset 0 1px 0 rgba(255,255,255,${isDark ? 0.1 : 0.6})`;
          el.style.borderColor = `rgba(${accentRgb}, ${isDark ? 0.6 : 0.5})`;
          el.style.transform = "translateY(-1px)";
        } else if (variant === "ghost") {
          el.style.background = isDark
            ? `rgba(${rgb}, 0.10)`
            : `rgba(${rgb}, 0.06)`;
          el.style.borderColor = `rgba(${rgb}, 0.25)`;
          el.style.color = primary;
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (isDisabled) return;
        const el = e.currentTarget;
        Object.assign(el.style, {
          ...base,
          transform: "translateY(0)",
        });
        props.onMouseLeave?.(e);
      }}
    >
      {loading ? (
        <svg
          className="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0" style={{ color: "inherit" }}>
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
