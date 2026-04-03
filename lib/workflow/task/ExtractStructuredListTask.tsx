import { LucideProps, ListIcon } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const ExtractStructuredListTask = {
  type: TaskType.EXTRACT_STRUCTURED_LIST,
  label: "Extract structured list",
  icon: (props: LucideProps) => (
    <ListIcon className="stroke-lime-400" {...props} />
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
      name: "Container Selector",
      type: TaskParamType.STRING,
      required: true,
      helperText:
        "CSS selector for each item container (e.g., '.product-card')",
    },
    {
      name: "Fields",
      type: TaskParamType.EXTRACTION_FIELDS,
      required: true,
      helperText: "Define fields to extract from each item",
      defaultValue: [
        { key: "title", selector: ".title", type: "text" },
        { key: "url", selector: "a", type: "attribute", attribute: "href" },
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
