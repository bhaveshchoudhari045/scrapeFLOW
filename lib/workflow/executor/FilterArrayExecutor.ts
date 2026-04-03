import { ExecutionEnvironment } from "@/types/executor";
import { FilterArray } from "@/lib/workflow/task/FilterArray";
import {
  FilterConditionsConfig,
  evaluateConditionsGroup,
} from "@/lib/workflow/conditionEvaluator";

export const FilterArrayExecutor = async (
  environment: ExecutionEnvironment<typeof FilterArray>,
) => {
  try {
    const arrayInput = environment.getInput("Array");
    const conditionsInput = environment.getInput("Conditions");

    if (!arrayInput || !conditionsInput) {
      environment.log.error("Missing required inputs");
      return false;
    }

    // Parse array
    let array: any[];
    try {
      array =
        typeof arrayInput === "string" ? JSON.parse(arrayInput) : arrayInput;
    } catch {
      environment.log.error("Invalid JSON array");
      return false;
    }

    // Parse conditions config
    let config: FilterConditionsConfig;
    try {
      config =
        typeof conditionsInput === "string"
          ? JSON.parse(conditionsInput)
          : conditionsInput;
    } catch {
      environment.log.error("Invalid conditions configuration");
      return false;
    }

    if (!config.conditions || config.conditions.length === 0) {
      environment.log.error("No filter conditions defined");
      return false;
    }

    // Filter using shared evaluator
    const filteredArray = array.filter((item) => {
      const { result, errors } = evaluateConditionsGroup(item, config);
      for (const err of errors) {
        environment.log.error(err);
      }
      return result;
    });

    environment.log.info(
      `Filtered: ${filteredArray.length}/${array.length} items matched`,
    );

    environment.setOutput(
      "Filtered Array",
      JSON.stringify(filteredArray, null, 2),
    );

    return true;
  } catch (error) {
    environment.log.error(`Error: ${(error as Error).message}`);
    return false;
  }
};
