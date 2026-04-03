import { SparklesIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const AISummarizer = {
  type: TaskType.AI_SUMMARIZER,
  label: "AI Summarizer",
  icon: (props: LucideProps) => (
    <SparklesIcon className="stroke-yellow-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
      helperText: "Text, JSON object, or JSON array to summarize",
      required: true,
    },
    {
      name: "Credentials",
      type: TaskParamType.CREDENTIAL,
      helperText: "AI provider credentials",
      required: true,
      hideHandler: true,
    },
    {
      name: "Fields",
      type: TaskParamType.STRING,
      helperText:
        "Comma-separated field names to extract from JSON objects (optional)",
      required: false,
      hideHandler: true,
    },
    {
      name: "Summary Length",
      type: TaskParamType.SELECT,
      helperText: "Desired summary length",
      required: true,
      hideHandler: true,
      options: [
        { label: "Short (1-2 sentences)", value: "short" },
        { label: "Medium (1 paragraph)", value: "medium" },
        { label: "Long (detailed)", value: "long" },
      ],
    },
  ] as const,
  outputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
    },
  ] as const,
};
