import { LoopEnd } from "@/lib/workflow/task/LoopEnd";
import { ExecutionEnvironment } from "@/types/executor";

export const LoopEndExecutor = async (
  environment: ExecutionEnvironment<typeof LoopEnd>,
) => {
  try {
    const itemResult = environment.getInput("Item Result");
    const existingAccumulatedRaw = environment.getInput("__LOOP_ACCUMULATED__");

    // Parse existing accumulated results (passed in by the engine)
    const existingItems: unknown[] = existingAccumulatedRaw
      ? JSON.parse(existingAccumulatedRaw)
      : [];

    // Parse and append current item
    let parsedItem: unknown;
    try {
      parsedItem = itemResult ? JSON.parse(itemResult) : null;
    } catch {
      parsedItem = itemResult ?? null;
    }

    const updatedItems =
      parsedItem !== null ? [...existingItems, parsedItem] : existingItems;

    // Write back the updated accumulated array for the engine to read
    environment.setOutput("__LOOP_ACCUMULATED__", JSON.stringify(updatedItems));
    // Also set Data so downstream nodes get the full array after loop ends
    environment.setOutput("Data", JSON.stringify(updatedItems, null, 2));

    environment.log.success(
      `Collected item ${updatedItems.length} into loop results`,
    );

    return true;
  } catch (error) {
    environment.log.error(`Loop End error: ${(error as Error).message}`);
    return false;
  }
};
