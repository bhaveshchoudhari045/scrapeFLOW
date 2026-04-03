import { OctagonXIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const StopWorkflow = {
  type: TaskType.STOP_WORKFLOW,
  label: "Stop Workflow",
  icon: (props: LucideProps) => (
    <OctagonXIcon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
      helperText: "Connect from a branch to control when this task runs",
      required: false,
    },
    {
      name: "Message",
      type: TaskParamType.STRING,
      helperText: "Optional reason for stopping the workflow",
      required: false,
      hideHandler: true,
    },
  ] as const,
  outputs: [
    {
      name: "Stopped",
      type: TaskParamType.STRING,
      hideHandler: true,
    },
  ] as const,
};
