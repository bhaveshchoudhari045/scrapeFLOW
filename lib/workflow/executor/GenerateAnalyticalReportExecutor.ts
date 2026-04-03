import { GenerateAnalyticalReport } from "@/lib/workflow/task/GenerateAnalyticalReport";
import { ExecutionEnvironment } from "@/types/executor";
import { callAI, AIError, getAnalyticalReportPrompt } from "@/lib/ai";
import {} from "@/lib/ai";

// Constants for large dataset handling
const MAX_SAMPLE_RECORDS = 60;
const MAX_PROMPT_CHARS = 15000;

interface ComputedStatistics {
  recordCount: number;
  fieldsDetected: string[];
  numericFields: string[];
  statistics: Record<string, { min: number; max: number; mean: number }>;
  frequencyCounts: Record<string, Record<string, number>>;
  missingValueCounts: Record<string, number>;
  dataType: "array" | "object" | "text";
}

interface Visualization {
  type: "bar" | "line" | "pie" | "column";
  title: string;
  xField: string;
  yField: string | null;
  description: string;
}

interface ReportOutput {
  reportMarkdown: string;
  visualizations: Visualization[];
  sampleData: unknown; // Include sample data for chart rendering
  metadata: {
    recordCount: number;
    fieldsDetected: string[];
    truncated: boolean;
  };
}

/**
 * Calculate descriptive statistics for an array of numeric values
 */
function calculateStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
} {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;

  return { min, max, mean };
}

/**
 * Check if a value is numeric
 */
function isNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  return !isNaN(Number(value));
}

/**
 * Compute comprehensive statistics for array data
 */
function computeArrayStatistics(data: unknown[]): ComputedStatistics {
  const fieldsSet = new Set<string>();
  const numericFieldsSet = new Set<string>();
  const fieldValues: Record<string, number[]> = {};
  const categoricalValues: Record<string, string[]> = {};
  const missingCounts: Record<string, number> = {};

  // Collect all fields and values
  data.forEach((item) => {
    if (typeof item === "object" && item !== null) {
      Object.keys(item).forEach((key) => {
        fieldsSet.add(key);
        const value = (item as Record<string, unknown>)[key];

        if (value === null || value === undefined || value === "") {
          missingCounts[key] = (missingCounts[key] || 0) + 1;
        } else if (isNumeric(value)) {
          numericFieldsSet.add(key);
          if (!fieldValues[key]) fieldValues[key] = [];
          fieldValues[key].push(Number(value));
        } else {
          if (!categoricalValues[key]) categoricalValues[key] = [];
          categoricalValues[key].push(String(value));
        }
      });
    }
  });

  const fieldsDetected = Array.from(fieldsSet);
  const numericFields = Array.from(numericFieldsSet);

  // Calculate statistics for numeric fields
  const statistics: Record<string, { min: number; max: number; mean: number }> =
    {};
  numericFields.forEach((field) => {
    if (fieldValues[field] && fieldValues[field].length > 0) {
      statistics[field] = calculateStats(fieldValues[field]);
    }
  });

  // Calculate frequency counts for categorical fields (top 10)
  const frequencyCounts: Record<string, Record<string, number>> = {};
  Object.keys(categoricalValues).forEach((field) => {
    const counts: Record<string, number> = {};
    categoricalValues[field].forEach((value) => {
      counts[value] = (counts[value] || 0) + 1;
    });

    // Get top 10 most frequent values
    const topValues = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce(
        (acc, [key, val]) => {
          acc[key] = val;
          return acc;
        },
        {} as Record<string, number>,
      );

    frequencyCounts[field] = topValues;
  });

  return {
    recordCount: data.length,
    fieldsDetected,
    numericFields,
    statistics,
    frequencyCounts,
    missingValueCounts: missingCounts,
    dataType: "array",
  };
}

/**
 * Compute statistics for object data
 */
function computeObjectStatistics(
  data: Record<string, unknown>,
): ComputedStatistics {
  const keys = Object.keys(data);
  const numericFields: string[] = [];
  const statistics: Record<string, { min: number; max: number; mean: number }> =
    {};

  keys.forEach((key) => {
    const value = data[key];
    if (isNumeric(value)) {
      numericFields.push(key);
      const numValue = Number(value);
      statistics[key] = {
        min: numValue,
        max: numValue,
        mean: numValue,
      };
    }
  });

  return {
    recordCount: 1,
    fieldsDetected: keys,
    numericFields,
    statistics,
    frequencyCounts: {},
    missingValueCounts: {},
    dataType: "object",
  };
}

/**
 * Compute statistics for text data
 */
function computeTextStatistics(text: string): ComputedStatistics {
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  const sentenceCount = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0).length;
  const characterCount = text.length;

  return {
    recordCount: 1,
    fieldsDetected: ["text"],
    numericFields: [],
    statistics: {
      wordCount: { min: wordCount, max: wordCount, mean: wordCount },
      sentenceCount: {
        min: sentenceCount,
        max: sentenceCount,
        mean: sentenceCount,
      },
      characterCount: {
        min: characterCount,
        max: characterCount,
        mean: characterCount,
      },
    },
    frequencyCounts: {},
    missingValueCounts: {},
    dataType: "text",
  };
}

/**
 * Sample large datasets intelligently
 */
function sampleDataset(
  data: unknown[],
  maxRecords: number,
): { sampled: unknown[]; truncated: boolean } {
  if (data.length <= maxRecords) {
    return { sampled: data, truncated: false };
  }

  const sampleSize = Math.floor(maxRecords / 3);
  const first = data.slice(0, sampleSize);
  const last = data.slice(-sampleSize);

  // Random sample from middle
  const middle = data.slice(sampleSize, -sampleSize);
  const randomSample: unknown[] = [];
  for (let i = 0; i < sampleSize && i < middle.length; i++) {
    const randomIndex = Math.floor(Math.random() * middle.length);
    randomSample.push(middle[randomIndex]);
  }

  return {
    sampled: [...first, ...randomSample, ...last],
    truncated: true,
  };
}

/**
 * Truncate prompt if it exceeds max characters
 */
function truncatePrompt(prompt: string, maxChars: number): string {
  if (prompt.length <= maxChars) {
    return prompt;
  }

  return (
    prompt.substring(0, maxChars) +
    "\n\n[... content truncated due to length ...]"
  );
}

/**
 * Extract markdown and JSON from LLM response
 */
function parseLLMResponse(content: string): {
  markdown: string;
  visualizations: Visualization[];
} {
  // Try to find JSON block at the end
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  let visualizations: Visualization[] = [];

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      visualizations = parsed.visualizations || [];
      // Remove JSON block from markdown
      content = content.replace(/```json\s*[\s\S]*?\s*```/, "").trim();
    } catch (error) {
      // If JSON parsing fails, continue with empty visualizations
      console.error("Failed to parse visualizations JSON:", error);
    }
  } else {
    // Try to find raw JSON block without code fences
    const rawJsonMatch = content.match(/\{[\s\S]*?"visualizations"[\s\S]*?\}/);
    if (rawJsonMatch) {
      try {
        const parsed = JSON.parse(rawJsonMatch[0]);
        visualizations = parsed.visualizations || [];
        content = content.replace(rawJsonMatch[0], "").trim();
      } catch (error) {
        console.error("Failed to parse raw JSON:", error);
      }
    }
  }

  return {
    markdown: content.trim(),
    visualizations,
  };
}

export const GenerateAnalyticalReportExecutor = async (
  environment: ExecutionEnvironment<typeof GenerateAnalyticalReport>,
) => {
  try {
    // STEP 1: Get and parse input data
    const rawData = environment.getInput("Data");
    const credentialId = environment.getInput("Credentials");

    if (!rawData) {
      environment.log.error("Data input is required");
      return false;
    }

    if (!credentialId) {
      environment.log.error("Credentials input is required");
      return false;
    }

    let parsedData: unknown;
    let isJson = false;

    try {
      parsedData = JSON.parse(rawData);
      isJson = true;
    } catch {
      parsedData = rawData; // Treat as plain text
    }

    // STEP 2: Compute deterministic statistics
    let computedStats: ComputedStatistics;
    let sampleData: unknown;
    let truncated = false;

    if (Array.isArray(parsedData)) {
      // Handle array data
      computedStats = computeArrayStatistics(parsedData);

      // Sample if needed
      if (parsedData.length > 100) {
        const result = sampleDataset(parsedData, MAX_SAMPLE_RECORDS);
        sampleData = result.sampled;
        truncated = result.truncated;
        environment.log.info(
          `Large dataset detected (${parsedData.length} records). Using sample of ${MAX_SAMPLE_RECORDS} for analysis.`,
        );
      } else {
        sampleData = parsedData;
      }
    } else if (
      isJson &&
      typeof parsedData === "object" &&
      parsedData !== null
    ) {
      // Handle object data
      computedStats = computeObjectStatistics(
        parsedData as Record<string, unknown>,
      );
      sampleData = parsedData;
    } else {
      // Handle text data
      computedStats = computeTextStatistics(String(parsedData));
      sampleData = String(parsedData).substring(0, 2000); // Truncate long text
    }

    // STEP 3: Use centralized system prompt
    const systemPrompt = await getAnalyticalReportPrompt(
      sampleData,
      "comprehensive",
      "data-analysis",
    ); // You can customize reportType and focusArea as needed

    // STEP 4: Construct user prompt
    let userPrompt = `Generate a professional analytical report for the following data.

COMPUTED STATISTICS:
${JSON.stringify(computedStats, null, 2)}

SAMPLE DATA:
${JSON.stringify(sampleData, null, 2)}

${truncated ? "\n⚠️ NOTE: This is a sampled dataset. The full dataset contains " + computedStats.recordCount + " records.\n" : ""}

Generate the report now.`;

    // Check and truncate if needed
    if (userPrompt.length > MAX_PROMPT_CHARS) {
      environment.log.info(
        `Prompt exceeds ${MAX_PROMPT_CHARS} chars. Truncating safely.`,
      );
      userPrompt = truncatePrompt(userPrompt, MAX_PROMPT_CHARS);
    }

    // STEP 5: Make single LLM call
    const response = await callAI(
      credentialId,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.7,
        maxTokens: 3000,
      },
    );

    // STEP 6: Parse LLM output
    const { markdown, visualizations } = parseLLMResponse(response.content);

    if (!markdown) {
      environment.log.error("LLM returned empty report");
      return false;
    }

    // STEP 7: Construct final output
    const reportOutput: ReportOutput = {
      reportMarkdown: markdown,
      visualizations: visualizations,
      sampleData: sampleData, // Include for chart rendering
      metadata: {
        recordCount: computedStats.recordCount,
        fieldsDetected: computedStats.fieldsDetected,
        truncated,
      },
    };

    environment.setOutput("Report", JSON.stringify(reportOutput));
    environment.log.success(
      `Report generated: ${visualizations.length} visualizations, ${computedStats.recordCount} records analyzed`,
    );

    return true;
  } catch (error) {
    if (error instanceof AIError) {
      environment.log.error(`AI error (${error.provider}): ${error.message}`);
    } else {
      environment.log.error(
        `Report generation error: ${(error as Error).message}`,
      );
    }
    return false;
  }
};
