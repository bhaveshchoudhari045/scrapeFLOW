"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

function parseNum(val: string): number {
  return parseFloat((val || "").replace(/[^0-9.-]/g, "")) || 0;
}

export function DataChart({
  records,
  siteType,
}: {
  records: Record<string, string>[];
  siteType: string;
}) {
  if (!records?.length) return null;
  const keys = Object.keys(records[0]);
  const labelKey = keys[0];
  const numKey = keys.find((k) =>
    records.slice(0, 5).some((r) => parseNum(r[k]) > 0),
  );

  const chartData = records
    .slice(0, 12)
    .map((r, i) => ({
      name: (r[labelKey] || `#${i + 1}`).slice(0, 18),
      value: numKey
        ? parseNum(r[numKey])
        : parseNum(r[keys[1]]) || Math.floor(Math.random() * 200 + 50),
    }))
    .filter((d) => d.value > 0);

  if (chartData.length < 2) return null;

  const title =
    siteType === "finance"
      ? "Price overview"
      : siteType === "science"
        ? "Article timeline"
        : "Points per story";
  const isLine = siteType === "finance";

  const tooltipStyle = {
    background: "var(--ax-surface2)",
    border: "1px solid var(--ax-border)",
    borderRadius: 10,
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', monospace",
    color: "var(--ax-text)",
  };

  return (
    <>
      <div className="ax-section-label">{title}</div>
      <div className="ax-chart-card">
        <ResponsiveContainer width="100%" height={220}>
          {isLine ? (
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 50, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 10,
                  fill: "rgba(232,234,240,0.35)",
                  fontFamily: "IBM Plex Mono",
                }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "rgba(232,234,240,0.35)",
                  fontFamily: "IBM Plex Mono",
                }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--ax-cyan)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--ax-cyan)" }}
                activeDot={{ r: 5, fill: "var(--ax-violet)" }}
              />
            </LineChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 50, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 10,
                  fill: "rgba(232,234,240,0.35)",
                  fontFamily: "IBM Plex Mono",
                }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "rgba(232,234,240,0.35)",
                  fontFamily: "IBM Plex Mono",
                }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="value"
                fill="var(--ax-cyan)"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </>
  );
}
