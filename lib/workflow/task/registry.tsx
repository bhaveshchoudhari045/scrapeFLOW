// @/lib/workflow/task/registry.ts
import { LaunchBrowserTask } from "./LaunchBrowser";
import { TaskType } from "@/types/task";
import { PageToHtmlTask } from "./PageToHtml";

export const TaskRegistry = {
  [TaskType.LAUNCH_BROWSER]: LaunchBrowserTask, // Use enum as key
  [TaskType.PAGE_TO_HTML]: PageToHtmlTask,
} as const;
