"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { usePalette } from "@/components/hooks/usePalette";

export default function NavigationTabs() {
  const { workflowId } = useParams();
  const pathname = usePathname();
  const activeValue = pathname?.split("/")[2]; // "editor" | "runs"
  const { primary, rgb, isDark } = usePalette();

  const tabs = [
    {
      value: "editor",
      label: "Editor",
      href: `/workflow/editor/${workflowId}`,
    },
    { value: "runs", label: "Runs", href: `/workflow/runs/${workflowId}` },
  ];

  const containerBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const containerBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.08)";

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl w-[280px]"
      style={{
        background: containerBg,
        border: `1px solid ${containerBorder}`,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeValue === tab.value;
        return (
          <Link key={tab.value} href={tab.href} className="flex-1">
            <button
              className="w-full h-8 text-sm font-medium rounded-lg transition-all duration-200"
              style={
                isActive
                  ? {
                      background: isDark
                        ? `linear-gradient(135deg, rgba(${rgb}, 0.25) 0%, rgba(${rgb}, 0.15) 100%)`
                        : `linear-gradient(135deg, rgba(${rgb}, 0.15) 0%, rgba(${rgb}, 0.08) 100%)`,
                      color: primary,
                      border: `1px solid rgba(${rgb}, ${isDark ? 0.4 : 0.3})`,
                      boxShadow: `0 2px 8px rgba(${rgb}, ${isDark ? 0.25 : 0.15}), inset 0 1px 0 rgba(255,255,255,${isDark ? 0.08 : 0.6})`,
                    }
                  : {
                      background: "transparent",
                      color: isDark ? "#6b7280" : "#9ca3af",
                      border: "1px solid transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = isDark ? "#d1d5db" : "#374151";
                  e.currentTarget.style.background = isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = isDark ? "#6b7280" : "#9ca3af";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {tab.label}
            </button>
          </Link>
        );
      })}
    </div>
  );
}
