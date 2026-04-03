import { TimerIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const RandomDelay = {
  type: TaskType.RANDOM_DELAY,
  label: "Random Delay",
  icon: (props: LucideProps) => (
    <TimerIcon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Web page",
      type: TaskParamType.BROWSER_INSTANCE,
      required: true,
    },
    {
      name: "Delay (seconds)",
      type: TaskParamType.STRING,
      helperText: "Wait time in seconds (default: 1-3 random)",
      required: false,
      hideHandler: true,
    },
  ] as const,
  outputs: [
    {
      name: "Web page",
      type: TaskParamType.BROWSER_INSTANCE,
    },
  ] as const,
};
