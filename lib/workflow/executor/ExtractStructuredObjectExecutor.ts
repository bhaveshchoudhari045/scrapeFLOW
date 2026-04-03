import { ExecutionEnvironment } from "@/types/executor";
import { ExtractStructuredObjectTask } from "@/lib/workflow/task/ExtractStructuredObjectTask";
import * as cheerio from "cheerio";

interface ExtractionField {
  key: string;
  selector: string;
  type: "text" | "attribute";
  attribute?: string;
}

export const ExtractStructuredObjectExecutor = async (
  environment: ExecutionEnvironment<typeof ExtractStructuredObjectTask>,
) => {
  try {
    const html = environment.getInput("Html");
    const fieldsInput = JSON.parse(environment.getInput("Fields"));

    // Handle both formats: { fields: [...] } or direct array [...]
    const fields: ExtractionField[] = Array.isArray(fieldsInput)
      ? fieldsInput
      : fieldsInput?.fields;

    if (!html || !fields || !Array.isArray(fields)) {
      environment.log.error("Missing required inputs: Html or Fields");
      return false;
    }

    const $ = cheerio.load(html);
    const item: any = {};

    for (const field of fields) {
      if (!field.key || !field.selector) continue;

      const $target = $(field.selector);

      if (field.type === "attribute") {
        const attr = field.attribute || "src";
        item[field.key] = $target.attr(attr) || "";
      } else {
        // Default to text
        item[field.key] = $target.text().trim();
      }
    }

    environment.setOutput("Extracted Data", JSON.stringify(item, null, 2));
    return true;
  } catch (error) {
    environment.log.error(
      `Error extracting structured object: ${(error as Error).message}`,
    );
    return false;
  }
};
