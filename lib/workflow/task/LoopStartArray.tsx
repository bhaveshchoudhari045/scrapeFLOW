import { RepeatIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const LoopStartArray = {
  type: TaskType.LOOP_START_ARRAY,
  label: "Loop (Array)",
  icon: (props: LucideProps) => (
    <RepeatIcon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  isLoopStart: true,
  credits: 0,
  inputs: [
    {
      name: "Source Array",
      type: TaskParamType.STRING,
      helperText:
        "JSON array to iterate over (from Extract Structured List, etc.)",
      required: true,
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
