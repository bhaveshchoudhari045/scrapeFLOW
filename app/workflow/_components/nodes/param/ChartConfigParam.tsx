"use client";
import { TaskParam } from "@/types/task";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "doughnut"
  | "scatter"
  | "area"
  | "radar"
  | "polarArea";

interface ChartConfig {
  chartType: ChartType;
  chartName: string;
  xField: string;
  yField: string;
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "doughnut", label: "Doughnut" },
  { value: "scatter", label: "Scatter" },
  { value: "radar", label: "Radar" },
  { value: "polarArea", label: "Polar Area" },
];

const DEFAULT_CONFIG: ChartConfig = {
  chartType: "bar",
  chartName: "Chart",
  xField: "",
  yField: "",
};

function parseConfig(raw: string | undefined): ChartConfig {
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed?.chartType) return { ...DEFAULT_CONFIG, ...parsed };
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default function ChartConfigParam({
  param,
  value,
  updateNodeParamValue,
  disabled,
}: {
  param: TaskParam;
  value: string;
  updateNodeParamValue: (value: string) => void;
  disabled: boolean;
}) {
  const [config, setConfig] = useState<ChartConfig>(() => parseConfig(value));

  useEffect(() => {
    setConfig(parseConfig(value));
  }, [value]);

  const emit = useCallback(
    (next: ChartConfig) => {
      setConfig(next);
      updateNodeParamValue(JSON.stringify(next));
    },
    [updateNodeParamValue],
  );

  const update = (field: keyof ChartConfig, val: string) =>
    emit({ ...config, [field]: val });

  return (
    <div className="flex w-full flex-col gap-2 p-1">
      {/* Chart type */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Chart type</Label>
        <Select
          disabled={disabled}
          value={config.chartType}
          onValueChange={(v) => update("chartType", v as ChartType)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPES.map((ct) => (
              <SelectItem key={ct.value} value={ct.value} className="text-xs">
                {ct.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart name */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Chart name</Label>
        <Input
          disabled={disabled}
          placeholder="e.g. Revenue by Month"
          value={config.chartName}
          onChange={(e) => update("chartName", e.target.value)}
          className="h-7 text-xs"
        />
      </div>

      {/* Field mappings */}
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <Label className="text-xs text-muted-foreground">X field</Label>
          <Input
            disabled={disabled}
            placeholder="auto-detect"
            value={config.xField}
            onChange={(e) => update("xField", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <Label className="text-xs text-muted-foreground">Y field</Label>
          <Input
            disabled={disabled}
            placeholder="auto-detect"
            value={config.yField}
            onChange={(e) => update("yField", e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Leave X/Y fields blank to auto-detect from data.
      </p>
    </div>
  );
}
