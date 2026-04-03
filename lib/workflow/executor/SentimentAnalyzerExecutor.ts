import { SentimentAnalyzer } from "@/lib/workflow/task/SentimentAnalyzer";
import { ExecutionEnvironment } from "@/types/executor";
import Sentiment from "sentiment";

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
    // Not valid JSON — treat as plain text
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

export const SentimentAnalyzerExecutor = async (
  environment: ExecutionEnvironment<typeof SentimentAnalyzer>,
) => {
  try {
    const data = environment.getInput("Data");
    if (!data) {
      environment.log.error("Data input is required");
      return false;
    }

    const fieldsRaw = environment.getInput("Fields");

    // Parse data to determine structure
    let parsed: unknown;
    let isJson = false;
    try {
      parsed = JSON.parse(data);
      isJson = true;
    } catch {
      parsed = data; // Plain text
    }

    // Use sentiment library for fast local analysis
    const sentimentAnalyzer = new Sentiment();

    let enrichedData: string;

    if (
      isJson &&
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      // Single object (likely from loop iteration)
      const textToAnalyze = prepareText(data, fieldsRaw);

      const result = sentimentAnalyzer.analyze(textToAnalyze);
      const sentimentLabel =
        result.score > 0
          ? "positive"
          : result.score < 0
            ? "negative"
            : "neutral";
      const confidence = Math.min(Math.abs(result.comparative) * 2, 1);

      // Append sentiment to the object
      const enrichedObj = {
        ...parsed,
        sentiment: sentimentLabel,
        sentiment_confidence: confidence.toFixed(3),
        sentiment_score: result.score,
      };
      enrichedData = JSON.stringify(enrichedObj, null, 2);
    } else {
      // Array or plain text (outside loop)
      const textToAnalyze = prepareText(data, fieldsRaw);

      const result = sentimentAnalyzer.analyze(textToAnalyze);
      const sentimentLabel =
        result.score > 0
          ? "positive"
          : result.score < 0
            ? "negative"
            : "neutral";
      const confidence = Math.min(Math.abs(result.comparative) * 2, 1);

      if (Array.isArray(parsed)) {
        // Append overall sentiment to array
        enrichedData = JSON.stringify(
          {
            data: parsed,
            overall_sentiment: sentimentLabel,
            overall_sentiment_confidence: confidence.toFixed(3),
            overall_sentiment_score: result.score,
          },
          null,
          2,
        );
      } else {
        // Plain text - wrap with sentiment
        enrichedData = JSON.stringify(
          {
            text: data,
            sentiment: sentimentLabel,
            sentiment_confidence: confidence.toFixed(3),
            sentiment_score: result.score,
          },
          null,
          2,
        );
      }

      environment.log.success(
        `Sentiment: ${sentimentLabel} (score: ${result.score})`,
      );
    }

    // Output enriched data with sentiment appended
    environment.setOutput("Data", enrichedData);
    return true;
  } catch (error) {
    environment.log.error(
      `Sentiment Analyzer error: ${(error as Error).message}`,
    );
    return false;
  }
};
