import { AISummarizer } from "@/lib/workflow/task/AISummarizer";
import { ExecutionEnvironment } from "@/types/executor";
import {
  summarizeWithAI,
  getSummaryLengthInstruction,
  AIError,
} from "@/lib/ai";

function prepareText(data: string, fieldsRaw?: string): string {
  const fields = fieldsRaw
    ? fieldsRaw
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return data;
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((item, idx) => {
        if (typeof item === "object" && item !== null) {
          return extractFromObject(item, fields, idx);
        }
        return `[${idx}] ${String(item)}`;
      })
      .join("\n");
  }

  if (typeof parsed === "object" && parsed !== null) {
    return extractFromObject(parsed as Record<string, unknown>, fields);
  }

  return String(parsed);
}

function extractFromObject(
  obj: Record<string, unknown>,
  fields: string[],
  index?: number,
): string {
  const prefix = index !== undefined ? `[${index}] ` : "";

  if (fields.length > 0) {
    const values = fields
      .map((f) => (f in obj ? `${f}: ${String(obj[f])}` : null))
      .filter(Boolean);
    return prefix + values.join(", ");
  }

  return prefix + JSON.stringify(obj);
}

export const AISummarizerExecutor = async (
  environment: ExecutionEnvironment<typeof AISummarizer>,
) => {
  try {
    const data = environment.getInput("Data");
    if (!data) {
      environment.log.error("Data input is required");
      return false;
    }

    const credentialId = environment.getInput("Credentials");
    if (!credentialId) {
      environment.log.error("Credentials input is missing");
      return false;
    }

    const fieldsRaw = environment.getInput("Fields");
    const summaryLength =
      (environment.getInput("Summary Length") as string) || "medium";

    // Parse data to determine structure
    let parsed: unknown;
    let isJson = false;
    try {
      parsed = JSON.parse(data);
      isJson = true;
    } catch {
      parsed = data; // Plain text
    }

    const textToSummarize = prepareText(data, fieldsRaw);
    const lengthInstruction = getSummaryLengthInstruction(summaryLength);

    const result = await summarizeWithAI(
      credentialId,
      textToSummarize,
      lengthInstruction,
    );

    const { summary } = result.data;

    if (!summary) {
      environment.log.error("AI returned no summary value");
      return false;
    }

    let enrichedData: string;

    if (
      isJson &&
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      // Single object (likely from loop iteration)
      const enrichedObj = {
        ...parsed,
        summary: summary,
      };
      enrichedData = JSON.stringify(enrichedObj, null, 2);
    } else {
      // Array or plain text (outside loop)
      if (Array.isArray(parsed)) {
        // Append overall summary to array
        enrichedData = JSON.stringify(
          {
            data: parsed,
            overall_summary: summary,
          },
          null,
          2,
        );
      } else {
        // Plain text - wrap with summary
        enrichedData = JSON.stringify(
          {
            text: data,
            summary: summary,
          },
          null,
          2,
        );
      }
    }

    environment.log.success(`Summary generated (${summaryLength})`);

    // Output enriched data with summary appended
    environment.setOutput("Data", enrichedData);

    return true;
  } catch (error) {
    if (error instanceof AIError) {
      environment.log.error(`AI error (${error.provider}): ${error.message}`);
    } else {
      environment.log.error(`AI Summarizer error: ${(error as Error).message}`);
    }
    return false;
  }
};
