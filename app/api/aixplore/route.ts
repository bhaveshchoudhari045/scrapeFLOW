import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

// ── AI callers ────────────────────────────────────────────────────────────
async function callClaude(prompt: string, maxTokens = 4000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || `Claude ${res.status}`);
  const text = (d.content?.[0]?.text ?? "").trim();
  if (!text) throw new Error("Claude returned empty");
  return text;
}

async function callGroq(prompt: string, maxTokens = 4000): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an elite data analyst. Respond ONLY with raw valid JSON. No markdown, no backticks, no prose. Start with { and end with }.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || `Groq ${res.status}`);
  const text = (d.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("Groq returned empty");
  return text;
}

async function callAI(prompt: string, maxTokens = 4000): Promise<string> {
  try {
    return await callClaude(prompt, maxTokens);
  } catch (e) {
    console.error("Claude failed, trying Groq:", e);
  }
  return await callGroq(prompt, maxTokens);
}

// ── Robust JSON parser ────────────────────────────────────────────────────
function parseJSON(raw: string): any | null {
  if (!raw) return null;

  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  for (const candidate of [raw, stripped]) {
    try {
      const r = JSON.parse(candidate);
      if (r && typeof r === "object") return r;
    } catch {}

    try {
      const m = candidate.match(/\{[\s\S]*\}/);
      if (m) {
        const r = JSON.parse(m[0]);
        if (r && typeof r === "object") return r;
      }
    } catch {}

    try {
      const m = candidate.match(/\{[\s\S]*/);
      if (m) {
        let str = m[0];
        str = str.replace(/,?\s*"[^"]*$/, "");
        str = str.replace(/,?\s*"[^"]*":\s*"[^"]*$/, "");
        str = str.replace(/,?\s*"[^"]*":\s*\[[\s\S]*$/, "");
        const open = (str.match(/\{/g) || []).length;
        const close = (str.match(/\}/g) || []).length;
        str += "}".repeat(Math.max(0, open - close));
        const r = JSON.parse(str);
        if (r && typeof r === "object") return r;
      }
    } catch {}
  }
  return null;
}

// ── DATA-FIRST: Flatten nested record structures ───────────────────────────
/**
 * Many scrapers nest real data inside sub-keys like `data`, `attributes`,
 * or `fields`. This promotes those values to the top level so column
 * detection and charting always see the actual content.
 */
function flattenRecord(record: any): any {
  const nested = record.attributes || record.data || record.fields || null;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    // Merge nested keys without clobbering top-level metadata
    return { ...record, ...nested };
  }
  return record;
}

function flattenScrapedData(records: any[]): any[] {
  return records.map(flattenRecord);
}

// ── DATA-FIRST: Column detection (ignores metadata / noise keys) ──────────
const IGNORED_KEYS = new Set([
  "_sourceName",
  "_sourceType",
  "id",
  "ID",
  "Category", // generic catch-all tag — not analytic content
  "Status",
  "url",
  "URL",
  "link",
  "href",
  "image",
  "img",
  "thumbnail",
]);

function detectColumns(records: any[]) {
  if (!records.length)
    return {
      numericCols: [] as string[],
      textCols: [] as string[],
      dateCols: [] as string[],
      allCols: [] as string[],
    };

  const allCols = [
    ...new Set(
      records
        .flatMap((r) => Object.keys(r))
        .filter((k) => !k.startsWith("_") && !IGNORED_KEYS.has(k)),
    ),
  ];

  const numericCols: string[] = [],
    textCols: string[] = [],
    dateCols: string[] = [];

  for (const col of allCols) {
    const vals = records
      .slice(0, 30)
      .map((r) => String(r[col] ?? ""))
      .filter((v) => v && v !== "—" && v !== "N/A");
    if (!vals.length) continue;

    const dateHits = vals.filter((v) =>
      /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(v),
    ).length;
    if (dateHits >= Math.min(3, vals.length * 0.4)) {
      dateCols.push(col);
      continue;
    }

    const numHits = vals.filter((v) => {
      const c = v
        .replace(/[₹$€£,\s%+]/g, "")
        .replace(/pts$/i, "")
        .replace(/km$/i, "");
      return c !== "" && !isNaN(parseFloat(c)) && isFinite(Number(c));
    }).length;

    if (numHits >= Math.max(2, vals.length * 0.45)) numericCols.push(col);
    else textCols.push(col);
  }

  return { numericCols, textCols, dateCols, allCols };
}

function toNum(val: any): number {
  if (typeof val === "number") return val;
  const s = String(val ?? "")
    .replace(/[₹$€£,\s%+]/g, "")
    .replace(/pts$/i, "")
    .replace(/km$/i, "")
    .trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function splitByType(records: any[]) {
  return {
    finance: records.filter((r) => r._sourceType === "finance" && r.Category),
    ohlcv: records.filter((r) => r._sourceType === "finance_ohlcv"),
    news: records.filter((r) => ["news", "social"].includes(r._sourceType)),
    academic: records.filter((r) => r._sourceType === "academic"),
    products: records.filter((r) => r._sourceType === "product"),
    dataset: records.filter((r) => r._sourceType === "dataset"),
    docs: records.filter((r) => r._sourceType === "document"),
    general: records.filter(
      (r) => !r._sourceType || ["general", "science"].includes(r._sourceType),
    ),
  };
}

// ── DATA-FIRST: pickChartable prefers records that have numeric values ─────
/**
 * Instead of relying solely on `_sourceType`, we now check whether records
 * actually contain numeric data. This means any scraped dataset with
 * prices, counts, scores, etc. will be charted even if its type tag is
 * missing or generic.
 */
function pickChartable(allRaw: any[]): any[] {
  const { ohlcv, dataset, products, academic } = splitByType(allRaw);

  // Prefer typed subsets that are large enough
  if (ohlcv.length >= 5) return ohlcv;
  if (dataset.length >= 3) return dataset;
  if (products.length >= 3) return products;
  if (academic.length >= 3) return academic;

  // DATA-FIRST fallback: pick records that contain at least one non-zero numeric value
  const withNumbers = allRaw.filter((r) =>
    Object.values(r).some((v) => {
      const n = toNum(v);
      return n !== 0 && !isNaN(n);
    }),
  );

  return withNumbers.length >= 3 ? withNumbers : allRaw;
}

// ── Charts ────────────────────────────────────────────────────────────────
function buildCharts(
  allRaw: any[],
  cleanRecords: any[],
  category: string,
): any[] {
  const charts: any[] = [];
  const chartable = pickChartable(allRaw);
  const { numericCols, textCols, dateCols } = detectColumns(chartable);
  const ohlcv = allRaw.filter((r) => r._sourceType === "finance_ohlcv");

  if (ohlcv.length >= 5) {
    const sorted = [...ohlcv].sort((a, b) =>
      (a.Date ?? "").localeCompare(b.Date ?? ""),
    );
    charts.push({
      type: "line",
      title: "Price History (Close)",
      data: sorted.slice(-30).map((r) => ({ x: r.Date, y: toNum(r.Close) })),
      color: "#00f5ff",
    });
    charts.push({
      type: "bar",
      title: "Daily Trading Volume",
      data: sorted
        .slice(-20)
        .map((r) => ({ x: r.Date?.slice(5), y: toNum(r.Volume) })),
      color: "#a78bfa",
    });
    charts.push({
      type: "area",
      title: "High–Low Price Range",
      data: sorted.slice(-20).map((r) => ({
        x: r.Date?.slice(5),
        high: toNum(r.High),
        low: toNum(r.Low),
        close: toNum(r.Close),
      })),
      color: "#34d399",
    });
  }

  if (textCols.length && numericCols.length) {
    const xCol =
      textCols.find((c) =>
        /name|player|title|product|country|team|brand/i.test(c),
      ) ?? textCols[0];
    for (const yCol of numericCols.slice(0, 3)) {
      const data = chartable
        .slice(0, 20)
        .map((r) => ({
          x: String(r[xCol] ?? "").slice(0, 22),
          y: toNum(r[yCol]),
        }))
        .filter((d) => d.x && d.y !== 0);
      if (data.length >= 2) {
        charts.push({
          type: "bar",
          title: `${yCol} by ${xCol}`,
          data,
          color: "#f59e0b",
        });
        if (charts.length >= 7) break;
      }
    }
  }

  if (dateCols.length && numericCols.length) {
    const sorted2 = [...chartable].sort((a, b) =>
      String(a[dateCols[0]] ?? "").localeCompare(String(b[dateCols[0]] ?? "")),
    );
    const data = sorted2
      .slice(0, 40)
      .map((r) => ({
        x: String(r[dateCols[0]] ?? ""),
        y: toNum(r[numericCols[0]]),
      }))
      .filter((d) => d.y !== 0);
    if (data.length >= 3)
      charts.push({
        type: "line",
        title: `${numericCols[0]} over ${dateCols[0]}`,
        data,
        color: "#818cf8",
      });
  }

  if (numericCols.length >= 2) {
    const data = chartable
      .slice(0, 60)
      .map((r) => ({
        x: toNum(r[numericCols[0]]),
        y: toNum(r[numericCols[1]]),
        label: String(r[textCols[0]] ?? "").slice(0, 15),
      }))
      .filter((d) => d.x !== 0 || d.y !== 0);
    if (data.length >= 4)
      charts.push({
        type: "scatter",
        title: `${numericCols[0]} vs ${numericCols[1]}`,
        data,
        color: "#f59e0b",
      });
  }

  const catCol = textCols.find((c) => {
    const u = new Set(chartable.map((r) => r[c]).filter(Boolean));
    return u.size >= 2 && u.size <= 12;
  });
  if (catCol) {
    const counts: Record<string, number> = {};
    chartable.forEach((r) => {
      const v = String(r[catCol] ?? "Other").slice(0, 20);
      counts[v] = (counts[v] || 0) + 1;
    });
    const data = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
    if (data.length >= 2)
      charts.push({
        type: "pie",
        title: `Distribution by ${catCol}`,
        data,
        color: "#818cf8",
      });
  }

  const newsRecs = allRaw.filter((r) =>
    ["news", "social"].includes(r._sourceType ?? ""),
  );
  if (newsRecs.length >= 3) {
    let pos = 0,
      neg = 0,
      neu = 0;
    newsRecs.forEach((r) => {
      const s = String(r.Sentiment ?? r.sentiment ?? "").toLowerCase();
      if (s.includes("positive")) pos++;
      else if (s.includes("negative")) neg++;
      else neu++;
    });
    if (pos + neg + neu > 0)
      charts.push({
        type: "donut",
        title: "News Sentiment",
        data: [
          { label: "Positive", value: pos, color: "#00f5c8" },
          { label: "Negative", value: neg, color: "#ef4444" },
          { label: "Neutral", value: neu, color: "#f59e0b" },
        ],
        color: "#00f5c8",
      });
  }

  const papers = allRaw.filter(
    (r) =>
      r._sourceType === "academic" &&
      r.Title &&
      r.Citations &&
      !isNaN(parseInt(r.Citations)),
  );
  if (papers.length >= 3) {
    const data = papers
      .sort(
        (a, b) => (parseInt(b.Citations) || 0) - (parseInt(a.Citations) || 0),
      )
      .slice(0, 12)
      .map((p) => ({
        x: String(p.Title ?? "").slice(0, 28),
        y: parseInt(p.Citations) || 0,
      }));
    if (data.length >= 2)
      charts.push({
        type: "bar",
        title: "Papers by Citations",
        data,
        color: "#818cf8",
      });
  }

  const prods = allRaw.filter((r) => r._sourceType === "product" && r.Name);
  if (prods.length >= 2) {
    const data = prods
      .slice(0, 15)
      .map((p) => ({ x: String(p.Name ?? "").slice(0, 22), y: toNum(p.Price) }))
      .filter((d) => d.y > 0);
    if (data.length >= 2)
      charts.push({
        type: "bar",
        title: "Product Price Comparison",
        data,
        color: "#fb923c",
      });
  }

  return charts.filter((c) => c.data?.length >= 1).slice(0, 9);
}

// ── ML readiness ──────────────────────────────────────────────────────────
function buildML(allRaw: any[], cleanRecords: any[]) {
  const chartable = pickChartable(allRaw);
  const working = chartable.length >= 5 ? chartable : cleanRecords;
  if (!working.length) return null;
  const { numericCols, textCols, dateCols, allCols } = detectColumns(working);
  const totalRows = working.length,
    totalCols = allCols.length;

  const missingCounts: Record<string, number> = {};
  allCols.forEach((k) => {
    missingCounts[k] = working.filter(
      (r) => !r[k] || r[k] === "—" || r[k] === "N/A" || r[k] === "",
    ).length;
  });

  const cleanCols = allCols.filter((k) => missingCounts[k] === 0);
  const dirtyCols = allCols.filter((k) => missingCounts[k] > totalRows * 0.2);
  const meaningful = numericCols.filter((c) => !/source|url|id|date/i.test(c));
  const suggestedTarget =
    meaningful[meaningful.length - 1] ??
    numericCols[numericCols.length - 1] ??
    null;
  const catCols = textCols.filter((c) => {
    const u = new Set(working.map((r) => r[c]).filter(Boolean));
    return u.size >= 2 && u.size <= 20;
  });

  const tasks: string[] = [];
  if (numericCols.length >= 2)
    tasks.push("Regression — predict a numeric value");
  if (catCols.length) tasks.push("Classification — predict a category");
  if (numericCols.length >= 3) tasks.push("Clustering — find hidden groups");
  if (dateCols.length && numericCols.length)
    tasks.push("Time Series — forecast future values");
  if (totalRows >= 50 && numericCols.length >= 4)
    tasks.push("Anomaly Detection — flag outliers");

  const models: string[] = [];
  if (tasks.some((t) => t.includes("Regression")))
    models.push("XGBoost", "Random Forest", "Linear Regression");
  if (tasks.some((t) => t.includes("Classification")))
    models.push("Gradient Boosting", "SVM", "Logistic Regression");
  if (tasks.some((t) => t.includes("Clustering")))
    models.push("K-Means", "DBSCAN");
  if (tasks.some((t) => t.includes("Time Series")))
    models.push("Prophet", "LSTM", "ARIMA");

  const colStats = numericCols
    .slice(0, 6)
    .map((col) => {
      const vals = working
        .map((r) => toNum(r[col]))
        .filter((v) => v !== 0 && !isNaN(v));
      if (!vals.length) return null;
      const sum = vals.reduce((a, b) => a + b, 0);
      return {
        col,
        min: Math.min(...vals).toFixed(2),
        max: Math.max(...vals).toFixed(2),
        mean: (sum / vals.length).toFixed(2),
        count: vals.length,
      };
    })
    .filter(Boolean);

  const readinessScore = Math.min(
    99,
    Math.round(
      (cleanCols.length / Math.max(totalCols, 1)) * 35 +
        (Math.min(totalRows, 500) / 500) * 35 +
        (numericCols.length / Math.max(totalCols, 1)) * 30,
    ),
  );

  return {
    readinessScore,
    totalRows,
    totalCols,
    numericCols,
    textCols,
    dateCols,
    cleanCols,
    dirtyCols,
    colStats,
    suggestedTarget,
    suggestedFeatures: [
      ...numericCols.filter((c) => c !== suggestedTarget),
      ...dateCols,
      ...textCols.slice(0, 3),
    ].slice(0, 8),
    applicableTasks: tasks,
    recommendedModels: [...new Set(models)].slice(0, 6),
    cleaningSteps: [
      dirtyCols.length > 0
        ? `Handle missing values in: ${dirtyCols.slice(0, 4).join(", ")}`
        : null,
      catCols.length > 0
        ? `Label-encode categorical: ${catCols.slice(0, 3).join(", ")}`
        : null,
      numericCols.length > 0
        ? `Normalize/standardize: ${numericCols.slice(0, 3).join(", ")}`
        : null,
      dateCols.length > 0
        ? `Extract features from: ${dateCols.join(", ")}`
        : null,
      totalRows < 100 ? "⚠ Small dataset — consider adding more sources" : null,
    ].filter(Boolean),
  };
}

// ── DATA-FIRST: Prompt builder ────────────────────────────────────────────
/**
 * Key changes from original:
 * 1. Detected column names are injected into the prompt as the authoritative
 *    list of fields to analyse — the model is explicitly told to ignore metadata.
 * 2. Column stats are always computed and surfaced so Claude anchors on real
 *    numbers rather than hallucinating them.
 * 3. The instruction block tells the model to compare columns, find
 *    outliers, and surface actual values — not structure commentary.
 */
function buildPrompt(
  category: string,
  subject: string,
  allRaw: any[],
  cleanRecords: any[],
  rawText: string,
  enriched: any,
): string {
  const { finance, ohlcv, news, academic, products, dataset, docs, general } =
    splitByType(allRaw);
  const chartable = pickChartable(allRaw);
  const { numericCols, textCols, dateCols } = detectColumns(chartable);

  // Build context sample (strip internal _ fields)
  let ctx: any[] = [];
  if (ohlcv.length) ctx.push(...ohlcv.slice(0, 15));
  if (finance.length) ctx.push(...finance.slice(0, 15));
  if (products.length) ctx.push(...products.slice(0, 20));
  if (dataset.length) ctx.push(...dataset.slice(0, 25));
  if (academic.length) ctx.push(...academic.slice(0, 15));
  if (news.length) ctx.push(...news.slice(0, 15));
  if (docs.length) ctx.push(...docs.slice(0, 10));
  if (general.length) ctx.push(...general.slice(0, 15));
  if (!ctx.length) ctx = cleanRecords.slice(0, 30);

  const cleanCtx = ctx.map((r) => {
    const o: any = {};
    for (const [k, v] of Object.entries(r))
      if (!k.startsWith("_") && !IGNORED_KEYS.has(k)) o[k] = v;
    return o;
  });

  // Always compute real column stats
  const statsLines = numericCols
    .slice(0, 6)
    .map((col) => {
      const vals = ctx
        .map((r) => toNum(r[col]))
        .filter((v) => v !== 0 && !isNaN(v));
      if (!vals.length) return "";
      const sum = vals.reduce((a, b) => a + b, 0);
      return `  ${col}: min=${Math.min(...vals).toFixed(2)}, max=${Math.max(...vals).toFixed(2)}, mean=${(sum / vals.length).toFixed(2)}, n=${vals.length}`;
    })
    .filter(Boolean)
    .join("\n");

  let extraCtx = "";
  if (category === "finance_deep") {
    const sig = finance.find((r) => r.Metric === "Overall Signal");
    const price = finance.find((r) => r.Metric === "Current Price");
    const rsi = finance.find((r) => r.Metric?.includes("RSI"));
    extraCtx = `\nFINANCE: Price=${price?.Value}, Signal=${sig?.Value}, RSI=${rsi?.Value}, News=${enriched?.sentiment?.bullish || 0}B/${enriched?.sentiment?.bearish || 0}Be`;
  }
  if (category === "academic_research" && academic.length) {
    const top = academic
      .filter((p) => p.Citations && !isNaN(parseInt(p.Citations)))
      .sort((a, b) => parseInt(b.Citations) - parseInt(a.Citations));
    extraCtx = `\nTOP CITED: ${top
      .slice(0, 3)
      .map((p) => `"${p.Title}" (${p.Citations} cites, ${p.Year})`)
      .join("; ")}`;
  }
  if (products.length) {
    const prices = products.map((p) => toNum(p.Price)).filter((v) => v > 0);
    if (prices.length)
      extraCtx += `\nPRICES: min=₹${Math.min(...prices).toLocaleString()}, max=₹${Math.max(...prices).toLocaleString()}, avg=₹${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}`;
  }

  const sampleJSON = JSON.stringify(cleanCtx, null, 1).slice(0, 5000);

  // DATA-FIRST instruction: tell the model exactly which columns to focus on
  const analyticCols = [
    ...numericCols.slice(0, 8),
    ...dateCols.slice(0, 4),
    ...textCols.slice(0, 6),
  ];

  return `You are a world-class data analyst. The user searched for: "${subject}"
Return ONLY a valid JSON object. No markdown, no backticks, no preamble. Start with { end with }.

CRITICAL INSTRUCTION — DATA-FIRST ANALYSIS:
- Analyze the CONTENT of the records, not their structure or metadata.
- The authoritative analytic columns are: [${analyticCols.join(", ")}]
- Do NOT mention field names like "_sourceType", "id", "Status", or "Category" in your response.
- Compare actual values across records. Cite specific names, numbers, and ranges.
- Your summary must contain at least 4 concrete data points (numbers, names, dates) from the sample.

DATASET: ${cleanRecords.length} total records, ${ctx.length} shown below
Numeric columns: ${numericCols.join(", ") || "none"}
Text columns: ${textCols.slice(0, 8).join(", ") || "none"}
Date columns: ${dateCols.join(", ") || "none"}
Sources: ${enriched?.sourceResults?.map((s: any) => s.name).join(", ") || "multiple"}
${extraCtx}

COLUMN STATS (use these numbers in your analysis — do not invent others):
${statsLines || "  (no numeric columns detected)"}

DATA SAMPLE (${cleanCtx.length} records):
${sampleJSON}

Respond with this exact JSON structure. Use SPECIFIC values from the data — no placeholders:
{
  "summary": "6-8 sentences with actual names, values, and numbers from the data. Be concrete.",
  "keyMetrics": [
    {"label": "metric name", "value": "exact value", "trend": "up|down|neutral", "context": "brief meaning"},
    {"label": "metric 2", "value": "exact value", "trend": "up|down|neutral", "context": "meaning"},
    {"label": "metric 3", "value": "exact value", "trend": "up|down|neutral", "context": "meaning"},
    {"label": "metric 4", "value": "exact value", "trend": "up|down|neutral", "context": "meaning"}
  ],
  "prediction": {
    "result": "specific verdict from data",
    "confidence": "XX%",
    "reason": "3-4 sentences citing specific data points"
  },
  "insights": [
    {"insight": "specific finding with real numbers", "significance": "high", "category": "Category", "dataPoint": "exact supporting value"},
    {"insight": "finding 2", "significance": "high", "category": "Category", "dataPoint": "value"},
    {"insight": "finding 3", "significance": "high", "category": "Category", "dataPoint": "value"},
    {"insight": "finding 4", "significance": "medium", "category": "Category", "dataPoint": "value"},
    {"insight": "finding 5", "significance": "medium", "category": "Category", "dataPoint": "value"},
    {"insight": "finding 6", "significance": "medium", "category": "Category", "dataPoint": "value"}
  ],
  "patterns": [
    {"pattern": "statistical or behavioral pattern from data", "frequency": "how often", "significance": "what it means"},
    {"pattern": "second pattern", "frequency": "frequency", "significance": "implication"}
  ],
  "scenarios": {
    "bull": "optimistic scenario with specific numbers",
    "base": "most likely outcome",
    "bear": "downside scenario"
  },
  "mlSuggestion": "ML recommendation based on column types and data volume",
  "bestUseCase": "who should use this data and how"
}`;
}

// ── Fallback — always returns real content, never "Pending" ───────────────
function buildFallback(
  category: string,
  subject: string,
  allRaw: any[],
  cleanRecords: any[],
  enriched: any,
): any {
  const { numericCols, textCols } = detectColumns(pickChartable(allRaw));
  const sources = [
    ...new Set(
      cleanRecords
        .map((r: any) => r.Source || r.source || r._sourceName || "")
        .filter(Boolean),
    ),
  ].slice(0, 5);

  const titleKeys = [
    "Title",
    "title",
    "Name",
    "name",
    "Headline",
    "headline",
    "Product",
    "subject",
  ];
  const numKeys = [
    "Price",
    "price",
    "Value",
    "value",
    "Score",
    "score",
    "Citations",
    "citations",
    "Rating",
    "rating",
    "Runs",
    "runs",
    "Average",
    "average",
    "SR",
    "Goals",
    "Points",
    "Avg",
  ];
  const descKeys = [
    "Summary",
    "summary",
    "Description",
    "description",
    "Abstract",
    "abstract",
    "Content",
    "content",
  ];

  const titles = cleanRecords
    .slice(0, 5)
    .map((r: any) => {
      for (const k of titleKeys)
        if (r[k] && String(r[k]).length > 3) return String(r[k]).slice(0, 80);
      return (
        (Object.values(r).find(
          (v) => typeof v === "string" && v.length > 10,
        ) as string) ?? ""
      );
    })
    .filter(Boolean);

  const numSamples: { col: string; min: number; max: number; avg: number }[] =
    [];
  for (const col of numericCols.slice(0, 4)) {
    const vals = cleanRecords
      .map((r: any) => toNum(r[col]))
      .filter((v) => v !== 0 && !isNaN(v));
    if (vals.length) {
      const s = vals.reduce((a, b) => a + b, 0);
      numSamples.push({
        col,
        min: Math.min(...vals),
        max: Math.max(...vals),
        avg: Math.round((s / vals.length) * 100) / 100,
      });
    }
  }

  const namedNums: { key: string; val: string }[] = [];
  if (cleanRecords[0]) {
    for (const k of numKeys) {
      const v = cleanRecords[0][k];
      if (v && String(v).trim() && toNum(v) !== 0) {
        namedNums.push({ key: k, val: String(v) });
        if (namedNums.length >= 4) break;
      }
    }
  }

  const descs = cleanRecords
    .slice(0, 2)
    .map((r: any) => {
      for (const k of descKeys)
        if (r[k] && String(r[k]).length > 30) return String(r[k]).slice(0, 150);
      return "";
    })
    .filter(Boolean);

  let summary = `${cleanRecords.length} records retrieved for "${subject}" from ${sources.length ? sources.join(", ") : "multiple sources"}. `;
  if (titles.length)
    summary += `Records include: "${titles.slice(0, 3).join('", "')}"${titles.length > 3 ? ` and ${titles.length - 3} more` : ""}. `;
  if (numSamples.length)
    summary +=
      numSamples
        .map((s) => `${s.col} ranges ${s.min}–${s.max} (avg ${s.avg})`)
        .join("; ") + ". ";
  else if (namedNums.length)
    summary += `Key values: ${namedNums.map((n) => `${n.key}=${n.val}`).join(", ")}. `;
  if (descs[0]) summary += descs[0] + " ";
  summary +=
    cleanRecords.length >= 20
      ? "Dataset is sufficient — explore Charts and Insights tabs for patterns."
      : "Consider fetching from more sources for richer analysis.";

  const km: any[] = [];
  for (const s of numSamples.slice(0, 2))
    km.push({
      label: `Avg ${s.col}`,
      value: String(s.avg),
      trend: "neutral",
      context: `Range: ${s.min}–${s.max}`,
    });
  for (const n of namedNums.slice(0, 2 - km.length))
    km.push({
      label: n.key,
      value: n.val,
      trend: "neutral",
      context: `From ${sources[0] || "source"}`,
    });
  km.push({
    label: "Records",
    value: String(cleanRecords.length),
    trend: "neutral",
    context: sources.slice(0, 2).join(", ") || "Multiple sources",
  });
  km.push({
    label: "Sources",
    value: String(Math.max(1, sources.length)),
    trend: "neutral",
    context: sources.join(", ") || "Multiple",
  });

  const insights: any[] = [];
  if (titles[0])
    insights.push({
      insight: `Top result: "${titles[0]}"`,
      significance: "high",
      category: "Top Result",
      dataPoint: titles[0].slice(0, 50),
    });
  if (titles[1])
    insights.push({
      insight: `Also includes: "${titles[1]}"${titles[2] ? ` and "${titles[2]}"` : ""} — ${cleanRecords.length} records total`,
      significance: "high",
      category: "Coverage",
      dataPoint: `${cleanRecords.length} records`,
    });
  for (const s of numSamples.slice(0, 2))
    insights.push({
      insight: `${s.col} spans ${s.min} to ${s.max} with average ${s.avg}`,
      significance: "high",
      category: "Statistics",
      dataPoint: `avg ${s.avg}`,
    });
  if (descs[0])
    insights.push({
      insight: descs[0].slice(0, 120),
      significance: "medium",
      category: "Detail",
      dataPoint: titles[0]?.slice(0, 40) || "record",
    });
  insights.push({
    insight:
      sources.length > 1
        ? `Data cross-validated from ${sources.length} sources: ${sources.join(", ")}`
        : `Single source: ${sources[0] || "unknown"} — add more for cross-validation`,
    significance: "medium",
    category: "Source Quality",
    dataPoint: `${cleanRecords.length} total records`,
  });
  insights.push({
    insight:
      numericCols.length >= 2
        ? `${numericCols.length} numeric columns available (${numericCols.slice(0, 3).join(", ")}) — Charts and ML tabs are enabled`
        : "Text-heavy dataset — use Data tab to read all records",
    significance: "medium",
    category: "Data Structure",
    dataPoint: numericCols[0] || "text",
  });

  const verdict = numSamples[0]
    ? numSamples[0].avg > numSamples[0].max * 0.6
      ? "Above Average Performance"
      : "Mixed Performance Signals"
    : cleanRecords.length > 20
      ? "Sufficient Data for Analysis"
      : "Limited Data Available";

  return {
    summary,
    keyMetrics: km.slice(0, 4),
    prediction: {
      result: verdict,
      confidence: `${Math.min(85, 50 + cleanRecords.length)}%`,
      reason: `Based on ${cleanRecords.length} records from ${sources.join(", ") || "multiple sources"}. ${numSamples.length ? `Numeric analysis shows ${numSamples[0]?.col} averaging ${numSamples[0]?.avg}.` : ""} Click AIXPLORE again if a deeper AI analysis is needed.`,
    },
    insights: insights.slice(0, 6),
    patterns: [
      {
        pattern: numSamples[0]
          ? `${numSamples[0].col} shows variance of ${(numSamples[0].max - numSamples[0].min).toFixed(2)} across ${cleanRecords.length} records`
          : `${cleanRecords.length} records span ${sources.length} sources`,
        frequency: `${cleanRecords.length} observations`,
        significance: "Cross-source data improves reliability of conclusions",
      },
    ],
    scenarios: {
      bull: `If trends hold, ${subject} shows potential for improvement based on ${cleanRecords.length} data points.`,
      base: `Current data indicates moderate activity — ${titles[0] || "records"} represent the primary area of focus.`,
      bear: `Limited data depth may affect accuracy. Add more sources for comprehensive analysis.`,
    },
    mlSuggestion:
      numericCols.length >= 2
        ? `${numericCols.length} numeric features available. Recommend starting with ${numericCols[numericCols.length - 1]} as target. Random Forest or XGBoost would work well.`
        : "Add structured numeric data sources to enable ML predictions.",
    bestUseCase: `Explore all ${cleanRecords.length} records in the Data tab. ${titles[0] ? `Start with: "${titles[0]}". ` : ""}Download as CSV for analysis in Python or Excel.`,
  };
}

// ── POST ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      records: rawCleanRecords,
      rawRecords: rawAllRaw,
      siteType,
      meta,
      enriched,
      rawText,
      category,
      subjectLine,
    } = await req.json();

    if (!rawCleanRecords?.length)
      return NextResponse.json(
        { error: "No records to analyse" },
        { status: 400 },
      );

    // ── DATA-FIRST: flatten nested structures before anything else ──────────
    const cleanRecords: any[] = flattenScrapedData(rawCleanRecords);
    const allRaw: any[] = rawAllRaw?.length
      ? flattenScrapedData(rawAllRaw)
      : cleanRecords;
    // ────────────────────────────────────────────────────────────────────────

    const cat = category || siteType || "general";
    const subject =
      subjectLine || enriched?.subjectLine || meta?.sourceUrl || "the topic";

    let analysis: any = null;
    try {
      const prompt = buildPrompt(
        cat,
        subject,
        allRaw,
        cleanRecords,
        rawText ?? "",
        enriched,
      );
      const raw = await callAI(prompt, 4000);
      analysis = parseJSON(raw);
    } catch (err) {
      console.error("AI analysis failed:", err);
    }

    if (!analysis || !analysis.summary) {
      analysis = buildFallback(cat, subject, allRaw, cleanRecords, enriched);
    }

    analysis.charts = buildCharts(allRaw, cleanRecords, cat);
    analysis.mlReadiness = buildML(allRaw, cleanRecords);
    analysis.stats = {
      totalRecords: meta?.totalRecords ?? cleanRecords.length,
      scrapedAt: meta?.scrapedAt ?? new Date().toISOString(),
      sourceUrl: meta?.sourceUrl ?? "",
      dataSize: meta?.dataSize ?? "~1 KB",
      category: cat,
      subjectLine: subject,
      sourcesUsed: meta?.sourcesUsed?.join(", ") || "",
      ...(enriched?.sentiment
        ? {
            bullishNews: enriched.sentiment.bullish,
            bearishNews: enriched.sentiment.bearish,
            neutralNews: enriched.sentiment.neutral,
          }
        : {}),
    };
    analysis.siteType = cat;

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error("AIXPLORE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
