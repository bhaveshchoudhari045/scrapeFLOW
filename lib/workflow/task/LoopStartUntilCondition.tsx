import { RefreshCwIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const LoopStartUntilCondition = {
  type: TaskType.LOOP_START_UNTIL_CONDITION,
  label: "Loop (Until Condition)",
  icon: (props: LucideProps) => (
    <RefreshCwIcon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  isLoopStart: true,
  credits: 0,
  inputs: [
    {
      name: "Max Iterations",
      type: TaskParamType.STRING,
      helperText: "Maximum number of iterations (safety limit)",
      required: true,
      hideHandler: true,
    },
    {
      name: "Initial Data",
      type: TaskParamType.STRING,
      helperText: "Optional initial data to pass to the first iteration",
      required: false,
    },
  ] as const,
  outputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
    },
    {
      name: "Current Index",
      type: TaskParamType.STRING,
    },
  ] as const,
};
