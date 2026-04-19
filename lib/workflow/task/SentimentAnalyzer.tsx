import { HeartPulseIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const SentimentAnalyzer = {
  type: TaskType.SENTIMENT_ANALYZER,
  label: "Sentiment Analyzer",
  icon: (props: LucideProps) => (
    <HeartPulseIcon className="stroke-yellow-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
      helperText: "Text, JSON object, or JSON array to analyze",
      required: true,
    },
    {
      name: "Fields",
      type: TaskParamType.STRING,
      helperText:
        "Comma-separated field names to extract from JSON objects (optional)",
      required: false,
      hideHandler: true,
    },
  ] as const,
  outputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
    },
  ] as const,
};