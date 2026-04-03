import { LoopEnd } from "@/lib/workflow/task/LoopEnd";
import { ExecutionEnvironment } from "@/types/executor";

export const LoopEndExecutor = async (
  environment: ExecutionEnvironment<typeof LoopEnd>,
) => {
  try {
    const itemResult = environment.getInput("Item Result");

    // Check if CONTINUE signal was set — skip accumulation
    const continueSignal = environment.getInput("__FLOW_CONTINUE__" as any);
    if (continueSignal === "true") {
      environment.log.success(
        "CONTINUE signal received — skipping accumulation",
      );
      // Pass through accumulated state unchanged
      const accumulatedJson =
        environment.getInput("__LOOP_ACCUMULATED__" as any) || "[]";
      const successCount =
        environment.getInput("__LOOP_SUCCESS_COUNT__" as any) || "0";
      environment.setOutput("__LOOP_ACCUMULATED__" as any, accumulatedJson);
      environment.setOutput("__LOOP_SUCCESS_COUNT__" as any, successCount);
      environment.setOutput("Data", accumulatedJson);
      return true;
    }

    // Get accumulated results from previous iterations (set by execution engine)
    const accumulatedJson =
      environment.getInput("__LOOP_ACCUMULATED__" as any) || "[]";
    const successCount = parseInt(
      environment.getInput("__LOOP_SUCCESS_COUNT__" as any) || "0",
    );

    let accumulated: unknown[];
    try {
      accumulated = JSON.parse(accumulatedJson);
    } catch {
      accumulated = [];
    }

    // Add current result to accumulated array
    if (itemResult) {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(itemResult);
        accumulated.push(parsed);
      } catch {
        // If not valid JSON, add as string
        accumulated.push(itemResult);
      }
    }

    // Store updated accumulated results for next iteration or final output
    const newAccumulatedJson = JSON.stringify(accumulated, null, 2);
    environment.setOutput("__LOOP_ACCUMULATED__" as any, newAccumulatedJson);
    environment.setOutput(
      "__LOOP_SUCCESS_COUNT__" as any,
      String(successCount + 1),
    );

    // Set visible output
    environment.setOutput("Data", newAccumulatedJson);
    environment.log.success(`Collected result (${accumulated.length} total)`);

    return true;
  } catch (error) {
    environment.log.error(`Loop End error: ${(error as Error).message}`);
    return false;
  }
};
