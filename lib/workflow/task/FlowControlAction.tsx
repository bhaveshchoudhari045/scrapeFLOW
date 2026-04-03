import { SignalIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const FlowControlAction = {
  type: TaskType.FLOW_CONTROL_ACTION,
  label: "Flow Control",
  icon: (props: LucideProps) => (
    <SignalIcon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
      helperText: "Current data (for context only, passed through)",
      required: false,
    },
    {
      name: "Action",
      type: TaskParamType.SELECT,
      helperText: "Control flow action to perform",
      required: true,
      hideHandler: true,
      options: [
        { label: "Continue (skip to next iteration)", value: "CONTINUE" },
        { label: "Break (exit loop)", value: "BREAK" },
        { label: "Stop (stop entire workflow)", value: "STOP" },
      ],
    },
  ] as const,
  outputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
    },
  ] as const,
};
