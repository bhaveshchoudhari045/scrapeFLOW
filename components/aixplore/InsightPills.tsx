"use client";
import { useState } from "react";

interface Insight {
  insight: string;
  significance: "high" | "medium";
}

export function InsightPills({ insights }: { insights: Insight[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="ax-insight-list">
      {insights.map((item, i) => (
        <div
          key={i}
          className={`ax-insight-pill ${open === i ? "open" : ""}`}
          onClick={() => setOpen(open === i ? null : i)}
        >
          <div className="ax-insight-main">
            <span className={`ax-insight-dot ${item.significance}`} />
            <span className="ax-insight-text">{item.insight}</span>
            <span className={`ax-insight-badge ${item.significance}`}>
              {item.significance}
            </span>
            <span className="ax-insight-chevron">▼</span>
          </div>
          {open === i && (
            <div className="ax-insight-expand">
              {item.significance === "high"
                ? "Key finding — this pattern is worth acting on or investigating further."
                : "Supporting context — interesting signal worth keeping in mind."}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
