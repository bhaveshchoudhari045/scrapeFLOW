import { LucideProps, LayersIcon } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const BatchLoopOverTask = {
  type: TaskType.BATCH_LOOP_OVER,
  label: "Batch Loop Over",
  icon: (props: LucideProps) => (
    <LayersIcon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Source Data (JSON)",
      type: TaskParamType.STRING,
      helperText: "JSON array from Extract Structured List containing URLs",
      required: true,
    },
    {
      name: "URL Field Name",
      type: TaskParamType.STRING,
      helperText: "Name of the field containing URLs (e.g., 'url', 'link')",
      required: true,
      defaultValue: "url",
    },
    {
      name: "Fields",
      type: TaskParamType.EXTRACTION_FIELDS,
      required: true,
      helperText: "Define fields to extract from each visited page",
      defaultValue: [
        { key: "title", selector: "h1", type: "text" },
        { key: "content", selector: ".content", type: "text" },
      ],
    },
  ] as const,
  outputs: [
    {
      name: "Extracted Data",
      type: TaskParamType.STRING,
    },
  ] as const,
};
