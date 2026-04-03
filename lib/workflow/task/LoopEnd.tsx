import { CheckCircle2Icon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const LoopEnd = {
  type: TaskType.LOOP_END,
  label: "Loop End",
  icon: (props: LucideProps) => (
    <CheckCircle2Icon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  isLoopEnd: true,
  credits: 0,
  inputs: [
    {
      name: "Item Result",
      type: TaskParamType.STRING,
      helperText:
        "Result from processing the current item (will be collected into final array)",
      required: true,
    },
  ] as const,
  outputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
    },
  ] as const,
};
