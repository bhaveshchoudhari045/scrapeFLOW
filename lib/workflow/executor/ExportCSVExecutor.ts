import { ExecutionEnvironment } from "@/types/executor";
import { ExportCSV } from "../task/ExportCSV";

export const ExportCSVExecutor = async (
  environment: ExecutionEnvironment<typeof ExportCSV>,
) => {
  try {
    const rawInput = environment.getInput("Data");

    if (!rawInput) {
      environment.log.error("Data input is required");
      return false;
    }

    let data: any[];
    if (typeof rawInput === "string") {
      try {
        data = JSON.parse(rawInput);
      } catch (e) {
        environment.log.error("Invalid JSON text in Data input");
        return false;
      }
    } else {
      // It is already a list/object, so we use it directly
      data = rawInput;
    }
    data = data
      .map((item) => {
        if (typeof item === "string") {
          try {
            return JSON.parse(item); // convert string → object
          } catch {
            return null;
          }
        }
        return item;
      })
      .filter((item) => item && typeof item === "object");

    // Handle wrapped data from sentiment/summarizer (e.g., { data: [...], overall_sentiment: "..." })
    if (
      !Array.isArray(data) &&
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      Array.isArray((data as Record<string, any>).data)
    ) {
      // Extract metadata fields (overall_sentiment, overall_summary, etc.)
      const dataObj = data as Record<string, any>;
      const metadata: Record<string, any> = {};
      for (const key in dataObj) {
        if (key !== "data") {
          metadata[key] = dataObj[key];
        }
      }

      // Get the actual array and add metadata to each row
      const baseArray = dataObj.data;
      data = baseArray.map((item: any) => ({
        ...item,
        ...metadata,
      }));
    }

    if (!Array.isArray(data) || data.length === 0) {
      environment.log.error("Data must be a non-empty list");
      return false;
    }

    // Get headers (titles)
    const columnSet = new Set<string>();
    data.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        Object.keys(item).forEach((key) => columnSet.add(key));
      }
    });
    const columns = Array.from(columnSet);

    // Helper to clean up text (add quotes if needed)
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return "";
      let str =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      // Fix quotes and commas inside text
      str = str.replace(/"/g, '""');
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    };

    // Build the CSV text
    const rows: string[] = [];
    // Add Header Row
    rows.push(columns.map(escapeCSV).join(","));
    // Add Data Rows
    // Add Data Rows
    for (const item of data) {
      // 🔥 ensure item is not nested
      const flatItem = item.data ? item.data : item;

      const row = columns.map((col) => {
        const value = flatItem[col];
        return escapeCSV(value ?? "");
      });

      rows.push(row.join(","));
    }

    // --- THE FIX IS HERE ---
    // We add "\uFEFF" (The BOM) to the start.
    // This forces Excel to read symbols like ₹ correctly.
    const csvContent = "\uFEFF" + rows.join("\r\n");
    // Get filename from input or use default
    const filename = environment.getInput("Filename") || "export";
    const fullFilename = filename.endsWith(".csv")
      ? filename
      : `${filename}.csv`;

    // Store CSV content with download metadata
    const csvData = {
      content: csvContent,
      filename: fullFilename,
      mimeType: "text/csv;charset=utf-8", // Explicit charset
      size: new Blob([csvContent]).size,
      autoDownload: true, // Flag to trigger download on client
    };

    environment.setOutput("CSV Content", JSON.stringify(csvData));

    environment.log.success(
      `CSV Generated: ${data.length} rows, ${columns.length} columns. Ready for download as "${fullFilename}"`,
    );

    return true;
  } catch (error) {
    environment.log.error(`Error: ${(error as Error).message}`);
    return false;
  }
};
