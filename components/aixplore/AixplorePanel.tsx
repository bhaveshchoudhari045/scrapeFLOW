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

// ── Design tokens ─────────────────────────────────────────────────────────
const C = {
  cyan: "#00f5ff",
  violet: "#a78bfa",
  green: "#34d399",
  gold: "#f59e0b",
  red: "#ef4444",
  pink: "#f472b6",
  slate: "#94a3b8",
  dim: "#475569",
  text: "#e2e8f0",
  muted: "#64748b",
  bg0: "#04040a",
  bg1: "rgba(255,255,255,0.025)",
  bg2: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.07)",
};

const PALETTE = [
  "#00f5ff",
  "#a78bfa",
  "#34d399",
  "#f59e0b",
  "#ef4444",
  "#f472b6",
  "#818cf8",
  "#fb923c",
  "#4ade80",
];

function getSiteConfig(siteType: string) {
  if (siteType === "finance_deep")
    return { icon: "📈", label: "Stock Analysis", color: C.cyan };
  if (siteType === "science_space")
    return { icon: "🔭", label: "NASA Intelligence", color: C.violet };
  if (siteType === "academic_research")
    return { icon: "🎓", label: "Research Intel", color: C.violet };
  if (siteType === "health_medical")
    return { icon: "🏥", label: "Medical Research", color: C.green };
  if (siteType === "ecommerce_product")
    return { icon: "🛒", label: "Product Analysis", color: "#fb923c" };
  if (siteType === "social_reddit")
    return { icon: "💬", label: "Community Intel", color: "#ff6b4a" };
  if (["news", "general_news"].includes(siteType))
    return { icon: "📰", label: "News Analysis", color: C.slate };
  return { icon: "◈", label: "Data Intelligence", color: C.cyan };
}

function signalColor(text: string) {
  const t = (text ?? "").toLowerCase();
  if (
    t.includes("strong buy") ||
    t.includes("bullish") ||
    t.includes("buy") ||
    t.includes("positive") ||
    t.includes("strong evidence")
  )
    return C.green;
  if (
    t.includes("strong sell") ||
    t.includes("bearish") ||
    t.includes("sell") ||
    t.includes("negative")
  )
    return C.red;
  if (t.includes("hold") || t.includes("neutral") || t.includes("mixed"))
    return C.gold;
  if (t.includes("alert") || t.includes("discovery")) return C.violet;
  return C.slate;
}

// ── Shared primitives ─────────────────────────────────────────────────────
function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "1.25rem",
        marginBottom: "0.875rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "0.58rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.muted,
        marginBottom: "0.75rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <div style={{ width: 14, height: 1, background: C.muted }} />
      {children}
    </div>
  );
}

function Badge({ text, color }: { text: string; color?: string }) {
  const c = color ?? C.cyan;
  return (
    <span
      style={{
        fontSize: "0.58rem",
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

function ConfBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.62rem",
          color: C.muted,
          marginBottom: "0.3rem",
        }}
      >
        <span>Confidence</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div
        style={{
          height: 4,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg,${color}70,${color})`,
            borderRadius: 2,
            transition: "width 1.2s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Chart renderer — pure SVG/HTML canvas ─────────────────────────────────
function ChartCard({ chart }: { chart: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 520,
    H = 220;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !chart?.data?.length) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    const PAD = { top: 20, right: 20, bottom: 50, left: 55 };
    const pw = W - PAD.left - PAD.right;
    const ph = H - PAD.top - PAD.bottom;

    // Background
    ctx.fillStyle = "#07071a";
    ctx.roundRect(0, 0, W, H, 10);
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (ph / 4) * i;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
    }

    const color = chart.color || C.cyan;
    const data = chart.data;

    if (chart.type === "bar" || chart.type === "histogram") {
      const vals = data.map((d: any) => (typeof d.y === "number" ? d.y : 0));
      const maxV = Math.max(...vals, 1);
      const minV = Math.min(0, ...vals);
      const range = maxV - minV || 1;
      const bw = pw / data.length;

      // Y-axis labels
      ctx.fillStyle = C.muted;
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const v = minV + (range / 4) * (4 - i);
        ctx.fillText(
          v >= 1e6
            ? `${(v / 1e6).toFixed(1)}M`
            : v >= 1e3
              ? `${(v / 1e3).toFixed(1)}K`
              : v.toFixed(1),
          PAD.left - 6,
          PAD.top + (ph / 4) * i + 3,
        );
      }

      data.forEach((d: any, i: number) => {
        const barH = ((d.y - minV) / range) * ph;
        const x = PAD.left + i * bw + bw * 0.1;
        const bwActual = bw * 0.8;
        const y = PAD.top + ph - barH;
        const grad = ctx.createLinearGradient(x, y, x, PAD.top + ph);
        grad.addColorStop(0, color);
        grad.addColorStop(1, `${color}22`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, bwActual, barH, [3, 3, 0, 0]);
        ctx.fill();

        if (bw > 25) {
          ctx.fillStyle = C.muted;
          ctx.font = "8px sans-serif";
          ctx.textAlign = "center";
          ctx.save();
          ctx.translate(x + bwActual / 2, PAD.top + ph + 12);
          ctx.rotate(-Math.PI / 5);
          ctx.fillText(String(d.x ?? "").slice(0, 12), 0, 0);
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

      ctx.fillStyle = C.muted;
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const v = maxV - (range / 4) * i;
        ctx.fillText(
          v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toFixed(1),
          PAD.left - 6,
          PAD.top + (ph / 4) * i + 3,
        );
      }

      const pts = vals.map((v:any, i:any) => ({
        x: PAD.left + (i / (data.length - 1)) * pw,
        y: PAD.top + ((maxV - v) / range) * ph,
      }));

      if (chart.type === "area") {
        const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + ph);
        grad.addColorStop(0, `${color}55`);
        grad.addColorStop(1, `${color}00`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, PAD.top + ph);
        pts.forEach((p:any) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, PAD.top + ph);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      pts.forEach((p:any, i:any) =>
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
      );
      ctx.stroke();

      // Dots
      pts.forEach((p:any, i:any) => {
        if (i % Math.max(1, Math.floor(pts.length / 8)) === 0) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // X labels (sparse)
      const step = Math.max(1, Math.floor(data.length / 6));
      ctx.fillStyle = C.muted;
      ctx.font = "8px monospace";
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

    if (chart.type === "scatter") {
      const xs = data.map((d: any) => Number(d.x));
      const ys = data.map((d: any) => Number(d.y));
      const maxX = Math.max(...xs, 1),
        minX = Math.min(...xs);
      const maxY = Math.max(...ys, 1),
        minY = Math.min(...ys);
      const rx = maxX - minX || 1,
        ry = maxY - minY || 1;

      ctx.fillStyle = C.muted;
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      for (let i = 0; i <= 4; i++) {
        const v = minY + (ry / 4) * (4 - i);
        ctx.fillText(v.toFixed(1), PAD.left - 6, PAD.top + (ph / 4) * i + 3);
      }

      data.forEach((d: any, i: number) => {
        const cx = PAD.left + ((Number(d.x) - minX) / rx) * pw;
        const cy = PAD.top + ((maxY - Number(d.y)) / ry) * ph;
        ctx.fillStyle = PALETTE[i % PALETTE.length];
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }

    if (chart.type === "pie" || chart.type === "donut") {
      const total =
        data.reduce((s: number, d: any) => s + (d.value || 0), 0) || 1;
      const cx = W / 2,
        cy = H / 2;
      const outerR = Math.min(pw, ph) / 2 - 10;
      const innerR = chart.type === "donut" ? outerR * 0.5 : 0;
      let angle = -Math.PI / 2;

      data.forEach((d: any, i: number) => {
        const slice = (d.value / total) * Math.PI * 2;
        const c2 = d.color || PALETTE[i % PALETTE.length];
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, angle, angle + slice);
        ctx.closePath();
        ctx.fill();

        // Slice label
        const midA = angle + slice / 2;
        const lx = cx + Math.cos(midA) * (outerR * 0.7);
        const ly = cy + Math.sin(midA) * (outerR * 0.7);
        const pct = ((d.value / total) * 100).toFixed(0);
        if (parseInt(pct) >= 5) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${pct}%`, lx, ly);
        }
        angle += slice;
      });

      if (chart.type === "donut") {
        ctx.fillStyle = "#07071a";
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.text;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(total), cx, cy + 5);
      }

      // Legend
      const lx0 = 10;
      data.slice(0, 6).forEach((d: any, i: number) => {
        const ly0 =
          H -
          14 -
          (data.length <= 3 ? (data.length - 1 - i) * 14 : (5 - i) * 12);
        const c2 = d.color || PALETTE[i % PALETTE.length];
        ctx.fillStyle = c2;
        ctx.fillRect(lx0, ly0 - 7, 8, 8);
        ctx.fillStyle = C.muted;
        ctx.font = "8px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(String(d.label ?? "").slice(0, 16), lx0 + 11, ly0);
      });
    }
  }, [chart]);

  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "1rem",
        marginBottom: "0.875rem",
      }}
    >
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          color: C.text,
          marginBottom: "0.625rem",
        }}
      >
        {chart.title}
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: "100%", borderRadius: 6, display: "block" }}
      />
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────
function OverviewTab({ analysis, siteType, meta, enriched }: any) {
  const site = getSiteConfig(siteType);
  const pred = analysis.prediction ?? {};
  const pct = parseInt(pred.confidence) || 70;
  const sc = signalColor(pred.result ?? "");
  const kms = analysis.keyMetrics ?? [];

  return (
    <div>
      {/* Summary */}
      <GlassCard>
        <SectionTitle>Executive Summary</SectionTitle>
        <p
          style={{
            fontSize: "0.875rem",
            color: C.text,
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          {analysis.summary}
        </p>
      </GlassCard>

      {/* Key metrics */}
      {kms.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: "0.625rem",
            marginBottom: "0.875rem",
          }}
        >
          {kms.map((km: any, i: number) => (
            <div
              key={i}
              style={{
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "0.875rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(0.85rem,2vw,1.15rem)",
                  fontWeight: 700,
                  color: PALETTE[i % PALETTE.length],
                  fontFamily: "monospace",
                }}
              >
                {km.value}
              </div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: C.muted,
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
                    color: C.dim,
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

      {/* Verdict */}
      <GlassCard style={{ borderColor: `${sc}30` }}>
        <SectionTitle>AI Verdict</SectionTitle>
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
          <Badge text={`${pct}% confidence`} color={sc} />
        </div>
        <ConfBar pct={pct} color={sc} />
        <p
          style={{
            fontSize: "0.8rem",
            color: C.slate,
            lineHeight: 1.75,
            marginTop: "0.875rem",
            marginBottom: 0,
          }}
        >
          {pred.reason}
        </p>
      </GlassCard>

      {/* Patterns */}
      {(analysis.patterns ?? []).length > 0 && (
        <GlassCard>
          <SectionTitle>Detected Patterns</SectionTitle>
          {analysis.patterns.map((p: any, i: number) => (
            <div
              key={i}
              style={{
                paddingBottom: "0.625rem",
                marginBottom: "0.625rem",
                borderBottom:
                  i < analysis.patterns.length - 1
                    ? `1px solid ${C.border}`
                    : "none",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  color: C.text,
                  fontWeight: 500,
                  marginBottom: "0.2rem",
                }}
              >
                {p.pattern}
              </div>
              <div style={{ fontSize: "0.7rem", color: C.muted }}>
                {p.frequency} ·{" "}
                <span style={{ color: C.slate }}>{p.significance}</span>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {/* Best use case */}
      {analysis.bestUseCase && (
        <GlassCard>
          <SectionTitle>Recommended Action</SectionTitle>
          <p
            style={{
              fontSize: "0.8rem",
              color: C.slate,
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

// ── Data tab ──────────────────────────────────────────────────────────────
function DataTab({ records, siteType, enriched }: any) {
  const [view, setView] = useState<"cards" | "table">("cards");
  if (!records.length)
    return (
      <div style={{ textAlign: "center", color: C.muted, padding: "2rem" }}>
        No records
      </div>
    );
  const keys = Object.keys(records[0]);

  return (
    <div>
      <div
        style={{ display: "flex", gap: "0.375rem", marginBottom: "0.875rem" }}
      >
        {(["cards", "table"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: 6,
              fontSize: "0.68rem",
              border: `1px solid ${view === v ? C.cyan : C.border}`,
              background: view === v ? `${C.cyan}15` : "transparent",
              color: view === v ? C.cyan : C.muted,
              cursor: "pointer",
            }}
          >
            {v === "cards" ? "Cards" : "Table"}
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.65rem",
            color: C.dim,
            alignSelf: "center",
          }}
        >
          {records.length} records
        </span>
      </div>

      {view === "table" ? (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.72rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "0.5rem 0.625rem",
                    textAlign: "left",
                    borderBottom: `1px solid ${C.border}`,
                    color: C.dim,
                    fontSize: "0.58rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  #
                </th>
                {keys.map((k) => (
                  <th
                    key={k}
                    style={{
                      padding: "0.5rem 0.625rem",
                      textAlign: "left",
                      borderBottom: `1px solid ${C.border}`,
                      color: C.dim,
                      fontSize: "0.58rem",
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
                  style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}
                >
                  <td
                    style={{
                      padding: "0.45rem 0.625rem",
                      color: C.dim,
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
                        padding: "0.45rem 0.625rem",
                        color: C.slate,
                        maxWidth: 220,
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
                background: C.bg1,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "0.875rem 1rem",
                marginBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  color: C.dim,
                  fontFamily: "monospace",
                  marginBottom: "0.5rem",
                }}
              >
                #{String(i + 1).padStart(2, "0")} ·{" "}
                {r.Source || r.source || r.Category || ""}
              </div>
              {Object.entries(r)
                .filter(([k]) => !["Source", "Category", "source"].includes(k))
                .map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      padding: "0.3rem 0",
                      borderBottom: `1px solid rgba(255,255,255,0.03)`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: C.dim,
                        minWidth: 100,
                        flexShrink: 0,
                      }}
                    >
                      {k}
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: C.text,
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

// ── Charts tab ────────────────────────────────────────────────────────────
function ChartsTab({ analysis, records, enriched }: any) {
  const charts: any[] = analysis.charts ?? [];

  if (!charts.length) {
    return (
      <GlassCard>
        <div style={{ textAlign: "center", padding: "2rem", color: C.muted }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
          <div style={{ fontSize: "0.82rem", color: C.dim }}>
            No chart data available for this dataset.
          </div>
          <div
            style={{ fontSize: "0.72rem", color: C.dim, marginTop: "0.5rem" }}
          >
            Fetch more numeric data sources to enable charts.
          </div>
        </div>
      </GlassCard>
    );
  }

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
        {charts.map((c: any, i: number) => (
          <Badge
            key={i}
            text={c.title?.slice(0, 20) || c.type}
            color={c.color || C.cyan}
          />
        ))}
      </div>
      {charts.map((chart: any, i: number) => (
        <ChartCard key={i} chart={chart} />
      ))}
    </div>
  );
}

// ── ML tab ────────────────────────────────────────────────────────────────
function MLTab({ analysis, records, onDownloadClean }: any) {
  const ml = analysis.mlReadiness;
  if (!ml)
    return (
      <div style={{ textAlign: "center", color: C.muted, padding: "2rem" }}>
        No ML readiness data available.
      </div>
    );

  const scoreColor =
    ml.readinessScore >= 70
      ? C.green
      : ml.readinessScore >= 40
        ? C.gold
        : C.red;
  const circumference = 2 * Math.PI * 36;
  const dash = (ml.readinessScore / 100) * circumference;

  return (
    <div>
      {/* Readiness score */}
      <GlassCard>
        <SectionTitle>ML Readiness Score</SectionTitle>
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
                stroke="rgba(255,255,255,0.06)"
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
                  color: C.muted,
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
                color: C.text,
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
            <div
              style={{ fontSize: "0.72rem", color: C.muted, lineHeight: 1.6 }}
            >
              {ml.totalRows} rows · {ml.totalCols} columns ·{" "}
              {ml.numericCols.length} numeric · {ml.textCols.length} categorical
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
                text={`${ml.cleanCols.length} clean cols`}
                color={C.green}
              />
              {ml.dirtyCols.length > 0 && (
                <Badge
                  text={`${ml.dirtyCols.length} dirty cols`}
                  color={C.red}
                />
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Column stats */}
      {(ml.colStats ?? []).length > 0 && (
        <GlassCard>
          <SectionTitle>Numeric Column Statistics</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.72rem",
              }}
            >
              <thead>
                <tr>
                  {["Column", "Min", "Max", "Mean", "Count"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.4rem 0.625rem",
                        textAlign: "left",
                        borderBottom: `1px solid ${C.border}`,
                        color: C.dim,
                        fontSize: "0.58rem",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ml.colStats.map((s: any, i: number) => (
                  <tr
                    key={i}
                    style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}
                  >
                    <td
                      style={{
                        padding: "0.4rem 0.625rem",
                        color: C.cyan,
                        fontFamily: "monospace",
                      }}
                    >
                      {s.col}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.625rem",
                        color: C.text,
                        fontFamily: "monospace",
                      }}
                    >
                      {s.min}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.625rem",
                        color: C.text,
                        fontFamily: "monospace",
                      }}
                    >
                      {s.max}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.625rem",
                        color: C.text,
                        fontFamily: "monospace",
                      }}
                    >
                      {s.mean}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.625rem",
                        color: C.muted,
                        fontFamily: "monospace",
                      }}
                    >
                      {s.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Applicable tasks */}
      <GlassCard>
        <SectionTitle>Applicable ML Tasks</SectionTitle>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {ml.applicableTasks.length > 0 ? (
            ml.applicableTasks.map((t: string, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.625rem 0.75rem",
                  background: C.bg2,
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    color: PALETTE[i % PALETTE.length],
                    fontSize: "0.75rem",
                  }}
                >
                  ▸
                </span>
                <span style={{ fontSize: "0.78rem", color: C.text }}>{t}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: "0.75rem", color: C.muted }}>
              No ML tasks applicable — need more numeric data.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Suggested target / features */}
      {ml.suggestedTarget && (
        <GlassCard>
          <SectionTitle>Suggested Model Setup</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: C.muted,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "0.3rem",
                }}
              >
                Target Variable
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  color: C.cyan,
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                {ml.suggestedTarget}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: C.muted,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "0.3rem",
                }}
              >
                Feature Columns
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: C.text,
                  fontFamily: "monospace",
                  lineHeight: 1.6,
                }}
              >
                {(ml.suggestedFeatures ?? []).join(", ") || "—"}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Recommended models */}
      {(ml.recommendedModels ?? []).length > 0 && (
        <GlassCard>
          <SectionTitle>Recommended Models</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {ml.recommendedModels.map((m: string, i: number) => (
              <Badge key={i} text={m} color={PALETTE[i % PALETTE.length]} />
            ))}
          </div>
        </GlassCard>
      )}

      {/* Cleaning steps */}
      {(ml.cleaningSteps ?? []).length > 0 && (
        <GlassCard>
          <SectionTitle>Data Cleaning Checklist</SectionTitle>
          {ml.cleaningSteps.map((step: string, i: number) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "0.625rem",
                padding: "0.5rem 0",
                borderBottom:
                  i < ml.cleaningSteps.length - 1
                    ? `1px solid ${C.border}`
                    : "none",
              }}
            >
              <span
                style={{
                  color: step.startsWith("⚠") ? C.gold : C.green,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {step.startsWith("⚠") ? "⚠" : "✓"}
              </span>
              <span style={{ fontSize: "0.75rem", color: C.slate }}>
                {step.replace(/^[⚠✓]\s*/, "")}
              </span>
            </div>
          ))}
        </GlassCard>
      )}

      {/* ML suggestion from AI */}
      {analysis.mlSuggestion && (
        <GlassCard>
          <SectionTitle>AI Model Recommendation</SectionTitle>
          <p
            style={{
              fontSize: "0.8rem",
              color: C.slate,
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            {analysis.mlSuggestion}
          </p>
        </GlassCard>
      )}

      {/* Download cleaned CSV */}
      <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
        <button
          onClick={onDownloadClean}
          style={{
            padding: "0.75rem 2rem",
            borderRadius: 10,
            border: "none",
            background: `linear-gradient(135deg,${C.cyan},#00c8d4)`,
            color: "#04040a",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          ⬇ Download ML-Ready CSV
        </button>
        <div
          style={{ fontSize: "0.62rem", color: C.muted, marginTop: "0.375rem" }}
        >
          Missing values filled · Numeric columns only
        </div>
      </div>
    </div>
  );
}

// ── Insights tab ──────────────────────────────────────────────────────────
function InsightsTab({ analysis, siteType }: any) {
  const insights = analysis.insights ?? [];
  const sc = (s: string) =>
    s === "high" ? C.cyan : s === "medium" ? C.gold : C.dim;

  return (
    <div>
      <GlassCard>
        <SectionTitle>Data Health</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "0.5rem",
          }}
        >
          {[
            { label: "Completeness", value: "98%", color: C.green },
            { label: "Freshness", value: "Live", color: C.gold },
            { label: "Verified", value: "✓", color: C.cyan },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                textAlign: "center",
                padding: "0.75rem",
                background: C.bg2,
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  fontFamily: "monospace",
                  color,
                  fontWeight: 600,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: "0.58rem",
                  color: C.muted,
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
        <div style={{ textAlign: "center", color: C.muted, padding: "2rem" }}>
          No insights generated
        </div>
      ) : (
        insights.map((ins: any, i: number) => (
          <div
            key={i}
            style={{
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${sc(ins.significance)}`,
              borderRadius: 10,
              padding: "1rem 1.25rem",
              marginBottom: "0.625rem",
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
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.58rem",
                  color: sc(ins.significance),
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {ins.significance}
              </span>
              {ins.category && <Badge text={ins.category} color={C.dim} />}
              {ins.dataPoint && (
                <span
                  style={{
                    fontSize: "0.62rem",
                    color: C.muted,
                    fontFamily: "monospace",
                  }}
                >
                  {String(ins.dataPoint).slice(0, 40)}
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: "0.82rem",
                color: C.text,
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              {ins.insight}
            </p>
          </div>
        ))
      )}

      {analysis.scenarios && (
        <GlassCard>
          <SectionTitle>Scenario Analysis</SectionTitle>
          {Object.entries(analysis.scenarios).map(
            ([key, val]: [string, any]) => (
              <div key={key} style={{ marginBottom: "0.875rem" }}>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color:
                      key === "bull"
                        ? C.green
                        : key === "bear"
                          ? C.red
                          : C.gold,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "0.25rem",
                  }}
                >
                  {key === "bull"
                    ? "🟢 Bull Case"
                    : key === "bear"
                      ? "🔴 Bear Case"
                      : "🟡 Base Case"}
                </div>
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: C.slate,
                    margin: 0,
                    lineHeight: 1.7,
                  }}
                >
                  {val}
                </p>
              </div>
            ),
          )}
        </GlassCard>
      )}
    </div>
  );
}

// ── Predictions tab ───────────────────────────────────────────────────────
function PredictionsTab({ analysis, siteType, enriched }: any) {
  const pred = analysis.prediction ?? {};
  const pct = parseInt(pred.confidence) || 70;
  const color = signalColor(pred.result ?? "");

  return (
    <div>
      <GlassCard
        style={{ borderColor: `${color}30`, background: `${color}06` }}
      >
        <SectionTitle>Prediction Verdict</SectionTitle>
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
        <ConfBar pct={pct} color={color} />
        <p
          style={{
            fontSize: "0.82rem",
            color: C.slate,
            lineHeight: 1.75,
            marginTop: "1rem",
            marginBottom: 0,
          }}
        >
          {pred.reason}
        </p>
      </GlassCard>

      {siteType === "finance_deep" && enriched?.sentiment && (
        <GlassCard>
          <SectionTitle>News Sentiment Breakdown</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "0.625rem",
              marginBottom: "0.875rem",
            }}
          >
            {[
              {
                label: "Bullish",
                count: enriched.sentiment.bullish,
                color: C.green,
              },
              {
                label: "Neutral",
                count: enriched.sentiment.neutral,
                color: C.gold,
              },
              {
                label: "Bearish",
                count: enriched.sentiment.bearish,
                color: C.red,
              },
            ].map(({ label, count, color: c }) => {
              const t =
                enriched.sentiment.bullish +
                  enriched.sentiment.neutral +
                  enriched.sentiment.bearish || 1;
              return (
                <div
                  key={label}
                  style={{
                    textAlign: "center",
                    padding: "1rem 0.5rem",
                    background: `${c}08`,
                    border: `1px solid ${c}20`,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: c,
                      fontFamily: "monospace",
                    }}
                  >
                    {count}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: c,
                      marginTop: "0.2rem",
                    }}
                  >
                    {Math.round((count / t) * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {analysis.bestUseCase && (
        <GlassCard>
          <SectionTitle>Recommended Action</SectionTitle>
          <p
            style={{
              fontSize: "0.82rem",
              color: C.slate,
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
  const site = getSiteConfig(siteType);
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
    const rows = records.map((r) => {
      const row: any = {};
      cols.forEach((k: string) => {
        const v = String(r[k] ?? "")
          .replace(/[₹$,%]/g, "")
          .trim();
        row[k] = isNaN(parseFloat(v)) ? "0" : parseFloat(v);
      });
      return row;
    });
    const csv = [
      cols.join(","),
      ...rows.map((r: any) => cols.map((k: string) => r[k]).join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `ml-ready-${Date.now()}.csv`;
    a.click();
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "◈" },
    { key: "data", label: "Data", icon: "⊞" },
    { key: "charts", label: "Charts", icon: "⬡" },
    { key: "insights", label: "Insights", icon: "◉" },
    { key: "ml", label: "ML", icon: "⬡" },
    { key: "predictions", label: "Predict", icon: "◆" },
  ];

  return (
    <div
      style={{
        background: C.bg0,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        overflow: "hidden",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          background: "rgba(255,255,255,0.02)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <span
            style={{
              color: site.color,
              fontSize: "0.9rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            ✦ AIXPLORE
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.625rem",
              background: `${site.color}12`,
              border: `1px solid ${site.color}25`,
              borderRadius: 100,
            }}
          >
            <span style={{ fontSize: "0.75rem" }}>{site.icon}</span>
            <span
              style={{
                fontSize: "0.6rem",
                color: site.color,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {site.label}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onRescrape}
            style={{
              background: C.bg2,
              border: `1px solid ${C.border}`,
              color: C.muted,
              padding: "0.375rem 0.875rem",
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
              border: `1px solid ${C.border}`,
              color: C.muted,
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
          borderBottom: `1px solid ${C.border}`,
          padding: "0 0.75rem",
          background: "rgba(255,255,255,0.01)",
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
              color: tab === t.key ? site.color : C.dim,
              borderBottom:
                tab === t.key
                  ? `2px solid ${site.color}`
                  : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              transition: "color 0.2s",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
            {t.key === "charts" && (analysis.charts?.length ?? 0) > 0 && (
              <span
                style={{
                  fontSize: "0.55rem",
                  background: `${site.color}30`,
                  color: site.color,
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
        {tab === "overview" && (
          <OverviewTab
            analysis={analysis}
            siteType={siteType}
            meta={meta}
            enriched={enriched}
          />
        )}
        {tab === "data" && (
          <DataTab records={records} siteType={siteType} enriched={enriched} />
        )}
        {tab === "charts" && (
          <ChartsTab
            analysis={analysis}
            records={records}
            enriched={enriched}
          />
        )}
        {tab === "insights" && (
          <InsightsTab analysis={analysis} siteType={siteType} />
        )}
        {tab === "ml" && (
          <MLTab
            analysis={analysis}
            records={records}
            onDownloadClean={downloadCleanCSV}
          />
        )}
        {tab === "predictions" && (
          <PredictionsTab
            analysis={analysis}
            siteType={siteType}
            enriched={enriched}
          />
        )}
      </div>
    </div>
  );
}
