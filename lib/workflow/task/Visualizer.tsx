import { BarChartIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const Visualizer = {
  type: TaskType.VISUALIZER,
  label: "Data Visualizer",
  icon: (props: LucideProps) => (
    <BarChartIcon className="stroke-yellow-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
      helperText: "JSON array data to visualize",
      required: true,
    },
    {
      name: "Chart Configuration",
      type: TaskParamType.CHART_CONFIG,
      helperText: "Configure chart type and field mappings",
      required: true,
      hideHandler: true,
    },
  ] as const,
  outputs: [
    {
      name: "Chart Data",
      type: TaskParamType.STRING,
      hideHandler: true,
    },
  ] as const,
};
