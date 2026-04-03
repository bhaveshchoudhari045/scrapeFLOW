// @/lib/workflow/task/registry.ts
import { LaunchBrowserTask } from "./LaunchBrowser";
import { TaskType } from "@/types/task";
import { PageToHtmlTask } from "./PageToHtml";
import { ExtractTextFromElementTask } from "./ExtractTextFromElement";
import { WorkflowTask } from "@/types/workflow";
import { FillInputTask } from "./FillInput";
import { ClickElementTask } from "./ClickElement";
import { WaitForElementTask } from "./WaitForElement";
import { DeliverViaWebhookTask } from "./DeliverViaWebhook";
import { ExtractDataWithAITask } from "./ExtractDataWithAI";
import { ReadPropertyFromJsonTask } from "./ReadPropertyFromJson";
import { AddPropertyToJsonTask } from "./AddPropertyToJson";
import { NavigateUrlTask } from "./NavigateUrlTask";
import { ScrollToElementTask } from "./ScrollToElement";
import { AISummarizer } from "./AISummarizer";
import { BatchLoopOverTask } from "./BatchLoopOver";
import { ConvertFieldsToNumber } from "./ConvertFieldsToNumberTask";
import { ExportCSV } from "./ExportCSV";
import { ExtractStructuredListTask } from "./ExtractStructuredListTask";
import { ExtractStructuredObjectTask } from "./ExtractStructuredObjectTask";
import { ExtractTableData } from "./ExtractTableData";
import { FilterArray } from "./FilterArray";
import { FlowControlAction } from "./FlowControlAction";
import { GenerateAnalyticalReport } from "./GenerateAnalyticalReport";
import { IfCondition } from "@/lib/workflow/task/IfCondition";
import { InfiniteScroll } from "./InfiniteScroll";
import { LoopEnd } from "./LoopEnd";
import { LoopStartArray } from "./LoopStartArray";
import { LoopStartRepeat } from "./LoopStartRepeat";
import { LoopStartUntilCondition } from "./LoopStartUntilCondition";
import { RandomDelay } from "./RandomDelay";
import { SentimentAnalyzer } from "./SentimentAnalyzer";

import { StopWorkflow } from "./StopWorkflow";
import { TransformArraysToObjects } from "./TransformArraysToObjects";
import { Visualizer } from "./Visualizer";
import { SessionTask } from "./Session";

type Registry = {
  [k in TaskType]?: WorkflowTask;
};

export const TaskRegistry: Registry = {
  LAUNCH_BROWSER: LaunchBrowserTask,
  SESSION_COOKIES: SessionTask, //here is the same error
  PAGE_TO_HTML: PageToHtmlTask,
  EXTRACT_TEXT_FROM_ELEMENT: ExtractTextFromElementTask,
  EXTRACT_STRUCTURED_LIST: ExtractStructuredListTask, //here is the same error
  EXTRACT_STRUCTURED_OBJECT: ExtractStructuredObjectTask, //here is the same error
  FILL_INPUT: FillInputTask,
  CLICK_ELEMENT: ClickElementTask,
  WAIT_FOR_ELEMENT: WaitForElementTask,
  DELIVER_VIA_WEBHOOK: DeliverViaWebhookTask,
  EXTRACT_DATA_WITH_AI: ExtractDataWithAITask,
  READ_PROPERTY_FROM_JSON: ReadPropertyFromJsonTask,
  ADD_PROPERTY_TO_JSON: AddPropertyToJsonTask,
  TRANSFORM_ARRAYS_TO_OBJECTS: TransformArraysToObjects, //here is the same error
  NAVIGATE_TO_URL: NavigateUrlTask,
  SCROLL_TO_ELEMENT: ScrollToElementTask,
  FILTER_ARRAY: FilterArray, //here is the same error
  INFINITE_SCROLL: InfiniteScroll, //here is the same error
  RANDOM_DELAY: RandomDelay, //here is the same error
  EXPORT_CSV: ExportCSV, //here is the same error
  EXTRACT_TABLE_DATA: ExtractTableData, //here is the same error
  CONVERT_FIELDS_TO_NUMBER: ConvertFieldsToNumber, //here is the same error
  LOOP_START_ARRAY: LoopStartArray, //here is the same error
  LOOP_START_REPEAT: LoopStartRepeat, //here is the same error
  LOOP_START_UNTIL_CONDITION: LoopStartUntilCondition, //here is the same error
  LOOP_END: LoopEnd, //here is the same error
  FLOW_CONTROL_ACTION: FlowControlAction, //here is the same error
  IF_CONDITION: IfCondition, //here is the same error
  STOP_WORKFLOW: StopWorkflow, //here is the same error
  SENTIMENT_ANALYZER: SentimentAnalyzer, //here is the same error
  AI_SUMMARIZER: AISummarizer, //here is the same error
  VISUALIZER: Visualizer, //here is the same error
  BATCH_LOOP_OVER: BatchLoopOverTask, //here is the same error
  GENERATE_ANALYTICAL_REPORT: GenerateAnalyticalReport,
};
