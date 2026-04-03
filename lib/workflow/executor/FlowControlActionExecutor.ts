import { FlowControlAction } from "@/lib/workflow/task/FlowControlAction";
import { ExecutionEnvironment } from "@/types/executor";

const VALID_ACTIONS = ["CONTINUE", "BREAK", "STOP"] as const;
type FlowAction = (typeof VALID_ACTIONS)[number];

const SIGNAL_MAP: Record<FlowAction, string> = {
  CONTINUE: "__FLOW_CONTINUE__",
  BREAK: "__FLOW_BREAK__",
  STOP: "__FLOW_STOP__",
};

export const FlowControlActionExecutor = async (
  environment: ExecutionEnvironment<typeof FlowControlAction>,
) => {
  try {
    const action = environment.getInput("Action") as string;

    if (!action) {
      environment.log.error("Action is required");
      return false;
    }

    if (!VALID_ACTIONS.includes(action as FlowAction)) {
      environment.log.error(
        `Invalid action: "${action}". Must be one of: ${VALID_ACTIONS.join(", ")}`,
      );
      return false;
    }

    const signal = SIGNAL_MAP[action as FlowAction];

    // Set the flow control signal as output — the execution engine reads this
    // These are internal signal keys, not declared task outputs, so we cast
    (environment.setOutput as (key: string, value: string) => void)(
      signal,
      "true",
    );

    // Pass through Data input unchanged
    const data = environment.getInput("Data");
    if (data) {
      environment.setOutput("Data", data);
    }

    return true;
  } catch (error) {
    environment.log.error(
      `Flow Control Action error: ${(error as Error).message}`,
    );
    return false;
  }
};
