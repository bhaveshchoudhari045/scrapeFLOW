// ─── CreditUsageChart.tsx ────────────────────────────────────────────────────
// FIX: chart colors now use CSS vars that actually resolve.
// The shadcn ChartContainer injects --color-success / --color-failed
// from chartConfig — those values must match what's in globals.css.
// We use hsl palette vars directly so they change with palette switching.
"use client";

import React from "react";
import { GetCreditUsageInPeriod } from "@/actions/analytics/getCreditUsageInperiod";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, CartesianGrid, XAxis, Bar } from "recharts";

type ChartData = Awaited<ReturnType<typeof GetCreditUsageInPeriod>>;

const chartConfig = {
  success: {
    label: "Successful Phase Credits",
    // Use palette primary — resolves via CSS custom property
    color: "var(--primary, hsl(38 96% 52%))",
  },
  failed: {
    label: "Failed Phase Credits",
    color: "hsl(0 84% 60%)",
  },
} satisfies ChartConfig;

export default function CreditUsageChart({
  data,
  title,
  description,
}: {
  data: ChartData;
  title: string;
  description: string;
}) {
  return (
    <ChartContainer config={chartConfig} className="max-h-[220px] w-full">
      <BarChart
        data={data}
        height={220}
        accessibilityLayer
        margin={{ top: 10 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="var(--rule, rgba(0,0,0,0.06))"
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
          cursor={{ fill: "var(--p-dim, rgba(245,158,11,0.06))" }}
          content={
            <ChartTooltipContent
              className="w-[250px]"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--rule2)",
                borderRadius: "var(--r-md)",
                boxShadow: "var(--sh-lg)",
                color: "var(--tx1)",
              }}
            />
          }
        />
        <Bar
          fillOpacity={0.85}
          radius={[0, 0, 4, 4]}
          fill="var(--color-success)"
          stroke="var(--color-success)"
          dataKey="success"
          stackId="a"
        />
        <Bar
          fillOpacity={0.85}
          radius={[4, 4, 0, 0]}
          fill="var(--color-failed)"
          stroke="var(--color-failed)"
          dataKey="failed"
          stackId="a"
        />
      </BarChart>
    </ChartContainer>
  );
}
