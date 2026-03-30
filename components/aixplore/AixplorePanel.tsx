"use client";
import { useEffect, useState } from "react";
import { StatsGrid }      from "./StatsGrid";
import { PredictionCard } from "./PredictionCard";
import { InsightPills }   from "./InsightPills";
import { DataChart }      from "./DataChart";

interface Props {
  analysis: any;
  records: Record<string, string>[];
  siteType: string;
  onClose: () => void;
}

const SITE_ICON: Record<string, string> = {
  finance: "📈", science: "🔭", news: "⚡", government: "🏛️", other: "🌐",
};

export function AixplorePanel({ analysis, records, siteType, onClose }: Props) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { speechSynthesis.cancel(); }, []);

  function toggleAudio() {
    if (playing) { speechSynthesis.cancel(); setPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(analysis.summary);
    u.rate = 0.95; u.pitch = 1;
    u.onend = () => setPlaying(false);
    speechSynthesis.speak(u);
    setPlaying(true);
  }

  return (
    <div className="ax-panel">

      {/* Header */}
      <div className="ax-panel-header">
        <div className="ax-panel-title">
          <div className="ax-panel-icon">{SITE_ICON[siteType] || "✦"}</div>
          <div>
            <div className="ax-panel-name">AIXPLORE</div>
            <div className="ax-panel-sub">AI-powered analysis</div>
          </div>
        </div>
        <button className="ax-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Summary */}
      <div className="ax-section ax-stagger-1">
        <div className="ax-section-label">Summary</div>
        <div className="ax-glass">
          <p className="ax-summary-text">{analysis.summary}</p>
          <div className="ax-audio-row">
            <button className={`ax-audio-btn ${playing ? "playing" : ""}`} onClick={toggleAudio}>
              {playing ? "⏸ Pause" : "▶ Play audio"}
            </button>
            <button className="ax-audio-stop" onClick={() => { speechSynthesis.cancel(); setPlaying(false); }}>
              ⏹ Stop
            </button>
          </div>
          <div className="ax-usecase">
            <div className="ax-usecase-label">Best use case</div>
            <p className="ax-usecase-text">{analysis.bestUseCase}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="ax-section ax-stagger-2">
        <div className="ax-section-label">Stats</div>
        <StatsGrid stats={analysis.stats} />
      </div>

      {/* Prediction */}
      <div className="ax-section ax-stagger-3">
        <div className="ax-section-label">
          {siteType === "finance" ? "Trend prediction"
           : siteType === "science" ? "Content classification"
           : "Community sentiment"}
        </div>
        <PredictionCard prediction={analysis.prediction} />
      </div>

      {/* Insights */}
      <div className="ax-section ax-stagger-4">
        <div className="ax-section-label">Insights</div>
        <InsightPills insights={analysis.insights} />
      </div>

      {/* Chart */}
      <div className="ax-section ax-stagger-5">
        <DataChart records={records} siteType={siteType} />
      </div>

    </div>
  );
}