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

// Use a looser icon signature for the registry so individual task files
// returning JSX.Element (a subtype of ReactNode) don't cause variance errors.
type RegistryTask = Omit<WorkflowTask, "icon"> & {
  icon: (props: any) => any;
};

type Registry = {
  [k in TaskType]?: RegistryTask;
};

export const TaskRegistry: Registry = {
  LAUNCH_BROWSER: LaunchBrowserTask,
  SESSION_COOKIES: SessionTask,
  PAGE_TO_HTML: PageToHtmlTask,
  EXTRACT_TEXT_FROM_ELEMENT: ExtractTextFromElementTask,
  EXTRACT_STRUCTURED_LIST: ExtractStructuredListTask,
  EXTRACT_STRUCTURED_OBJECT: ExtractStructuredObjectTask,
  FILL_INPUT: FillInputTask,
  CLICK_ELEMENT: ClickElementTask,
  WAIT_FOR_ELEMENT: WaitForElementTask,
  DELIVER_VIA_WEBHOOK: DeliverViaWebhookTask,
  EXTRACT_DATA_WITH_AI: ExtractDataWithAITask,
  READ_PROPERTY_FROM_JSON: ReadPropertyFromJsonTask,
  ADD_PROPERTY_TO_JSON: AddPropertyToJsonTask,
  TRANSFORM_ARRAYS_TO_OBJECTS: TransformArraysToObjects,
  NAVIGATE_URL: NavigateUrlTask,
  SCROLL_TO_ELEMENT: ScrollToElementTask,
  FILTER_ARRAY: FilterArray,
  INFINITE_SCROLL: InfiniteScroll,
  RANDOM_DELAY: RandomDelay,
  EXPORT_CSV: ExportCSV,
  EXTRACT_TABLE_DATA: ExtractTableData,
  CONVERT_FIELDS_TO_NUMBER: ConvertFieldsToNumber,
  LOOP_START_ARRAY: LoopStartArray,
  LOOP_START_REPEAT: LoopStartRepeat,
  LOOP_START_UNTIL_CONDITION: LoopStartUntilCondition,
  LOOP_END: LoopEnd,
  FLOW_CONTROL_ACTION: FlowControlAction,
  IF_CONDITION: IfCondition,
  STOP_WORKFLOW: StopWorkflow,
  SENTIMENT_ANALYZER: SentimentAnalyzer,
  AI_SUMMARIZER: AISummarizer,
  VISUALIZER: Visualizer,
  BATCH_LOOP_OVER: BatchLoopOverTask,
  GENERATE_ANALYTICAL_REPORT: GenerateAnalyticalReport,
};
