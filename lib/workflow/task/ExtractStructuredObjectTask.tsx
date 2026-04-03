import { FileJsonIcon, LucideProps, TextIcon } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const ExtractStructuredObjectTask = {
  type: TaskType.EXTRACT_STRUCTURED_OBJECT,
  label: "Extract structured object",
  icon: (props: LucideProps) => (
    <FileJsonIcon className="stroke-lime-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Html",
      type: TaskParamType.STRING,
      required: true,
    },
    {
      name: "Fields",
      type: TaskParamType.EXTRACTION_FIELDS,
      required: true,
      helperText: "Define fields to extract",
      defaultValue: [
        { key: "title", selector: "h1", type: "text" },
        { key: "description", selector: "p", type: "text" },
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
