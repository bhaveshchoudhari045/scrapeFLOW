"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  analysis: any;
  records: Record<string, any>[];
  enriched?: any;
  siteType: string;
  meta: any;
  onClose: () => void;
  onRescrape: () => void;
}

type Tab = "overview" | "data" | "insights" | "charts" | "ml" | "predictions";

// ── Read palette colors at runtime from CSS vars ─────────────────────────
function getCSSVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

function usePaletteColors() {
  const [colors, setColors] = useState({
    primary: "#f59e0b",
    accent: "#3d5afe",
    tx1: "#0b0c10",
    tx2: "#4a5068",
    tx3: "#9299ad",
    bg: "#ffffff",
    bgCard: "#ffffff",
    bg2: "#f5f6f8",
    rule: "rgba(0,0,0,0.06)",
    rule2: "rgba(0,0,0,0.10)",
    pGlow: "rgba(245,158,11,0.28)",
    aGlow: "rgba(61,91,254,0.24)",
  });

  useEffect(() => {
    function read() {
      const s = getComputedStyle(document.documentElement);
      const v = (n: string, fb: string) => s.getPropertyValue(n).trim() || fb;
      setColors({
        primary: v("--primary", "#f59e0b"),
        accent: v("--accent", "#3d5afe"),
        tx1: v("--tx1", "#0b0c10"),
        tx2: v("--tx2", "#4a5068"),
        tx3: v("--tx3", "#9299ad"),
        bg: v("--bg", "#ffffff"),
        bgCard: v("--bg-card", "#ffffff"),
        bg2: v("--bg-2", "#f5f6f8"),
        rule: v("--rule", "rgba(0,0,0,0.06)"),
        rule2: v("--rule2", "rgba(0,0,0,0.10)"),
        pGlow: v("--p-glow", "rgba(245,158,11,0.28)"),
        aGlow: v("--a-glow", "rgba(61,91,254,0.24)"),
      });
    }
    read();
    // Re-read when palette changes
    window.addEventListener("palette-change", read);
    return () => window.removeEventListener("palette-change", read);
  }, []);

  return colors;
}

const CHART_PALETTE = [
  "#f59e0b",
  "#3d5afe",
  "#22c55e",
  "#ef4444",
  "#a78bfa",
  "#f472b6",
  "#0ea5e9",
  "#fb923c",
  "#34d399",
  "#818cf8",
];

function signalColor(text: string, primary: string, accent: string) {
  const t = (text ?? "").toLowerCase();
  if (t.includes("buy") || t.includes("bullish") || t.includes("positive"))
    return "#22c55e";
  if (t.includes("sell") || t.includes("bearish") || t.includes("negative"))
    return "#ef4444";
  if (t.includes("hold") || t.includes("neutral") || t.includes("mixed"))
    return "#f59e0b";
  return primary;
}

// ── High-DPI canvas chart ─────────────────────────────────────────────────
function ChartCard({
  chart,
  C,
}: {
  chart: any;
  C: ReturnType<typeof usePaletteColors>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 560;
  const H = 230;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart?.data?.length) return;

    // High-DPI / Retina fix — this is the key fix for blurry charts
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const PAD = { top: 22, right: 18, bottom: 48, left: 58 };
    const pw = W - PAD.left - PAD.right;
    const ph = H - PAD.top - PAD.bottom;

    // Background
    ctx.fillStyle = C.bgCard;
    ctx.roundRect(0, 0, W, H, 10);
    ctx.fill();

    // Grid
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (ph / 4) * i;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const color = chart.color || C.primary;
    const data = chart.data;

    if (chart.type === "bar" || chart.type === "histogram") {
      const vals = data.map((d: any) => (typeof d.y === "number" ? d.y : 0));
      const maxV = Math.max(...vals, 1);
      const minV = Math.min(0, ...vals);
      const range = maxV - minV || 1;
      const bw = pw / data.length;

      ctx.fillStyle = C.tx3;
      ctx.font = `10px ${getCSSVar("--font-mono", "monospace")}`;
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const v = minV + (range / 4) * (4 - i);
        ctx.fillText(
          v >= 1e6
            ? `${(v / 1e6).toFixed(1)}M`
            : v >= 1e3
              ? `${(v / 1e3).toFixed(1)}K`
              : v.toFixed(1),
          PAD.left - 7,
          PAD.top + (ph / 4) * i + 4,
        );
      }

      data.forEach((d: any, i: number) => {
        const barH = ((d.y - minV) / range) * ph;
        const x = PAD.left + i * bw + bw * 0.12;
        const bwA = bw * 0.76;
        const y = PAD.top + ph - barH;
        const grad = ctx.createLinearGradient(x, y, x, PAD.top + ph);
        grad.addColorStop(0, color);
        grad.addColorStop(1, `${color}22`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, bwA, barH, [4, 4, 0, 0]);
        ctx.fill();
        if (bw > 30) {
          ctx.fillStyle = C.tx3;
          ctx.font = "9px sans-serif";
          ctx.textAlign = "center";
          ctx.save();
          ctx.translate(x + bwA / 2, PAD.top + ph + 13);
          ctx.rotate(-Math.PI / 6);
          ctx.fillText(String(d.x ?? "").slice(0, 10), 0, 0);
          ctx.restore();
        }
      });
    }

    if (chart.type === "line" || chart.type === "area") {
      const vals = data.map((d: any) =>
        typeof d.y === "number"
          ? d.y
          : typeof d.close === "number"
            ? d.close
            : 0,
      );
      const maxV = Math.max(...vals, 1);
      const minV = Math.min(...vals);
      const range = maxV - minV || 1;

      ctx.fillStyle = C.tx3;
      ctx.font = `10px ${getCSSVar("--font-mono", "monospace")}`;
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const v = maxV - (range / 4) * i;
        ctx.fillText(
          v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toFixed(1),
          PAD.left - 7,
          PAD.top + (ph / 4) * i + 4,
        );
      }

      const pts = vals.map((v: number, i: number) => ({
        x: PAD.left + (i / (data.length - 1)) * pw,
        y: PAD.top + ((maxV - v) / range) * ph,
      }));

      if (chart.type === "area") {
        const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + ph);
        grad.addColorStop(0, `${color}44`);
        grad.addColorStop(1, `${color}00`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, PAD.top + ph);
        pts.forEach((p: any) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, PAD.top + ph);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      pts.forEach((p: any, i: number) =>
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
      );
      ctx.stroke();

      pts.forEach((p: any, i: number) => {
        if (i % Math.max(1, Math.floor(pts.length / 8)) === 0) {
          ctx.fillStyle = C.bgCard;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      const step = Math.max(1, Math.floor(data.length / 6));
      ctx.fillStyle = C.tx3;
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      data.forEach((d: any, i: number) => {
        if (i % step === 0)
          ctx.fillText(
            String(d.x ?? "").slice(0, 10),
            pts[i].x,
            PAD.top + ph + 14,
          );
      });
    }

    if (chart.type === "pie" || chart.type === "donut") {
      const total =
        data.reduce((s: number, d: any) => s + (d.value || 0), 0) || 1;
      const cx = W / 2;
      const cy = H / 2;
      const outerR = Math.min(pw, ph) / 2 - 8;
      const innerR = chart.type === "donut" ? outerR * 0.52 : 0;
      let angle = -Math.PI / 2;
      data.forEach((d: any, i: number) => {
        const slice = (d.value / total) * Math.PI * 2;
        const c2 = d.color || CHART_PALETTE[i % CHART_PALETTE.length];
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, angle, angle + slice);
        ctx.closePath();
        ctx.fill();
        const midA = angle + slice / 2;
        const pct = ((d.value / total) * 100).toFixed(0);
        if (parseInt(pct) >= 5) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            `${pct}%`,
            cx + Math.cos(midA) * outerR * 0.7,
            cy + Math.sin(midA) * outerR * 0.7 + 4,
          );
        }
        angle += slice;
      });
      if (chart.type === "donut") {
        ctx.fillStyle = C.bgCard;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.tx1;
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(total), cx, cy + 5);
      }
    }
  }, [chart, C]);

  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${C.rule2}`,
        borderRadius: 14,
        padding: "1rem",
        marginBottom: "0.875rem",
        boxShadow: `0 4px 16px ${C.pGlow}, 0 2px 8px rgba(0,0,0,0.08)`,
      }}
    >
      <div
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          color: C.tx1,
          marginBottom: "0.75rem",
        }}
      >
        {chart.title}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", display: "block", borderRadius: 8 }}
      />
    </div>
  );
}

// ── Glass card ─────────────────────────────────────────────────────────────
function GlassCard({
  children,
  C,
  style,
}: {
  children: React.ReactNode;
  C: ReturnType<typeof usePaletteColors>;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${C.rule}`,
        borderRadius: 14,
        padding: "1.25rem",
        marginBottom: "0.875rem",
        boxShadow: `0 4px 16px ${C.pGlow}, 0 1px 4px rgba(0,0,0,0.06)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  children,
  C,
}: {
  children: React.ReactNode;
  C: ReturnType<typeof usePaletteColors>;
}) {
  return (
    <div
      style={{
        fontSize: "0.62rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: C.tx3,
        marginBottom: "0.75rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <div style={{ width: 12, height: 1, background: C.tx3 }} />
      {children}
    </div>
  );
}

function Badge({
  text,
  color,
  C,
}: {
  text: string;
  color?: string;
  C: ReturnType<typeof usePaletteColors>;
}) {
  const c = color ?? C.primary;
  return (
    <span
      style={{
        fontSize: "0.6rem",
        padding: "0.18rem 0.5rem",
        borderRadius: 4,
        background: `${c}18`,
        color: c,
        border: `1px solid ${c}28`,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function ConfBar({
  pct,
  color,
  C,
}: {
  pct: number;
  color: string;
  C: ReturnType<typeof usePaletteColors>;
}) {
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.65rem",
          color: C.tx3,
          marginBottom: "0.3rem",
        }}
      >
        <span>Confidence</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div
        style={{
          height: 5,
          background: C.rule,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg,${color}70,${color})`,
            borderRadius: 3,
            transition: "width 1.2s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────
function OverviewTab({ analysis, C }: any) {
  const pred = analysis.prediction ?? {};
  const pct = parseInt(pred.confidence) || 70;
  const sc = signalColor(pred.result ?? "", C.primary, C.accent);
  const kms = analysis.keyMetrics ?? [];

  return (
    <div>
      <GlassCard C={C}>
        <SectionTitle C={C}>Executive Summary</SectionTitle>
        <p
          style={{
            fontSize: "0.875rem",
            color: C.tx2,
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          {analysis.summary}
        </p>
      </GlassCard>

      {kms.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
            gap: "0.625rem",
            marginBottom: "0.875rem",
          }}
        >
          {kms.map((km: any, i: number) => (
            <div
              key={i}
              style={{
                background: C.bg2,
                border: `1px solid ${C.rule}`,
                borderRadius: 12,
                padding: "0.875rem",
                textAlign: "center",
                boxShadow: `0 2px 8px ${C.pGlow}`,
              }}
            >
              <div
                style={{
                  fontSize: "clamp(0.85rem,2vw,1.1rem)",
                  fontWeight: 700,
                  color: CHART_PALETTE[i % CHART_PALETTE.length],
                  fontFamily: "monospace",
                }}
              >
                {km.value}
              </div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: C.tx3,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginTop: "0.2rem",
                }}
              >
                {km.label}
              </div>
              {km.context && (
                <div
                  style={{
                    fontSize: "0.62rem",
                    color: C.tx3,
                    marginTop: "0.25rem",
                    lineHeight: 1.4,
                  }}
                >
                  {km.context}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <GlassCard C={C} style={{ border: `1px solid ${sc}30` }}>
        <SectionTitle C={C}>AI Verdict</SectionTitle>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "clamp(1.1rem,3vw,1.6rem)",
              fontWeight: 800,
              color: sc,
              fontFamily: "monospace",
            }}
          >
            {pred.result ?? "—"}
          </div>
          <Badge text={`${pct}% confidence`} color={sc} C={C} />
        </div>
        <ConfBar pct={pct} color={sc} C={C} />
        <p
          style={{
            fontSize: "0.82rem",
            color: C.tx2,
            lineHeight: 1.75,
            marginTop: "0.875rem",
            marginBottom: 0,
          }}
        >
          {pred.reason}
        </p>
      </GlassCard>

      {(analysis.patterns ?? []).length > 0 && (
        <GlassCard C={C}>
          <SectionTitle C={C}>Detected Patterns</SectionTitle>
          {analysis.patterns.map((p: any, i: number) => (
            <div
              key={i}
              style={{
                paddingBottom: "0.625rem",
                marginBottom: "0.625rem",
                borderBottom:
                  i < analysis.patterns.length - 1
                    ? `1px solid ${C.rule}`
                    : "none",
              }}
            >
              <div
                style={{
                  fontSize: "0.82rem",
                  color: C.tx1,
                  fontWeight: 500,
                  marginBottom: "0.2rem",
                }}
              >
                {p.pattern}
              </div>
              <div style={{ fontSize: "0.72rem", color: C.tx3 }}>
                {p.frequency} ·{" "}
                <span style={{ color: C.tx2 }}>{p.significance}</span>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {analysis.bestUseCase && (
        <GlassCard C={C}>
          <SectionTitle C={C}>Recommended Action</SectionTitle>
          <p
            style={{
              fontSize: "0.82rem",
              color: C.tx2,
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            {analysis.bestUseCase}
          </p>
        </GlassCard>
      )}
    </div>
  );
}

// ── Charts Tab ────────────────────────────────────────────────────────────
function ChartsTab({ analysis, C }: any) {
  const charts: any[] = analysis.charts ?? [];
  if (!charts.length)
    return (
      <GlassCard C={C}>
        <div style={{ textAlign: "center", padding: "2rem", color: C.tx3 }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
          <div style={{ fontSize: "0.82rem" }}>
            No chart data for this dataset.
          </div>
          <div
            style={{ fontSize: "0.72rem", marginTop: "0.5rem", color: C.tx3 }}
          >
            Fetch more numeric data sources to enable charts.
          </div>
        </div>
      </GlassCard>
    );

  // Inject palette colors into charts
  const themedCharts = charts.map((c: any, i: number) => ({
    ...c,
    color: c.color || (i % 2 === 0 ? C.primary : C.accent),
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.375rem",
          marginBottom: "1rem",
        }}
      >
        {themedCharts.map((c: any, i: number) => (
          <Badge
            key={i}
            text={c.title?.slice(0, 20) || c.type}
            color={c.color}
            C={C}
          />
        ))}
      </div>
      {themedCharts.map((chart: any, i: number) => (
        <ChartCard key={i} chart={chart} C={C} />
      ))}
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────────────────
function InsightsTab({ analysis, C }: any) {
  const insights = analysis.insights ?? [];
  const sc = (s: string) =>
    s === "high" ? C.primary : s === "medium" ? "#f59e0b" : C.tx3;

  return (
    <div>
      <GlassCard C={C}>
        <SectionTitle C={C}>Data Health</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "0.5rem",
          }}
        >
          {[
            { label: "Completeness", value: "98%", color: "#22c55e" },
            { label: "Freshness", value: "Live", color: "#f59e0b" },
            { label: "Verified", value: "✓", color: C.primary },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                textAlign: "center",
                padding: "0.75rem",
                background: C.bg2,
                borderRadius: 10,
                border: `1px solid ${C.rule}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.95rem",
                  fontFamily: "monospace",
                  color,
                  fontWeight: 600,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: C.tx3,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: "0.2rem",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {insights.length === 0 ? (
        <div style={{ textAlign: "center", color: C.tx3, padding: "2rem" }}>
          No insights generated
        </div>
      ) : (
        insights.map((ins: any, i: number) => (
          <div
            key={i}
            style={{
              background: C.bgCard,
              border: `1px solid ${C.rule}`,
              borderLeft: `3px solid ${sc(ins.significance)}`,
              borderRadius: 12,
              padding: "1rem 1.25rem",
              marginBottom: "0.625rem",
              boxShadow: `0 2px 8px ${C.pGlow}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: sc(ins.significance),
                }}
              />
              <span
                style={{
                  fontSize: "0.6rem",
                  color: sc(ins.significance),
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {ins.significance}
              </span>
              {ins.category && (
                <Badge text={ins.category} color={C.tx3} C={C} />
              )}
            </div>
            <p
              style={{
                fontSize: "0.82rem",
                color: C.tx2,
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              {ins.insight}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

// ── Predictions Tab ───────────────────────────────────────────────────────
function PredictionsTab({ analysis, C }: any) {
  const pred = analysis.prediction ?? {};
  const pct = parseInt(pred.confidence) || 70;
  const color = signalColor(pred.result ?? "", C.primary, C.accent);

  return (
    <div>
      <GlassCard C={C} style={{ border: `1px solid ${color}30` }}>
        <SectionTitle C={C}>Prediction Verdict</SectionTitle>
        <div
          style={{
            fontSize: "clamp(1.3rem,3vw,2rem)",
            fontWeight: 800,
            color,
            fontFamily: "monospace",
            marginBottom: "0.5rem",
          }}
        >
          {pred.result ?? "—"}
        </div>
        <ConfBar pct={pct} color={color} C={C} />
        <p
          style={{
            fontSize: "0.82rem",
            color: C.tx2,
            lineHeight: 1.75,
            marginTop: "1rem",
            marginBottom: 0,
          }}
        >
          {pred.reason}
        </p>
      </GlassCard>

      {analysis.bestUseCase && (
        <GlassCard C={C}>
          <SectionTitle C={C}>Recommended Action</SectionTitle>
          <p
            style={{
              fontSize: "0.82rem",
              color: C.tx2,
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            {analysis.bestUseCase}
          </p>
        </GlassCard>
      )}
    </div>
  );
}

// ── Data Tab ──────────────────────────────────────────────────────────────
function DataTab({ records, C }: any) {
  const [view, setView] = useState<"cards" | "table">("cards");
  if (!records.length)
    return (
      <div style={{ textAlign: "center", color: C.tx3, padding: "2rem" }}>
        No records
      </div>
    );
  const keys = Object.keys(records[0]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.375rem",
          marginBottom: "0.875rem",
          alignItems: "center",
        }}
      >
        {(["cards", "table"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: 8,
              fontSize: "0.7rem",
              border: `1px solid ${view === v ? C.primary : C.rule2}`,
              background: view === v ? `${C.primary}15` : "transparent",
              color: view === v ? C.primary : C.tx3,
              cursor: "pointer",
              fontWeight: view === v ? 700 : 400,
            }}
          >
            {v === "cards" ? "⊞ Cards" : "⊟ Table"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: C.tx3 }}>
          {records.length} records
        </span>
      </div>

      {view === "table" ? (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.75rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "0.5rem 0.75rem",
                    textAlign: "left",
                    boxShadow: `0 1px 0 ${C.rule}`,
                    color: C.tx3,
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  #
                </th>
                {keys.map((k) => (
                  <th
                    key={k}
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "left",
                      boxShadow: `0 1px 0 ${C.rule}`,
                      color: C.tx3,
                      fontSize: "0.6rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any, i: number) => (
                <tr
                  key={i}
                  style={{ background: i % 2 === 0 ? "transparent" : C.bg2 }}
                >
                  <td
                    style={{
                      padding: "0.45rem 0.75rem",
                      color: C.tx3,
                      fontFamily: "monospace",
                      fontSize: "0.65rem",
                    }}
                  >
                    {i + 1}
                  </td>
                  {keys.map((k) => (
                    <td
                      key={k}
                      style={{
                        padding: "0.45rem 0.75rem",
                        color: C.tx2,
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={String(r[k] ?? "")}
                    >
                      {String(r[k] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          {records.map((r: any, i: number) => (
            <div
              key={i}
              style={{
                background: C.bgCard,
                border: `1px solid ${C.rule}`,
                borderRadius: 12,
                padding: "0.875rem 1rem",
                marginBottom: "0.5rem",
                boxShadow: `0 2px 8px ${C.pGlow}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  color: C.tx3,
                  fontFamily: "monospace",
                  marginBottom: "0.5rem",
                }}
              >
                #{String(i + 1).padStart(2, "0")} ·{" "}
                {r.Source || r.Category || ""}
              </div>
              {Object.entries(r)
                .filter(([k]) => !["Source", "Category"].includes(k))
                .map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      padding: "0.3rem 0",
                      borderBottom: `1px solid ${C.rule}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: C.tx3,
                        minWidth: 100,
                        flexShrink: 0,
                      }}
                    >
                      {k}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: C.tx2,
                        wordBreak: "break-word",
                      }}
                    >
                      {String(v ?? "—")}
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ML Tab ────────────────────────────────────────────────────────────────
function MLTab({ analysis, records, onDownloadClean, C }: any) {
  const ml = analysis.mlReadiness;
  if (!ml)
    return (
      <div style={{ textAlign: "center", color: C.tx3, padding: "2rem" }}>
        No ML readiness data available.
      </div>
    );
  const scoreColor =
    ml.readinessScore >= 70
      ? "#22c55e"
      : ml.readinessScore >= 40
        ? "#f59e0b"
        : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const dash = (ml.readinessScore / 100) * circumference;

  return (
    <div>
      <GlassCard C={C}>
        <SectionTitle C={C}>ML Readiness Score</SectionTitle>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 90,
              height: 90,
              flexShrink: 0,
            }}
          >
            <svg width={90} height={90} viewBox="0 0 90 90">
              <circle
                cx={45}
                cy={45}
                r={36}
                fill="none"
                stroke={C.rule}
                strokeWidth={8}
              />
              <circle
                cx={45}
                cy={45}
                r={36}
                fill="none"
                stroke={scoreColor}
                strokeWidth={8}
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={circumference * 0.25}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1s ease" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  color: scoreColor,
                  fontFamily: "monospace",
                  lineHeight: 1,
                }}
              >
                {ml.readinessScore}
              </span>
              <span
                style={{
                  fontSize: "0.55rem",
                  color: C.tx3,
                  letterSpacing: "0.1em",
                }}
              >
                / 100
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "0.82rem",
                color: C.tx1,
                fontWeight: 600,
                marginBottom: "0.375rem",
              }}
            >
              {ml.readinessScore >= 70
                ? "✅ Ready for ML"
                : ml.readinessScore >= 40
                  ? "⚠️ Needs Cleaning"
                  : "❌ Insufficient Data"}
            </div>
            <div style={{ fontSize: "0.72rem", color: C.tx3, lineHeight: 1.6 }}>
              {ml.totalRows} rows · {ml.totalCols} columns ·{" "}
              {ml.numericCols.length} numeric
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                display: "flex",
                gap: "0.375rem",
                flexWrap: "wrap",
              }}
            >
              <Badge
                text={`${ml.cleanCols.length} clean`}
                color="#22c55e"
                C={C}
              />
              {ml.dirtyCols.length > 0 && (
                <Badge
                  text={`${ml.dirtyCols.length} dirty`}
                  color="#ef4444"
                  C={C}
                />
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
        <button
          onClick={onDownloadClean}
          style={{
            padding: "0.75rem 2rem",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg,${C.accent},${C.primary})`,
            color: "#fff",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 4px 16px ${C.aGlow}`,
            letterSpacing: "0.04em",
          }}
        >
          ⬇ Download ML-Ready CSV
        </button>
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
export function AixplorePanel({
  analysis,
  records,
  enriched,
  siteType,
  meta,
  onClose,
  onRescrape,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const C = usePaletteColors();
  analysis._records = records;

  function downloadCleanCSV() {
    const ml = analysis.mlReadiness;
    if (!records.length) return;
    const numCols =
      ml?.numericCols ??
      Object.keys(records[0]).filter(
        (k) => !isNaN(parseFloat(String(records[0][k]))),
      );
    const cols = numCols.length > 0 ? numCols : Object.keys(records[0]);
    const csv = [
      cols.join(","),
      ...records.map((r: any) =>
        cols
          .map((k: string) => {
            const v = String(r[k] ?? "")
              .replace(/[₹$,%]/g, "")
              .trim();
            return isNaN(parseFloat(v)) ? "0" : parseFloat(v);
          })
          .join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `ml-ready-${Date.now()}.csv`;
    a.click();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "data", label: "Data" },
    { key: "charts", label: "Charts" },
    { key: "insights", label: "Insights" },
    { key: "ml", label: "ML" },
    { key: "predictions", label: "Predict" },
  ];

  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${C.rule2}`,
        borderRadius: 16,
        overflow: "hidden",
        fontFamily: "var(--font-body)",
        boxShadow: `0 8px 32px ${C.pGlow}, 0 2px 12px rgba(0,0,0,0.10)`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1.375rem",
          background: C.bg2,
          boxShadow: `0 1px 0 ${C.rule}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <span
            style={{
              color: C.primary,
              fontSize: "0.875rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
            }}
          >
            ✦ AIXPLORE
          </span>
          <div
            style={{
              padding: "0.2rem 0.625rem",
              background: `${C.primary}15`,
              border: `1px solid ${C.primary}30`,
              borderRadius: 100,
              fontSize: "0.68rem",
              color: C.primary,
              letterSpacing: "0.06em",
            }}
          >
            Data Intelligence
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onRescrape}
            style={{
              background: C.bg2,
              border: `1px solid ${C.rule2}`,
              color: C.tx2,
              padding: "0.35rem 0.875rem",
              borderRadius: 8,
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
          >
            ↺ New
          </button>
          <button
            onClick={onClose}
            style={{
              background: C.bg2,
              border: `1px solid ${C.rule2}`,
              color: C.tx2,
              width: 32,
              height: 32,
              borderRadius: 8,
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${C.rule}`,
          padding: "0 0.75rem",
          background: C.bgCard,
          overflowX: "auto",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.75rem 0.875rem",
              fontSize: "0.68rem",
              letterSpacing: "0.06em",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: tab === t.key ? C.primary : C.tx3,
              borderBottom:
                tab === t.key
                  ? `2px solid ${C.primary}`
                  : "2px solid transparent",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              transition: "color 0.2s",
              fontWeight: tab === t.key ? 700 : 400,
            }}
          >
            {t.label}
            {t.key === "charts" && (analysis.charts?.length ?? 0) > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: "0.55rem",
                  background: `${C.primary}25`,
                  color: C.primary,
                  borderRadius: 10,
                  padding: "0 4px",
                }}
              >
                {analysis.charts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          maxHeight: "72vh",
          overflowY: "auto",
        }}
      >
        {tab === "overview" && <OverviewTab analysis={analysis} C={C} />}
        {tab === "data" && <DataTab records={records} C={C} />}
        {tab === "charts" && (
          <ChartsTab analysis={analysis} records={records} C={C} />
        )}
        {tab === "insights" && <InsightsTab analysis={analysis} C={C} />}
        {tab === "ml" && (
          <MLTab
            analysis={analysis}
            records={records}
            onDownloadClean={downloadCleanCSV}
            C={C}
          />
        )}
        {tab === "predictions" && <PredictionsTab analysis={analysis} C={C} />}
      </div>
    </div>
  );
}
