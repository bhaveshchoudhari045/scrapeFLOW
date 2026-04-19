import { SentimentAnalyzer } from "@/lib/workflow/task/SentimentAnalyzer";
import { ExecutionEnvironment } from "@/types/executor";
import Sentiment from "sentiment";

// FIX 1: Singleton — instantiated once at module level, not per execution
const sentimentAnalyzer = new Sentiment();

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
          return extractFromObject(
            item as Record<string, unknown>,
            fields,
            idx,
          );
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

// FIX 2: Shared helper — avoids duplicating score → label + confidence logic
function computeSentiment(text: string): {
  label: "positive" | "negative" | "neutral";
  confidence: string;
  score: number;
  comparative: number;
} {
  const result = sentimentAnalyzer.analyze(text);
  const label =
    result.score > 0 ? "positive" : result.score < 0 ? "negative" : "neutral";
  const confidence = Math.min(Math.abs(result.comparative) * 2, 1).toFixed(3);
  return {
    label,
    confidence,
    score: result.score,
    comparative: result.comparative,
  };
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

    let parsed: unknown;
    let isJson = false;
    try {
      parsed = JSON.parse(data);
      isJson = true;
    } catch {
      parsed = data;
    }

    const textToAnalyze = prepareText(data, fieldsRaw);
    const { label, confidence, score, comparative } =
      computeSentiment(textToAnalyze);

    let enrichedData: string;

    if (
      isJson &&
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      // Single object (e.g. inside a loop iteration)
      const enrichedObj = {
        ...parsed,
        sentiment: label,
        sentiment_confidence: confidence,
        sentiment_score: score,
        // FIX 4: Expose raw comparative so callers can debug short-text saturation
        sentiment_comparative: comparative,
      };
      enrichedData = JSON.stringify(enrichedObj, null, 2);

      // FIX 3: Log success for the single-object path (was missing before)
      environment.log.success(`Sentiment: ${label} (score: ${score})`);
    } else if (Array.isArray(parsed)) {
      enrichedData = JSON.stringify(
        {
          data: parsed,
          overall_sentiment: label,
          overall_sentiment_confidence: confidence,
          overall_sentiment_score: score,
          overall_sentiment_comparative: comparative,
        },
        null,
        2,
      );
      environment.log.success(`Sentiment: ${label} (score: ${score})`);
    } else {
      // Plain text
      enrichedData = JSON.stringify(
        {
          text: data,
          sentiment: label,
          sentiment_confidence: confidence,
          sentiment_score: score,
          sentiment_comparative: comparative,
        },
        null,
        2,
      );
      environment.log.success(`Sentiment: ${label} (score: ${score})`);
    }

    environment.setOutput("Data", enrichedData);
    return true;
  } catch (error) {
    environment.log.error(
      `Sentiment Analyzer error: ${(error as Error).message}`,
    );
    return false;
  }
};
