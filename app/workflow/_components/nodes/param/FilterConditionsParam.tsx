"use client";
import { TaskParam } from "@/types/task";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

type Operator =
  | "contains"
  | "not_contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

interface Condition {
  property: string;
  operator: Operator;
  value: string;
}

interface FilterConditionsConfig {
  logicOperator: "AND" | "OR";
  conditions: Condition[];
}

const OPERATORS: { value: Operator; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const NO_VALUE_OPERATORS: Operator[] = ["is_empty", "is_not_empty"];

const DEFAULT_CONFIG: FilterConditionsConfig = {
  logicOperator: "AND",
  conditions: [{ property: "", operator: "contains", value: "" }],
};

function parseConfig(raw: string | undefined): FilterConditionsConfig {
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed?.conditions) return parsed;
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default function FilterConditionsParam({
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
  const [config, setConfig] = useState<FilterConditionsConfig>(() =>
    parseConfig(value),
  );

  // Sync inbound value changes (e.g. node load)
  useEffect(() => {
    setConfig(parseConfig(value));
  }, [value]);

  const emit = useCallback(
    (next: FilterConditionsConfig) => {
      setConfig(next);
      updateNodeParamValue(JSON.stringify(next));
    },
    [updateNodeParamValue],
  );

  const setLogicOperator = (op: "AND" | "OR") =>
    emit({ ...config, logicOperator: op });

  const addCondition = () =>
    emit({
      ...config,
      conditions: [
        ...config.conditions,
        { property: "", operator: "contains", value: "" },
      ],
    });

  const removeCondition = (index: number) =>
    emit({
      ...config,
      conditions: config.conditions.filter((_, i) => i !== index),
    });

  const updateCondition = (
    index: number,
    field: keyof Condition,
    val: string,
  ) => {
    const next = config.conditions.map((c, i) =>
      i === index ? { ...c, [field]: val } : c,
    );
    emit({ ...config, conditions: next });
  };

  return (
    <div className="flex w-full flex-col gap-2 p-1">
      {/* Logic operator toggle */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Match</Label>
        <div className="flex rounded-md border text-xs overflow-hidden">
          {(["AND", "OR"] as const).map((op) => (
            <button
              key={op}
              disabled={disabled}
              onClick={() => setLogicOperator(op)}
              className={`px-3 py-1 transition-colors ${
                config.logicOperator === op
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {op}
            </button>
          ))}
        </div>
        <Label className="text-xs text-muted-foreground">conditions</Label>
      </div>

      {/* Condition rows */}
      <div className="flex flex-col gap-1.5">
        {config.conditions.map((condition, index) => (
          <div key={index} className="flex items-center gap-1">
            {/* Property */}
            <Input
              disabled={disabled}
              placeholder="property"
              value={condition.property}
              onChange={(e) =>
                updateCondition(index, "property", e.target.value)
              }
              className="h-7 text-xs flex-1 min-w-0"
            />

            {/* Operator */}
            <Select
              disabled={disabled}
              value={condition.operator}
              onValueChange={(v) =>
                updateCondition(index, "operator", v as Operator)
              }
            >
              <SelectTrigger className="h-7 text-xs w-[130px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem
                    key={op.value}
                    value={op.value}
                    className="text-xs"
                  >
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value (hidden for is_empty / is_not_empty) */}
            {!NO_VALUE_OPERATORS.includes(condition.operator) && (
              <Input
                disabled={disabled}
                placeholder="value"
                value={condition.value}
                onChange={(e) =>
                  updateCondition(index, "value", e.target.value)
                }
                className="h-7 text-xs flex-1 min-w-0"
              />
            )}

            {/* Remove */}
            <Button
              disabled={disabled || config.conditions.length <= 1}
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeCondition(index)}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add condition */}
      <Button
        disabled={disabled}
        variant="outline"
        size="sm"
        className="h-7 text-xs w-full"
        onClick={addCondition}
      >
        <PlusIcon className="h-3.5 w-3.5 mr-1" />
        Add condition
      </Button>
    </div>
  );
}
