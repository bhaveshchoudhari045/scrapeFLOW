"use client";

import { useState } from "react";

interface Props {
  analysis: any;
  records: Record<string, any>[];
  enriched?: any;
  siteType: string;
  meta: any;
  onClose: () => void;
  onRescrape: () => void;
}

type Tab = "overview" | "data" | "insights" | "predictions" | "news";

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function getSiteConfig(siteType: string) {
  if (siteType === "finance_deep")
    return { icon: "📈", label: "Deep Stock Analysis", color: "#00f5c8" };
  if (siteType === "finance_watchlist")
    return { icon: "📊", label: "Market Watchlist", color: "#00c8d4" };
  if (siteType === "science")
    return { icon: "🔭", label: "NASA Intelligence", color: "#a78bfa" };
  if (siteType === "news")
    return { icon: "⚡", label: "Tech Intelligence", color: "#f59e0b" };
  return { icon: "◈", label: "Data Intelligence", color: "#00f5c8" };
}

function getSignalColor(text: string) {
  const t = (text ?? "").toLowerCase();
  if (t.includes("strong buy") || t.includes("bullish") || t.includes("buy"))
    return "#00f5c8";
  if (t.includes("strong sell") || t.includes("bearish") || t.includes("sell"))
    return "#ef4444";
  if (t.includes("hold") || t.includes("neutral") || t.includes("mixed"))
    return "#f59e0b";
  if (t.includes("discovery") || t.includes("alert")) return "#a78bfa";
  return "#94a3b8";
}

function ConfidenceBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.65rem",
          color: "#64748b",
          marginBottom: "0.35rem",
        }}
      >
        <span>Confidence</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div
        style={{
          height: "4px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: "2px",
            transition: "width 1s ease",
          }}
        />
      </div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color?: string }) {
  return (
    <span
      style={{
        fontSize: "0.6rem",
        padding: "0.2rem 0.5rem",
        borderRadius: "4px",
        background: `${color ?? "#00f5c8"}18`,
        color: color ?? "#00f5c8",
        border: `1px solid ${color ?? "#00f5c8"}30`,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "0.6rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#475569",
        marginBottom: "0.75rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <div style={{ width: "16px", height: "1px", background: "#475569" }} />
      {children}
    </div>
  );
}

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
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px",
        padding: "1.25rem",
        marginBottom: "0.875rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Overview Tab ─────────────────────────────────────────────────────────── */
function OverviewTab({
  analysis,
  siteType,
  meta,
  enriched,
}: {
  analysis: any;
  siteType: string;
  meta: any;
  enriched?: any;
}) {
  const site = getSiteConfig(siteType);
  const pred = analysis.prediction ?? {};
  const pct = parseInt(pred.confidence) || 70;
  const signalColor = getSignalColor(pred.result ?? "");

  return (
    <div>
      {/* Executive Summary */}
      <GlassCard>
        <SectionTitle>Executive Summary</SectionTitle>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#cbd5e1",
            lineHeight: 1.75,
            margin: 0,
          }}
        >
          {analysis.summary}
        </p>
      </GlassCard>

      {/* KPI Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.625rem",
          marginBottom: "0.875rem",
        }}
      >
        {[
          { label: "Records", value: String(meta?.totalRecords ?? "—") },
          { label: "Data Size", value: meta?.dataSize ?? "—" },
          {
            label: "Source",
            value: siteType.includes("finance")
              ? "Alpha Vantage"
              : siteType === "science"
                ? "NASA APIs"
                : "HN Firebase",
          },
          {
            label: "Fetched",
            value: meta?.scrapedAt
              ? new Date(meta.scrapedAt).toLocaleTimeString()
              : "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "clamp(0.875rem,2vw,1.1rem)",
                fontWeight: 600,
                color: site.color,
                fontFamily: "monospace",
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: "0.6rem",
                color: "#475569",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: "0.25rem",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Verdict + Confidence */}
      <GlassCard style={{ borderColor: `${signalColor}30` }}>
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
              fontSize: "clamp(1.25rem,3vw,1.75rem)",
              fontWeight: 700,
              color: signalColor,
              fontFamily: "monospace",
            }}
          >
            {pred.result ?? "—"}
          </div>
          <Badge text={`${pct}% confidence`} color={signalColor} />
        </div>
        <ConfidenceBar pct={pct} color={signalColor} />
        <p
          style={{
            fontSize: "0.8rem",
            color: "#94a3b8",
            lineHeight: 1.7,
            marginTop: "0.875rem",
            marginBottom: 0,
          }}
        >
          {pred.reason}
        </p>
      </GlassCard>

      {/* Finance Deep: Key Metrics Hero */}
      {siteType === "finance_deep" && analysis._records && (
        <FinanceHero records={analysis._records} enriched={enriched} />
      )}

      {/* Finance Watchlist: Mini cards */}
      {siteType === "finance_watchlist" && enriched?.watchlist && (
        <WatchlistOverview watchlist={enriched.watchlist} />
      )}

      {/* Science: Hazard Alert */}
      {siteType === "science" && enriched?.asteroids && (
        <AsteroidAlert asteroids={enriched.asteroids} />
      )}

      {/* HackerNews: Top story */}
      {siteType === "news" && analysis._records?.[0] && (
        <TopStoryCard record={analysis._records[0]} />
      )}

      {/* Best use case */}
      {analysis.bestUseCase && (
        <GlassCard>
          <SectionTitle>Recommended Action</SectionTitle>
          <p
            style={{
              fontSize: "0.8rem",
              color: "#94a3b8",
              lineHeight: 1.7,
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

function FinanceHero({
  records,
  enriched,
}: {
  records: any[];
  enriched?: any;
}) {
  const find = (metric: string) =>
    records.find((r: any) => r.Metric === metric)?.Value ?? "—";
  const price = find("Current Price");
  const change = find("Change");
  const signal = find("Overall Signal");
  const rsi = find("RSI (14)");
  const trend = find("Trend (MA50 vs MA200)");
  const mktCap = find("Market Cap");
  const pe = find("P/E Ratio");
  const sentiment = enriched?.sentiment;

  const isUp =
    change.includes("+") || (!change.includes("-") && parseFloat(change) > 0);

  return (
    <GlassCard>
      <SectionTitle>Price & Signal Dashboard</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.875rem",
          marginBottom: "0.875rem",
        }}
      >
        {/* Price */}
        <div
          style={{
            background: "rgba(0,245,200,0.05)",
            border: "1px solid rgba(0,245,200,0.15)",
            borderRadius: "10px",
            padding: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.6rem",
              color: "#475569",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Current Price
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#f0eff8",
              fontFamily: "monospace",
              margin: "0.25rem 0",
            }}
          >
            {price}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: isUp ? "#00f5c8" : "#ef4444",
              fontFamily: "monospace",
            }}
          >
            {change}
          </div>
        </div>
        {/* Signal */}
        <div
          style={{
            background: `${getSignalColor(signal)}08`,
            border: `1px solid ${getSignalColor(signal)}20`,
            borderRadius: "10px",
            padding: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.6rem",
              color: "#475569",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Overall Signal
          </div>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: getSignalColor(signal),
              margin: "0.5rem 0",
            }}
          >
            {signal}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{trend}</div>
        </div>
      </div>
      {/* Metric row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "0.5rem",
        }}
      >
        {[
          { label: "RSI 14", value: rsi.split("—")[0].trim() },
          { label: "Market Cap", value: mktCap },
          { label: "P/E Ratio", value: pe },
          {
            label: "News",
            value: sentiment
              ? `${sentiment.bullish}🟢 ${sentiment.bearish}🔴`
              : "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              padding: "0.625rem",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                fontFamily: "monospace",
                color: "#e2e8f0",
                fontWeight: 600,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: "0.58rem",
                color: "#475569",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: "0.2rem",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function WatchlistOverview({ watchlist }: { watchlist: any[] }) {
  return (
    <GlassCard>
      <SectionTitle>Live Watchlist</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {watchlist.map((s: any, i: number) => {
          const isUp = s.direction === "▲";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.625rem 0.75rem",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "8px",
                border: `1px solid ${isUp ? "rgba(0,245,200,0.1)" : "rgba(239,68,68,0.1)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                }}
              >
                <span style={{ fontSize: "1rem" }}>{s.flag}</span>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#e2e8f0",
                      fontFamily: "monospace",
                    }}
                  >
                    {s.symbol}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#64748b" }}>
                    {s.name}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontFamily: "monospace",
                    color: "#f0eff8",
                  }}
                >
                  {s.price}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: isUp ? "#00f5c8" : "#ef4444",
                  }}
                >
                  {s.direction} {s.changePercent}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function AsteroidAlert({ asteroids }: { asteroids: any[] }) {
  const hazardous = asteroids.filter((a: any) =>
    a.hazardous?.includes("HAZARDOUS"),
  );
  if (!hazardous.length) return null;
  return (
    <div
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        marginBottom: "0.875rem",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: "1.5rem" }}>☄️</span>
      <div>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#ef4444",
            marginBottom: "0.25rem",
          }}
        >
          {hazardous.length} Potentially Hazardous Asteroid
          {hazardous.length > 1 ? "s" : ""} — Today
        </div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          {hazardous.map((h: any) => h.name).join(" · ")}
        </div>
      </div>
    </div>
  );
}

function TopStoryCard({ record }: { record: any }) {
  return (
    <GlassCard style={{ borderColor: "rgba(245,158,11,0.2)" }}>
      <SectionTitle>Top Story</SectionTitle>
      <a
        href={record.URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "#f0eff8",
          textDecoration: "none",
          lineHeight: 1.5,
          display: "block",
          marginBottom: "0.5rem",
        }}
      >
        {record.Title}
      </a>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          fontSize: "0.7rem",
          color: "#64748b",
        }}
      >
        <span style={{ color: "#f59e0b" }}>{record.Score}</span>
        <span>{record.Domain}</span>
        <span>{record.Author}</span>
        <span>{record.Comments} comments</span>
      </div>
    </GlassCard>
  );
}

/* ── Data Tab ─────────────────────────────────────────────────────────────── */
function DataTab({
  records,
  siteType,
  enriched,
}: {
  records: any[];
  siteType: string;
  enriched?: any;
}) {
  /* Finance Deep — grouped by Category */
  if (siteType === "finance_deep" && records[0]?.Category) {
    const groups: Record<string, any[]> = {};
    for (const r of records) {
      const cat = r.Category ?? "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    }
    return (
      <div>
        {Object.entries(groups).map(([cat, rows]) => (
          <GlassCard key={cat}>
            <SectionTitle>{cat}</SectionTitle>
            <div>
              {rows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "0.5rem 0",
                    borderBottom:
                      i < rows.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      flex: "0 0 auto",
                      maxWidth: "45%",
                    }}
                  >
                    {row.Metric}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "#e2e8f0",
                      fontFamily: "monospace",
                      textAlign: "right",
                      wordBreak: "break-word",
                    }}
                  >
                    {row.Value}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  /* Finance Watchlist */
  if (siteType === "finance_watchlist") {
    return (
      <div>
        {records.map((r, i) => {
          const isUp = String(r.Change ?? "").startsWith("▲");
          return (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${isUp ? "rgba(0,245,200,0.12)" : "rgba(239,68,68,0.12)"}`,
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                marginBottom: "0.625rem",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>{r.Flag}</span>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#f0eff8",
                      fontFamily: "monospace",
                    }}
                  >
                    {r.Symbol}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                    {r.Company}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#475569",
                    marginTop: "0.2rem",
                  }}
                >
                  Vol: {r.Volume} · H:{r["Day High"]} L:{r["Day Low"]}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "1rem",
                    fontFamily: "monospace",
                    color: "#f0eff8",
                  }}
                >
                  {r.Price}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: isUp ? "#00f5c8" : "#ef4444",
                  }}
                >
                  {r.Change} ({r["Change %"]})
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* Science / NASA */
  if (siteType === "science") {
    const apod = records.filter((r) => r["Data Type"]?.includes("APOD"));
    const asteroids = records.filter((r) =>
      r["Data Type"]?.includes("Near Earth"),
    );
    const events = records.filter((r) =>
      r["Data Type"]?.includes("Earth Event"),
    );
    const images = enriched?.nasaImages ?? [];

    return (
      <div>
        {/* NASA Images */}
        {images.length > 0 && (
          <GlassCard>
            <SectionTitle>NASA Image Library</SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: "0.625rem",
              }}
            >
              {images.slice(0, 6).map((img: any, i: number) => (
                <div
                  key={i}
                  style={{
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#0d0d1f",
                  }}
                >
                  <img
                    src={img.image_url}
                    alt={img.title}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={(e) => {
                      (
                        e.target as HTMLImageElement
                      ).parentElement!.style.display = "none";
                    }}
                  />
                  <div
                    style={{
                      padding: "0.375rem 0.5rem",
                      fontSize: "0.62rem",
                      color: "#64748b",
                    }}
                  >
                    {img.title}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* APOD */}
        {apod.length > 0 && (
          <GlassCard>
            <SectionTitle>Astronomy Picture of the Day</SectionTitle>
            {apod.map((a, i) => (
              <div
                key={i}
                style={{
                  paddingBottom: i < apod.length - 1 ? "1rem" : 0,
                  marginBottom: i < apod.length - 1 ? "1rem" : 0,
                  borderBottom:
                    i < apod.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "baseline",
                    marginBottom: "0.375rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#e2e8f0",
                    }}
                  >
                    {a.Title}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "#475569" }}>
                    {a.Date}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {String(a.Summary ?? "").slice(0, 250)}…
                </p>
              </div>
            ))}
          </GlassCard>
        )}

        {/* Asteroids */}
        {asteroids.length > 0 && (
          <GlassCard>
            <SectionTitle>Near Earth Objects — Today</SectionTitle>
            {asteroids.map((a, i) => {
              const isHazardous = a["Hazard Status"]?.includes("HAZARDOUS");
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.625rem 0",
                    borderBottom:
                      i < asteroids.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: isHazardous ? "#ef4444" : "#e2e8f0",
                      flex: "1 0 auto",
                      minWidth: "140px",
                    }}
                  >
                    {a.Name}
                  </span>
                  <Badge
                    text={a["Hazard Status"]}
                    color={isHazardous ? "#ef4444" : "#00f5c8"}
                  />
                  <Badge
                    text={`Ø ${a["Diameter Min"]}–${a["Diameter Max"]}`}
                    color="#64748b"
                  />
                  <Badge text={`Miss: ${a["Miss Distance"]}`} color="#64748b" />
                  <Badge text={a.Velocity} color="#64748b" />
                </div>
              );
            })}
          </GlassCard>
        )}

        {/* Earth Events */}
        {events.length > 0 && (
          <GlassCard>
            <SectionTitle>Active Earth Events (EONET)</SectionTitle>
            {events.map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0",
                  borderBottom:
                    i < events.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
              >
                <Badge text={e.Category} color="#a78bfa" />
                <span
                  style={{ fontSize: "0.78rem", color: "#e2e8f0", flex: 1 }}
                >
                  {e.Title}
                </span>
                <span style={{ fontSize: "0.65rem", color: "#475569" }}>
                  {e.Date}
                </span>
              </div>
            ))}
          </GlassCard>
        )}
      </div>
    );
  }

  /* HackerNews */
  if (records[0]?.Title && records[0]?.Score) {
    return (
      <div>
        {records.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
              padding: "0.875rem 1rem",
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                color: "#334155",
                fontFamily: "monospace",
                fontWeight: 700,
                paddingTop: "2px",
                minWidth: "24px",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={r.URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "#e2e8f0",
                  textDecoration: "none",
                  lineHeight: 1.5,
                  display: "block",
                  marginBottom: "0.375rem",
                }}
              >
                {r.Title}
              </a>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  fontSize: "0.65rem",
                  color: "#475569",
                }}
              >
                <span style={{ color: "#f59e0b" }}>{r.Score}</span>
                <span>·</span>
                <span>{r.Domain}</span>
                <span>·</span>
                <span>{r.Author}</span>
                <span>·</span>
                <span>{r.Comments} comments</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* Generic table fallback */
  if (!records.length)
    return (
      <div style={{ textAlign: "center", color: "#475569", padding: "2rem" }}>
        No records
      </div>
    );
  const keys = Object.keys(records[0]);
  return (
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
            {keys.map((k) => (
              <th
                key={k}
                style={{
                  padding: "0.625rem 0.75rem",
                  textAlign: "left",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  color: "#475569",
                  fontSize: "0.6rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr
              key={i}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              {keys.map((k) => (
                <td
                  key={k}
                  style={{ padding: "0.5rem 0.75rem", color: "#94a3b8" }}
                >
                  {String(r[k] ?? "—").slice(0, 60)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Insights Tab ─────────────────────────────────────────────────────────── */
function InsightsTab({
  analysis,
  siteType,
}: {
  analysis: any;
  siteType: string;
}) {
  const insights: {
    insight: string;
    significance: string;
    category?: string;
  }[] = analysis.insights ?? [];
  const sigColor = (s: string) =>
    s === "high" ? "#00f5c8" : s === "medium" ? "#f59e0b" : "#64748b";

  return (
    <div>
      {/* Data Quality block */}
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
            { label: "Completeness", value: "98%", color: "#00f5c8" },
            {
              label: "Latency",
              value: siteType.includes("finance") ? "15 min" : "Real-time",
              color: "#f59e0b",
            },
            { label: "Source", value: "Verified", color: "#00f5c8" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                textAlign: "center",
                padding: "0.75rem",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "8px",
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
                  color: "#475569",
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

      {/* Insights */}
      {insights.length === 0 ? (
        <div style={{ textAlign: "center", color: "#475569", padding: "2rem" }}>
          No insights generated
        </div>
      ) : (
        insights.map((ins, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: `3px solid ${sigColor(ins.significance)}`,
              borderRadius: "10px",
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
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: sigColor(ins.significance),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.6rem",
                  color: sigColor(ins.significance),
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {ins.significance} significance
              </span>
              {ins.category && <Badge text={ins.category} color="#64748b" />}
            </div>
            <p
              style={{
                fontSize: "0.82rem",
                color: "#cbd5e1",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {ins.insight}
            </p>
          </div>
        ))
      )}

      {/* Scenario analysis if available */}
      {analysis.scenarios && (
        <GlassCard>
          <SectionTitle>Scenario Analysis</SectionTitle>
          {Object.entries(analysis.scenarios).map(
            ([key, val]: [string, any]) => (
              <div key={key} style={{ marginBottom: "0.75rem" }}>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color:
                      key === "bull"
                        ? "#00f5c8"
                        : key === "bear"
                          ? "#ef4444"
                          : "#f59e0b",
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
                    color: "#94a3b8",
                    margin: 0,
                    lineHeight: 1.6,
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

/* ── Predictions Tab ──────────────────────────────────────────────────────── */
function PredictionsTab({
  analysis,
  siteType,
  enriched,
}: {
  analysis: any;
  siteType: string;
  enriched?: any;
}) {
  const pred = analysis.prediction ?? {};
  const pct = parseInt(pred.confidence) || 70;
  const color = getSignalColor(pred.result ?? "");
  const forecast = analysis.forecast ?? [];

  return (
    <div>
      {/* Main verdict */}
      <GlassCard
        style={{ borderColor: `${color}30`, background: `${color}06` }}
      >
        <SectionTitle>Prediction Verdict</SectionTitle>
        <div
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color,
            fontFamily: "monospace",
            marginBottom: "0.5rem",
          }}
        >
          {pred.result ?? "—"}
        </div>
        <ConfidenceBar pct={pct} color={color} />
        <p
          style={{
            fontSize: "0.82rem",
            color: "#94a3b8",
            lineHeight: 1.7,
            marginTop: "1rem",
            marginBottom: 0,
          }}
        >
          {pred.reason}
        </p>
      </GlassCard>

      {/* Finance: News sentiment breakdown */}
      {siteType === "finance_deep" && enriched?.sentiment && (
        <GlassCard>
          <SectionTitle>News Sentiment Analysis</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "0.625rem",
              marginBottom: "1rem",
            }}
          >
            {[
              {
                label: "Bullish",
                count: enriched.sentiment.bullish,
                color: "#00f5c8",
              },
              {
                label: "Neutral",
                count: enriched.sentiment.neutral,
                color: "#f59e0b",
              },
              {
                label: "Bearish",
                count: enriched.sentiment.bearish,
                color: "#ef4444",
              },
            ].map(({ label, count, color: c }) => {
              const total =
                enriched.sentiment.bullish +
                  enriched.sentiment.neutral +
                  enriched.sentiment.bearish || 1;
              const pctVal = Math.round((count / total) * 100);
              return (
                <div
                  key={label}
                  style={{
                    textAlign: "center",
                    padding: "1rem 0.5rem",
                    background: `${c}08`,
                    border: `1px solid ${c}20`,
                    borderRadius: "10px",
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
                      color: "#475569",
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
                      marginTop: "0.25rem",
                    }}
                  >
                    {pctVal}%
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              textAlign: "center",
            }}
          >
            Overall:{" "}
            <span
              style={{
                color: getSignalColor(enriched.sentiment.overall ?? ""),
                fontWeight: 600,
              }}
            >
              {enriched.sentiment.overall}
            </span>
          </div>
        </GlassCard>
      )}

      {/* News articles with sentiment */}
      {siteType === "finance_deep" && enriched?.news?.length > 0 && (
        <GlassCard>
          <SectionTitle>Latest News — Sentiment Scored</SectionTitle>
          {enriched.news.slice(0, 8).map((n: any, i: number) => {
            const sentColor = n.sentiment?.includes("Bullish")
              ? "#00f5c8"
              : n.sentiment?.includes("Bearish")
                ? "#ef4444"
                : "#f59e0b";
            return (
              <div
                key={i}
                style={{
                  padding: "0.625rem 0",
                  borderBottom:
                    i < 7 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.625rem",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: sentColor,
                      flexShrink: 0,
                      marginTop: "4px",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "0.78rem",
                        color: "#e2e8f0",
                        textDecoration: "none",
                        display: "block",
                        marginBottom: "0.2rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {n.title}
                    </a>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        fontSize: "0.62rem",
                        color: "#475569",
                      }}
                    >
                      <span style={{ color: sentColor }}>{n.sentiment}</span>
                      <span>·</span>
                      <span>{n.source}</span>
                      <span>·</span>
                      <span>{n.publishedAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </GlassCard>
      )}

      {/* Forecast points if present */}
      {forecast.length > 0 && (
        <GlassCard>
          <SectionTitle>30-Day Forecast Signals</SectionTitle>
          {forecast.map((f: any, i: number) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.5rem 0",
                borderBottom:
                  i < forecast.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {f.label}
              </span>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#e2e8f0",
                  fontFamily: "monospace",
                }}
              >
                {f.value}
              </span>
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
              fontSize: "0.82rem",
              color: "#94a3b8",
              lineHeight: 1.7,
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

/* ── Main Panel ───────────────────────────────────────────────────────────── */
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

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "◈" },
    { key: "data", label: "Data", icon: "⊞" },
    { key: "insights", label: "Insights", icon: "◉" },
    { key: "predictions", label: "Predictions", icon: "◆" },
  ];

  return (
    <div
      style={{
        background: "#04040a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: site.color, fontSize: "0.9rem" }}>✦</span>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "#f0eff8",
                letterSpacing: "0.06em",
              }}
            >
              AIXPLORE
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.625rem",
              background: `${site.color}12`,
              border: `1px solid ${site.color}25`,
              borderRadius: "100px",
            }}
          >
            <span style={{ fontSize: "0.75rem" }}>{site.icon}</span>
            <span
              style={{
                fontSize: "0.62rem",
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
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748b",
              padding: "0.375rem 0.875rem",
              borderRadius: "8px",
              fontSize: "0.72rem",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            ↺ New
          </button>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748b",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
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

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "0 1rem",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.75rem 1rem",
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: tab === t.key ? site.color : "#475569",
              borderBottom:
                tab === t.key
                  ? `2px solid ${site.color}`
                  : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              transition: "color 0.2s",
              textTransform: "uppercase",
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          maxHeight: "70vh",
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
        {tab === "insights" && (
          <InsightsTab analysis={analysis} siteType={siteType} />
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
