// Drop this component into your AixplorePanel.tsx
// Replace the "Generic table fallback" section in DataTab with <TabularDataTab records={records} />
// Also call it when displayType === "tabular" or siteType includes "statistics/sports"

"use client";
import { useState } from "react";

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
        textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const,
      }}
    >
      {text}
    </span>
  );
}

export function TabularDataTab({
  records,
}: {
  records: Record<string, any>[];
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  if (!records.length)
    return (
      <div style={{ textAlign: "center", color: "#475569", padding: "2rem" }}>
        No tabular data
      </div>
    );

  // Get all column keys, exclude internal _ fields
  const keys = Object.keys(records[0]).filter((k) => !k.startsWith("_"));

  // Detect numeric columns for right-align
  const numericKeys = new Set(
    keys.filter((k) =>
      records
        .slice(0, 10)
        .every((r) => !isNaN(parseFloat(r[k])) && r[k] !== ""),
    ),
  );

  // Sort
  let rows = [...records];
  if (sortKey) {
    rows.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const an = parseFloat(av),
        bn = parseFloat(bv);
      const cmp =
        !isNaN(an) && !isNaN(bn)
          ? an - bn
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  // Search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  // Summary stats for numeric columns
  const numericSummary = keys
    .filter((k) => numericKeys.has(k))
    .slice(0, 4)
    .map((k) => {
      const vals = records
        .map((r) => parseFloat(r[k]))
        .filter((v) => !isNaN(v));
      if (!vals.length) return null;
      const sum = vals.reduce((a, b) => a + b, 0);
      return {
        key: k,
        min: Math.min(...vals).toFixed(2),
        max: Math.max(...vals).toFixed(2),
        avg: (sum / vals.length).toFixed(2),
        count: vals.length,
      };
    })
    .filter(Boolean);

  return (
    <div>
      {/* Summary stats row */}
      {numericSummary.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(numericSummary.length, 4)}, 1fr)`,
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {numericSummary.map((s: any) => (
            <div
              key={s.key}
              style={{
                background: "rgba(0,245,200,0.04)",
                border: "1px solid rgba(0,245,200,0.12)",
                borderRadius: "10px",
                padding: "0.75rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.58rem",
                  color: "#475569",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  marginBottom: "0.35rem",
                }}
              >
                {s.key}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#00f5c8",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                max {s.max}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "#64748b",
                  fontFamily: "monospace",
                }}
              >
                avg {s.avg} · min {s.min}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + record count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          gap: "1rem",
        }}
      >
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Filter rows..."
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            padding: "0.5rem 0.75rem",
            color: "#e2e8f0",
            fontSize: "0.78rem",
            outline: "none",
          }}
        />
        <Badge
          text={`${rows.length} rows · ${keys.length} cols`}
          color="#64748b"
        />
        {sortKey && (
          <button
            onClick={() => {
              setSortKey(null);
            }}
            style={{
              fontSize: "0.65rem",
              color: "#475569",
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              padding: "0.3rem 0.6rem",
              cursor: "pointer",
            }}
          >
            ✕ clear sort
          </button>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.75rem",
          }}
        >
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {keys.map((k) => (
                <th
                  key={k}
                  onClick={() => handleSort(k)}
                  style={{
                    padding: "0.625rem 0.875rem",
                    textAlign: numericKeys.has(k)
                      ? ("right" as const)
                      : ("left" as const),
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    color: sortKey === k ? "#00f5c8" : "#475569",
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    cursor: "pointer",
                    whiteSpace: "nowrap" as const,
                    userSelect: "none" as const,
                  }}
                >
                  {k} {sortKey === k ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(0,245,200,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)")
                }
              >
                {keys.map((k) => {
                  const val = r[k] ?? "—";
                  const isNum = numericKeys.has(k);
                  const numVal = parseFloat(val);
                  return (
                    <td
                      key={k}
                      style={{
                        padding: "0.5rem 0.875rem",
                        color: isNum ? "#e2e8f0" : "#94a3b8",
                        fontFamily: isNum ? "monospace" : "inherit",
                        textAlign: isNum
                          ? ("right" as const)
                          : ("left" as const),
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap" as const,
                      }}
                      title={String(val)}
                    >
                      {String(val).length > 60
                        ? String(val).slice(0, 57) + "…"
                        : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            marginTop: "0.875rem",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: "0.35rem 0.75rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              color: page === 0 ? "#334155" : "#94a3b8",
              cursor: page === 0 ? "default" : "pointer",
              fontSize: "0.72rem",
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: "0.7rem", color: "#475569" }}>
            Page {page + 1} of {totalPages} ({rows.length} rows)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: "0.35rem 0.75rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              color: page >= totalPages - 1 ? "#334155" : "#94a3b8",
              cursor: page >= totalPages - 1 ? "default" : "pointer",
              fontSize: "0.72rem",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
