"use client";

import { useState, useRef } from "react";
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
  config: {
    url: string;
    siteType: string;
    selectors: string[];
    dataKeys: string[];
  };
  data: ScrapeData;
  meta: {
    totalRecords: number;
    scrapedAt: string;
    sourceUrl: string;
    dataSize: string;
  };
}

const SUGGESTIONS = [
  "Get me tech news from Hacker News",
  "Show latest stock prices from Yahoo Finance",
  "Get NASA space science articles",
];

export default function FlowScrapePage() {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("structured");
  const [showImages, setShowImages] = useState(false);
  const [aixploreMode, setAixploreMode] = useState(false);
  const [aixploreLoading, setAixploreLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

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
      toast.success(`Scraped ${json.meta.totalRecords} records`);
    } catch (err: any) {
      toast.error(err.message || "Scrape failed");
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
    const blob = new Blob([JSON.stringify(result.data.records, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scrape-${Date.now()}.json`;
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
    a.download = `scrape-${Date.now()}.csv`;
    a.click();
  }

  return (
    <div className="ax-page" style={{ minHeight: "100vh" }}>
      {/* ── Header ── */}
      <header className="ax-header">
        <div className="ax-logo">
          <div className="ax-logo-mark">SF</div>
          <span className="ax-logo-text">Flow Scrape</span>
        </div>
        {result && (
          <div className="ax-status">
            <span className="ax-status-dot" />
            {result.meta.totalRecords} records · {result.meta.dataSize}
          </div>
        )}
      </header>

      <div className="ax-container">
        {/* ── Search ── */}
        <div className="ax-section">
          <div className="ax-search-wrap">
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleScrape();
                }
              }}
              placeholder="Describe what you want to scrape... e.g. 'Get me the latest tech news from Hacker News'"
              className="ax-textarea"
            />
            <button
              onClick={() => handleScrape()}
              disabled={loading || !intent.trim()}
              className="ax-scrape-btn"
            >
              {loading ? (
                <>
                  <span className="ax-spinner" />
                  Scraping…
                </>
              ) : (
                <>Scrape →</>
              )}
            </button>
          </div>
          <div className="ax-chips">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="ax-chip"
                onClick={() => {
                  setIntent(s);
                  handleScrape(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results ── */}
        {result && (
          <>
            {/* Controls row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "0.875rem",
              }}
            >
              <div className="ax-toggle-group">
                {(["raw", "structured", "table"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    className={`ax-toggle-btn ${viewMode === m ? "active" : ""}`}
                    onClick={() => setViewMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="ax-dl-btn" onClick={downloadJSON}>
                  ↓ JSON
                </button>
                <button className="ax-dl-btn" onClick={downloadCSV}>
                  ↓ CSV
                </button>
              </div>
            </div>

            {/* Data */}
            <div className="ax-section">
              <ScrapeResults result={result} viewMode={viewMode} />
            </div>

            {/* Images */}
            {result.data.images.length > 0 && (
              <div className="ax-section">
                <button
                  className="ax-images-toggle"
                  onClick={() => setShowImages((v) => !v)}
                >
                  <span
                    style={{ color: "var(--ax-cyan)", fontSize: "0.65rem" }}
                  >
                    {showImages ? "▼" : "▶"}
                  </span>
                  {result.data.images.length} images found — click to{" "}
                  {showImages ? "hide" : "view"}
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

            {/* AIXPLORE button */}
            {!aixploreMode && (
              <div className="ax-btn-wrap">
                <button
                  className="ax-cta-btn"
                  onClick={handleAixplore}
                  disabled={aixploreLoading}
                >
                  <span className="ax-cta-inner">
                    {aixploreLoading ? (
                      <>
                        <span className="ax-spinner-light" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        <span className="ax-cta-icon">✦</span>AIXPLORE
                      </>
                    )}
                  </span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ── AIXPLORE Panel ── */}
        {aixploreMode && analysis && (
          <AixplorePanel
            analysis={analysis}
            records={result!.data.records}
            siteType={result!.config.siteType}
            onClose={() => setAixploreMode(false)}
          />
        )}
      </div>
    </div>
  );
}
