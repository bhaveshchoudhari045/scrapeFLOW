// ExtractStructuredListExecutor.ts
import { ExtractStructuredListTask } from "@/lib/workflow/task/ExtractStructuredListTask";
import { ExecutionEnvironment } from "@/types/executor";

import * as cheerio from "cheerio";

interface ExtractionField {
  key: string;
  selector: string;
  type: "text" | "attribute";
  attribute?: string;
}

interface ExtractionFieldsConfig {
  baseUrl?: string;
  fields: ExtractionField[];
}

export const ExtractStructuredListExecutor = async (
  environment: ExecutionEnvironment<typeof ExtractStructuredListTask>,
) => {
  try {
    const html = environment.getInput("Html");
    const containerSelector = environment.getInput("Container Selector");
    const fieldsInput = environment.getInput("Fields");

    if (!html || !containerSelector || !fieldsInput) {
      environment.log.error("Missing required inputs");
      return false;
    }

    // Parse the fields config
    let config: ExtractionFieldsConfig;
    try {
      const parsed = JSON.parse(fieldsInput);
      // Handle both old format (array) and new format (object)
      if (Array.isArray(parsed)) {
        config = { fields: parsed, baseUrl: "" };
      } else {
        config = parsed;
      }
    } catch (e) {
      environment.log.error("Invalid Fields configuration");
      return false;
    }

    const { fields, baseUrl } = config;

    // Helper to resolve URLs
    const resolveUrl = (url: string): string => {
      if (!url || !baseUrl) return url;

      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }

      const cleanBaseUrl = baseUrl.replace(/\/$/, "");

      if (url.startsWith("/")) {
        return `${cleanBaseUrl}${url}`;
      }

      return `${cleanBaseUrl}/${url}`;
    };

    const $ = cheerio.load(html);
    const results: any[] = [];

    $(containerSelector).each((_, element) => {
      const item: any = {};
      const $element = $(element);

      for (const field of fields) {
        if (!field.key || !field.selector) continue;

        const $target = $element.find(field.selector);

        if (field.type === "attribute") {
          const attr = field.attribute || "src";
          let value = $target.attr(attr) || "";

          // Resolve URLs for href and src attributes
          if (baseUrl && (attr === "href" || attr === "src")) {
            value = resolveUrl(value);
          }

          item[field.key] = value;
        } else {
          item[field.key] = $target.text().trim();
        }
      }

      results.push(item);
    });

    environment.setOutput("Extracted Data", JSON.stringify(results, null, 2));
    environment.log.success(`Successfully extracted ${results.length} items.`);
    return true;
  } catch (error) {
    environment.log.error(
      `Error extracting structured list: ${(error as Error).message}`,
    );
    return false;
  }
};
