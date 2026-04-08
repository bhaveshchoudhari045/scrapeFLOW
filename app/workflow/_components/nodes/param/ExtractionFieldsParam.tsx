"use client";
import { TaskParam } from "@/types/task";
import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, Trash2Icon } from "lucide-react";

interface ExtractionField {
  key: string;
  selector: string;
  type: "text" | "attribute";
  attribute?: string;
}

interface ExtractionFieldsConfig {
  baseUrl?: string;
  fields: ExtractionField[];
}

export default function ExtractionFieldsParam({
  param,
  updateNodeParamValue,
  value,
  disabled,
}: {
  param: TaskParam;
  updateNodeParamValue: (newValue: string) => void;
  value: string;
  disabled?: boolean;
}) {
  const parseValue = (): ExtractionFieldsConfig => {
    if (!value) {
      const def = param.defaultValue;
      if (Array.isArray(def)) return { fields: def, baseUrl: "" };
      if (def && typeof def === "object") return def as ExtractionFieldsConfig;
      return { fields: [], baseUrl: "" };
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return { fields: parsed, baseUrl: "" };
      return parsed;
    } catch {
      return { fields: [], baseUrl: "" };
    }
  };

  const [config, setConfig] = useState<ExtractionFieldsConfig>(parseValue);

  // Sync upward whenever config changes
  useEffect(() => {
    updateNodeParamValue(JSON.stringify(config));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const updateField = (
    index: number,
    key: keyof ExtractionField,
    val: string,
  ) => {
    setConfig((prev) => {
      const fields = prev.fields.map((f, i) =>
        i === index ? { ...f, [key]: val } : f,
      );
      return { ...prev, fields };
    });
  };

  const addField = () => {
    setConfig((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        { key: "", selector: "", type: "text", attribute: "" },
      ],
    }));
  };

  const removeField = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Label className="text-xs flex">
        {param.name}
        {param.required && <span className="text-red-400 px-2">*</span>}
      </Label>

      {param.helperText && (
        <p className="text-xs text-muted-foreground">{param.helperText}</p>
      )}

      {/* Base URL */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          Base URL (optional, for resolving relative links)
        </Label>
        <Input
          className="text-xs h-7"
          placeholder="https://example.com"
          value={config.baseUrl ?? ""}
          disabled={disabled}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))
          }
        />
      </div>

      {/* Field rows */}
      <div className="flex flex-col gap-2">
        {config.fields.map((field, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 p-2 border rounded-md bg-muted/30"
          >
            {/* Key + Type row */}
            <div className="flex gap-1 items-center">
              <Input
                className="text-xs h-7 flex-1"
                placeholder="Field key (e.g. title)"
                value={field.key}
                disabled={disabled}
                onChange={(e) => updateField(index, "key", e.target.value)}
              />
              <Select
                value={field.type}
                onValueChange={(val) =>
                  updateField(index, "type", val as "text" | "attribute")
                }
                disabled={disabled}
              >
                <SelectTrigger className="h-7 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="attribute">Attr</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                disabled={disabled}
                onClick={() => removeField(index)}
              >
                <Trash2Icon className="w-3 h-3" />
              </Button>
            </div>

            {/* Selector */}
            <Input
              className="text-xs h-7"
              placeholder="CSS selector (e.g. .title, a)"
              value={field.selector}
              disabled={disabled}
              onChange={(e) => updateField(index, "selector", e.target.value)}
            />

            {/* Attribute name — only shown for attribute type */}
            {field.type === "attribute" && (
              <Input
                className="text-xs h-7"
                placeholder="Attribute name (e.g. href, src)"
                value={field.attribute ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  updateField(index, "attribute", e.target.value)
                }
              />
            )}
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        disabled={disabled}
        onClick={addField}
      >
        <PlusIcon className="w-3 h-3" />
        Add Field
      </Button>
    </div>
  );
}
