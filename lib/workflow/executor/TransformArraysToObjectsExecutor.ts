import { ExecutionEnvironment } from "@/types/executor";
import { TransformArraysToObjects } from "@/lib/workflow/task/TransformArraysToObjects";

export const TransformArraysToObjectsExecutor = async (
  environment: ExecutionEnvironment<typeof TransformArraysToObjects>,
) => {
  try {
    const jsonString = environment.getInput("JSON");
    if (!jsonString) {
      environment.log.error("JSON input is missing");
      return false;
    }

    const inputJson = JSON.parse(jsonString);

    if (
      typeof inputJson !== "object" ||
      inputJson === null ||
      Array.isArray(inputJson)
    ) {
      environment.log.error("JSON input must be an object of arrays");
      return false;
    }

    const keys = Object.keys(inputJson);

    if (keys.length === 0) {
      environment.log.error("JSON object has no fields");
      return false;
    }

    // Validate all values are arrays
    for (const key of keys) {
      if (!Array.isArray(inputJson[key])) {
        environment.log.error(`Field '${key}' must be an array`);
        return false;
      }
    }

    // Determine max length
    const maxLength = Math.max(...keys.map((key) => inputJson[key].length));

    const transformed = Array.from({ length: maxLength }, (_, index) => {
      const obj: Record<string, any> = {};

      for (const key of keys) {
        obj[key] =
          inputJson[key][index] !== undefined
            ? inputJson[key][index]
            : "Unknown";
      }

      return obj;
    });

    const result = JSON.stringify(transformed, null, 2);

    environment.setOutput("Transformed JSON", result);
    environment.log.success(`Transformed into ${transformed.length} objects`);

    return true;
  } catch (error) {
    environment.log.error(
      `Error transforming arrays: ${(error as Error).message}`,
    );
    return false;
  }
};
