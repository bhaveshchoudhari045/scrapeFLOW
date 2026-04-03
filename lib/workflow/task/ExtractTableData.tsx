import { TableIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const ExtractTableData = {
  type: TaskType.EXTRACT_TABLE_DATA,
  label: "Extract Table Data",
  icon: (props: LucideProps) => (
    <TableIcon className="stroke-lime-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "HTML",
      type: TaskParamType.STRING,
      helperText: "HTML content containing the table",
      required: true,
    },
    {
      name: "Table Selector",
      type: TaskParamType.STRING,
      helperText:
        "CSS selector for the table (e.g., 'table', '#myTable', '.data-table')",
      required: true,
    },
    {
      name: "Columns to Keep",
      type: TaskParamType.STRING,
      helperText:
        "Comma-separated names of columns you want (e.g., 'column_1_name, column_2_name'). Leave empty to get all.",
      required: false,
    },
  ] as const,
  outputs: [
    {
      name: "Extracted Data",
      type: TaskParamType.STRING,
    },
  ] as const,
};
