"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { AixplorePanel } from "@/components/aixplore/AixplorePanel";
import "./flowscrape.css";

export type ViewMode = "cards" | "table" | "raw";

export interface SuggestedSite {
  id: string;
  name: string;
  url: string;
  domain: string;
  description: string;
  category: string;
  fetchMethod: string;
  creditCost: number;
  relevanceScore: number;
  favicon: string;
}

export interface ScrapeResult {
  config: {
    url: string;
    siteType: string;
    selectors: string[];
    dataKeys: string[];
    displayType?: string;
    category?: string;
    sourcesUsed?: string[];
  };
  data: {
    records: Record<string, string>[];
    images: string[];
    rawText: string;
  };
  meta: {
    totalRecords: number;
    scrapedAt: string;
    sourceUrl: string;
    dataSize: string;
    sourcesUsed?: string[];
  };
  enriched?: any;
}

// ── Design tokens ─────────────────────────────────────────────────
const COLORS = {
  academic: {
    bg: "rgba(129,140,248,0.12)",
    border: "rgba(129,140,248,0.3)",
    text: "#a5b4fc",
  },
  finance: {
    bg: "rgba(0,245,200,0.1)",
    border: "rgba(0,245,200,0.3)",
    text: "#00f5c8",
  },
  shopping: {
    bg: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.3)",
    text: "#fb923c",
  },
  news: {
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.3)",
    text: "#94a3b8",
  },
  social: {
    bg: "rgba(255,107,74,0.1)",
    border: "rgba(255,107,74,0.3)",
    text: "#ff6b4a",
  },
  science: {
    bg: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.3)",
    text: "#a78bfa",
  },
  general: {
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.3)",
    text: "#64748b",
  },
};

const CAT_ICONS: Record<string, string> = {
  academic: "🎓",
  finance: "📈",
  shopping: "🛒",
  news: "📰",
  social: "💬",
  science: "🔭",
  general: "🌐",
};

const DOMAINS = [
  "All",
  "Academic",
  "Finance",
  "Shopping",
  "News",
  "Social",
  "Science",
  "General",
] as const;
type DomainTab = (typeof DOMAINS)[number];

const QUICK_SEARCHES = [
  {
    emoji: "📈",
    label: "Reliance stock",
    q: "Reliance Industries stock deep analysis",
  },
  {
    emoji: "🧬",
    label: "CRISPR research",
    q: "CRISPR gene editing latest research papers 2024",
  },
  {
    emoji: "💻",
    label: "Laptops Flipkart",
    q: "Best laptops under 50000 on Flipkart",
  },
  {
    emoji: "🚀",
    label: "NASA today",
    q: "NASA space science latest news today",
  },
  {
    emoji: "⚡",
    label: "Hacker News",
    q: "Top tech stories from Hacker News today",
  },
  {
    emoji: "📱",
    label: "iPhone Amazon",
    q: "iPhone 15 Pro price Amazon India comparison",
  },
  {
    emoji: "🌍",
    label: "Climate data",
    q: "Climate change global temperature research 2024",
  },
  {
    emoji: "💊",
    label: "Cancer research",
    q: "Cancer immunotherapy breakthrough research papers",
  },
  {
    emoji: "🎮",
    label: "Gaming news",
    q: "Latest gaming news and game releases",
  },
  {
    emoji: "🏏",
    label: "Cricket stats",
    q: "Rohit Sharma batting statistics from Kaggle",
  },
  {
    emoji: "🛢️",
    label: "Oil & Gold",
    q: "Crude oil and gold price trend analysis",
  },
  {
    emoji: "🤖",
    label: "AI breakthroughs",
    q: "Artificial intelligence latest research arxiv",
  },
];

// ─────────────────────────────────────────────────────────────────
export default function FlowScrapePage() {
  const [intent, setIntent] = useState("");
  const [step, setStep] = useState<
    "search" | "sources" | "results" | "analysis"
  >("search");
  const [suggesting, setSuggesting] = useState(false);
  const [sites, setSites] = useState<SuggestedSite[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<DomainTab>("All");
  const [queryMeta, setQueryMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [aixploreLoading, setAixploreLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredSites =
    activeTab === "All"
      ? sites
      : sites.filter(
          (s) => s.category?.toLowerCase() === activeTab.toLowerCase(),
        );
  const creditCost = sites.filter(
    (s) => selectedIds.has(s.id) && s.creditCost > 0,
  ).length;

  // ── Step 1: Suggest ────────────────────────────────────────────
  async function handleSuggest(q?: string) {
    const query = q ?? intent;
    if (!query.trim()) return;
    if (q) setIntent(q);
    setSuggesting(true);
    setSites([]);
    setSelectedIds(new Set());
    setResult(null);
    setAnalysis(null);
    setQueryMeta(null);
    setStep("sources");
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: query }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSites(json.sites ?? []);
      setSelectedIds(
        new Set((json.sites ?? []).map((s: SuggestedSite) => s.id)),
      );
      setQueryMeta({
        queryCategory: json.queryCategory,
        subjectLine: json.subjectLine,
        displayType: json.displayType,
      });
    } catch (e: any) {
      toast.error(e.message);
      setStep("search");
    } finally {
      setSuggesting(false);
    }
  }

  // ── Step 2: Fetch ──────────────────────────────────────────────
  async function handleFetch() {
    if (!selectedIds.size) {
      toast.error("Select at least one source");
      return;
    }
    const selected = sites.filter((s) => selectedIds.has(s.id));
    setLoading(true);
    setResult(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, selectedSites: selected, ...queryMeta }),
      });
      const json = await res.json();
      if (json.error === "no_data") {
        toast.error(json.message);
        return;
      }
      if (json.error) throw new Error(json.error);
      setResult(json);
      setStep("results");
      toast.success(
        `✓ ${json.meta.totalRecords} records from ${json.meta.sourcesUsed?.length ?? selected.length} sources`,
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: AIXPLORE ───────────────────────────────────────────
  async function handleAixplore() {
    if (!result) return;
    setAixploreLoading(true);
    try {
      const res = await fetch("/api/aixplore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: result.data.records,
          rawRecords: result.enriched?._allRaw,
          siteType: result.config.siteType,
          meta: result.meta,
          enriched: result.enriched ?? null,
          rawText: result.data.rawText ?? "",
          category: result.config.category ?? "general",
          subjectLine: result.enriched?.subjectLine || intent,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAnalysis(json.analysis);
      setStep("analysis");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAixploreLoading(false);
    }
  }

  function reset() {
    setStep("search");
    setSites([]);
    setSelectedIds(new Set());
    setResult(null);
    setAnalysis(null);
    setQueryMeta(null);
    setIntent("");
  }

  function dl(type: "json" | "csv") {
    if (!result) return;
    if (type === "json") {
      const b = new Blob([JSON.stringify(result.data.records, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `data-${Date.now()}.json`;
      a.click();
    } else {
      const keys = Object.keys(result.data.records[0] ?? {});
      const csv = [
        keys.join(","),
        ...result.data.records.map((r) =>
          keys.map((k) => `"${r[k] ?? ""}"`).join(","),
        ),
      ].join("\n");
      const b = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `data-${Date.now()}.csv`;
      a.click();
    }
  }

  const stepNum =
    step === "search" ? 1 : step === "sources" ? 2 : step === "results" ? 3 : 4;

  return (
    <div className="fs-root">
      {/* ══ TOP BAR ══════════════════════════════════════════════ */}
      <header className="fs-topbar">
        <div className="fs-logo">
          <div className="fs-logo-mark">SF</div>
          <span className="fs-logo-text">FlowScrape</span>
        </div>

        {/* Pipeline steps */}
        <div className="fs-steps">
          {[
            { n: 1, label: "Search" },
            { n: 2, label: "Sources" },
            { n: 3, label: "Data" },
            { n: 4, label: "Insights" },
          ].map((s, i) => (
            <>
              {i > 0 && (
                <span key={`arr-${i}`} className="fs-step-arrow">
                  ›
                </span>
              )}
              <div
                key={s.n}
                className={`fs-step ${stepNum === s.n ? "active" : stepNum > s.n ? "done" : ""}`}
              >
                <span className="fs-step-dot" />
                {s.label}
              </div>
            </>
          ))}
        </div>

        <div className="fs-topbar-right">
          {result && (
            <div className="fs-meta-pill">
              <span className="fs-meta-dot" />
              {result.meta.totalRecords} records · {result.meta.dataSize} ·{" "}
              {result.meta.sourcesUsed?.length ?? 0} sources
            </div>
          )}
          {step !== "search" && (
            <button className="fs-icon-btn" onClick={reset} title="New search">
              ↺
            </button>
          )}
          <button
            className="fs-icon-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Toggle sidebar"
          >
            {sidebarOpen ? "◧" : "▣"}
          </button>
        </div>
      </header>

      {/* ══ BODY ═════════════════════════════════════════════════ */}
      <div className="fs-body">
        {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
        <aside className={`fs-sidebar ${sidebarOpen ? "" : "closed"}`}>
          <div className="fs-sidebar-scroll">
            <div className="fs-sidebar-section">
              <div className="fs-sidebar-label">Quick Search</div>
              {QUICK_SEARCHES.map((qs) => (
                <button
                  key={qs.q}
                  className="fs-quick-btn"
                  onClick={() => handleSuggest(qs.q)}
                >
                  <span className="fs-quick-emoji">{qs.emoji}</span>
                  <span>{qs.label}</span>
                </button>
              ))}
            </div>

            {/* Domain legend */}
            <div className="fs-sidebar-section" style={{ marginTop: "0.5rem" }}>
              <div className="fs-sidebar-label">Source Categories</div>
              {Object.entries(COLORS).map(([cat, c]) => (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.3rem 0.25rem",
                    fontSize: "0.72rem",
                  }}
                >
                  <span style={{ fontSize: "0.8rem" }}>{CAT_ICONS[cat]}</span>
                  <span style={{ color: c.text, textTransform: "capitalize" }}>
                    {cat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── MAIN PANEL ───────────────────────────────────────── */}
        <main className="fs-main">
          {/* ·· STEP 1: Search ·· */}
          {step === "search" && (
            <div className="fs-search-panel">
              <div className="fs-hero-eyebrow">
                ✦ Intelligent Data Discovery
              </div>
              <div className="fs-hero-title">Ask for anything</div>
              <div className="fs-hero-sub">
                Stocks · Research · Products · News · Sports · Datasets ·
                Anything
              </div>

              <div
                className="fs-search-box"
                style={{ width: "100%", maxWidth: 700 }}
              >
                <textarea
                  ref={inputRef}
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSuggest();
                    }
                  }}
                  placeholder={
                    'Try: "Rohit Sharma stats from Kaggle" · "Nvidia stock deep analysis" · "CRISPR research papers 2024"'
                  }
                  className="fs-search-input"
                  rows={2}
                />
                <button
                  className="fs-go-btn"
                  onClick={() => handleSuggest()}
                  disabled={suggesting || !intent.trim()}
                >
                  {suggesting ? (
                    <>
                      <span className="fs-spin" />
                      Thinking…
                    </>
                  ) : (
                    <>Find Sources →</>
                  )}
                </button>
              </div>

              <div className="fs-chips-row">
                {QUICK_SEARCHES.slice(0, 8).map((qs) => (
                  <button
                    key={qs.q}
                    className="fs-chip"
                    onClick={() => handleSuggest(qs.q)}
                  >
                    <span>{qs.emoji}</span>
                    {qs.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ·· STEP 2: Source selection ·· */}
          {step === "sources" && (
            <div className="fs-sources-panel">
              <div className="fs-sources-header">
                <div className="fs-sources-title">
                  {suggesting
                    ? "Finding best sources…"
                    : `${sites.length} sources found for `}
                  {!suggesting && queryMeta?.subjectLine && (
                    <span style={{ color: "#00f5ff" }}>
                      "{queryMeta.subjectLine}"
                    </span>
                  )}
                </div>
                <div className="fs-domain-tabs">
                  {DOMAINS.map((tab) => (
                    <button
                      key={tab}
                      className={`fs-domain-tab ${activeTab === tab ? "active" : ""}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab !== "All" && (
                        <span style={{ marginRight: "0.25rem" }}>
                          {CAT_ICONS[tab.toLowerCase()] ?? ""}
                        </span>
                      )}
                      {tab}
                      {tab !== "All" && (
                        <span style={{ marginLeft: "0.25rem", opacity: 0.5 }}>
                          {
                            sites.filter(
                              (s) =>
                                s.category?.toLowerCase() === tab.toLowerCase(),
                            ).length
                          }
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    style={{
                      marginLeft: "auto",
                      padding: "0.3rem 0.75rem",
                      borderRadius: "7px",
                      fontSize: "0.68rem",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const all = filteredSites.every((s) =>
                        selectedIds.has(s.id),
                      );
                      setSelectedIds((prev) => {
                        const n = new Set(prev);
                        all
                          ? filteredSites.forEach((s) => n.delete(s.id))
                          : filteredSites.forEach((s) => n.add(s.id));
                        return n;
                      });
                    }}
                  >
                    {filteredSites.every((s) => selectedIds.has(s.id))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
              </div>

              <div className="fs-sources-grid">
                {suggesting
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: 110,
                          borderRadius: 11,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                    ))
                  : filteredSites.map((site) => {
                      const sel = selectedIds.has(site.id);
                      const cc =
                        COLORS[site.category as keyof typeof COLORS] ??
                        COLORS.general;
                      return (
                        <button
                          key={site.id}
                          className={`fs-site-card ${sel ? "selected" : ""}`}
                          onClick={() =>
                            setSelectedIds((prev) => {
                              const n = new Set(prev);
                              sel ? n.delete(site.id) : n.add(site.id);
                              return n;
                            })
                          }
                        >
                          <div className="fs-site-checkmark">
                            <span className="fs-site-checkmark-inner">✓</span>
                          </div>
                          <div className="fs-site-head">
                            <img
                              className="fs-site-favicon"
                              src={site.favicon}
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            <div>
                              <div className="fs-site-name">{site.name}</div>
                              <div className="fs-site-domain">
                                {site.domain}
                              </div>
                            </div>
                          </div>
                          <div className="fs-site-desc">{site.description}</div>
                          <div className="fs-site-tags">
                            <span
                              className="fs-tag"
                              style={{
                                background: cc.bg,
                                color: cc.text,
                                border: `1px solid ${cc.border}`,
                              }}
                            >
                              {site.category}
                            </span>
                            {site.creditCost > 0 && (
                              <span
                                className="fs-tag"
                                style={{
                                  background: "rgba(245,158,11,0.1)",
                                  color: "#f59e0b",
                                  border: "1px solid rgba(245,158,11,0.2)",
                                }}
                              >
                                paid
                              </span>
                            )}
                            <span
                              className="fs-tag"
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                color: "#334155",
                              }}
                            >
                              {site.relevanceScore}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
              </div>

              <div className="fs-sources-footer">
                <div className="fs-sources-meta">
                  <strong>{selectedIds.size}</strong> of {sites.length} selected
                  {creditCost > 0 && (
                    <span style={{ color: "#f59e0b", marginLeft: "0.75rem" }}>
                      ⚡ {creditCost} firecrawl credit
                      {creditCost > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button
                    style={{
                      padding: "0.625rem 1.25rem",
                      borderRadius: "9px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#64748b",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                    onClick={() => setStep("search")}
                  >
                    ← Back
                  </button>
                  <button
                    className="fs-fetch-btn"
                    onClick={handleFetch}
                    disabled={loading || !selectedIds.size}
                  >
                    {loading ? (
                      <>
                        <span className="fs-spin" />
                        Fetching {selectedIds.size} sources…
                      </>
                    ) : (
                      <>⚡ Fetch Data ({selectedIds.size})</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ·· Loading overlay ·· */}
          {loading && (
            <div className="fs-loading">
              <div className="fs-loading-ring" />
              <div className="fs-loading-text">
                Fetching from {selectedIds.size} sources in parallel…
              </div>
              <div className="fs-loading-sub">
                {/flipkart|amazon|jio/i.test(intent)
                  ? "Scraping product listings via Firecrawl…"
                  : /stock|finance|reliance|tesla|nvidia/i.test(intent)
                    ? "Pulling live market data…"
                    : /nasa|space|asteroid/i.test(intent)
                      ? "Calling NASA APIs…"
                      : /arxiv|pubmed|scholar|research/i.test(intent)
                        ? "Querying academic databases…"
                        : "Aggregating data across sources…"}
              </div>
            </div>
          )}

          {/* ·· STEP 3: Results dashboard ·· */}
          {step === "results" && result && !loading && (
            <div className="fs-dash">
              {/* Sources used + toolbar */}
              <div className="fs-dash-topbar">
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}
                >
                  {result.meta.sourcesUsed?.map((s, i) => (
                    <span
                      key={i}
                      className="fs-source-chip"
                      style={{
                        background: "rgba(0,245,255,0.06)",
                        border: "1px solid rgba(0,245,255,0.15)",
                        color: "#00f5c8",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="fs-view-btns">
                  {(["cards", "table", "raw"] as ViewMode[]).map((m) => (
                    <button
                      key={m}
                      className={`fs-view-btn ${viewMode === m ? "active" : ""}`}
                      onClick={() => setViewMode(m)}
                    >
                      {m === "cards"
                        ? "⊞ Cards"
                        : m === "table"
                          ? "⊟ Table"
                          : "{ } Raw"}
                    </button>
                  ))}
                </div>
                <button className="fs-dl-btn" onClick={() => dl("json")}>
                  ↓ JSON
                </button>
                <button className="fs-dl-btn" onClick={() => dl("csv")}>
                  ↓ CSV
                </button>
              </div>

              {/* Data body */}
              <div className="fs-data-area">
                {viewMode === "raw" && (
                  <pre className="fs-raw">
                    {result.data.rawText || "No raw text"}
                  </pre>
                )}

                {viewMode === "cards" && (
                  <div className="fs-cards-grid">
                    {result.data.records.map((r, i) => (
                      <div key={i} className="fs-data-card">
                        <div className="fs-card-num">
                          #{String(i + 1).padStart(2, "0")} ·{" "}
                          {r.Source || r.Category || r.Type || ""}
                        </div>
                        {Object.entries(r)
                          .filter(
                            ([k]) =>
                              !["Source", "Category", "Type"].includes(k),
                          )
                          .map(([k, v]) => (
                            <div key={k} className="fs-kv-row">
                              <span className="fs-kv-key">{k}</span>
                              <span className="fs-kv-val">
                                {String(v).slice(0, 220)}
                              </span>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                )}

                {viewMode === "table" &&
                  (() => {
                    const recs = result.data.records;
                    if (!recs.length)
                      return (
                        <div
                          style={{
                            color: "#334155",
                            padding: "2rem",
                            textAlign: "center",
                          }}
                        >
                          No records
                        </div>
                      );
                    const keys = Object.keys(recs[0]);
                    return (
                      <table className="fs-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            {keys.map((k) => (
                              <th key={k}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {recs.map((r, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              {keys.map((k) => (
                                <td key={k} title={String(r[k] ?? "")}>
                                  {String(r[k] ?? "—")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}

                {/* Images */}
                {result.data.images.length > 0 && (
                  <div className="fs-imgs">
                    {result.data.images.slice(0, 12).map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* AIXPLORE CTA bar */}
              <div className="fs-cta-bar">
                <div className="fs-cta-hint">
                  <span className="fs-cta-hint-star">✦</span>
                  {result.meta.totalRecords} records ready · AI will analyse all{" "}
                  {result.meta.sourcesUsed?.length ?? ""} sources simultaneously
                </div>
                <button
                  className="fs-aixplore-btn"
                  onClick={handleAixplore}
                  disabled={aixploreLoading}
                >
                  <span className="fs-aixplore-shimmer" />
                  {aixploreLoading ? (
                    <>
                      <span className="fs-spin" />
                      Synthesising…
                    </>
                  ) : (
                    <>
                      <span>✦</span>AIXPLORE
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ·· STEP 4: AIXPLORE analysis ·· */}
          {step === "analysis" && analysis && result && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* mini toolbar above panel */}
              <div
                style={{
                  padding: "0.625rem 1.5rem",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexShrink: 0,
                }}
              >
                <button
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "7px",
                    fontSize: "0.68rem",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "transparent",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                  onClick={() => setStep("results")}
                >
                  ← Back to Data
                </button>
                <span style={{ fontSize: "0.72rem", color: "#334155" }}>
                  {result.meta.totalRecords} records analysed ·{" "}
                  {result.meta.sourcesUsed?.join(", ")}
                </span>
                <div
                  style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}
                >
                  <button
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "7px",
                      fontSize: "0.68rem",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                    onClick={() => dl("csv")}
                  >
                    ↓ CSV
                  </button>
                  <button
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "7px",
                      fontSize: "0.68rem",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                    onClick={() => dl("json")}
                  >
                    ↓ JSON
                  </button>
                </div>
              </div>
              <div className="fs-analysis-wrap">
                <AixplorePanel
                  analysis={analysis}
                  records={result.data.records}
                  enriched={result.enriched}
                  siteType={result.config.siteType}
                  meta={result.meta}
                  onClose={() => setStep("results")}
                  onRescrape={reset}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
