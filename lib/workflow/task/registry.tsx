// @/lib/workflow/task/registry.ts
import { LaunchBrowserTask } from "./LaunchBrowser";
import { TaskType } from "@/types/task";
import { PageToHtmlTask } from "./PageToHtml";
import { ExtractTextFromElementTask } from "./ExtractTextFromElement";
import { WorkflowTask } from "@/types/workflow";
import { FillInputTask } from "./FillInput";
import { ClickElementTask } from "./ClickElement";
import { WaitForElementTask } from "./WaitForElement";


type Registry = {
  [k in TaskType]: WorkflowTask;
};

export const TaskRegistry: Registry = {
  LAUNCH_BROWSER: LaunchBrowserTask, // Use enum as key
  PAGE_TO_HTML: PageToHtmlTask,
  EXTRACT_TEXT_FROM_ELEMENT: ExtractTextFromElementTask,
  FILL_INPUT: FillInputTask,
  CLICK_ELEMENT: ClickElementTask,
  WAIT_FOR_ELEMENT: WaitForElementTask,
};
