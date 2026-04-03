import { FilterIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";
import React from "react";

export const FilterArray = {
  type: TaskType.FILTER_ARRAY,
  label: "Filter Array",
  icon: (props: LucideProps) =>
    React.createElement(FilterIcon, { className: "stroke-red-400", ...props }),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Array",
      type: TaskParamType.STRING,
      helperText: "JSON array to filter (from Extract to List)",
      required: true,
    },
    {
      name: "Conditions",
      type: TaskParamType.FILTER_CONDITIONS,
      helperText: "Define filter conditions",
      hideHandler: true,
      required: true,
      defaultValue: {
        logicOperator: "AND",
        conditions: [{ property: "", operator: "contains", value: "" }],
      },
    },
  ] as const,
  outputs: [
    {
      name: "Filtered Array",
      type: TaskParamType.STRING,
      helperText: "Filtered JSON array",
    },
  ] as const,
};
