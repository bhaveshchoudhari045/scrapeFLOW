"use client";
import type { ScrapeResult, ViewMode } from "@/app/flowscrape/page";

export function ScrapeResults({
  result,
  viewMode,
}: {
  result: ScrapeResult;
  viewMode: ViewMode;
}) {
  const { records, rawText } = result.data;

  if (viewMode === "raw") {
    return (
      <div
        className="ax-data-card"
        style={{ maxHeight: 380, overflowY: "auto" }}
      >
        <pre className="ax-raw">{rawText || "No raw text extracted"}</pre>
      </div>
    );
  }

  if (viewMode === "structured") {
    return (
      <div
        className="ax-data-card"
        style={{ maxHeight: 400, overflowY: "auto" }}
      >
        {records.length === 0 ? (
          <div className="ax-empty">No structured data found</div>
        ) : (
          records.map((record, i) => (
            <div key={i} className="ax-record">
              <div className="ax-record-num">
                #{String(i + 1).padStart(2, "0")}
              </div>
              {Object.entries(record).map(([key, val]) => (
                <div key={key} className="ax-kv">
                  <span className="ax-key">{key}</span>
                  <span className="ax-val">{val}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    );
  }

  // Table view
  if (records.length === 0)
    return <div className="ax-empty">No data to display</div>;
  const keys = Object.keys(records[0]);

  return (
    <div className="ax-data-card" style={{ maxHeight: 400, overflowY: "auto" }}>
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
          {records.map((record, i) => (
            <tr key={i}>
              <td className="ax-row-num">{i + 1}</td>
              {keys.map((k) => (
                <td key={k}>{record[k] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
