import { StopWorkflow } from "../task/StopWorkflow";
import { ExecutionEnvironment } from "@/types/executor";

export const StopWorkflowExecutor = async (
  environment: ExecutionEnvironment<typeof StopWorkflow>,
) => {
  try {
    const message = environment.getInput("Message");

    if (message && message.trim().length > 0) {
      environment.log.error(`Workflow stopped: ${message}`);
    } else {
      environment.log.error("Workflow stopped by Stop Workflow task");
    }

    // Emit __FLOW_STOP__ — the engine checks this after every phase
    (environment.setOutput as (key: string, value: string) => void)(
      "__FLOW_STOP__",
      "true",
    );

    return true;
  } catch (error) {
    environment.log.error(`Stop Workflow error: ${(error as Error).message}`);
    return false;
  }
};
