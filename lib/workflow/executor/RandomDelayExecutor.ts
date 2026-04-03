import { RandomDelay } from "@/lib/workflow/task/RandomDelay";
import { ExecutionEnvironment } from "@/types/executor";

export const RandomDelayExecutor = async (
  environment: ExecutionEnvironment<typeof RandomDelay>,
) => {
  try {
    const delayInput = environment.getInput("Delay (seconds)");

    // Parse delay - default to random 1-3 seconds
    let delayMs: number;
    if (delayInput) {
      delayMs = parseFloat(delayInput) * 1000;
    } else {
      // Random between 1-3 seconds
      delayMs = Math.floor(Math.random() * 2000) + 1000;
    }

    // Actually wait
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    return true;
  } catch (error) {
    environment.log.error(`Error: ${(error as Error).message}`);
    return false;
  }
};
