"use client";

import React from "react";
import { TaskRegistry } from "@/lib/workflow/task/registry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoinsIcon } from "lucide-react";
import { TaskType } from "@/types/task";
import { usePalette } from "@/components/hooks/usePalette";

export default function TaskMenu() {
  const { primary, rgb, isDark } = usePalette();

  const allTasks = Object.values(TaskRegistry).filter(Boolean) as Array<
    NonNullable<(typeof TaskRegistry)[TaskType]>
  >;

  const sidebarBg = isDark ? "#12151d" : "#ffffff";
  const borderColor = isDark ? `rgba(${rgb}, 0.18)` : `rgba(${rgb}, 0.15)`;
  const headerBg = isDark
    ? `linear-gradient(135deg, #1a1d2a 0%, #12151d 100%)`
    : `linear-gradient(135deg, #ffffff 0%, rgba(${rgb}, 0.05) 100%)`;
  const scrollbarThumb = isDark ? `rgba(${rgb}, 0.30)` : `rgba(${rgb}, 0.25)`;

  return (
    <aside
      className="w-[340px] min-w-[340px] max-w-[340px] h-screen flex flex-col overflow-hidden"
      style={{
        background: sidebarBg,
        borderRight: `1px solid ${borderColor}`,
        boxShadow: isDark
          ? `4px 0 24px rgba(0,0,0,0.40), 1px 0 0 rgba(${rgb}, 0.08)`
          : `4px 0 16px rgba(${rgb}, 0.06), 1px 0 0 rgba(${rgb}, 0.10)`,
      }}
    >
      {/* ── Header ── */}
      <div
        className="p-4 sticky top-0 z-10"
        style={{
          background: headerBg,
          borderBottom: `1px solid ${borderColor}`,
          boxShadow: isDark
            ? `0 4px 12px rgba(0,0,0,0.30)`
            : `0 4px 12px rgba(${rgb}, 0.08)`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Palette-colored accent dot */}
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: primary,
              boxShadow: `0 0 8px rgba(${rgb}, 0.55)`,
            }}
          />
          <h2
            className="font-bold text-lg"
            style={{ color: isDark ? "#e8eaf0" : "#1a1d2a" }}
          >
            Tasks
          </h2>
          <span
            className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: `rgba(${rgb}, ${isDark ? 0.2 : 0.12})`,
              color: primary,
              border: `1px solid rgba(${rgb}, 0.25)`,
            }}
          >
            {allTasks.length}
          </span>
        </div>
      </div>

      {/* ── Scrollable list ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={
          {
            "--scrollbar-thumb": scrollbarThumb,
            "--scrollbar-track": "transparent",
            scrollbarWidth: "thin",
            scrollbarColor: `${scrollbarThumb} transparent`,
          } as React.CSSProperties
        }
      >
        <div className="p-3 pb-20 space-y-1.5">
          {allTasks.map((task) => (
            <TaskMenuBtn key={task.type} task={task} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function TaskMenuBtn({
  task,
}: {
  task: NonNullable<(typeof TaskRegistry)[TaskType]>;
}) {
  const { primary, rgb, accent, accentRgb, isDark } = usePalette();

  const onDragStart = (event: React.DragEvent, type: TaskType) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <button
      draggable
      onDragStart={(e) => onDragStart(e, task.type)}
      className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-grab active:cursor-grabbing text-left"
      style={{
        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = isDark
          ? `rgba(${rgb}, 0.12)`
          : `rgba(${rgb}, 0.07)`;
        el.style.border = `1px solid rgba(${rgb}, ${isDark ? 0.35 : 0.28})`;
        el.style.boxShadow = `0 2px 10px rgba(${rgb}, ${isDark ? 0.18 : 0.12})`;
        el.style.transform = "translateX(2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = isDark
          ? "rgba(255,255,255,0.03)"
          : "rgba(0,0,0,0.02)";
        el.style.border = `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`;
        el.style.boxShadow = "none";
        el.style.transform = "translateX(0)";
      }}
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: primary }}
      />

      {/* Icon */}
      <span
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md"
        style={{
          background: isDark ? `rgba(${rgb}, 0.15)` : `rgba(${rgb}, 0.10)`,
          border: `1px solid rgba(${rgb}, ${isDark ? 0.25 : 0.18})`,
          color: primary,
        }}
      >
        {task.icon ? (
          <task.icon size={15} />
        ) : (
          <div className="w-3 h-3 rounded-sm" style={{ background: primary }} />
        )}
      </span>

      {/* Label */}
      <span
        className="font-medium text-sm flex-1 truncate"
        style={{ color: isDark ? "#d4d8e8" : "#2a2d3a" }}
      >
        {task.label}
      </span>

      {/* Credits badge */}
      <span
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
        style={{
          background: isDark
            ? `rgba(${accentRgb}, 0.15)`
            : `rgba(${accentRgb}, 0.10)`,
          border: `1px solid rgba(${accentRgb}, 0.25)`,
          color: accent,
        }}
      >
        <CoinsIcon size={10} />
        {task.credits ?? 1}
      </span>
    </button>
  );
}
