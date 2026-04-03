import { LoopStartArray } from "@/lib/workflow/task/LoopStartArray";
import { ExecutionEnvironment } from "@/types/executor";

export const LoopStartArrayExecutor = async (
  environment: ExecutionEnvironment<typeof LoopStartArray>,
) => {
  try {
    const sourceArrayJson = environment.getInput("Source Array");

    if (!sourceArrayJson) {
      environment.log.error("Source Array is required");
      return false;
    }

    let sourceArray: unknown[];
    try {
      sourceArray = JSON.parse(sourceArrayJson);
    } catch {
      environment.log.error("Source Array must be valid JSON");
      return false;
    }

    if (!Array.isArray(sourceArray)) {
      environment.log.error("Source Array must be a JSON array");
      return false;
    }

    if (sourceArray.length === 0) {
      environment.log.error("Source Array is empty - nothing to loop over");
      return false;
    }

    // Store loop metadata for the execution engine
    environment.setOutput("__LOOP_TYPE__" as any, "ARRAY");
    environment.setOutput("__LOOP_SOURCE_ARRAY__" as any, sourceArrayJson);
    environment.setOutput(
      "__LOOP_ARRAY_LENGTH__" as any,
      String(sourceArray.length),
    );

    // Output first item for initial iteration
    const firstItem =
      typeof sourceArray[0] === "object"
        ? JSON.stringify(sourceArray[0])
        : String(sourceArray[0]);

    environment.setOutput("Data", firstItem);
    environment.setOutput("Current Index", "0");

    environment.log.success(
      `Loop initialized with ${sourceArray.length} items`,
    );

    return true;
  } catch (error) {
    environment.log.error(
      `Loop Start (Array) error: ${(error as Error).message}`,
    );
    return false;
  }
};
