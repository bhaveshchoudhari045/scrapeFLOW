// @/lib/workflow/task/registry.ts
import { LaunchBrowserTask } from "./LaunchBrowser";
import { TaskType } from "@/types/task";
import { PageToHtmlTask } from "./PageToHtml";
import { ExtractTextFromElementTask } from "./ExtractTextFromElement";

export const TaskRegistry = {
  [TaskType.LAUNCH_BROWSER]: LaunchBrowserTask, // Use enum as key
  [TaskType.PAGE_TO_HTML]: PageToHtmlTask,
  [TaskType.EXTRACT_TEXT_FROM_ELEMENT]: ExtractTextFromElementTask,
} as const;
