"use client";

interface Props {
  prediction: { result: string; confidence: string; reason: string };
}

function getResultClass(result: string) {
  const r = result.toLowerCase();
  if (r.includes("bull") || r.includes("optim")) return "bullish";
  if (r.includes("bear") || r.includes("critic")) return "bearish";
  if (r.includes("neutr")) return "neutral";
  if (r.includes("excit")) return "excited";
  if (r.includes("discov")) return "discovery";
  if (r.includes("research")) return "research";
  return "default";
}

export function PredictionCard({ prediction }: Props) {
  const pct = parseInt(prediction.confidence) || 75;
  const cls = getResultClass(prediction.result);

  return (
    <div className="ax-pred-card">
      <div className="ax-pred-top">
        <div className={`ax-pred-result ${cls}`}>{prediction.result}</div>
        <div className="ax-pred-confidence">
          <div className="ax-pred-pct">{prediction.confidence}</div>
          <div className="ax-pred-pct-label">confidence</div>
        </div>
      </div>
      <div className="ax-conf-bar-track">
        <div className="ax-conf-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="ax-pred-reason">{prediction.reason}</p>
    </div>
  );
}
