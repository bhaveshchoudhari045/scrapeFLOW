"use client";

import TooltipWrapper from "@/components/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import SaveBtn from "./SaveBtn";
import ExecuteBtn from "./ExecuteBtn";
import NavigationTabs from "./NavigationTabs";
import PublishBtn from "./PublishBtn";
import UnpublishBtn from "./Unpublishbtn";
import { usePalette } from "@/components/hooks/usePalette";

interface Props {
  title: string;
  subtitle?: string;
  workflowId: string;
  hideButtons?: boolean;
  isPublished?: boolean;
}

export default function Topbar({
  title,
  subtitle,
  workflowId,
  hideButtons = false,
  isPublished = false,
}: Props) {
  const router = useRouter();
  const { primary, rgb, isDark } = usePalette();

  const topbarBg = isDark
    ? "linear-gradient(180deg, #15182200 0%, #15182200 100%), #111420"
    : "linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%)";

  const borderColor = isDark ? `rgba(${rgb}, 0.18)` : `rgba(${rgb}, 0.15)`;

  return (
    <header
      className="flex p-2 justify-between w-full h-[60px] sticky top-0 z-10 items-center"
      style={{
        background: topbarBg,
        borderBottom: `1px solid ${borderColor}`,
        boxShadow: isDark
          ? `0 4px 20px rgba(0,0,0,0.40), 0 1px 0 rgba(${rgb}, 0.10)`
          : `0 4px 16px rgba(${rgb}, 0.07), 0 1px 0 rgba(${rgb}, 0.12)`,
      }}
    >
      {/* ── Left: Back + Title ── */}
      <div className="flex gap-2 flex-1 items-center min-w-0">
        <TooltipWrapper content="Back">
          <button
            onClick={() => router.back()}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              color: isDark ? "#9299ad" : "#4a5068",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `rgba(${rgb}, ${isDark ? 0.15 : 0.08})`;
              e.currentTarget.style.borderColor = `rgba(${rgb}, 0.35)`;
              e.currentTarget.style.color = primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)";
              e.currentTarget.style.borderColor = isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)";
              e.currentTarget.style.color = isDark ? "#9299ad" : "#4a5068";
            }}
          >
            <ChevronLeftIcon size={16} />
          </button>
        </TooltipWrapper>

        <div className="min-w-0">
          <p
            className="font-bold text-sm truncate leading-tight"
            style={{ color: isDark ? "#e4e8f4" : "#1a1d2a" }}
          >
            {title}
          </p>
          {subtitle && (
            <p
              className="text-xs truncate leading-tight mt-0.5"
              style={{
                color: isDark ? `rgba(${rgb}, 0.70)` : `rgba(${rgb}, 0.75)`,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── Center: Navigation tabs ── */}
      <NavigationTabs />

      {/* ── Right: Action buttons ── */}
      <div className="flex gap-2 flex-1 justify-end">
        {!hideButtons && (
          <>
            <ExecuteBtn workflowId={workflowId} />
            {isPublished && <UnpublishBtn workflowId={workflowId} />}
            {!isPublished && (
              <>
                <SaveBtn workflowId={workflowId} />
                <PublishBtn workflowId={workflowId} />
              </>
            )}
          </>
        )}
      </div>
    </header>
  );
}
