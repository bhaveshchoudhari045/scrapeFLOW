import { ExecutionEnvironment } from "@/types/executor";
import { ExtractTableData } from "@/lib/workflow/task/ExtractTableData";
import * as cheerio from "cheerio";

type CellInfo = {
  value: string;
  rowspan: number;
  colspan: number;
};

export const ExtractTableDataExecutor = async (
  environment: ExecutionEnvironment<typeof ExtractTableData>,
) => {
  try {
    const html = environment.getInput("HTML");
    const tableSelector = environment.getInput("Table Selector");
    const columnsToKeepInput = environment.getInput("Columns to Keep");

    if (!html || !tableSelector) {
      environment.log.error("HTML and Table Selector are required");
      return false;
    }

    const $ = cheerio.load(html);
    const table = $(tableSelector).first();

    if (table.length === 0) {
      environment.log.error(`No table found: ${tableSelector}`);
      return false;
    }

    // Prepare keep list
    let keepList: string[] = [];
    if (columnsToKeepInput) {
      keepList = columnsToKeepInput
        .split(",")
        .map((s) => s.trim().toLowerCase());
    }

    // Auto-detect table type
    const detectedType = detectTableType($, table);
    environment.log.info(`Detected table type: ${detectedType}`);

    let result: any;

    if (detectedType === "Key-Value") {
      result = extractKeyValueTable($, table, keepList);
    } else {
      result = extractStandardTable($, table, keepList);
    }

    environment.setOutput("Extracted Data", JSON.stringify(result, null, 2));
    environment.log.success(
      `Extracted ${Array.isArray(result) ? result.length + " rows" : "key-value data"}`,
    );

    return true;
  } catch (error) {
    environment.log.error(`Error: ${(error as Error).message}`);
    return false;
  }
};

// Detect if table is key-value or standard
function detectTableType(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<any>,
): string {
  const firstRow = table.find("tr").first();
  const thCount = firstRow.find("th").length;
  const tdCount = firstRow.find("td").length;

  // If each row has 1 th and 1 td, it's likely key-value
  let keyValueScore = 0;
  table.find("tr").each((_, row) => {
    const rowTh = $(row).find("th").length;
    const rowTd = $(row).find("td").length;
    if (rowTh === 1 && rowTd === 1) {
      keyValueScore++;
    }
  });

  const totalRows = table.find("tr").length;
  if (keyValueScore / totalRows > 0.7) {
    return "Key-Value";
  }

  return "Standard";
}

// Extract key-value tables (Amazon style: th → td pairs)
function extractKeyValueTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<any>,
  keepList: string[],
): Record<string, string> {
  const result: Record<string, string> = {};

  table.find("tr").each((_, row) => {
    const th = $(row).find("th").first();
    const td = $(row).find("td").first();

    if (th.length && td.length) {
      const key = th.text().trim();
      const value = td.text().trim();
      const lowerKey = key.toLowerCase();

      // Filter if needed
      if (keepList.length > 0 && !keepList.includes(lowerKey)) {
        return;
      }

      if (key && value) {
        result[key] = value;
      }
    }
  });

  return result;
}

function extractStandardTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<any>,
  keepList: string[],
): any[] {
  const rows: any[] = [];
  const grid: (CellInfo | null)[][] = [];

  table.find("tr").each((rowIndex, tr) => {
    if (!grid[rowIndex]) {
      grid[rowIndex] = [];
    }

    let colIndex = 0;
    $(tr)
      .find("th, td")
      .each((_, cell) => {
        // Find next empty cell
        while (grid[rowIndex][colIndex] !== undefined) {
          colIndex++;
        }

        const text = $(cell).text().trim();
        const rowspan = parseInt($(cell).attr("rowspan") || "1", 10);
        const colspan = parseInt($(cell).attr("colspan") || "1", 10);

        const cellInfo: CellInfo = { value: text, rowspan, colspan };

        // Fill grid with this cell (accounting for rowspan/colspan)
        for (let r = 0; r < rowspan; r++) {
          if (!grid[rowIndex + r]) {
            grid[rowIndex + r] = [];
          }
          for (let c = 0; c < colspan; c++) {
            grid[rowIndex + r][colIndex + c] = cellInfo;
          }
        }

        colIndex += colspan;
      });
  });

  // Find last header row - only rows before the first row with td elements
  let lastHeaderRow = 0;
  let foundDataRow = false;

  for (let i = 0; i < grid.length; i++) {
    const row = table.find("tr").eq(i);
    const hasTd = row.find("td").length > 0;

    if (hasTd) {
      // Found first data row, stop here
      foundDataRow = true;
      lastHeaderRow = i - 1;
      break;
    }

    // If this row has th tags and we haven't found a data row yet, it's a header row
    const hasTh = row.find("th").length > 0;
    if (hasTh) {
      lastHeaderRow = i;
    }
  }

  // If no data rows found, use the last row with th tags
  if (!foundDataRow) {
    lastHeaderRow = 0;
    for (let i = 0; i < grid.length; i++) {
      const row = table.find("tr").eq(i);
      if (row.find("th").length > 0) {
        lastHeaderRow = i;
      }
    }
  }

  // Build column headers by combining all levels of headers for each column
  const numCols = Math.max(...grid.map((row) => row.length));
  const headers: string[] = [];

  for (let colIndex = 0; colIndex < numCols; colIndex++) {
    const headerParts: string[] = [];
    const seenValues = new Set<string>();

    // Traverse from top to bottom, collecting unique header values for this column
    for (let rowIndex = 0; rowIndex <= lastHeaderRow; rowIndex++) {
      const cell = grid[rowIndex]?.[colIndex];
      if (cell?.value && cell.value !== "" && !seenValues.has(cell.value)) {
        headerParts.push(cell.value);
        seenValues.add(cell.value);
      }
    }

    // Combine multi-level headers with space (e.g., "Q1 Product A")
    headers[colIndex] =
      headerParts.length > 0 ? headerParts.join(" ") : `Column${colIndex + 1}`;
  }

  if (headers.length === 0) {
    throw new Error("No headers found");
  }

  if (headers.length === 0) {
    throw new Error("No headers found");
  }

  // Extract data rows (start after last header row)
  for (let rowIndex = lastHeaderRow + 1; rowIndex < grid.length; rowIndex++) {
    const rowData: any = {};
    let hasData = false;
    const processedCols = new Set<number>();

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      if (processedCols.has(colIndex)) continue;

      const cell = grid[rowIndex]?.[colIndex];
      if (!cell) continue;

      const headerName = headers[colIndex];
      const lowerHeaderName = headerName.toLowerCase();

      // Filter if needed
      if (keepList.length > 0 && !keepList.includes(lowerHeaderName)) {
        continue;
      }

      const value = cell.value;
      rowData[headerName] = value;

      if (value) hasData = true;
      processedCols.add(colIndex);
    }

    if (hasData && Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  }

  return rows;
}
