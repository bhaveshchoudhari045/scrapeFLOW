"use client";

import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  Pie,
  Cell,
  Scatter,
} from "recharts";

// ── generateChartData produces these shapes: ──────────────────────────────
// line/scatter: { x, y, volume?, label? }
// bar/pie:      { label, value, color }
// So ChartWrappers must handle both, not require xKey/yKeys config.

interface LineChartProps {
  data: { x: string | number; y: number; [k: string]: any }[];
  config?: {
    xLabel?: string;
    yLabel?: string;
    color?: string;
    showVolume?: boolean;
  };
  height?: number;
}

export function LineChartWrapper({
  data,
  config,
  height = 280,
}: LineChartProps) {
  const color = config?.color ?? "#00f5c8";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="x"
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          label={
            config?.xLabel
              ? {
                  value: config.xLabel,
                  position: "insideBottom",
                  fill: "#475569",
                  fontSize: 10,
                }
              : undefined
          }
          interval="preserveStartEnd"
          tickFormatter={(v) => String(v).slice(5)} // show MM-DD for dates
        />
        <YAxis
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={55}
          tickFormatter={(v) => v.toFixed(0)}
          label={
            config?.yLabel
              ? {
                  value: config.yLabel,
                  angle: -90,
                  position: "insideLeft",
                  fill: "#475569",
                  fontSize: 10,
                }
              : undefined
          }
        />
        <Tooltip
          contentStyle={{
            background: "#0d0d1f",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
          }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color }}
        />
        <Line
          dataKey="y"
          stroke={color}
          dot={false}
          strokeWidth={2}
          name={config?.yLabel ?? "Price"}
        />
        {config?.showVolume && (
          <Line
            dataKey="volume"
            stroke="#334155"
            dot={false}
            strokeWidth={1}
            name="Volume"
            yAxisId={1}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  config?: { xLabel?: string; yLabel?: string };
  height?: number;
}

export function BarChartWrapper({ data, config, height = 280 }: BarChartProps) {
  // Recharts needs a single fill per Bar — use Cell for per-bar colours
  const defaultColor = "#00c8d4";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "#475569", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "#0d0d1f",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
          }}
          labelStyle={{ color: "#94a3b8" }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          name={config?.yLabel ?? "Count"}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color ?? defaultColor}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  config?: Record<string, any>;
  height?: number;
}

const FALLBACK_COLORS = [
  "#00f5c8",
  "#ef4444",
  "#f59e0b",
  "#818cf8",
  "#fb923c",
  "#34d399",
];

export function PieChartWrapper({ data, config, height = 260 }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={40}
          paddingAngle={3}
          label={({ label, percent }) =>
            `${label} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: "rgba(255,255,255,0.15)" }}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#0d0d1f",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface ScatterChartProps {
  data: { x: number; y: number; label?: string }[];
  config?: { xLabel?: string; yLabel?: string; color?: string };
  height?: number;
}

export function ScatterChartWrapper({
  data,
  config,
  height = 280,
}: ScatterChartProps) {
  const color = config?.color ?? "#818cf8";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          type="number"
          dataKey="x"
          name={config?.xLabel ?? "X"}
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={config?.yLabel ?? "Y"}
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{
            background: "#0d0d1f",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={(value, name) => [value, name]}
        />
        <Scatter data={data} fill={color} fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
