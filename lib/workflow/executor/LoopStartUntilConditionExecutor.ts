import { LoopStartUntilCondition } from "@/lib/workflow/task/LoopStartUntilCondition";
import { ExecutionEnvironment } from "@/types/executor";

export const LoopStartUntilConditionExecutor = async (
  environment: ExecutionEnvironment<typeof LoopStartUntilCondition>,
) => {
  try {
    const maxIterationsStr = environment.getInput("Max Iterations");
    const initialData = environment.getInput("Initial Data");

    if (!maxIterationsStr) {
      environment.log.error("Max Iterations is required");
      return false;
    }

    const maxIterations = parseInt(maxIterationsStr, 10);

    if (isNaN(maxIterations) || maxIterations <= 0) {
      environment.log.error("Max Iterations must be a positive integer");
      return false;
    }

    if (maxIterations > 10000) {
      environment.log.error("Max Iterations cannot exceed 10,000");
      return false;
    }

    // Generate internal array [0, 1, ..., maxIterations-1] so the engine's
    // existing array-based iteration logic works without modification
    const sourceArray = Array.from({ length: maxIterations }, (_, i) => i);
    const sourceArrayJson = JSON.stringify(sourceArray);

    // Store loop metadata for the execution engine
    environment.setOutput("__LOOP_TYPE__" as any, "UNTIL_CONDITION");
    environment.setOutput("__LOOP_SOURCE_ARRAY__" as any, sourceArrayJson);
    environment.setOutput(
      "__LOOP_ARRAY_LENGTH__" as any,
      String(maxIterations),
    );
    environment.setOutput(
      "__LOOP_MAX_ITERATIONS__" as any,
      String(maxIterations),
    );

    // Output first iteration data
    environment.setOutput("Data", initialData || "0");
    environment.setOutput("Current Index", "0");

    environment.log.success(
      `Condition loop initialized (max ${maxIterations} iterations)`,
    );

    return true;
  } catch (error) {
    environment.log.error(
      `Loop Start (Until Condition) error: ${(error as Error).message}`,
    );
    return false;
  }
};
