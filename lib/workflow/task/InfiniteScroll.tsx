import { ArrowDownIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const InfiniteScroll = {
  type: TaskType.INFINITE_SCROLL,
  label: "Infinite Scroll",
  icon: (props: LucideProps) => (
    <ArrowDownIcon className="stroke-blue-400" {...props} />
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
      name: "Max Scrolls",
      type: TaskParamType.STRING,
      helperText: "Number of times to scroll (default: 10)",
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
