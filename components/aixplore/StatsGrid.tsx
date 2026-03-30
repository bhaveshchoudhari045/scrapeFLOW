"use client";

interface Props {
  stats: {
    totalRecords: number;
    scrapedAt: string;
    sourceUrl: string;
    dataSize: string;
    topItem: string;
  };
}

export function StatsGrid({ stats }: Props) {
  const items = [
    { label: "Records", value: stats.totalRecords.toString() },
    { label: "Data size", value: stats.dataSize },
    {
      label: "Scraped at",
      value: new Date(stats.scrapedAt).toLocaleTimeString(),
    },
    { label: "Top item", value: (stats.topItem || "N/A").slice(0, 22) },
  ];
  return (
    <div className="ax-stats-grid">
      {items.map(({ label, value }) => (
        <div key={label} className="ax-stat-card">
          <div className="ax-stat-val">{value}</div>
          <div className="ax-stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
