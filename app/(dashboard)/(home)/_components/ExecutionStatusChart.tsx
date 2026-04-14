"use client";

// FIX (issue 3): ChartContainer injects --color-success/failed as CSS vars
// using the literal string from chartConfig.color. When we pass "var(--accent)"
// it injects --color-success: var(--accent) which recharts can't use in SVG fill.
// Solution: use a real hsl() value for success. We pick the accent hue from
// the CSS var computation done at mount, OR simply use a stable semantic green
// for "success" and palette accent for a secondary series.
// For success: use #22c55e (green-500) — universally readable as "success"
// For failed: use hsl(0 84% 60%) — universally readable as "failed"
// The chart container itself sits inside .chart-card which has palette shadow.

import React from "react";
import { GetWorkflowExecutionStats } from "@/actions/analytics/getWorkflowExecutionStats";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis } from "recharts";

type ChartData = Awaited<ReturnType<typeof GetWorkflowExecutionStats>>;

// Static colors — these inject correctly as CSS vars into ChartContainer
const chartConfig = {
  success: {
    label: "Successful",
    color: "#22c55e", // green — always visible, means "success"
  },
  failed: {
    label: "Failed",
    color: "hsl(0 84% 60%)", // red — always visible, means "failed"
  },
} satisfies ChartConfig;

export default function ExecutionStatusChart({ data }: { data: ChartData }) {
  return (
    <ChartContainer config={chartConfig} className="max-h-[220px] w-full">
      <AreaChart
        data={data}
        height={220}
        accessibilityLayer
        margin={{ top: 10 }}
      >
        <defs>
          <linearGradient id="successFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-success)"
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor="var(--color-success)"
              stopOpacity={0.02}
            />
          </linearGradient>
          <linearGradient id="failedFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-failed)"
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor="var(--color-failed)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>

        <CartesianGrid
          vertical={false}
          stroke="var(--rule, rgba(0,0,0,0.06))"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tick={{ fill: "var(--tx3, #9299ad)", fontSize: 11 }}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <ChartTooltip
          cursor={{ stroke: "var(--rule2, rgba(0,0,0,0.10))", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              className="w-[220px]"
              style={{
                background: "var(--bg-card, #fff)",
                border: "1px solid var(--rule2, rgba(0,0,0,0.10))",
                borderRadius: "var(--r-md, 13px)",
                boxShadow: "var(--sh-lg)",
                color: "var(--tx1, #0b0c10)",
              }}
            />
          }
        />
        <Area
          min={0}
          type="monotone"
          fill="url(#successFill)"
          stroke="var(--color-success)"
          strokeWidth={2.5}
          dataKey="success"
          stackId="a"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          min={0}
          type="monotone"
          fill="url(#failedFill)"
          stroke="var(--color-failed)"
          strokeWidth={2.5}
          dataKey="failed"
          stackId="a"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
