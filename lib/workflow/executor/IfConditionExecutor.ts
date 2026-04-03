import { IfCondition } from "@/lib/workflow/task/IfCondition";
import { ExecutionEnvironment } from "@/types/executor";
import {
  FilterConditionsConfig,
  evaluateConditionsGroup,
} from "@/lib/workflow/conditionEvaluator";

/**
 * IF_CONDITION executor — two modes:
 *
 * MODE A (Boolean):  No Conditions input → Data is parsed as boolean.
 * MODE B (Condition): Conditions input present → evaluate Data against them.
 *
 * The winning branch receives Data as pass-through.
 * The losing branch receives __SKIPPED__ so downstream nodes are skipped.
 */
export const IfConditionExecutor = async (
  environment: ExecutionEnvironment<typeof IfCondition>,
) => {
  try {
    const data = environment.getInput("Data");
    const conditionsRaw = environment.getInput("Conditions");

    if (data === undefined || data === null) {
      environment.log.error("Data input is required");
      return false;
    }

    let conditionResult: boolean;

    // ── Determine mode ────────────────────────────────────────────
    const hasConditions = conditionsRaw && conditionsRaw.trim().length > 0;

    if (hasConditions) {
      // MODE B — Condition evaluation
      let config: FilterConditionsConfig;
      try {
        config =
          typeof conditionsRaw === "string"
            ? JSON.parse(conditionsRaw)
            : conditionsRaw;
      } catch {
        environment.log.error("Invalid conditions configuration");
        return false;
      }

      if (!config.conditions || config.conditions.length === 0) {
        environment.log.error("Conditions input has no conditions defined");
        return false;
      }

      // Parse Data as JSON object for property-based evaluation
      let dataObj: any;
      try {
        dataObj = JSON.parse(data);
      } catch {
        // If Data is not valid JSON, wrap it as { value: data }
        dataObj = { value: data };
      }

      const { result, errors } = evaluateConditionsGroup(dataObj, config);
      for (const err of errors) {
        environment.log.error(err);
      }

      conditionResult = result;
      environment.log.success(
        `Condition evaluation (${config.logicOperator}): ${conditionResult ? "TRUE" : "FALSE"}`,
      );
    } else {
      // MODE A — Boolean evaluation
      const lower = data.trim().toLowerCase();

      if (lower === "true" || lower === "1" || lower === "yes") {
        conditionResult = true;
      } else if (
        lower === "false" ||
        lower === "0" ||
        lower === "no" ||
        lower === ""
      ) {
        conditionResult = false;
      } else {
        // Non-empty truthy string
        conditionResult = true;
      }

      environment.log.success(
        `Boolean evaluation: "${data}" → ${conditionResult ? "TRUE" : "FALSE"}`,
      );
    }

    // ── Route outputs ─────────────────────────────────────────────
    const setInternalOutput = environment.setOutput as (
      key: string,
      value: string,
    ) => void;

    // Always populate BOTH outputs with the data so that pass-through
    // nodes on the inactive branch still have data to forward downstream.
    // The branch markers control which path's nodes actually execute.
    environment.setOutput("True", data);
    environment.setOutput("False", data);

    if (conditionResult) {
      setInternalOutput("__BRANCH_TRUE__", "true");
      setInternalOutput("__BRANCH_FALSE__", "skipped");
      environment.log.success("→ Taking TRUE branch");
    } else {
      setInternalOutput("__BRANCH_TRUE__", "skipped");
      setInternalOutput("__BRANCH_FALSE__", "true");
      environment.log.success("→ Taking FALSE branch");
    }

    return true;
  } catch (error) {
    environment.log.error(`IF Condition error: ${(error as Error).message}`);
    return false;
  }
};
