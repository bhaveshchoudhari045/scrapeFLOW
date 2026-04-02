"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { AixplorePanel } from "@/components/aixplore/AixplorePanel";

export type ViewMode = "raw" | "structured" | "table";

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

const CATEGORY_TABS = [
  "All",
  "Academic",
  "Finance",
  "Shopping",
  "News",
  "Social",
  "Science",
  "General",
] as const;
type CategoryTab = (typeof CATEGORY_TABS)[number];

const CATEGORY_COLORS: Record<string, string> = {
  academic: "#818cf8",
  finance: "#00f5c8",
  shopping: "#fb923c",
  news: "#94a3b8",
  social: "#ff6b4a",
  science: "#a78bfa",
  general: "#64748b",
};

const SUGGESTIONS = [
  {
    icon: "📈",
    label: "Reliance stock",
    query: "Show Reliance Industries stock analysis",
  },
  {
    icon: "💻",
    label: "Laptops Flipkart",
    query: "Laptops under 50000 on Flipkart",
  },
  {
    icon: "🧬",
    label: "CRISPR research",
    query: "CRISPR gene editing research papers",
  },
  { icon: "🚀", label: "NASA space", query: "NASA space science news today" },
  {
    icon: "⚡",
    label: "Hacker News",
    query: "Get me tech news from Hacker News",
  },
  {
    icon: "📱",
    label: "iPhone on Amazon",
    query: "iPhone 15 price on Amazon India",
  },
  {
    icon: "🌍",
    label: "Climate science",
    query: "Climate change latest research 2024",
  },
  {
    icon: "💊",
    label: "Cancer research",
    query: "Cancer immunotherapy research papers",
  },
];

export default function FlowScrapePage() {
  const [intent, setIntent] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [sites, setSites] = useState<SuggestedSite[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<CategoryTab>("All");
  const [queryMeta, setQueryMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("structured");
  const [showImages, setShowImages] = useState(false);
  const [aixploreMode, setAixploreMode] = useState(false);
  const [aixploreLoading, setAixploreLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Step 1: Suggest sites
  async function handleSuggest(overrideIntent?: string) {
    const query = overrideIntent || intent;
    if (!query.trim()) return;
    setSuggesting(true);
    setSites([]);
    setSelectedIds(new Set());
    setResult(null);
    setAnalysis(null);
    setAixploreMode(false);
    setQueryMeta(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: query }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSites(json.sites || []);
      // Auto-select all
      setSelectedIds(
        new Set((json.sites || []).map((s: SuggestedSite) => s.id)),
      );
      setQueryMeta({
        queryCategory: json.queryCategory,
        subjectLine: json.subjectLine,
        displayType: json.displayType,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to get suggestions");
    } finally {
      setSuggesting(false);
    }
  }

  // Step 2: Fetch from selected sites
  async function handleFetch() {
    if (!selectedIds.size) {
      toast.error("Select at least one source");
      return;
    }
    const selected = sites.filter((s) => selectedIds.has(s.id));
    setLoading(true);
    setResult(null);
    setAnalysis(null);
    setAixploreMode(false);
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
      toast.success(
        `Fetched ${json.meta.totalRecords} records from ${json.meta.sourcesUsed?.length || selected.length} sources`,
      );
    } catch (err: any) {
      toast.error(err.message || "Fetch failed");
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
      setAixploreMode(true);
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setAixploreLoading(false);
    }
  }

  function toggleSite(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const filtered = filteredSites.map((s) => s.id);
    const allSelected = filtered.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((id) => next.delete(id));
      else filtered.forEach((id) => next.add(id));
      return next;
    });
  }

  function downloadJSON() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.data.records, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `data-${Date.now()}.json`;
    a.click();
  }

  function downloadCSV() {
    if (!result?.data.records.length) return;
    const keys = Object.keys(result.data.records[0]);
    const csv = [
      keys.join(","),
      ...result.data.records.map((r) =>
        keys.map((k) => `"${r[k] || ""}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `data-${Date.now()}.csv`;
    a.click();
  }

  const filteredSites =
    activeTab === "All"
      ? sites
      : sites.filter(
          (s) => s.category?.toLowerCase() === activeTab.toLowerCase(),
        );

  const creditCost = sites.filter(
    (s) => selectedIds.has(s.id) && s.creditCost > 0,
  ).length;
  const siteType = result?.config?.siteType ?? "";

  return (
    <div className="ax-page">
      {/* ── Header ── */}
      <header className="ax-header">
        <div className="ax-logo">
          <div className="ax-logo-mark">SF</div>
          <span className="ax-logo-text">FlowScrape</span>
        </div>
        {result && (
          <div className="ax-status-badge">
            <span className="ax-status-dot" />
            <span>{result.meta.totalRecords} records</span>
            <span className="ax-status-sep">·</span>
            <span>{result.meta.dataSize}</span>
            <span className="ax-status-sep">·</span>
            <span className="ax-status-type">
              {result.meta.sourcesUsed?.length || 0} sources
            </span>
          </div>
        )}
      </header>

      <div className="ax-container">
        {/* ── Hero ── */}
        <div
          className={`ax-hero ${sites.length || result ? "ax-hero--compact" : ""}`}
        >
          {!sites.length && !result && (
            <>
              <div className="ax-hero-eyebrow">
                ✦ Universal Intelligence Engine
              </div>
              <div className="ax-hero-title">
                Ask for <span className="ax-hero-gradient">anything</span>
              </div>
              <div className="ax-hero-sub">
                Atoms to galaxies · Stocks to research papers · Products to news
              </div>
            </>
          )}

          <div className="ax-search-wrap">
            <div className="ax-search-icon">⌕</div>
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
              placeholder='Type anything — "CRISPR gene editing", "iPhone 15 Flipkart", "Nvidia stock", "Ukraine war news"…'
              className="ax-textarea"
              rows={2}
            />
            <button
              onClick={() => handleSuggest()}
              disabled={suggesting || !intent.trim()}
              className="ax-scrape-btn"
            >
              {suggesting ? (
                <>
                  <span className="ax-spinner" />
                  Finding sources…
                </>
              ) : (
                <>Find Sources →</>
              )}
            </button>
          </div>

          {!sites.length && !result && (
            <div className="ax-chips">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.query}
                  className="ax-chip"
                  onClick={() => {
                    setIntent(s.query);
                    handleSuggest(s.query);
                  }}
                >
                  <span className="ax-chip-icon">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Site Selection ── */}
        {sites.length > 0 && !result && (
          <div style={{ marginBottom: "1.5rem" }}>
            {/* Category tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div
                style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}
              >
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: "100px",
                      fontSize: "0.7rem",
                      border: `1px solid ${activeTab === tab ? "rgba(0,245,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                      background:
                        activeTab === tab
                          ? "rgba(0,245,255,0.1)"
                          : "transparent",
                      color:
                        activeTab === tab
                          ? "#00f5ff"
                          : "rgba(240,239,248,0.45)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <button
                  onClick={toggleAll}
                  style={{
                    padding: "0.35rem 0.875rem",
                    borderRadius: "8px",
                    fontSize: "0.7rem",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "transparent",
                    color: "rgba(240,239,248,0.45)",
                    cursor: "pointer",
                  }}
                >
                  {filteredSites.every((s) => selectedIds.has(s.id))
                    ? "Deselect All"
                    : "Select All"}
                </button>
                {creditCost > 0 && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "#f59e0b",
                      padding: "0.25rem 0.5rem",
                      background: "rgba(245,158,11,0.1)",
                      borderRadius: "6px",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    {creditCost} Firecrawl credit{creditCost > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Site grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              {filteredSites.map((site) => {
                const selected = selectedIds.has(site.id);
                const catColor = CATEGORY_COLORS[site.category] || "#64748b";
                return (
                  <button
                    key={site.id}
                    onClick={() => toggleSite(site.id)}
                    style={{
                      padding: "0.875rem 1rem",
                      borderRadius: "12px",
                      textAlign: "left",
                      border: `1px solid ${selected ? "rgba(0,245,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                      background: selected
                        ? "rgba(0,245,255,0.06)"
                        : "rgba(255,255,255,0.02)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      position: "relative",
                      boxShadow: selected
                        ? "0 0 20px rgba(0,245,255,0.08)"
                        : "none",
                    }}
                  >
                    {/* Selected indicator */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0.75rem",
                        right: "0.75rem",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: `1.5px solid ${selected ? "#00f5ff" : "rgba(255,255,255,0.15)"}`,
                        background: selected ? "#00f5ff" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      {selected && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#04040a",
                            fontWeight: 700,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        marginBottom: "0.5rem",
                        paddingRight: "1.5rem",
                      }}
                    >
                      <img
                        src={site.favicon}
                        alt=""
                        width={20}
                        height={20}
                        style={{ borderRadius: "4px", flexShrink: 0 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "#e2e8f0",
                            lineHeight: 1.2,
                          }}
                        >
                          {site.name}
                        </div>
                        <div style={{ fontSize: "0.62rem", color: "#475569" }}>
                          {site.domain}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "#64748b",
                        lineHeight: 1.5,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {site.description}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.375rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.58rem",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "100px",
                          background: `${catColor}15`,
                          color: catColor,
                          border: `1px solid ${catColor}25`,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {site.category}
                      </span>
                      {site.creditCost > 0 && (
                        <span
                          style={{
                            fontSize: "0.58rem",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "100px",
                            background: "rgba(245,158,11,0.1)",
                            color: "#f59e0b",
                            border: "1px solid rgba(245,158,11,0.2)",
                          }}
                        >
                          {site.creditCost} credit
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "0.58rem",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "100px",
                          background: "rgba(255,255,255,0.04)",
                          color: "#475569",
                        }}
                      >
                        {site.relevanceScore}% match
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fetch button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                  {selectedIds.size}
                </span>{" "}
                of {sites.length} sources selected
                {queryMeta?.subjectLine && (
                  <span>
                    {" "}
                    ·{" "}
                    <span style={{ color: "#00f5ff" }}>
                      {queryMeta.subjectLine}
                    </span>
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => {
                    setSites([]);
                    setSelectedIds(new Set());
                    setQueryMeta(null);
                  }}
                  style={{
                    padding: "0.625rem 1.25rem",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "transparent",
                    color: "rgba(240,239,248,0.45)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleFetch}
                  disabled={loading || selectedIds.size === 0}
                  style={{
                    padding: "0.75rem 2rem",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg,#00f5ff,#00c8d4)",
                    color: "#04040a",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor:
                      loading || !selectedIds.size ? "not-allowed" : "pointer",
                    opacity: loading || !selectedIds.size ? 0.5 : 1,
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {loading ? (
                    <>
                      <span className="ax-spinner" />
                      Fetching {selectedIds.size} sources…
                    </>
                  ) : (
                    <>⚡ Fetch & Analyse ({selectedIds.size})</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && !aixploreMode && (
          <div className="ax-results-section">
            {/* Sources used */}
            {result.meta.sourcesUsed?.length && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.375rem",
                  marginBottom: "0.875rem",
                }}
              >
                {result.meta.sourcesUsed.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "0.65rem",
                      padding: "0.2rem 0.625rem",
                      borderRadius: "100px",
                      background: "rgba(0,245,255,0.06)",
                      border: "1px solid rgba(0,245,255,0.15)",
                      color: "#00f5ff",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="ax-toolbar">
              <div className="ax-toolbar-left">
                <div className="ax-toggle-group">
                  {(["structured", "table", "raw"] as ViewMode[]).map((m) => (
                    <button
                      key={m}
                      className={`ax-toggle-btn ${viewMode === m ? "active" : ""}`}
                      onClick={() => setViewMode(m)}
                    >
                      {m === "structured"
                        ? "Cards"
                        : m === "table"
                          ? "Table"
                          : "Raw"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ax-toolbar-right">
                <button className="ax-dl-btn" onClick={downloadJSON}>
                  ↓ JSON
                </button>
                <button className="ax-dl-btn" onClick={downloadCSV}>
                  ↓ CSV
                </button>
                <button
                  className="ax-dl-btn"
                  onClick={() => {
                    setResult(null);
                    setSites([]);
                    setSelectedIds(new Set());
                    setQueryMeta(null);
                  }}
                >
                  ← New Search
                </button>
              </div>
            </div>

            {/* Data table */}
            <div
              className="ax-data-card"
              style={{ maxHeight: 480, overflowY: "auto" }}
            >
              {viewMode === "raw" ? (
                <pre className="ax-raw">
                  {result.data.rawText || "No raw text"}
                </pre>
              ) : viewMode === "structured" ? (
                <div>
                  {result.data.records.map((r, i) => (
                    <div key={i} className="ax-record">
                      <div className="ax-record-num">
                        #{String(i + 1).padStart(2, "0")} ·{" "}
                        {r.Source || r._sourceName || r.Category || ""}
                      </div>
                      {Object.entries(r)
                        .filter(([k]) => k !== "Source" && k !== "Category")
                        .map(([k, v]) => (
                          <div key={k} className="ax-kv">
                            <span className="ax-key">{k}</span>
                            <span className="ax-val">
                              {String(v).slice(0, 200)}
                            </span>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const records = result.data.records;
                  if (!records.length)
                    return <div className="ax-empty">No records</div>;
                  const keys = Object.keys(records[0]);
                  return (
                    <table className="ax-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          {keys.map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r, i) => (
                          <tr key={i}>
                            <td className="ax-row-num">{i + 1}</td>
                            {keys.map((k) => (
                              <td key={k}>
                                {String(r[k] || "—").slice(0, 80)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()
              )}
            </div>

            {/* Images */}
            {result.data.images.length > 0 && (
              <div className="ax-images-section">
                <button
                  className="ax-images-toggle"
                  onClick={() => setShowImages((v) => !v)}
                >
                  <span className="ax-toggle-arrow">
                    {showImages ? "▼" : "▶"}
                  </span>
                  {result.data.images.length} images ·{" "}
                  {showImages ? "hide" : "show"}
                </button>
                {showImages && (
                  <div className="ax-images-grid">
                    {result.data.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className="ax-img"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AIXPLORE CTA */}
            <div className="ax-cta-section">
              <div className="ax-cta-hint">
                <span className="ax-cta-hint-icon">✦</span>
                AI synthesis across all{" "}
                {result.meta.sourcesUsed?.length || "multiple"} sources —
                insights, predictions, and analysis
              </div>
              <button
                className="ax-cta-btn"
                onClick={handleAixplore}
                disabled={aixploreLoading}
              >
                <span className="ax-cta-shimmer" />
                <span className="ax-cta-inner">
                  {aixploreLoading ? (
                    <>
                      <span className="ax-spinner-light" />
                      Synthesising {result.meta.totalRecords} records…
                    </>
                  ) : (
                    <>
                      <span className="ax-cta-star">✦</span>AIXPLORE
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── AIXPLORE Panel ── */}
        {aixploreMode && analysis && result && (
          <AixplorePanel
            analysis={analysis}
            records={result.data.records}
            enriched={result.enriched}
            siteType={result.config.siteType}
            meta={result.meta}
            onClose={() => setAixploreMode(false)}
            onRescrape={() => {
              setAixploreMode(false);
              setResult(null);
              setSites([]);
              setSelectedIds(new Set());
              setQueryMeta(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
