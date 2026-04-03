import { ExecutionEnvironment } from "@/types/executor";
import { Visualizer } from "@/lib/workflow/task/Visualizer";

// Helper to detect if a value is numeric
const isNumeric = (value: any): boolean => {
  if (value === null || value === undefined || value === "") return false;
  return !isNaN(Number(value));
};

// Helper to generate beautiful color palettes
const getColorPalette = (chartType: string, dataLength: number): string[] => {
  const palettes = {
    bar: [
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
      "#f59e0b",
      "#10b981",
      "#06b6d4",
      "#6366f1",
      "#f97316",
      "#14b8a6",
      "#a855f7",
    ],
    line: [
      "#2563eb",
      "#7c3aed",
      "#db2777",
      "#d97706",
      "#059669",
      "#0891b2",
      "#4f46e5",
      "#ea580c",
      "#0d9488",
      "#9333ea",
    ],
    pie: [
      "#60a5fa",
      "#a78bfa",
      "#f472b6",
      "#fbbf24",
      "#34d399",
      "#22d3ee",
      "#818cf8",
      "#fb923c",
      "#2dd4bf",
      "#c084fc",
    ],
    doughnut: [
      "#60a5fa",
      "#a78bfa",
      "#f472b6",
      "#fbbf24",
      "#34d399",
      "#22d3ee",
      "#818cf8",
      "#fb923c",
      "#2dd4bf",
      "#c084fc",
    ],
    scatter: ["#3b82f6"],
    area: ["rgba(59, 130, 246, 0.5)"],
    radar: [
      "rgba(59, 130, 246, 0.5)",
      "rgba(139, 92, 246, 0.5)",
      "rgba(236, 72, 153, 0.5)",
      "rgba(245, 158, 11, 0.5)",
    ],
    polarArea: [
      "rgba(59, 130, 246, 0.6)",
      "rgba(139, 92, 246, 0.6)",
      "rgba(236, 72, 153, 0.6)",
      "rgba(245, 158, 11, 0.6)",
      "rgba(16, 185, 129, 0.6)",
    ],
  };

  const palette = palettes[chartType as keyof typeof palettes] || palettes.bar;

  // Repeat colors if needed
  const colors: string[] = [];
  for (let i = 0; i < dataLength; i++) {
    colors.push(palette[i % palette.length]);
  }

  return colors;
};

export const VisualizerExecutor = async (
  environment: ExecutionEnvironment<typeof Visualizer>,
) => {
  try {
    const rawInput = environment.getInput("Data");

    if (!rawInput) {
      environment.log.error("Data input is required");
      return false;
    }

    // Parse input data
    let data: any[];
    if (typeof rawInput === "string") {
      try {
        data = JSON.parse(rawInput);
      } catch (e) {
        environment.log.error("Invalid JSON format. Expected JSON array");
        return false;
      }
    } else {
      data = rawInput;
    }

    // Handle wrapped data from sentiment/summarizer (e.g., { data: [...], overall_sentiment: "..." })
    if (
      !Array.isArray(data) &&
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      Array.isArray((data as Record<string, any>).data)
    ) {
      data = (data as Record<string, any>).data;
    }

    if (!Array.isArray(data) || data.length === 0) {
      environment.log.error("Data must be a non-empty array");
      return false;
    }

    // Get chart configuration
    const chartConfigInput = environment.getInput("Chart Configuration");
    if (!chartConfigInput) {
      environment.log.error("Chart Configuration is required");
      return false;
    }

    let inputConfig: any;
    try {
      inputConfig = JSON.parse(chartConfigInput);
    } catch (e) {
      environment.log.error("Invalid Chart Configuration format");
      return false;
    }

    const chartType = inputConfig.chartType || "bar";
    const chartName = inputConfig.chartName || "Chart";
    const xField = inputConfig.xField;
    const yField = inputConfig.yField;

    // Auto-detect fields if not specified
    let detectedXField = xField;
    let detectedYField = yField;

    if (!detectedXField || !detectedYField) {
      const firstItem = data[0];
      const fields = Object.keys(firstItem);

      // Auto-detect X field (first non-numeric field)
      if (!detectedXField) {
        detectedXField =
          fields.find((f) => !isNumeric(firstItem[f])) || fields[0];
      }

      // Auto-detect Y field (first numeric field)
      if (!detectedYField) {
        detectedYField =
          fields.find((f) => isNumeric(firstItem[f])) || fields[1] || fields[0];
      }
    }

    // Extract and aggregate data
    const dataMap = new Map<string, number>();
    let validDataPoints = 0;

    for (const item of data) {
      const xValue = String(item[detectedXField] || "");
      const yValue = item[detectedYField];

      if (!xValue) continue;

      const numericY = isNumeric(yValue) ? Number(yValue) : 1;

      if (dataMap.has(xValue)) {
        // Aggregate duplicate X values by summing Y values
        dataMap.set(xValue, dataMap.get(xValue)! + numericY);
      } else {
        dataMap.set(xValue, numericY);
      }
      validDataPoints++;
    }

    if (dataMap.size === 0) {
      environment.log.error("No valid data points found");
      return false;
    }

    // Convert to labels and values
    const labels = Array.from(dataMap.keys());
    const values = Array.from(dataMap.values());

    // Generate color palette
    const colors = getColorPalette(chartType, labels.length);

    // Build Chart.js config based on chart type
    let chartConfig: any;

    if (
      chartType === "pie" ||
      chartType === "doughnut" ||
      chartType === "polarArea"
    ) {
      // Pie-like charts
      chartConfig = {
        type: chartType,
        data: {
          labels: labels,
          datasets: [
            {
              label: detectedYField,
              data: values,
              backgroundColor: colors,
              borderColor: "#ffffff",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: chartName,
              font: { size: 18, weight: "bold" },
            },
            legend: {
              display: true,
              position: "bottom",
            },
          },
        },
      };
    } else if (chartType === "radar") {
      // Radar chart
      chartConfig = {
        type: "radar",
        data: {
          labels: labels,
          datasets: [
            {
              label: detectedYField,
              data: values,
              backgroundColor: colors[0],
              borderColor: colors[0].replace("0.5", "1"),
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: chartName,
              font: { size: 18, weight: "bold" },
            },
          },
          scales: {
            r: {
              beginAtZero: true,
            },
          },
        },
      };
    } else if (chartType === "scatter") {
      // Scatter plot
      const scatterData = labels.map((label, index) => ({
        x: index,
        y: values[index],
      }));

      chartConfig = {
        type: "scatter",
        data: {
          datasets: [
            {
              label: `${detectedXField} vs ${detectedYField}`,
              data: scatterData,
              backgroundColor: colors[0],
              borderColor: colors[0],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: chartName,
              font: { size: 18, weight: "bold" },
            },
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              title: { display: true, text: detectedXField },
            },
            y: {
              title: { display: true, text: detectedYField },
              beginAtZero: true,
            },
          },
        },
      };
    } else if (chartType === "area") {
      // Area chart (line with fill)
      chartConfig = {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: detectedYField,
              data: values,
              backgroundColor: colors[0],
              borderColor: colors[0].replace("0.5", "1"),
              borderWidth: 2,
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: chartName,
              font: { size: 18, weight: "bold" },
            },
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              title: { display: true, text: detectedXField },
            },
            y: {
              title: { display: true, text: detectedYField },
              beginAtZero: true,
            },
          },
        },
      };
    } else {
      // Bar, Line, and other cartesian charts
      chartConfig = {
        type: chartType === "line" ? "line" : "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: detectedYField,
              data: values,
              backgroundColor:
                chartType === "line" ? "rgba(59, 130, 246, 0.1)" : colors,
              borderColor: chartType === "line" ? colors[0] : colors,
              borderWidth: 2,
              tension: chartType === "line" ? 0.4 : 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: chartName,
              font: { size: 18, weight: "bold" },
            },
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              title: { display: true, text: detectedXField },
            },
            y: {
              title: { display: true, text: detectedYField },
              beginAtZero: true,
            },
          },
        },
      };
    }

    // Create output envelope (similar to CSV export)
    const sanitizedName = chartName.trim() || "chart";
    const fullFilename = sanitizedName.endsWith(".png")
      ? sanitizedName
      : `${sanitizedName}-${Date.now()}.png`;

    const chartData = {
      chartConfig: chartConfig,
      filename: fullFilename,
      chartType: chartType,
      dataPoints: validDataPoints,
      aggregatedPoints: dataMap.size,
      xField: detectedXField,
      yField: detectedYField,
      type: "chart",
    };

    environment.setOutput("Chart Data", JSON.stringify(chartData));

    environment.log.success(
      `Chart Generated: ${chartType} with ${dataMap.size} data points (aggregated from ${validDataPoints}). Ready for preview and download as "${fullFilename}"`,
    );

    return true;
  } catch (error) {
    environment.log.error(`Error: ${(error as Error).message}`);
    return false;
  }
};
