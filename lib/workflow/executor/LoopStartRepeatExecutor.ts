import { LoopStartRepeat } from "@/lib/workflow/task/LoopStartRepeat";
import { ExecutionEnvironment } from "@/types/executor";

export const LoopStartRepeatExecutor = async (
  environment: ExecutionEnvironment<typeof LoopStartRepeat>,
) => {
  try {
    const repeatCountStr = environment.getInput("Repeat Count");

    if (!repeatCountStr) {
      environment.log.error("Repeat Count is required");
      return false;
    }

    const repeatCount = parseInt(repeatCountStr, 10);

    if (isNaN(repeatCount) || repeatCount <= 0) {
      environment.log.error("Repeat Count must be a positive integer");
      return false;
    }

    if (repeatCount > 10000) {
      environment.log.error("Repeat Count cannot exceed 10,000");
      return false;
    }

    // Generate internal array [0, 1, 2, ..., N-1]
    const sourceArray = Array.from({ length: repeatCount }, (_, i) => i);
    const sourceArrayJson = JSON.stringify(sourceArray);

    // Store loop metadata for the execution engine
    environment.setOutput("__LOOP_TYPE__" as any, "REPEAT");
    environment.setOutput("__LOOP_SOURCE_ARRAY__" as any, sourceArrayJson);
    environment.setOutput("__LOOP_ARRAY_LENGTH__" as any, String(repeatCount));

    // Output first iteration data
    environment.setOutput("Data", "0");
    environment.setOutput("Current Index", "0");

    environment.log.success(
      `Repeat loop initialized for ${repeatCount} iterations`,
    );

    return true;
  } catch (error) {
    environment.log.error(
      `Loop Start (Repeat) error: ${(error as Error).message}`,
    );
    return false;
  }
};
