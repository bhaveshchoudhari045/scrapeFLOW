"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AixplorePanel } from "@/components/aixplore/AixplorePanel";
import { ScrapeResults } from "@/components/aixplore/ScrapeResults";

export type ViewMode = "raw" | "structured" | "table";

export interface ScrapeData {
  records: Record<string, string>[];
  images: string[];
  rawText: string;
}

export interface ScrapeResult {
  config: { url: string; siteType: string; selectors: string[]; dataKeys: string[]; displayType?: string; category?: string; pageTitle?: string; };
  data: ScrapeData;
  meta: { totalRecords: number; scrapedAt: string; sourceUrl: string; dataSize: string; };
  enriched?: any;
}

const SUGGESTIONS = [
  { icon: "📈", label: "Reliance stock",         query: "Show Reliance Industries stock analysis" },
  { icon: "💻", label: "Laptops on Flipkart",    query: "Show laptops under 50000 on Flipkart" },
  { icon: "🛒", label: "JioMart groceries",       query: "Show fresh vegetables on JioMart" },
  { icon: "🚀", label: "NASA space news",         query: "Get NASA space science articles" },
  { icon: "⚡", label: "Hacker News",             query: "Get me tech news from Hacker News" },
  { icon: "📱", label: "iPhones on Amazon",       query: "Show iPhone prices on Amazon India" },
  { icon: "🥇", label: "Gold & Oil prices",       query: "Show Gold and Oil prices" },
  { icon: "🇺🇸", label: "Apple stock",            query: "Show Apple stock deep analysis" },
];

export default function FlowScrapePage() {
  const [intent, setIntent]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<ScrapeResult | null>(null);
  const [viewMode, setViewMode]       = useState<ViewMode>("structured");
  const [showImages, setShowImages]   = useState(false);
  const [aixploreMode, setAixploreMode]   = useState(false);
  const [aixploreLoading, setAixploreLoading] = useState(false);
  const [analysis, setAnalysis]       = useState<any>(null);

  async function handleScrape(overrideIntent?: string) {
    const query = overrideIntent || intent;
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setAnalysis(null);
    setAixploreMode(false);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: query }),
      });
      const json = await res.json();
      if (json.error === "no_data") {
        toast.error(json.message);
        return;
      }
      if (json.error) throw new Error(json.error);
      setResult(json);
      toast.success(`Fetched ${json.meta.totalRecords} records`);
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
          records:  result.data.records,
          siteType: result.config.siteType,
          meta:     result.meta,
          enriched: result.enriched ?? null,
          rawText:  result.data.rawText ?? "",
          displayType: result.config.displayType ?? "table",
          category:    result.config.category ?? "general",
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

  function downloadJSON() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.data.records, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `scrape-${Date.now()}.json`; a.click();
  }

  function downloadCSV() {
    if (!result?.data.records.length) return;
    const keys = Object.keys(result.data.records[0]);
    const csv = [keys.join(","), ...result.data.records.map(r => keys.map(k => `"${r[k]||""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `scrape-${Date.now()}.csv`; a.click();
  }

  const siteType   = result?.config?.siteType ?? "";
  const isEcommerce = siteType === "ecommerce" || result?.config?.displayType === "products";

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
              {result.config.category || siteType.replace("_", " ")}
            </span>
          </div>
        )}
      </header>

      <div className="ax-container">

        {/* ── Hero / Search ── */}
        <div className={`ax-hero ${result ? "ax-hero--compact" : ""}`}>
          {!result && (
            <>
              <div className="ax-hero-eyebrow">✦ Universal Data Engine</div>
              <div className="ax-hero-title">
                Ask for <span className="ax-hero-gradient">any data</span>
              </div>
              <div className="ax-hero-sub">
                Stocks · Products · News · Space · Any URL · Any website
              </div>
            </>
          )}

          <div className="ax-search-wrap">
            <div className="ax-search-icon">⌕</div>
            <textarea
              value={intent}
              onChange={e => setIntent(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleScrape(); } }}
              placeholder='e.g. "laptops under 50000 on Flipkart" or "Reliance stock" or paste any URL…'
              className="ax-textarea"
              rows={2}
            />
            <button onClick={() => handleScrape()} disabled={loading || !intent.trim()} className="ax-scrape-btn">
              {loading
                ? <><span className="ax-spinner" />Fetching…</>
                : <>Fetch →</>}
            </button>
          </div>

          {!result && (
            <div className="ax-chips">
              {SUGGESTIONS.map(s => (
                <button key={s.query} className="ax-chip"
                  onClick={() => { setIntent(s.query); handleScrape(s.query); }}>
                  <span className="ax-chip-icon">{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
          )}

          {/* Loading state with type */}
          {loading && (
            <div className="ax-loading-state">
              <div className="ax-loading-bar" />
              <div className="ax-loading-text">
                {/flipkart|amazon|jiomart|myntra|nykaa|meesho/i.test(intent)
                  ? "🛒 Scraping product listings via Firecrawl…"
                  : /stock|finance|reliance|tata|infosys/i.test(intent)
                  ? "📈 Fetching live market data…"
                  : /nasa|space|asteroid/i.test(intent)
                  ? "🚀 Calling NASA APIs…"
                  : "⚡ Fetching data…"}
              </div>
            </div>
          )}
        </div>

        {/* ── Results ── */}
        {result && !aixploreMode && (
          <div className="ax-results-section">

            {/* Toolbar */}
            <div className="ax-toolbar">
              <div className="ax-toolbar-left">
                {/* Page title if available */}
                {result.config.pageTitle && (
                  <div className="ax-page-title-badge">
                    {result.config.pageTitle.slice(0, 50)}
                  </div>
                )}
                <div className="ax-toggle-group">
                  {(["structured","table","raw"] as ViewMode[]).map(m => (
                    <button key={m}
                      className={`ax-toggle-btn ${viewMode === m ? "active" : ""}`}
                      onClick={() => setViewMode(m)}>
                      {m === "structured"
                        ? isEcommerce ? "Cards" : "Cards"
                        : m === "table" ? "Table" : "Raw"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ax-toolbar-right">
                <button className="ax-dl-btn" onClick={downloadJSON}>↓ JSON</button>
                <button className="ax-dl-btn" onClick={downloadCSV}>↓ CSV</button>
              </div>
            </div>

            {/* Source */}
            <div className="ax-source-label">
              <span className="ax-source-dot" />
              <span>{result.meta.sourceUrl}</span>
              <span className="ax-source-sep">·</span>
              <span>{new Date(result.meta.scrapedAt).toLocaleTimeString()}</span>
            </div>

            {/* Data */}
            <ScrapeResults result={result} viewMode={viewMode} />

            {/* Images */}
            {result.data.images.length > 0 && (
              <div className="ax-images-section">
                <button className="ax-images-toggle" onClick={() => setShowImages(v => !v)}>
                  <span className="ax-toggle-arrow">{showImages ? "▼" : "▶"}</span>
                  {result.data.images.length} images · {showImages ? "hide" : "show"}
                </button>
                {showImages && (
                  <div className="ax-images-grid">
                    {result.data.images.map((src, i) => (
                      <img key={i} src={src} alt="" className="ax-img"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AIXPLORE CTA */}
            <div className="ax-cta-section">
              <div className="ax-cta-hint">
                <span className="ax-cta-hint-icon">✦</span>
                {isEcommerce
                  ? "Run AI analysis for best deals, price insights, and buying recommendations"
                  : "Run AI analysis for insights, predictions, and visualizations"}
              </div>
              <button className="ax-cta-btn" onClick={handleAixplore} disabled={aixploreLoading}>
                <span className="ax-cta-shimmer" />
                <span className="ax-cta-inner">
                  {aixploreLoading
                    ? <><span className="ax-spinner-light" />Analysing…</>
                    : <><span className="ax-cta-star">✦</span>AIXPLORE</>}
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
            onRescrape={() => { setAixploreMode(false); setResult(null); setAnalysis(null); }}
          />
        )}
      </div>
    </div>
  );
}