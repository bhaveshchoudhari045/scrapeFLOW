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
  console.log("Claude status:", res.status); // ← add
  console.log("Claude response:", JSON.stringify(d).slice(0, 300)); // ← add
  if (!res.ok) throw new Error(d.error?.message || "Claude error");
  return (d.content?.[0]?.text ?? "").trim();
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
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are an elite data analyst. Respond ONLY with raw valid JSON. No markdown, no backticks. Start { end }.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const d = await res.json();
  return (d.choices?.[0]?.message?.content ?? "").trim();
}

async function callAI(prompt: string, maxTokens = 4000): Promise<string> {
  try {
    const result = await callClaude(prompt, maxTokens);
    if (!result?.trim()) throw new Error("Claude returned empty response");
    return result;
  } catch (e) {
    console.error("Claude failed:", e);
    try {
      const result = await callGroq(prompt, maxTokens);
      if (!result?.trim()) throw new Error("Groq returned empty response");
      return result;
    } catch (e2) {
      console.error("Groq failed:", e2);
      throw e2;
    }
  }
}

// FIND the parseJSON function and REPLACE entirely with:
function parseJSON(raw: string): any | null {
  const attempts = [
    () => JSON.parse(raw),
    () => JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()),
    () => {
      const m = raw.match(/\{[\s\S]*\}/s);
      return m ? JSON.parse(m[0]) : null;
    },
    () => {
      // Handle truncated JSON — find last complete field
      const m = raw.match(/\{[\s\S]*/s);
      if (!m) return null;
      let str = m[0];
      // Try closing it if truncated
      const openBraces = (str.match(/\{/g) || []).length;
      const closeBraces = (str.match(/\}/g) || []).length;
      const diff = openBraces - closeBraces;
      if (diff > 0) str += "}".repeat(diff);
      return JSON.parse(str);
    },
  ];

  for (const fn of attempts) {
    try {
      const r = fn();
      if (r && (r.summary || r.insights || r.prediction)) return r;
    } catch {}
  }
  return null;
}

// ── Column type detection — works on ACTUAL content values ───────────────
function detectColumns(records: any[]) {
  if (!records.length)
    return {
      numericCols: [] as string[],
      textCols: [] as string[],
      dateCols: [] as string[],
      allCols: [] as string[],
    };
  // Use all keys from all records (some firecrawl rows differ)
  const allCols = [
    ...new Set(
      records.flatMap((r) => Object.keys(r)).filter((k) => !k.startsWith("_")),
    ),
  ];
  const numericCols: string[] = [];
  const textCols: string[] = [];
  const dateCols: string[] = [];

  for (const col of allCols) {
    const vals = records
      .slice(0, 30)
      .map((r) => String(r[col] ?? ""))
      .filter((v) => v && v !== "—" && v !== "N/A");
    if (!vals.length) continue;
    // Date detection
    const dateHits = vals.filter((v) =>
      /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{4}/.test(v),
    ).length;
    if (dateHits >= Math.min(3, vals.length * 0.4)) {
      dateCols.push(col);
      continue;
    }
    // Numeric detection — strip currency symbols, commas, %, spaces then check
    const numHits = vals.filter((v) => {
      const cleaned = v
        .replace(/[₹$€£,\s%+]/g, "")
        .replace(/pts$/i, "")
        .replace(/km$/i, "");
      return (
        cleaned !== "" &&
        !isNaN(parseFloat(cleaned)) &&
        isFinite(Number(cleaned))
      );
    }).length;
    if (numHits >= Math.max(2, vals.length * 0.45)) numericCols.push(col);
    else textCols.push(col);
  }
  return { numericCols, textCols, dateCols, allCols };
}

// ── Parse a value to float robustly ──────────────────────────────────────
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

// ── Split records by _sourceType for targeted analysis ───────────────────
function splitByType(records: any[]) {
  const finance = records.filter(
    (r) => r._sourceType === "finance" && r.Category,
  ); // metric rows
  const ohlcv = records.filter((r) => r._sourceType === "finance_ohlcv");
  const news = records.filter((r) =>
    ["news", "social"].includes(r._sourceType),
  );
  const academic = records.filter((r) => r._sourceType === "academic");
  const products = records.filter((r) => r._sourceType === "product");
  const dataset = records.filter((r) => r._sourceType === "dataset");
  const docs = records.filter((r) => r._sourceType === "document");
  const general = records.filter(
    (r) =>
      !r._sourceType ||
      r._sourceType === "general" ||
      r._sourceType === "science",
  );
  return { finance, ohlcv, news, academic, products, dataset, docs, general };
}

// ── Choose the best record set for charting ───────────────────────────────
function pickChartableRecords(allRaw: any[], category: string): any[] {
  const { finance, ohlcv, news, academic, products, dataset, docs, general } =
    splitByType(allRaw);

  if (ohlcv.length >= 5) return ohlcv; // OHLCV always best for finance charts
  if (dataset.length >= 3) return dataset;
  if (products.length >= 3) return products;
  if (academic.length >= 3) return academic;
  // For mixed / news / general — try all non-finance records
  const rest = allRaw.filter((r) => !["finance"].includes(r._sourceType ?? ""));
  if (rest.length >= 3) return rest;
  return allRaw;
}

// ── Build chart configs from ACTUAL data ──────────────────────────────────
function buildChartConfigs(
  allRaw: any[],
  cleanRecords: any[],
  category: string,
): any[] {
  const charts: any[] = [];
  const chartable = pickChartableRecords(allRaw, category);
  const { numericCols, textCols, dateCols } = detectColumns(chartable);

  // ── 1. Finance OHLCV line chart ──────────────────────────────────────
  const ohlcv = allRaw.filter((r) => r._sourceType === "finance_ohlcv");
  if (ohlcv.length >= 5) {
    const sorted = [...ohlcv].sort(
      (a, b) => a.Date?.localeCompare(b.Date ?? "") ?? 0,
    );
    charts.push({
      type: "line",
      title: "Price History (Close)",
      xKey: "Date",
      yKey: "Close",
      data: sorted.slice(-30).map((r) => ({ x: r.Date, y: toNum(r.Close) })),
      color: "#00f5ff",
    });
    charts.push({
      type: "bar",
      title: "Daily Trading Volume",
      xKey: "Date",
      yKey: "Volume",
      data: sorted
        .slice(-20)
        .map((r) => ({ x: r.Date?.slice(5), y: toNum(r.Volume) })),
      color: "#a78bfa",
    });
    // OHLC range chart (High-Low spread)
    charts.push({
      type: "area",
      title: "High–Low Price Range",
      xKey: "Date",
      yKey: "High",
      yKey2: "Low",
      data: sorted.slice(-20).map((r) => ({
        x: r.Date?.slice(5),
        high: toNum(r.High),
        low: toNum(r.Low),
        close: toNum(r.Close),
      })),
      color: "#34d399",
    });
  }

  // ── 2. Bar — text × numeric (e.g. Player vs Runs, Product vs Price) ──
  if (textCols.length && numericCols.length) {
    // Pick the most meaningful text col (prefer Name/Player/Title over Source)
    const xCol =
      textCols.find((c) =>
        /name|player|title|product|country|team|category|brand/i.test(c),
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
          xKey: xCol,
          yKey: yCol,
          data,
          color: "#f59e0b",
        });
        if (charts.length >= 7) break;
      }
    }
  }

  // ── 3. Line — date × numeric (time series) ───────────────────────────
  if (dateCols.length && numericCols.length) {
    const xCol = dateCols[0];
    const yCol = numericCols[0];
    const sorted = [...chartable].sort((a, b) =>
      String(a[xCol] ?? "").localeCompare(String(b[xCol] ?? "")),
    );
    const data = sorted
      .slice(0, 40)
      .map((r) => ({ x: String(r[xCol] ?? ""), y: toNum(r[yCol]) }))
      .filter((d) => d.y !== 0);
    if (data.length >= 3)
      charts.push({
        type: "line",
        title: `${yCol} over ${xCol}`,
        xKey: xCol,
        yKey: yCol,
        data,
        color: "#818cf8",
      });
  }

  // ── 4. Scatter — numeric × numeric correlation ────────────────────────
  if (numericCols.length >= 2) {
    const xCol = numericCols[0],
      yCol = numericCols[1];
    const data = chartable
      .slice(0, 60)
      .map((r) => ({
        x: toNum(r[xCol]),
        y: toNum(r[yCol]),
        label: String(r[textCols[0]] ?? "").slice(0, 15),
      }))
      .filter((d) => d.x !== 0 || d.y !== 0);
    if (data.length >= 4)
      charts.push({
        type: "scatter",
        title: `${xCol} vs ${yCol} Correlation`,
        xKey: xCol,
        yKey: yCol,
        data,
        color: "#f59e0b",
      });
  }

  // ── 5. Pie/donut — categorical distribution ───────────────────────────
  const catCol = textCols.find((c) => {
    const uniq = new Set(chartable.map((r) => r[c]).filter(Boolean));
    return uniq.size >= 2 && uniq.size <= 12;
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

  // ── 6. Histogram — value distribution ────────────────────────────────
  if (numericCols.length) {
    const col = numericCols[numericCols.length - 1];
    const vals = chartable
      .map((r) => toNum(r[col]))
      .filter((v) => v !== 0 && !isNaN(v));
    if (vals.length >= 5) {
      const min = Math.min(...vals),
        max = Math.max(...vals);
      const bk = Math.min(10, Math.ceil(Math.sqrt(vals.length)));
      const bsz = (max - min) / bk || 1;
      const buckets: Record<string, number> = {};
      vals.forEach((v) => {
        const b = Math.min(Math.floor((v - min) / bsz), bk - 1);
        const lbl = `${(min + b * bsz).toFixed(1)}`;
        buckets[lbl] = (buckets[lbl] || 0) + 1;
      });
      const data = Object.entries(buckets)
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
        .map(([x, y]) => ({ x, y }));
      charts.push({
        type: "histogram",
        title: `${col} Distribution`,
        data,
        color: "#34d399",
      });
    }
  }

  // ── 7. Sentiment donut (news/social) ──────────────────────────────────
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
    if (pos + neg + neu > 0) {
      charts.push({
        type: "donut",
        title: "News Sentiment Breakdown",
        data: [
          { label: "Positive", value: pos, color: "#00f5c8" },
          { label: "Negative", value: neg, color: "#ef4444" },
          { label: "Neutral", value: neu, color: "#f59e0b" },
        ],
        color: "#00f5c8",
      });
    }
  }

  // ── 8. Academic citation bar ──────────────────────────────────────────
  const papers = allRaw.filter(
    (r) => r._sourceType === "academic" && r.Title && r.Citations,
  );
  if (papers.length >= 3) {
    const data = papers
      .filter((p) => !isNaN(parseInt(p.Citations)))
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
        title: "Papers by Citation Count",
        xKey: "Paper",
        yKey: "Citations",
        data,
        color: "#818cf8",
      });
  }

  // ── 9. Product price comparison ───────────────────────────────────────
  const prods = allRaw.filter((r) => r._sourceType === "product" && r.Name);
  if (prods.length >= 2) {
    const data = prods
      .slice(0, 15)
      .map((p) => ({
        x: String(p.Name ?? "").slice(0, 22),
        y: toNum(p.Price),
      }))
      .filter((d) => d.y > 0);
    if (data.length >= 2)
      charts.push({
        type: "bar",
        title: "Product Price Comparison",
        xKey: "Product",
        yKey: "Price (₹)",
        data,
        color: "#fb923c",
      });
  }

  return charts.filter((c) => c.data?.length >= 1).slice(0, 9);
}

// ── ML readiness — works on chartable records ─────────────────────────────
function buildMLReadiness(allRaw: any[], cleanRecords: any[]) {
  const chartable = pickChartableRecords(allRaw, "");
  const working = chartable.length >= 5 ? chartable : cleanRecords;
  if (!working.length) return null;

  const { numericCols, textCols, dateCols, allCols } = detectColumns(working);
  const totalRows = working.length;
  const totalCols = allCols.length;

  // Missing value analysis on actual data
  const missingCounts: Record<string, number> = {};
  allCols.forEach((k) => {
    missingCounts[k] = working.filter(
      (r) => !r[k] || r[k] === "—" || r[k] === "N/A" || r[k] === "",
    ).length;
  });
  const cleanCols = allCols.filter((k) => missingCounts[k] === 0);
  const dirtyCols = allCols.filter((k) => missingCounts[k] > totalRows * 0.2);

  // Suggest best target: last meaningful numeric col
  const meaningful = numericCols.filter((c) => !/source|url|id|date/i.test(c));
  const suggestedTarget =
    meaningful[meaningful.length - 1] ??
    numericCols[numericCols.length - 1] ??
    null;
  const suggestedFeatures = [
    ...numericCols.filter((c) => c !== suggestedTarget),
    ...dateCols,
    ...textCols.slice(0, 3),
  ].slice(0, 8);

  // Applicable ML tasks based on what columns exist
  const tasks: string[] = [];
  if (numericCols.length >= 2)
    tasks.push("Regression — predict a numeric value");
  const catCols = textCols.filter((c) => {
    const u = new Set(working.map((r) => r[c]).filter(Boolean));
    return u.size >= 2 && u.size <= 20;
  });
  if (catCols.length) tasks.push("Classification — predict a category");
  if (numericCols.length >= 3) tasks.push("Clustering — find hidden groups");
  if (dateCols.length && numericCols.length)
    tasks.push("Time Series — forecast future values");
  if (totalRows >= 50 && numericCols.length >= 4)
    tasks.push("Anomaly Detection — flag outliers");
  if (numericCols.length >= 5) tasks.push("Dimensionality Reduction (PCA)");

  const models: string[] = [];
  if (tasks.some((t) => t.includes("Regression")))
    models.push("XGBoost Regressor", "Random Forest", "Linear Regression");
  if (tasks.some((t) => t.includes("Classification")))
    models.push("Gradient Boosting Classifier", "SVM", "Logistic Regression");
  if (tasks.some((t) => t.includes("Clustering")))
    models.push("K-Means", "DBSCAN");
  if (tasks.some((t) => t.includes("Time Series")))
    models.push("Prophet", "LSTM", "ARIMA");

  // Actual column stats for display
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
    suggestedFeatures,
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
        ? `Extract year/month/day from: ${dateCols.join(", ")}`
        : null,
      totalRows < 100
        ? "⚠ Small dataset (<100 rows) — consider augmentation or more sources"
        : null,
      numericCols.length < 2
        ? "⚠ Few numeric columns — ML models need at least 2 numeric features"
        : null,
    ].filter(Boolean),
  };
}

// ── Deep prompt that sends actual content ────────────────────────────────
function buildPrompt(
  category: string,
  subject: string,
  allRaw: any[],
  cleanRecords: any[],
  rawText: string,
  enriched: any,
): string {
  // Pick the richest records to send to AI — use typed records for context
  const { finance, ohlcv, news, academic, products, dataset, docs, general } =
    splitByType(allRaw);
  const { numericCols, textCols } = detectColumns(
    pickChartableRecords(allRaw, category),
  );

  // Build a representative sample: prioritise typed records, send actual values
  let contextRecords: any[] = [];
  if (ohlcv.length) contextRecords.push(...ohlcv.slice(0, 5));
  if (finance.length) contextRecords.push(...finance.slice(0, 8));
  if (products.length) contextRecords.push(...products.slice(0, 10));
  if (dataset.length) contextRecords.push(...dataset.slice(0, 10));
  if (academic.length) contextRecords.push(...academic.slice(0, 8));
  if (news.length) contextRecords.push(...news.slice(0, 8));
  if (docs.length) contextRecords.push(...docs.slice(0, 5));
  if (general.length) contextRecords.push(...general.slice(0, 8));
  if (!contextRecords.length) contextRecords = cleanRecords.slice(0, 5);
  // Remove internal _ keys for the prompt but keep all real data
  const cleanCtx = contextRecords.map((r) => {
    const out: any = {};
    for (const [k, v] of Object.entries(r)) {
      if (!k.startsWith("_")) out[k] = v;
    }
    return out;
  });

  // Compute real stats for numeric columns to include in prompt
  const statsLines = numericCols
    .slice(0, 6)
    .map((col) => {
      const vals = contextRecords
        .map((r) => toNum(r[col]))
        .filter((v) => v !== 0 && !isNaN(v));
      if (!vals.length) return "";
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const min = Math.min(...vals),
        max = Math.max(...vals);
      return `  ${col}: min=${min.toFixed(2)}, max=${max.toFixed(2)}, mean=${mean.toFixed(2)}, n=${vals.length}`;
    })
    .filter(Boolean)
    .join("\n");

  // Category-specific extra context
  let extraCtx = "";
  if (category === "finance_deep") {
    const fin = finance.find((r) => r.Metric === "Overall Signal");
    const price = finance.find((r) => r.Metric === "Current Price");
    const rsi = finance.find((r) => r.Metric?.includes("RSI"));
    extraCtx = `\nFINANCE SIGNALS:\n  Price: ${price?.Value}\n  Signal: ${fin?.Value}\n  RSI: ${rsi?.Value}\n  News: ${enriched?.sentiment?.bullish || 0} bullish / ${enriched?.sentiment?.bearish || 0} bearish`;
  }
  if (category === "academic_research" && academic.length) {
    const cites = academic
      .filter((p) => p.Citations && !isNaN(parseInt(p.Citations)))
      .sort((a, b) => parseInt(b.Citations) - parseInt(a.Citations));
    extraCtx = `\nTOP CITED:\n${cites
      .slice(0, 3)
      .map((p) => `  "${p.Title}" — ${p.Citations} citations (${p.Year})`)
      .join("\n")}`;
  }
  if (products.length) {
    const prices = products.map((p) => toNum(p.Price)).filter((v) => v > 0);
    if (prices.length)
      extraCtx += `\nPRODUCT PRICES: min=₹${Math.min(...prices).toLocaleString()}, max=₹${Math.max(...prices).toLocaleString()}, avg=₹${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}, n=${prices.length}`;
  }

  return `You are a world-class data analyst. The user queried: "${subject}"
Return ONLY raw JSON — no markdown, no backticks, no explanation. Start with { and end with }.

DATASET OVERVIEW:
  Total records: ${cleanRecords.length}
  Numeric columns: ${numericCols.join(", ") || "none detected"}
  Text columns: ${textCols.join(", ") || "none detected"}
  Sources: ${enriched?.sourceResults?.map((s: any) => s.name).join(", ") || "multiple"}
${extraCtx}

COLUMN STATISTICS (computed from actual values):
${statsLines || "  No numeric columns with sufficient data"}

ACTUAL DATA SAMPLE (${cleanCtx.length} records — real values):
${JSON.stringify(cleanCtx, null, 1).slice(0, 3500)}

RAW TEXT CONTEXT:
${rawText?.slice(0, 500) || ""}

Return this JSON (fill with SPECIFIC values from the data above — no generic placeholder text):
{
  "summary": "7-9 sentences. Reference SPECIFIC names, numbers, values from the data. E.g. mention actual player names and their stats, actual product names and prices, actual paper titles and citation counts, actual stock price and RSI value. Connect the data points into a coherent narrative. Be concrete and data-driven.",
  "keyMetrics": [
    { "label": "most important metric name", "value": "exact value from data", "trend": "up|down|neutral", "context": "one sentence on what this means" },
    { "label": "second metric", "value": "exact value", "trend": "up|down|neutral", "context": "meaning" },
    { "label": "third metric", "value": "exact value", "trend": "up|down|neutral", "context": "meaning" },
    { "label": "fourth metric", "value": "exact value", "trend": "up|down|neutral", "context": "meaning" }
  ],
  "prediction": {
    "result": "specific verdict — not generic, based on actual data values",
    "confidence": "XX%",
    "reason": "3-4 sentences citing specific values, names, or statistics from the data that justify this prediction"
  },
  "insights": [
    { "insight": "Specific finding #1 with actual numbers (e.g. 'Virat Kohli averages 58.7 in Tests compared to 52.3 in ODIs')", "significance": "high", "category": "key finding", "dataPoint": "exact value that supports this" },
    { "insight": "Specific finding #2", "significance": "high", "category": "pattern", "dataPoint": "exact value" },
    { "insight": "Specific finding #3", "significance": "high", "category": "trend", "dataPoint": "exact value" },
    { "insight": "Specific finding #4", "significance": "medium", "category": "comparison", "dataPoint": "exact value" },
    { "insight": "Specific finding #5", "significance": "medium", "category": "outlier", "dataPoint": "exact value" },
    { "insight": "Specific finding #6 — an unexpected or counter-intuitive pattern", "significance": "medium", "category": "discovery", "dataPoint": "exact value" }
  ],
  "patterns": [
    { "pattern": "statistical pattern visible across multiple records", "frequency": "how frequently this appears", "significance": "actionable implication" },
    { "pattern": "second pattern", "frequency": "frequency", "significance": "implication" }
  ],
  "scenarios": {
    "bull": "3 sentences — best case scenario with specific conditions and realistic numbers",
    "base": "3 sentences — most likely outcome with specific timeline",
    "bear": "3 sentences — worst case with specific risk factors and numbers"
  },
  "mlSuggestion": "2-3 sentences: what ML model fits best, what to predict, which columns to use as features, expected accuracy range",
  "bestUseCase": "3-4 sentences: who benefits most from this data, how to act on the insights, what decision this data enables"
}`;
}

function buildFallback(
  category: string,
  subject: string,
  allRaw: any[],
  cleanRecords: any[],
  enriched: any,
): any {
  const { numericCols, textCols } = detectColumns(
    pickChartableRecords(allRaw, category),
  );

  const sources = [
    ...new Set(
      cleanRecords.map((r: any) => r.Source || r.source || "").filter(Boolean),
    ),
  ].slice(0, 5);

  // ── Read actual content from ANY record structure ──────────────────────
  // Grab the first meaningful text value from each record
  const titleKeys = [
    "Title",
    "title",
    "Headline",
    "headline",
    "Name",
    "name",
    "Product",
    "subject",
    "Subject",
    "Question",
    "query",
  ];
  const valueKeys = [
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
    "Count",
    "count",
    "Amount",
    "amount",
  ];
  const descKeys = [
    "Summary",
    "summary",
    "Description",
    "description",
    "Content",
    "content",
    "Snippet",
    "snippet",
    "Abstract",
    "abstract",
    "Body",
    "body",
  ];

  // Extract real titles/names from records
  const titles = cleanRecords
    .map((r: any) => {
      for (const k of titleKeys)
        if (r[k] && String(r[k]).length > 5) return String(r[k]);
      // fallback: first string value longer than 10 chars
      return (
        (Object.values(r).find(
          (v) => typeof v === "string" && v.length > 10,
        ) as string) ?? ""
      );
    })
    .filter(Boolean)
    .slice(0, 5);

  // Extract real numeric values
  const numericSamples: {
    col: string;
    min: number;
    max: number;
    avg: number;
  }[] = [];
  for (const col of numericCols.slice(0, 4)) {
    const vals = cleanRecords
      .map((r: any) => toNum(r[col]))
      .filter((v) => v !== 0 && !isNaN(v));
    if (vals.length) {
      const sum = vals.reduce((a, b) => a + b, 0);
      numericSamples.push({
        col,
        min: Math.min(...vals),
        max: Math.max(...vals),
        avg: Math.round((sum / vals.length) * 100) / 100,
      });
    }
  }

  // Extract real descriptions
  const descriptions = cleanRecords
    .map((r: any) => {
      for (const k of descKeys)
        if (r[k] && String(r[k]).length > 20) return String(r[k]).slice(0, 120);
      return "";
    })
    .filter(Boolean)
    .slice(0, 2);

  // ── Build content-driven summary ──────────────────────────────────────
  let summary = `${cleanRecords.length} records retrieved about "${subject}" from ${sources.length ? sources.join(", ") : "multiple sources"}. `;

  if (titles.length) {
    summary += `Records include: "${titles[0]}"`;
    if (titles[1]) summary += `, "${titles[1]}"`;
    if (titles[2]) summary += `, and ${titles.length - 2} more`;
    summary += ". ";
  }

  if (numericSamples.length) {
    summary +=
      numericSamples
        .map((s) => `${s.col} ranges from ${s.min} to ${s.max} (avg ${s.avg})`)
        .join("; ") + ". ";
  }

  if (descriptions.length) {
    summary += `${descriptions[0].slice(0, 100)}... `;
  }

  summary +=
    cleanRecords.length >= 20
      ? "Dataset is adequate for analysis — explore Insights and Charts tabs."
      : "Consider adding more sources for richer analysis.";

  // ── Content-driven key metrics ─────────────────────────────────────────
  const keyMetrics: any[] = [];

  // Add real numeric metrics first
  for (const s of numericSamples.slice(0, 2)) {
    keyMetrics.push({
      label: `Avg ${s.col}`,
      value: String(s.avg),
      trend: "neutral",
      context: `Range: ${s.min} – ${s.max}`,
    });
    if (keyMetrics.length >= 2) break;
  }

  // Fill remaining with structural but useful info
  keyMetrics.push({
    label: "Records",
    value: String(cleanRecords.length),
    trend: "neutral",
    context: `From ${sources.join(", ") || "multiple sources"}`,
  });
  keyMetrics.push({
    label: "Sources",
    value: String(sources.length || 1),
    trend: "neutral",
    context: sources.join(", ") || "Multiple sources",
  });

  // ── Content-driven insights ────────────────────────────────────────────
  const insights: any[] = [];

  if (titles[0]) {
    insights.push({
      insight: `Top result: "${titles[0]}"`,
      significance: "high",
      category: "Lead Result",
      dataPoint: titles[0].slice(0, 60),
    });
  }
  if (titles[1]) {
    insights.push({
      insight: `Also retrieved: "${titles[1]}"${titles[2] ? ` and "${titles[2]}"` : ""}`,
      significance: "high",
      category: "Coverage",
      dataPoint: `${cleanRecords.length} total records`,
    });
  }
  for (const s of numericSamples.slice(0, 2)) {
    insights.push({
      insight: `${s.col} spans from ${s.min} to ${s.max} with an average of ${s.avg} across ${cleanRecords.length} records`,
      significance: "high",
      category: "Data Range",
      dataPoint: `avg ${s.avg}`,
    });
  }
  if (descriptions[0]) {
    insights.push({
      insight: descriptions[0],
      significance: "medium",
      category: "Detail",
      dataPoint: titles[0]?.slice(0, 40) || "record",
    });
  }
  if (!insights.length) {
    insights.push({
      insight: `${cleanRecords.length} records fetched from ${sources.join(", ") || "multiple sources"} — open the Data tab to explore all records`,
      significance: "medium",
      category: "Coverage",
      dataPoint: `${cleanRecords.length} records`,
    });
  }
  insights.push({
    insight: numericCols.length
      ? `Numeric data found in: ${numericCols.join(", ")} — charts and ML analysis are enabled`
      : "No numeric columns detected — data is text-based; use the Data tab to read all records",
    significance: "medium",
    category: "Structure",
    dataPoint: numericCols[0] || "text-only",
  });

  return {
    summary,
    keyMetrics: keyMetrics.slice(0, 4),
    prediction: {
      result: "Pending Deep Analysis",
      confidence: "65%",
      reason: `AI analysis could not complete for "${subject}". ${cleanRecords.length} records are loaded — try AIXPLORE again or refine your query.`,
    },
    insights,
    patterns: [
      {
        pattern:
          sources.length > 1
            ? `Data spans ${sources.length} sources: ${sources.join(", ")}`
            : "Single source dataset — add more for cross-validation",
        frequency: `${cleanRecords.length} records total`,
        significance: "Cross-source validation improves reliability",
      },
    ],
    scenarios: {
      bull: "With sufficient data quality, automated analysis can surface actionable insights quickly.",
      base: "Manual review of the Data tab will reveal key trends across sources.",
      bear: "Limited numeric data may constrain quantitative analysis — supplement with additional sources.",
    },
    mlSuggestion:
      numericCols.length >= 2
        ? `Dataset has ${numericCols.length} numeric columns (${numericCols.join(", ")}) — suitable for regression or clustering. Suggested target: ${numericCols[numericCols.length - 1]}.`
        : "Add structured numeric data sources to enable ML predictions.",
    bestUseCase: `Explore all ${cleanRecords.length} records in the Data tab. ${titles[0] ? `Start with: "${titles[0]}"` : "Use filters to narrow down the most relevant records."} Download as CSV for deeper analysis in Python or Excel.`,
  };
}
// ── POST ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      records: cleanRecords,
      rawRecords: allRaw,
      siteType,
      meta,
      enriched,
      rawText,
      category,
      subjectLine,
    } = await req.json();
    if (!cleanRecords?.length)
      return NextResponse.json(
        { error: "No records to analyse" },
        { status: 400 },
      );

    // allRaw contains _sourceType-tagged records (sent from scrape result enriched)
    // Fall back to cleanRecords if allRaw not sent
    const fullRecords: any[] = allRaw?.length ? allRaw : cleanRecords;

    const cat = category || siteType || "general";
    const subject =
      subjectLine || enriched?.subjectLine || meta?.sourceUrl || "the topic";

    // ── AI analysis ──────────────────────────────────────────────────────
    let analysis: any = null;
    try {
      const prompt = buildPrompt(
        cat,
        subject,
        fullRecords,
        cleanRecords,
        rawText ?? "",
        enriched,
      );
      console.log("PROMPT LENGTH:", prompt.length);
      const raw = await callAI(prompt, 4000);
      console.log("AI RAW (first 300):", raw.slice(0, 300));
      analysis = parseJSON(raw);
      console.log("PARSE RESULT:", analysis ? "OK" : "NULL");
    } catch (err) {
      console.error("Analysis API error:", err);
    }
    if (!analysis)
      analysis = buildFallback(
        cat,
        subject,
        fullRecords,
        cleanRecords,
        enriched,
      );

    // ── Charts from ACTUAL typed data ────────────────────────────────────
    analysis.charts = buildChartConfigs(fullRecords, cleanRecords, cat);

    // ── ML readiness from ACTUAL typed data ──────────────────────────────
    analysis.mlReadiness = buildMLReadiness(fullRecords, cleanRecords);

    // ── Stats ─────────────────────────────────────────────────────────────
    const topHeadline =
      fullRecords.find((r) => r.Title)?.Title ||
      fullRecords.find((r) => r.Headline)?.Headline ||
      "";

    analysis.stats = {
      totalRecords: meta?.totalRecords ?? cleanRecords.length,
      scrapedAt: meta?.scrapedAt ?? new Date().toISOString(),
      sourceUrl: meta?.sourceUrl ?? "",
      dataSize: meta?.dataSize ?? "~1 KB",
      category: cat,
      subjectLine: subject,
      sourcesUsed: meta?.sourcesUsed?.join(", ") || "",
      topHeadline,
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
