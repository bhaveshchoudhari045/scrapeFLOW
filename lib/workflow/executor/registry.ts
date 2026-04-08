import { ExecutionEnvironment } from "@/types/executor";
import { TaskType } from "@/types/task";
import { WorkflowTask } from "@/types/workflow";
import { AddPropertyToJsonExecutor } from "./AddPropertyToJsonExecutor";
import { AISummarizerExecutor } from "./AISummarizerExecutor";
import { BatchLoopOverExecutor } from "./BatchLoopOverExecutor";
import { ClickELementExecutor } from "./ClickElementExecutor";
import { ConvertFieldsToNumberExecutor } from "./ConvertFieldsToNumberExecutor";
import { DeliverViaWebhookExecutor } from "./DeliverViaWebhookExecutor";
import { ExportCSVExecutor } from "./ExportCSVExecutor";
import { ExtractDataWithAIExecutor } from "./ExtractDataWithAIExecutor";
import { ExtractStructuredListExecutor } from "./ExtractStructuredListExecutor";
import { ExtractStructuredObjectExecutor } from "./ExtractStructuredObjectExecutor";
import { ExtractTableDataExecutor } from "./ExtractTableDataExecutor";
import { ExtractTextFromElementExecutor } from "./ExtractTextFromElementExecutor";
import { FillInputExecutor } from "./FillInputExecutor";
import { FilterArrayExecutor } from "./FilterArrayExecutor";
import { FlowControlActionExecutor } from "./FlowControlActionExecutor";
import { GenerateAnalyticalReportExecutor } from "./GenerateAnalyticalReportExecutor";
import { IfConditionExecutor } from "./IfConditionExecutor";
import { InfiniteScrollExecutor } from "./InfiniteScrollExecutor";
import { LaunchBrowserExecutor } from "./LaunchBrowserExecutor";
import { LoopEndExecutor } from "./LoopEndExecutor";
import { LoopStartArrayExecutor } from "./LoopStartArrayExecutor";
import { LoopStartRepeatExecutor } from "./LoopStartRepeatExecutor";
import { LoopStartUntilConditionExecutor } from "./LoopStartUntilConditionExecutor";
import { NavigateUrlExecutor } from "./NavigateUrlExecutor";
import { PageToHtmlExecutor } from "./PageToHtmlExecutor";
import { RandomDelayExecutor } from "./RandomDelayExecutor";
import { ReadPropertyFromJsonExecutor } from "./ReadPropertyFromJsonExecutor";
import { ScrollToElementExecutor } from "./ScrollToElementExecutor";
import { SentimentAnalyzerExecutor } from "./SentimentAnalyzerExecutor";
import { SessionExecutor } from "./SessionExecutor";
import { StopWorkflowExecutor } from "./StopWorkflowExecutor";
import { TransformArraysToObjectsExecutor } from "./TransformArraysToObjectsExecutor";
import { VisualizerExecutor } from "./VisualizerExecutor";
import { WaitForElementExecutor } from "./WaitForElementExecutor";

type ExecutorFn<T extends WorkflowTask> = (
  environment: ExecutionEnvironment<T>,
) => Promise<boolean>;

type RegistryType = {
  [k in TaskType]?: ExecutorFn<WorkflowTask>;
};
export const ExecutorRegistry: RegistryType = {
  LAUNCH_BROWSER: LaunchBrowserExecutor,
  PAGE_TO_HTML: PageToHtmlExecutor,
  EXTRACT_TEXT_FROM_ELEMENT: ExtractTextFromElementExecutor, //() => Promise.resolve(true),
  FILL_INPUT: FillInputExecutor,
  CLICK_ELEMENT: ClickELementExecutor,
  WAIT_FOR_ELEMENT: WaitForElementExecutor,
  DELIVER_VIA_WEBHOOK: DeliverViaWebhookExecutor,
  EXTRACT_DATA_WITH_AI: ExtractDataWithAIExecutor,
  READ_PROPERTY_FROM_JSON: ReadPropertyFromJsonExecutor,
  ADD_PROPERTY_TO_JSON: AddPropertyToJsonExecutor,
  NAVIGATE_URL: NavigateUrlExecutor,
  SCROLL_TO_ELEMENT: ScrollToElementExecutor,
  // ── NEW ──
  INFINITE_SCROLL: InfiniteScrollExecutor,
  RANDOM_DELAY: RandomDelayExecutor,
  SESSION_COOKIES: SessionExecutor,
  EXTRACT_STRUCTURED_LIST: ExtractStructuredListExecutor,
  EXTRACT_STRUCTURED_OBJECT: ExtractStructuredObjectExecutor,
  EXTRACT_TABLE_DATA: ExtractTableDataExecutor,
  FILTER_ARRAY: FilterArrayExecutor,
  CONVERT_FIELDS_TO_NUMBER: ConvertFieldsToNumberExecutor,
  TRANSFORM_ARRAYS_TO_OBJECTS: TransformArraysToObjectsExecutor,
  LOOP_START_ARRAY: LoopStartArrayExecutor,
  LOOP_START_REPEAT: LoopStartRepeatExecutor,
  LOOP_START_UNTIL_CONDITION: LoopStartUntilConditionExecutor,
  LOOP_END: LoopEndExecutor,
  FLOW_CONTROL_ACTION: FlowControlActionExecutor,
  IF_CONDITION: IfConditionExecutor,
  STOP_WORKFLOW: StopWorkflowExecutor,
  BATCH_LOOP_OVER: BatchLoopOverExecutor,
  SENTIMENT_ANALYZER: SentimentAnalyzerExecutor,
  AI_SUMMARIZER: AISummarizerExecutor,
  VISUALIZER: VisualizerExecutor,
  GENERATE_ANALYTICAL_REPORT: GenerateAnalyticalReportExecutor,
  EXPORT_CSV: ExportCSVExecutor,
};
