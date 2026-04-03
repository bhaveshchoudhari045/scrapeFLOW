import { GitBranchIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const IfCondition = {
  type: TaskType.IF_CONDITION,
  label: "If Condition",
  icon: (props: LucideProps) => (
    <GitBranchIcon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
      helperText:
        "Data to evaluate — boolean string (true/false) or JSON for condition mode",
      required: true,
    },
    {
      name: "Conditions",
      type: TaskParamType.FILTER_CONDITIONS,
      helperText:
        "Optional — if provided, evaluates Data against these conditions. If omitted, Data is treated as a boolean.",
      hideHandler: true,
      required: false,
      defaultValue: {
        logicOperator: "AND",
        conditions: [{ property: "", operator: "contains", value: "" }],
      },
    },
  ] as const,
  outputs: [
    {
      name: "True",
      type: TaskParamType.STRING,
    },
    {
      name: "False",
      type: TaskParamType.STRING,
    },
  ] as const,
};
