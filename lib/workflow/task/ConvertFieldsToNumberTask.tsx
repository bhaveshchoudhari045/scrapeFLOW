import { HashIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const ConvertFieldsToNumber = {
  type: TaskType.CONVERT_FIELDS_TO_NUMBER,
  label: "Convert Fields to Number",
  icon: (props: LucideProps) => (
    <HashIcon className="stroke-purple-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Array",
      type: TaskParamType.STRING,
      helperText: "JSON array with string fields to convert",
      required: true,
    },
    {
      name: "Fields",
      type: TaskParamType.STRING,
      helperText: "Comma-separated field names (e.g., 'price,rating,reviews')",
      required: true,
      hideHandler: true,
    },
  ] as const,
  outputs: [
    {
      name: "Converted Array",
      type: TaskParamType.STRING,
      helperText: "Array with numeric fields converted",
    },
  ] as const,
};
