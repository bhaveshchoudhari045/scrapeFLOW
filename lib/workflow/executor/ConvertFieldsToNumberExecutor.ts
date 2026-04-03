import { ConvertFieldsToNumber } from "@/lib/workflow/task/ConvertFieldsToNumberTask";
import { ExecutionEnvironment } from "@/types/executor";

const parseToNumber = (value: any): number | null => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;

  // Extract first numeric-looking part
  const match = value.match(/[-+]?[0-9.,\s]+/);
  if (!match) return null;

  let str = match[0].trim();

  // If both comma and dot exist, decide which is decimal by last occurrence
  const lastDot = str.lastIndexOf(".");
  const lastComma = str.lastIndexOf(",");

  if (lastDot > lastComma) {
    // dot is decimal → remove commas & spaces
    str = str.replace(/,/g, "").replace(/\s/g, "");
  } else if (lastComma > lastDot) {
    // comma is decimal → remove dots & spaces, replace comma with dot
    str = str.replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
  } else {
    // only one or none → remove spaces
    str = str.replace(/\s/g, "");
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
};

export const ConvertFieldsToNumberExecutor = async (
  environment: ExecutionEnvironment<typeof ConvertFieldsToNumber>,
) => {
  try {
    const arrayInput = environment.getInput("Array");
    const fieldsInput = environment.getInput("Fields");

    if (!arrayInput) {
      environment.log.error("Array input is missing");
      return false;
    }
    if (!fieldsInput) {
      environment.log.error("Fields input is missing");
      return false;
    }

    // Parse the array
    let array: any[];
    try {
      array = JSON.parse(arrayInput);
    } catch (error) {
      environment.log.error("Invalid JSON array");
      return false;
    }

    if (!Array.isArray(array)) {
      environment.log.error("Input is not an array");
      return false;
    }

    // Parse field names (comma-separated)
    const fields = fieldsInput
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (fields.length === 0) {
      environment.log.error("No fields specified");
      return false;
    }

    // Convert specified fields to numbers
    const convertedArray = array.map((item) => {
      const newItem = { ...item };
      fields.forEach((field) => {
        if (field in newItem) {
          const converted = parseToNumber(newItem[field]);
          if (converted !== null) {
            newItem[field] = converted;
          }
          // Note: If conversion fails, original value is preserved
        }
      });
      return newItem;
    });

    environment.setOutput(
      "Converted Array",
      JSON.stringify(convertedArray, null, 2),
    );

    const convertedCount = convertedArray.reduce((count, item) => {
      let itemCount = 0;
      fields.forEach((field) => {
        if (typeof item[field] === "number") itemCount++;
      });
      return count + itemCount;
    }, 0);

    environment.log.success(
      `Converted ${convertedCount} fields to numbers across ${convertedArray.length} items`,
    );
    return true;
  } catch (error) {
    environment.log.error(
      `Error converting fields to number: ${(error as Error).message}`,
    );
    return false;
  }
};
