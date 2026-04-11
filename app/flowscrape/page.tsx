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

const COLORS: Record<string, { bg: string; text: string; border: string }> = {
  academic: {
    bg: "rgba(124,58,237,0.07)",
    border: "rgba(124,58,237,0.2)",
    text: "#7c3aed",
  },
  finance: {
    bg: "rgba(22,163,74,0.07)",
    border: "rgba(22,163,74,0.2)",
    text: "#16a34a",
  },
  shopping: {
    bg: "rgba(234,88,12,0.07)",
    border: "rgba(234,88,12,0.2)",
    text: "#ea580c",
  },
  news: {
    bg: "rgba(100,116,139,0.07)",
    border: "rgba(100,116,139,0.2)",
    text: "#64748b",
  },
  social: {
    bg: "rgba(219,39,119,0.07)",
    border: "rgba(219,39,119,0.2)",
    text: "#db2777",
  },
  science: {
    bg: "rgba(8,145,178,0.07)",
    border: "rgba(8,145,178,0.2)",
    text: "#0891b2",
  },
  general: {
    bg: "rgba(113,113,122,0.07)",
    border: "rgba(113,113,122,0.2)",
    text: "#71717a",
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
    emoji: "🏏",
    label: "Cricket stats",
    q: "Rohit Sharma cricket batting statistics",
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
  {
    emoji: "🎮",
    label: "Gaming news",
    q: "Latest gaming news and game releases",
  },
];

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
  const [dark, setDark] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Dark mode is handled entirely via className on the root div.
  // No useEffect needed — className={`fs-root ${dark ? "dark" : ""}`} is sufficient.

  const filteredSites =
    activeTab === "All"
      ? sites
      : sites.filter(
          (s) => s.category?.toLowerCase() === activeTab.toLowerCase(),
        );

  const creditCost = sites.filter(
    (s) => selectedIds.has(s.id) && s.creditCost > 0,
  ).length;

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
        queryIntelligence: json.queryIntelligence,
      });
    } catch (e: any) {
      toast.error(e.message);
      setStep("search");
    } finally {
      setSuggesting(false);
    }
  }

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
        `${json.meta.totalRecords} records from ${json.meta.sourcesUsed?.length ?? selected.length} sources`,
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAixplore() {
    if (!result) return;
    setAixploreLoading(true);
    try {
      const res = await fetch("/api/aixplore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: result.data.records,
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
    if (!result?.data.records.length) return;
    if (type === "json") {
      const b = new Blob([JSON.stringify(result.data.records, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `data-${Date.now()}.json`;
      a.click();
    } else {
      const keys = Object.keys(result.data.records[0]);
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
    <div className={`fs-root ${dark ? "dark" : ""}`}>
      {/* ══ TOPBAR ══ */}
      <header className="fs-topbar">
        <div className="fs-logo">
          <div className="fs-logo-mark">SF</div>
          <span className="fs-logo-text">FlowScrape</span>
        </div>

        <div className="fs-steps">
          {[
            { n: 1, label: "Search" },
            { n: 2, label: "Sources" },
            { n: 3, label: "Data" },
            { n: 4, label: "Insights" },
          ].map((s, i) => (
            <span
              key={s.n}
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              {i > 0 && <span className="fs-step-arrow">›</span>}
              <div
                className={`fs-step ${stepNum === s.n ? "active" : stepNum > s.n ? "done" : ""}`}
              >
                <span className="fs-step-dot" />
                {s.label}
              </div>
            </span>
          ))}
        </div>

        <div className="fs-topbar-right">
          {result && (
            <div className="fs-meta-pill">
              <span className="fs-meta-dot" />
              {result.meta.totalRecords} records · {result.meta.dataSize}
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
          <button
            className="fs-theme-btn"
            onClick={() => setDark((d) => !d)}
            title="Toggle theme"
          >
            {dark ? "☀" : "◑"}
          </button>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div className="fs-body">
        {/* ── SIDEBAR ── */}
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
            <div className="fs-sidebar-section">
              <div className="fs-sidebar-label">Categories</div>
              {Object.entries(COLORS).map(([cat, c]) => (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.3rem 0.375rem",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ fontSize: "13px" }}>{CAT_ICONS[cat]}</span>
                  <span style={{ color: c.text, textTransform: "capitalize" }}>
                    {cat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="fs-main">
          {/* ·· STEP 1: Search ·· */}
          {step === "search" && (
            <div className="fs-search-panel">
              <div className="fs-hero-eyebrow">
                ✦ Intelligent Data Discovery
              </div>
              <h1 className="fs-hero-title">Ask for anything</h1>
              <p className="fs-hero-sub">
                Stocks · Research · Products · News · Sports · Anything on the
                internet
              </p>

              <div
                className="fs-search-box"
                style={{ width: "100%", maxWidth: 680 }}
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
                  placeholder='Try: "Nvidia stock analysis" · "CRISPR research papers" · "Laptops under ₹50,000 Flipkart"'
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

          {/* ·· STEP 2: Sources ·· */}
          {step === "sources" && (
            <div className="fs-sources-panel">
              <div className="fs-sources-header">
                <div className="fs-sources-title">
                  {suggesting
                    ? "Finding best sources…"
                    : `${sites.length} sources found`}
                  {!suggesting && queryMeta?.subjectLine && (
                    <span
                      style={{
                        color: "var(--fs-text3)",
                        marginLeft: "0.375rem",
                      }}
                    >
                      for "{queryMeta.subjectLine}"
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
                        <span style={{ marginLeft: "0.25rem", opacity: 0.4 }}>
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
                      padding: "0.3rem 0.625rem",
                      borderRadius: 6,
                      fontSize: 11,
                      border: "1px solid var(--fs-border)",
                      background: "transparent",
                      color: "var(--fs-text3)",
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
                  ? Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: 110,
                          borderRadius: "var(--fs-radius)",
                          background: "var(--fs-bg2)",
                          border: "1px solid var(--fs-border)",
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
                                  background: "rgba(217,119,6,0.08)",
                                  color: "var(--fs-amber)",
                                  border: "1px solid rgba(217,119,6,0.2)",
                                }}
                              >
                                paid
                              </span>
                            )}
                            <span
                              className="fs-tag"
                              style={{
                                background: "var(--fs-bg2)",
                                color: "var(--fs-text3)",
                                border: "1px solid var(--fs-border)",
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
                    <span
                      style={{
                        color: "var(--fs-amber)",
                        marginLeft: "0.75rem",
                      }}
                    >
                      ⚡ {creditCost} credit{creditCost > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: 8,
                      border: "1px solid var(--fs-border)",
                      background: "transparent",
                      color: "var(--fs-text2)",
                      fontSize: 13,
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
                        Fetching…
                      </>
                    ) : (
                      <>Fetch Data ({selectedIds.size})</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ·· Loading ·· */}
          {loading && (
            <div className="fs-loading">
              <div className="fs-loading-ring" />
              <div className="fs-loading-text">
                Fetching from {selectedIds.size} sources…
              </div>
              <div className="fs-loading-sub">
                Aggregating and structuring data
              </div>
            </div>
          )}

          {/* ·· STEP 3: Results ·· */}
          {step === "results" && result && !loading && (
            <div className="fs-dash">
              <div className="fs-dash-topbar">
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}
                >
                  {result.meta.sourcesUsed?.map((s, i) => (
                    <span
                      key={i}
                      className="fs-source-chip"
                      style={{
                        background: "var(--fs-green-dim)",
                        color: "var(--fs-green)",
                        border: "1px solid rgba(22,163,74,0.15)",
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
                                {String(v).slice(0, 200)}
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
                            color: "var(--fs-text3)",
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

              <div className="fs-cta-bar">
                <div className="fs-cta-hint">
                  <span className="fs-cta-hint-star">✦</span>
                  {result.meta.totalRecords} records ready · AI will analyse all
                  sources simultaneously
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

          {/* ·· STEP 4: Analysis ·· */}
          {step === "analysis" && analysis && result && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.625rem 1.25rem",
                  borderBottom: "1px solid var(--fs-border)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexShrink: 0,
                  background: "var(--fs-surface)",
                }}
              >
                <button
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: 6,
                    fontSize: 11,
                    border: "1px solid var(--fs-border)",
                    background: "transparent",
                    color: "var(--fs-text2)",
                    cursor: "pointer",
                  }}
                  onClick={() => setStep("results")}
                >
                  ← Back to Data
                </button>
                <span style={{ fontSize: 11, color: "var(--fs-text3)" }}>
                  {result.meta.totalRecords} records ·{" "}
                  {result.meta.sourcesUsed?.join(", ")}
                </span>
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: "0.375rem",
                  }}
                >
                  <button className="fs-dl-btn" onClick={() => dl("csv")}>
                    ↓ CSV
                  </button>
                  <button className="fs-dl-btn" onClick={() => dl("json")}>
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
