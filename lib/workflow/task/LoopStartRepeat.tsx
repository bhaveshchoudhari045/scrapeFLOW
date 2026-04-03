import { Repeat2Icon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const LoopStartRepeat = {
  type: TaskType.LOOP_START_REPEAT,
  label: "Loop (Repeat)",
  icon: (props: LucideProps) => (
    <Repeat2Icon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  isLoopStart: true,
  credits: 0,
  inputs: [
    {
      name: "Repeat Count",
      type: TaskParamType.STRING,
      helperText: "Number of times to repeat (positive integer)",
      required: true,
      hideHandler: true,
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
