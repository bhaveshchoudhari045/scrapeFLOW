import { ExecutionEnvironment } from "@/types/executor";
import * as cheerio from "cheerio";
import { BatchLoopOverTask } from "@/lib/workflow/task/BatchLoopOver";

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

export const BatchLoopOverExecutor = async (
  environment: ExecutionEnvironment<typeof BatchLoopOverTask>,
) => {
  try {
    const sourceDataJson = environment.getInput("Source Data (JSON)");
    const urlFieldName = environment.getInput("URL Field Name");
    const fieldsInput = environment.getInput("Fields");
    const browser = environment.getBrowser();

    if (!browser) {
      environment.log.error(
        "Browser instance not found. Ensure 'Launch Browser' is executed first.",
      );
      return false;
    }

    if (!sourceDataJson || !urlFieldName || !fieldsInput) {
      environment.log.error("Missing required inputs");
      return false;
    }

    // Parse source data
    let sourceData: any[];
    try {
      sourceData = JSON.parse(sourceDataJson);
    } catch (e) {
      environment.log.error("Invalid JSON in Source Data");
      return false;
    }

    if (!Array.isArray(sourceData)) {
      environment.log.error("Source Data must be an array");
      return false;
    }

    // Parse fields config
    let config: ExtractionFieldsConfig;
    try {
      const parsed = JSON.parse(fieldsInput);
      // Handle both old format (array) and new format (object with baseUrl)
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

    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;

    // Helper to resolve URLs (for extracted href/src attributes)
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

    // Visit each URL and extract data
    for (let i = 0; i < sourceData.length; i++) {
      const item = sourceData[i];

      // Extract URL from the item
      let url: string = "";
      if (typeof item === "string") {
        url = item;
      } else if (typeof item === "object" && item !== null) {
        url = item[urlFieldName];
      }

      if (!url || !url.startsWith("http")) {
        environment.log.error(`Invalid URL at index ${i}: ${url}. Skipping.`);
        failCount++;
        continue;
      }

      try {
        const page = await browser.newPage();

        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        const html = await page.content();

        // Extract data using Cheerio
        const $ = cheerio.load(html);
        const extractedItem: any = {
          ...item,
        };

        // Extract each field
        for (const field of fields) {
          if (!field.key || !field.selector) continue;

          const $target = $(field.selector);

          if (field.type === "attribute") {
            const attr = field.attribute || "src";
            let value = $target.attr(attr) || "";

            // Resolve URLs for href and src attributes
            if (baseUrl && (attr === "href" || attr === "src")) {
              value = resolveUrl(value);
            }

            extractedItem[field.key] = value;
          } else {
            // Extract text
            extractedItem[field.key] = $target.text().trim();
          }
        }

        results.push(extractedItem);
        successCount++;

        await page.close();

        // Rate limiting: 1 second delay between requests
        if (i < sourceData.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (e) {
        environment.log.error(
          `Failed to visit ${url}: ${(e as Error).message}`,
        );
        failCount++;
      }
    }

    environment.setOutput("Extracted Data", JSON.stringify(results, null, 2));
    environment.log.success(
      `Batch visit complete: ${successCount} succeeded, ${failCount} failed out of ${sourceData.length} total`,
    );

    return true;
  } catch (error) {
    environment.log.error(`Error in batch visit: ${(error as Error).message}`);
    return false;
  }
};
