import { FileSpreadsheetIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const ExportCSV = {
  type: TaskType.EXPORT_CSV,
  label: "Export to CSV",
  icon: (props: LucideProps) => (
    <FileSpreadsheetIcon className="stroke-teal-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
      helperText: "JSON array to convert to CSV",
      required: true,
    },
    {
      name: "Filename",
      type: TaskParamType.STRING,
      helperText: "Filename (without .csv)",
      required: false,
      hideHandler: true,
    },
  ] as const,
  outputs: [
    {
      name: "CSV Content",
      type: TaskParamType.STRING,
      hideHandler: true,
    },
  ] as const,
};
