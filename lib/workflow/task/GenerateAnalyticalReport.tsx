import { FileTextIcon, LucideProps } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";
import { WorkflowTask } from "@/types/workflow";

export const GenerateAnalyticalReport = {
  type: TaskType.GENERATE_ANALYTICAL_REPORT satisfies TaskType,
  label: "Generate Analytical Report",
  icon: (props: LucideProps) => (
    <FileTextIcon className="stroke-teal-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "Data",
      type: TaskParamType.STRING,
      helperText: "Data to analyze (JSON array, object, or text)",
      required: true,
      variant: "textarea" as const,
    },
    {
      name: "Credentials",
      type: TaskParamType.CREDENTIAL,
      helperText: "Select AI model for report generation",
      required: true,
    },
  ] as const,
  outputs: [
    {
      name: "Report",
      type: TaskParamType.STRING,
      hideHandler: true,
    },
  ] as const,
} satisfies WorkflowTask & { type: TaskType.GENERATE_ANALYTICAL_REPORT };
