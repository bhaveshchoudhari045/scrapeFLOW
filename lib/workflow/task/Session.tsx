import { CookieIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const SessionTask = {
  type: TaskType.SESSION_COOKIES,
  label: "Session Cookies",
  icon: (props: LucideProps) => (
    <CookieIcon className="stroke-orange-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Session Cookies (JSON)",
      type: TaskParamType.STRING,
      helperText: "Paste cookie JSON array here to restore session",
      required: true,
      hideHandler: true,
    },
  ] as const,
  outputs: [
    {
      name: "Session",
      type: TaskParamType.SESSION_PARAM,
    },
  ] as const,
};
