import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callAIExtraction } from "@/lib/ai-tiered";

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY!;
const NEWS_API_KEY = process.env.NEWS_API_KEY!;
const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY!;

const NEWS_API_DOMAINS = [
  "reuters.com",
  "bloomberg.com",
  "nytimes.com",
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "wsj.com",
  "apnews.com",
  "cnn.com",
  "aljazeera.com",
  "ndtv.com",
  "timesofindia.indiatimes.com",
  "thehindu.com",
  "economictimes.indiatimes.com",
  "hindustantimes.com",
  "indianexpress.com",
];
const BLOCKED_DOMAINS = [
  "statista.com",
  "jstor.org",
  "sciencedirect.com",
  "researchgate.net",
  "nature.com",
  "ieeexplore.ieee.org",
  "scholar.google.com",
  "kaggle.com",
  "ourworldindata.org",
];

// ── Extract with AI — uses extraction rules from query intelligence ────────
async function extractWithAI(
  content: string,
  intent: string,
  sourceName: string,
  qi?: any, // QueryIntelligence from suggest route
): Promise<any[]> {
  if (!content || content.length < 50) return [];

  const mustHave =
    qi?.extractionRules?.mustHaveFields?.join(", ") ||
    "Title, Name, Price, Description";
  const mustExclude = qi?.extractionRules?.mustExclude?.join(", ") || "";
  const mustFilter = qi?.extractionRules?.mustFilter?.join(", ") || "";
  const refined = qi?.refinedQuery || intent;
  const outputFmt = qi?.extractionRules?.outputFormat || "general";
  const priceMax = qi?.entities?.priceRange?.max;
  const priceMin = qi?.entities?.priceRange?.min;
  const category = qi?.entities?.category || "general";

  // Build category-specific extraction schema
  let schema = "";
  if (outputFmt === "product_list" || category === "ecommerce") {
    schema = `[{"_sourceName":"${sourceName}","_sourceType":"product","Name":"EXACT product name","Price":"numeric price in ₹ or Rs format","OriginalPrice":"original price if discounted","Discount":"X% off if shown","Rating":"X.X out of 5","Reviews":"number of reviews","Brand":"brand name","Processor":"processor model","RAM":"RAM amount","Storage":"storage amount","Display":"screen size","Graphics":"GPU if any","Battery":"battery capacity","OS":"operating system","URL":"product link if found"}]`;
  } else if (outputFmt === "research_papers" || category === "academic") {
    schema = `[{"_sourceName":"${sourceName}","_sourceType":"academic","Title":"full paper title","Authors":"author names","Year":"publication year","Citations":"citation count","Abstract":"full abstract text","Journal":"journal/venue name","URL":"paper URL or DOI"}]`;
  } else if (outputFmt === "news_articles" || category === "news") {
    schema = `[{"_sourceName":"${sourceName}","_sourceType":"news","Title":"article headline","Description":"full article summary","Author":"author name","Date":"YYYY-MM-DD","Source":"publication name","URL":"article URL","Sentiment":"positive/negative/neutral"}]`;
  } else if (outputFmt === "career_stats" || category === "sports") {
    schema = `[{"_sourceName":"${sourceName}","_sourceType":"tabular","Player":"name","Format":"Test/ODI/T20","Matches":"number","Innings":"number","Runs":"number","Average":"number","StrikeRate":"number","HighScore":"number","Centuries":"number","Fifties":"number","NotOuts":"number"}]`;
  } else if (outputFmt === "stock_data" || category === "finance") {
    schema = `[{"_sourceName":"${sourceName}","_sourceType":"finance","Symbol":"ticker","Price":"current price","Change":"price change","ChangePercent":"% change","Volume":"volume","MarketCap":"market cap","PE":"P/E ratio"}]`;
  } else {
    schema = `[{"_sourceName":"${sourceName}","_sourceType":"general","Title":"title or name","Content":"main content","Value":"key value","Date":"date if present","URL":"link if present"}]`;
  }

  const priceFilter = priceMax
    ? `\nCRITICAL PRICE FILTER: ONLY include items where price is LESS THAN ${priceMax}. Completely skip any item above this price.`
    : "";

  const excludeFilter = mustExclude
    ? `\nCRITICAL EXCLUSION: DO NOT include any of these — ${mustExclude}. These are completely irrelevant.`
    : "";

  const prompt = `You are a precise data extraction system. Extract ONLY what was asked for.

USER SEARCHED FOR: "${refined}"
SOURCE: ${sourceName}
${priceFilter}
${excludeFilter}
REQUIRED FIELDS: ${mustHave}
FILTER CRITERIA: ${mustFilter || "relevant items only"}

PAGE CONTENT:
${content.slice(0, 7000)}

Return ONLY a JSON array matching this schema. No markdown. Start [ end ]:
${schema}

RULES:
1. ${priceMax ? `MANDATORY: Skip ALL items with price above ₹${priceMax.toLocaleString()}` : "Include all relevant items"}
2. ${mustExclude ? `MANDATORY: Skip items that are: ${mustExclude}` : "Include all relevant results"}
3. Extract REAL values — no placeholders, no "N/A" unless genuinely missing
4. Minimum 5 items if data exists on page
5. For prices: convert to number format (remove ₹, commas) — keep as "₹X,XXX" string
6. If page has no relevant data for "${refined}", return []`;

  const raw = await callAIExtraction(prompt, 3000);
  if (!raw) return [];

  let records: any[] = [];
  try {
    const m = raw.text.match(/\[[\s\S]*\]/);
    if (m) records = JSON.parse(m[0]);
  } catch {
    try {
      const clean = raw.text.replace(/,(\s*[\]}])/g, "$1");
      const m2 = clean.match(/\[[\s\S]*\]/);
      if (m2) records = JSON.parse(m2[0]);
    } catch {}
  }

  // Post-filter: enforce price constraint if AI missed it
  if (priceMax) {
    records = records.filter((r) => {
      const priceStr = String(r.Price ?? r.price ?? "");
      if (!priceStr) return true; // keep if no price (let user decide)
      const priceNum = parseFloat(priceStr.replace(/[₹Rs.,\s]/gi, ""));
      if (isNaN(priceNum)) return true;
      return priceNum <= priceMax;
    });
  }

  // Post-filter: exclude irrelevant items
  if (mustExclude && qi?.extractionRules?.mustExclude?.length) {
    const excludeTerms = qi.extractionRules.mustExclude.map((t: string) =>
      t.toLowerCase(),
    );
    records = records.filter((r) => {
      const name = String(r.Name ?? r.Title ?? "").toLowerCase();
      return !excludeTerms.some((term:any) => name.includes(term));
    });
  }

  console.log(
    `[extract] ${sourceName}: ${records.length} records after filtering`,
  );
  return records.filter(
    (r) => Object.keys(r).filter((k) => !k.startsWith("_")).length >= 2,
  );
}

// ── Sentiment ─────────────────────────────────────────────────────────────
function sentiment(text: string): "🟢 Positive" | "🔴 Negative" | "🟡 Neutral" {
  const t = text.toLowerCase();
  let s = 0;
  [
    "surge",
    "soar",
    "gain",
    "profit",
    "beat",
    "strong",
    "growth",
    "bullish",
    "upgrade",
    "breakthrough",
    "success",
    "win",
    "positive",
    "increase",
    "boost",
    "advance",
  ].forEach((w) => {
    if (t.includes(w)) s++;
  });
  [
    "fall",
    "drop",
    "crash",
    "loss",
    "decline",
    "plunge",
    "weak",
    "miss",
    "bearish",
    "downgrade",
    "risk",
    "fail",
    "crisis",
    "war",
    "attack",
    "negative",
    "decrease",
    "threat",
  ].forEach((w) => {
    if (t.includes(w)) s--;
  });
  return s > 0 ? "🟢 Positive" : s < 0 ? "🔴 Negative" : "🟡 Neutral";
}

function calcRSI(closes: number[], p = 14): number {
  if (closes.length < p + 1) return 50;
  let g = 0,
    l = 0;
  for (let i = closes.length - p; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) g += d;
    else l -= d;
  }
  const ag = g / p,
    al = l / p;
  if (al === 0) return 100;
  return parseFloat((100 - 100 / (1 + ag / al)).toFixed(2));
}
function calcEMA(d: number[], p: number): number[] {
  const k = 2 / (p + 1),
    ema = [d[0]];
  for (let i = 1; i < d.length; i++) ema.push(d[i] * k + ema[i - 1] * (1 - k));
  return ema;
}
function calcMACD(closes: number[]) {
  if (closes.length < 26)
    return { macd: 0, signal: 0, histogram: 0, trend: "N/A" };
  const e12 = calcEMA(closes, 12),
    e26 = calcEMA(closes, 26);
  const ml = e12.map((v, i) => v - e26[i]);
  const sig = calcEMA(ml.slice(-9), 9);
  const m = parseFloat(ml[ml.length - 1].toFixed(3));
  const s = parseFloat(sig[sig.length - 1].toFixed(3));
  return {
    macd: m,
    signal: s,
    histogram: parseFloat((m - s).toFixed(3)),
    trend: m > s ? "📈 Bullish" : "📉 Bearish",
  };
}
function rsiSignal(r: number) {
  if (r >= 70) return "Overbought ⚠️";
  if (r <= 30) return "Oversold 📈";
  if (r >= 55) return "Bullish 📈";
  if (r <= 45) return "Bearish 📉";
  return "Neutral ➡️";
}
function fmtNum(n: string | number): string {
  const v = parseFloat(String(n));
  if (isNaN(v)) return String(n) || "N/A";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return v.toLocaleString();
}

// ── Safe HTML fetch ───────────────────────────────────────────────────────
async function safeFetch(url: string, maxChars = 8000): Promise<string> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[safeFetch] ${new URL(url).hostname} ${res.status}`);
      return "";
    }
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);
  } catch {
    return "";
  }
}

// ── Firecrawl ─────────────────────────────────────────────────────────────
async function fetchFromFirecrawl(
  url: string,
  intent: string,
  sourceName: string,
  qi?: any,
): Promise<any[]> {
  if (!FIRECRAWL_KEY) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
        timeout: 20000,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !data.data?.markdown) return [];
    return await extractWithAI(
      data.data.markdown.slice(0, 7000),
      intent,
      sourceName,
      qi,
    );
  } catch {
    return [];
  }
}

// ── Free API fetchers (unchanged — these work correctly) ──────────────────
async function fetchFromNewsAPI(intent: string, sourceName = "News") {
  if (!NEWS_API_KEY) return [];
  const q = encodeURIComponent(
    intent
      .replace(
        /(show|get|fetch|find|search|give me|scrape|current|information|about)/gi,
        "",
      )
      .trim(),
  );
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&language=en&pageSize=30&apiKey=${NEWS_API_KEY}`,
    );
    const data = await res.json();
    if (data.status !== "ok") return [];
    return (data.articles ?? [])
      .filter((a: any) => a.title && !a.title.includes("[Removed]"))
      .map((a: any) => ({
        _sourceName: a.source?.name || sourceName,
        _sourceType: "news",
        Source: a.source?.name || sourceName,
        Title: a.title || "",
        Description: a.description || "",
        Content: (a.content || "").replace(/\[\+\d+ chars\]/, ""),
        Author: a.author || "",
        Date: a.publishedAt?.split("T")[0] || "",
        URL: a.url || "",
        Sentiment: sentiment((a.title || "") + " " + (a.description || "")),
        _imageUrl: a.urlToImage || "",
      }));
  } catch {
    return [];
  }
}

async function fetchFromAlphaVantage(intent: string) {
  const STOCKS: Record<string, { symbol: string; name: string }> = {
    reliance: { symbol: "RELIANCE.BSE", name: "Reliance Industries" },
    tata: { symbol: "TCS.BSE", name: "TCS" },
    tcs: { symbol: "TCS.BSE", name: "TCS" },
    infosys: { symbol: "INFY", name: "Infosys" },
    hdfc: { symbol: "HDB", name: "HDFC Bank" },
    adani: { symbol: "ADANIENT.BSE", name: "Adani Enterprises" },
    wipro: { symbol: "WIT", name: "Wipro" },
    icici: { symbol: "IBN", name: "ICICI Bank" },
    apple: { symbol: "AAPL", name: "Apple" },
    nvidia: { symbol: "NVDA", name: "NVIDIA" },
    microsoft: { symbol: "MSFT", name: "Microsoft" },
    google: { symbol: "GOOGL", name: "Google" },
    amazon: { symbol: "AMZN", name: "Amazon" },
    tesla: { symbol: "TSLA", name: "Tesla" },
    meta: { symbol: "META", name: "Meta" },
    gold: { symbol: "GLD", name: "Gold ETF" },
    oil: { symbol: "USO", name: "Oil ETF" },
    silver: { symbol: "SLV", name: "Silver ETF" },
    bajaj: { symbol: "BAJFINANCE.BSE", name: "Bajaj Finance" },
  };
  const lower = intent.toLowerCase();
  const key = Object.keys(STOCKS).find((k) => lower.includes(k));
  if (!key) return [];
  const stock = STOCKS[key];
  const base = "https://www.alphavantage.co/query";
  const [qRes, oRes, dRes] = await Promise.all([
    fetch(
      `${base}?function=GLOBAL_QUOTE&symbol=${stock.symbol}&apikey=${ALPHA_VANTAGE_KEY}`,
    ),
    fetch(
      `${base}?function=OVERVIEW&symbol=${stock.symbol}&apikey=${ALPHA_VANTAGE_KEY}`,
    ),
    fetch(
      `${base}?function=TIME_SERIES_DAILY&symbol=${stock.symbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`,
    ),
  ]);
  const [qData, ov, dData] = await Promise.all([
    qRes.json(),
    oRes.json(),
    dRes.json(),
  ]);
  const q = qData["Global Quote"] ?? {};
  const ts = dData["Time Series (Daily)"] ?? {};
  const ohlcv = Object.entries(ts)
    .slice(0, 30)
    .map(([date, v]: [string, any]) => ({
      date,
      open: parseFloat(v["1. open"]),
      high: parseFloat(v["2. high"]),
      low: parseFloat(v["3. low"]),
      close: parseFloat(v["4. close"]),
      volume: parseInt(v["5. volume"]),
    }));
  const closes = ohlcv.map((d) => d.close).reverse();
  const rsi14 = calcRSI(closes);
  const macd = calcMACD(closes);
  const ma50 =
    closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : 0;
  const ma200 =
    closes.length >= 200
      ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200
      : 0;
  const price = parseFloat(q["05. price"] ?? "0");
  let bull = 0,
    bear = 0;
  if (rsi14 < 70 && rsi14 > 40) bull++;
  if (rsi14 >= 70) bear++;
  if (rsi14 <= 30) bull += 2;
  if (macd.histogram > 0) bull++;
  else bear++;
  if (price > ma50) bull++;
  else bear++;
  if (price > ma200) bull++;
  else bear++;
  if (ma50 > ma200) bull++;
  else bear++;
  const pct = Math.round((bull / (bull + bear)) * 100);
  const sig =
    pct >= 70
      ? "🟢 Strong Buy"
      : pct >= 55
        ? "🟩 Buy"
        : pct >= 45
          ? "🟡 Hold"
          : pct >= 30
            ? "🟥 Sell"
            : "🔴 Strong Sell";
  return [
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "💰 Price",
      Metric: "Current Price",
      Value: `${price} ${ov.Currency ?? ""}`,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "💰 Price",
      Metric: "Day Change",
      Value: `${q["09. change"]} (${q["10. change percent"]})`,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "💰 Price",
      Metric: "Day High/Low",
      Value: `${q["03. high"]} / ${q["04. low"]}`,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "💰 Price",
      Metric: "Volume",
      Value: parseInt(q["06. volume"] ?? "0").toLocaleString(),
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "🏢 Company",
      Metric: "Name",
      Value: ov.Name ?? stock.name,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "🏢 Company",
      Metric: "Sector",
      Value: `${ov.Sector} / ${ov.Industry}`,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📊 Fundamentals",
      Metric: "Market Cap",
      Value: fmtNum(ov.MarketCapitalization),
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📊 Fundamentals",
      Metric: "P/E Ratio",
      Value: ov.PERatio ?? "N/A",
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📊 Fundamentals",
      Metric: "EPS",
      Value: ov.EPS ?? "N/A",
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📊 Fundamentals",
      Metric: "52W High/Low",
      Value: `${ov["52WeekHigh"]} / ${ov["52WeekLow"]}`,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📈 Technicals",
      Metric: "Overall Signal",
      Value: sig,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📈 Technicals",
      Metric: "RSI (14)",
      Value: `${rsi14} — ${rsiSignal(rsi14)}`,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📈 Technicals",
      Metric: "MACD",
      Value: `${macd.macd} — ${macd.trend}`,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📈 Technicals",
      Metric: "Trend",
      Value:
        ma50 > ma200 ? "📈 Bullish (Golden Cross)" : "📉 Bearish (Death Cross)",
    },
    ...ohlcv.map((d) => ({
      _sourceName: "Alpha Vantage",
      _sourceType: "finance_timeseries",
      Date: d.date,
      Open: String(d.open),
      High: String(d.high),
      Low: String(d.low),
      Close: String(d.close),
      Volume: String(d.volume),
    })),
  ].filter(
    (r: any) => r.Value && r.Value !== "N/A / N/A" && r.Value !== "undefined",
  );
}

async function fetchFromNASA(intent: string) {
  const today = new Date().toISOString().split("T")[0];
  const q = encodeURIComponent(
    intent.replace(/(show|get|nasa|space)/gi, "").trim() || "space",
  );
  const [apodRes, neoRes, eonetRes, imgRes] = await Promise.all([
    fetch(
      `https://api.nasa.gov/planetary/apod?count=5&api_key=${NASA_API_KEY}`,
    ),
    fetch(
      `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`,
    ),
    fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?limit=10&status=open`),
    fetch(
      `https://images-api.nasa.gov/search?q=${q}&media_type=image&year_start=2023&page_size=6`,
    ),
  ]);
  const [apod, neo, eonet, img] = await Promise.all([
    apodRes.json(),
    neoRes.json(),
    eonetRes.json(),
    imgRes.json(),
  ]);
  const articles = Array.isArray(apod) ? apod : [];
  const asteroids = Object.values(neo?.near_earth_objects ?? {})
    .flat()
    .slice(0, 8) as any[];
  const events = (eonet?.events ?? []).slice(0, 8);
  const images = (img?.collection?.items ?? []).slice(0, 6);
  return [
    ...articles.map((a: any) => ({
      _sourceName: "NASA APOD",
      _sourceType: "science",
      Type: "📸 APOD",
      Title: a.title,
      Date: a.date,
      Description: a.explanation,
      URL: a.url,
      _imageUrl: a.media_type === "image" ? a.url : "",
    })),
    ...asteroids.map((a: any) => ({
      _sourceName: "NASA NEO",
      _sourceType: "science",
      Type: "☄️ NEO",
      Name: a.name,
      Hazardous: a.is_potentially_hazardous_asteroid ? "⚠️ YES" : "✅ Safe",
      "Miss Distance": `${parseFloat(a.close_approach_data?.[0]?.miss_distance?.kilometers ?? "0").toLocaleString()} km`,
      Velocity: `${parseFloat(a.close_approach_data?.[0]?.relative_velocity?.kilometers_per_hour ?? "0").toFixed(0)} km/h`,
      "Approach Date": a.close_approach_data?.[0]?.close_approach_date ?? "",
    })),
    ...events.map((e: any) => ({
      _sourceName: "NASA EONET",
      _sourceType: "science",
      Type: "🌍 Earth Event",
      Title: e.title,
      Category: e.categories?.[0]?.title,
      Status: e.status,
      Date: e.geometry?.[0]?.date?.split("T")[0],
    })),
    ...images.map((i: any) => ({
      _sourceName: "NASA Images",
      _sourceType: "science",
      Type: "🖼️ NASA Image",
      Title: i.data?.[0]?.title,
      Description: i.data?.[0]?.description,
      Date: i.data?.[0]?.date_created?.split("T")[0],
      _imageUrl: i.links?.[0]?.href,
    })),
  ];
}

async function fetchFromSemanticScholar(intent: string) {
  const q = encodeURIComponent(
    intent
      .replace(/(research|papers|study|studies|show|find|get)/gi, "")
      .trim(),
  );
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${q}&limit=25&fields=title,abstract,authors,year,citationCount,externalIds,publicationVenue,fieldsOfStudy`,
      { headers: { "User-Agent": "FlowScrape/1.0" } },
    );
    const data = await res.json();
    return (data?.data ?? [])
      .map((p: any) => ({
        _sourceName: "Semantic Scholar",
        _sourceType: "academic",
        Source: "🎓 Semantic Scholar",
        Title: p.title ?? "",
        Authors: (p.authors ?? [])
          .slice(0, 5)
          .map((a: any) => a.name)
          .join(", "),
        Year: String(p.year ?? ""),
        Citations: String(p.citationCount ?? 0),
        Abstract: p.abstract ?? "",
        Venue: p.publicationVenue?.name ?? "",
        Fields: (p.fieldsOfStudy ?? []).join(", "),
        URL: p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : "",
      }))
      .filter((r: any) => r.Title);
  } catch {
    return [];
  }
}

async function fetchFromArXiv(intent: string) {
  const q = encodeURIComponent(
    intent.replace(/(research|papers|show|find|get)/gi, "").trim(),
  );
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=25&sortBy=relevance`,
    );
    const xml = await res.text();
    const entries = xml.split("<entry>").slice(1);
    return entries
      .map((e) => {
        const get = (tag: string) =>
          e
            .match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]
            ?.replace(/<[^>]+>/g, "")
            .trim() ?? "";
        const authors = [...e.matchAll(/<name>(.*?)<\/name>/g)]
          .slice(0, 5)
          .map((m) => m[1])
          .join(", ");
        const arxivId = get("id").split("/abs/")[1] ?? "";
        return {
          _sourceName: "arXiv",
          _sourceType: "academic",
          Source: "📄 arXiv",
          Title: get("title").replace(/\s+/g, " "),
          Authors: authors,
          Abstract: get("summary"),
          Published: get("published").slice(0, 10),
          URL: `https://arxiv.org/abs/${arxivId}`,
        };
      })
      .filter((r) => r.Title);
  } catch {
    return [];
  }
}

async function fetchFromPubMed(intent: string) {
  const q = encodeURIComponent(
    intent
      .replace(/(research|papers|show|find|get|medical|health)/gi, "")
      .trim(),
  );
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${q}&retmax=25&retmode=json&sort=relevance`,
    );
    const searchData = await searchRes.json();
    const ids: string[] = searchData?.esearchresult?.idlist ?? [];
    if (!ids.length) return [];
    const sumRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`,
    );
    const sumData = await sumRes.json();
    const result = sumData?.result ?? {};
    return ids
      .map((id) => {
        const p = result[id] ?? {};
        return {
          _sourceName: "PubMed",
          _sourceType: "academic",
          Source: "🏥 PubMed",
          Title: p.title ?? "",
          Authors: (p.authors ?? [])
            .slice(0, 5)
            .map((a: any) => a.name)
            .join(", "),
          Journal: p.source ?? "",
          Year: p.pubdate?.split(" ")[0] ?? "",
          Abstract: "",
          URL: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        };
      })
      .filter((r) => r.Title);
  } catch {
    return [];
  }
}

async function fetchFromHackerNews(intent: string) {
  const q = encodeURIComponent(
    intent.replace(/(show|get|hacker news|hn|tech news)/gi, "").trim() ||
      intent,
  );
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=30`,
    );
    const data = await res.json();
    return (data?.hits ?? [])
      .map((s: any) => ({
        _sourceName: "Hacker News",
        _sourceType: "news",
        Source: "⚡ Hacker News",
        Title: s.title ?? "",
        Score: `${s.points ?? 0} pts`,
        Author: s.author ?? "",
        Comments: String(s.num_comments ?? 0),
        Date: s.created_at?.split("T")[0] ?? "",
        Domain: s.url
          ? (() => {
              try {
                return new URL(s.url).hostname.replace("www.", "");
              } catch {
                return "";
              }
            })()
          : "",
        URL: s.url ?? `https://news.ycombinator.com/item?id=${s.objectID}`,
        Sentiment: sentiment(s.title ?? ""),
      }))
      .filter((r: any) => r.Title);
  } catch {
    return [];
  }
}

async function fetchFromReddit(intent: string) {
  const q = encodeURIComponent(intent);
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${q}&sort=top&limit=25&t=month`,
      { headers: { "User-Agent": "FlowScrape/1.0" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.children ?? [])
      .map((c: any) => c.data)
      .filter(Boolean)
      .map((p: any) => ({
        _sourceName: `Reddit r/${p.subreddit}`,
        _sourceType: "social",
        Source: `💬 r/${p.subreddit}`,
        Title: p.title ?? "",
        Score: `${p.score} pts`,
        Author: `u/${p.author}`,
        Comments: String(p.num_comments),
        Content: (p.selftext ?? "").slice(0, 500),
        Date: new Date((p.created_utc || 0) * 1000).toISOString().split("T")[0],
        Sentiment: sentiment(p.title + " " + (p.selftext ?? "")),
        URL: `https://reddit.com${p.permalink}`,
      }))
      .filter((r: any) => r.Title);
  } catch {
    return [];
  }
}

async function fetchFromWikipedia(url: string, intent: string) {
  let articleTitle = "";
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/wiki/"))
      articleTitle = decodeURIComponent(
        u.pathname.replace("/wiki/", "").replace(/_/g, " "),
      );
  } catch {}
  const q =
    articleTitle ||
    intent.replace(/(show|get|find|about|what is)/gi, "").trim();
  try {
    const [sumRes, searchRes] = await Promise.all([
      fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/ /g, "_"))}`,
      ),
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=10&format=json&origin=*`,
      ),
    ]);
    const [sumData, searchData] = await Promise.all([
      sumRes.json(),
      searchRes.json(),
    ]);
    const records: any[] = [];
    if (sumData?.extract && sumData.type === "standard")
      records.push({
        _sourceName: "Wikipedia",
        _sourceType: "general",
        Source: "📖 Wikipedia",
        Title: sumData.title,
        Abstract: sumData.extract,
        URL: sumData.content_urls?.desktop?.page ?? "",
        Date: "Current",
        _imageUrl: sumData.thumbnail?.source ?? "",
      });
    const searchResults = searchData?.query?.search ?? [];
    records.push(
      ...searchResults
        .slice(0, 8)
        .map((r: any) => ({
          _sourceName: "Wikipedia",
          _sourceType: "general",
          Source: "📖 Wikipedia",
          Title: r.title,
          Abstract: r.snippet?.replace(/<[^>]+>/g, "") ?? "",
          URL: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
          Date: "Current",
        })),
    );
    return records.filter((r) => r.Title);
  } catch {
    return [];
  }
}

async function fetchFromCSV(url: string, sourceName: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FlowScrape/1.0" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) return [];
    const parseRow = (line: string): string[] => {
      const cols: string[] = [];
      let cur = "",
        inQ = false;
      for (const ch of line) {
        if (ch === '"') {
          inQ = !inQ;
          continue;
        }
        if (ch === "," && !inQ) {
          cols.push(cur.trim());
          cur = "";
          continue;
        }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    };
    const headers = parseRow(lines[0]);
    return lines
      .slice(1, 201)
      .map((line) => {
        const vals = parseRow(line);
        const row: Record<string, string> = {
          _sourceName: sourceName,
          _sourceType: "tabular",
        };
        headers.forEach((h, i) => {
          if (h) row[h] = vals[i] ?? "";
        });
        return row;
      })
      .filter((r) => Object.keys(r).length > 3);
  } catch {
    return [];
  }
}

// ── Route each site — passes QueryIntelligence for precise extraction ─────
async function fetchFromSite(
  site: any,
  intent: string,
  qi?: any,
): Promise<any[]> {
  const domain =
    site.domain?.toLowerCase() ||
    (() => {
      try {
        return new URL(site.url).hostname.replace("www.", "");
      } catch {
        return "";
      }
    })();
  console.log(`[scrape] → ${site.name} | ${domain}`);

  try {
    // Free structured APIs — always accurate
    if (domain.includes("alphavantage"))
      return await fetchFromAlphaVantage(intent);
    if (domain === "newsapi.org") return await fetchFromNewsAPI(intent);
    if (domain.includes("nasa.gov") || domain.includes("eonet.gsfc"))
      return await fetchFromNASA(intent);
    if (domain.includes("semanticscholar.org"))
      return await fetchFromSemanticScholar(intent);
    if (domain.includes("arxiv.org")) return await fetchFromArXiv(intent);
    if (
      domain.includes("pubmed.ncbi") ||
      domain.includes("ncbi.nlm.nih") ||
      domain.includes("medrxiv.org") ||
      domain.includes("biorxiv.org")
    )
      return await fetchFromPubMed(intent);
    if (domain.includes("ycombinator.com"))
      return await fetchFromHackerNews(intent);
    if (domain.includes("reddit.com")) return await fetchFromReddit(intent);
    if (domain.includes("wikipedia.org"))
      return await fetchFromWikipedia(site.url, intent);
    if (
      site.url?.endsWith(".csv") ||
      domain.includes("raw.githubusercontent.com")
    )
      return await fetchFromCSV(site.url, site.name);

    // Blocked domains — use NewsAPI fallback
    if (BLOCKED_DOMAINS.some((d) => domain.includes(d)))
      return await fetchFromNewsAPI(intent, site.name);

    // News domains — use NewsAPI
    if (NEWS_API_DOMAINS.some((d) => domain.includes(d)))
      return await fetchFromNewsAPI(intent, site.name);

    // Ecommerce / scraped sites — use Firecrawl WITH query intelligence
    if (FIRECRAWL_KEY) {
      const fc = await fetchFromFirecrawl(site.url, intent, site.name, qi);
      if (fc.length > 0) return fc;
    }

    // Direct fetch fallback with AI extraction + query intelligence
    const text = await safeFetch(site.url);
    if (text) return await extractWithAI(text, intent, site.name, qi);

    return [];
  } catch (err: any) {
    console.error(`[scrape] Failed ${site.name}:`, err.message?.slice(0, 100));
    return [];
  }
}

// ── POST ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // queryIntelligence is now passed from suggest route
    const {
      intent,
      selectedSites,
      queryCategory,
      subjectLine,
      displayType,
      queryIntelligence,
    } = await req.json();
    if (!intent?.trim())
      return NextResponse.json({ error: "Intent required" }, { status: 400 });
    if (!selectedSites?.length)
      return NextResponse.json({ error: "No sites selected" }, { status: 400 });

    const qi = queryIntelligence; // may be undefined for old clients
    console.log(
      "[scrape] QI:",
      qi?.refinedQuery || "none",
      "| Exclude:",
      qi?.extractionRules?.mustExclude?.join(",") || "none",
    );

    const results = await Promise.allSettled(
      selectedSites.map((site: any) => fetchFromSite(site, intent, qi)),
    );

    const allRecords: any[] = [],
      allImages: string[] = [],
      sourceNames: string[] = [];
    results.forEach((result, i) => {
      const site = selectedSites[i];
      if (result.status === "fulfilled" && result.value?.length) {
        allRecords.push(...result.value);
        result.value.forEach((r: any) => {
          if (r._imageUrl) allImages.push(r._imageUrl);
        });
        sourceNames.push(site.name);
        console.log(`[scrape] ✓ ${site.name}: ${result.value.length} records`);
      } else {
        console.warn(`[scrape] ✗ ${site.name}: 0 records`);
      }
    });

    if (!allRecords.length)
      return NextResponse.json({
        error: "no_data",
        message:
          "Could not fetch data from selected sources. Try different sites or rephrase your query.",
      });

    const cleanRecords = allRecords
      .map((r) => {
        const clean: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          if (
            !k.startsWith("_") &&
            v !== null &&
            v !== undefined &&
            String(v).trim() &&
            String(v) !== "0"
          )
            clean[k] = String(v);
        }
        return clean;
      })
      .filter((r) => Object.keys(r).length > 1);

    const financeRecords = allRecords.filter(
      (r) => r._sourceType === "finance",
    );
    const timeseriesRecords = allRecords.filter(
      (r) => r._sourceType === "finance_timeseries",
    );
    const academicRecords = allRecords.filter(
      (r) => r._sourceType === "academic",
    );
    const newsRecords = allRecords.filter((r) => r._sourceType === "news");
    const productRecords = allRecords.filter(
      (r) => r._sourceType === "product",
    );
    const socialRecords = allRecords.filter((r) => r._sourceType === "social");
    const tabularRecords = allRecords.filter(
      (r) => r._sourceType === "tabular",
    );
    const bullishNews = newsRecords.filter((r) =>
      String(r.Sentiment || "").includes("Positive"),
    ).length;
    const bearishNews = newsRecords.filter((r) =>
      String(r.Sentiment || "").includes("Negative"),
    ).length;

    const siteType =
      queryCategory === "finance"
        ? "finance_deep"
        : queryCategory === "academic"
          ? "academic_research"
          : queryCategory === "science"
            ? "science_space"
            : queryCategory === "ecommerce"
              ? "ecommerce_product"
              : queryCategory === "health"
                ? "health_medical"
                : queryCategory === "social"
                  ? "social_reddit"
                  : queryCategory === "sports" || queryCategory === "statistics"
                    ? "statistics"
                    : "general_news";

    const fullRawText = allRecords
      .filter((r) => r.Abstract || r.Description || r.Content || r.Summary)
      .map(
        (r) =>
          `[${r._sourceName}] ${r.Title || r.Name || ""}\n${r.Abstract || r.Description || r.Content || r.Summary || ""}`,
      )
      .join("\n\n---\n\n")
      .slice(0, 80000);

    console.log(
      `[scrape] Total: ${allRecords.length} records from ${sourceNames.length} sources`,
    );

    return NextResponse.json({
      success: true,
      config: {
        url: sourceNames.join(" + "),
        siteType,
        displayType: displayType || "mixed",
        category: queryCategory,
        selectors: [],
        dataKeys: [],
        sourcesUsed: sourceNames,
      },
      data: {
        records: cleanRecords,
        images: [...new Set(allImages)].filter(Boolean).slice(0, 20),
        rawText: fullRawText,
      },
      meta: {
        totalRecords: cleanRecords.length,
        scrapedAt: new Date().toISOString(),
        sourceUrl: sourceNames.join(", "),
        dataSize: `~${Math.max(1, Math.round(JSON.stringify(cleanRecords).length / 1024))} KB`,
        sourcesUsed: sourceNames,
      },
      enriched: {
        sourceResults: sourceNames.map((name) => ({
          name,
          count: allRecords.filter(
            (r) => r._sourceName === name || r._sourceName?.includes(name),
          ).length,
        })),
        category: queryCategory,
        subjectLine: subjectLine || qi?.subjectLine || intent,
        displayType: displayType || "mixed",
        sentiment: {
          overall:
            bullishNews > bearishNews
              ? "🟢 Positive"
              : bearishNews > bullishNews
                ? "🔴 Negative"
                : "🟡 Mixed",
          bullish: bullishNews,
          bearish: bearishNews,
          neutral: newsRecords.length - bullishNews - bearishNews,
        },
        financeData: financeRecords.length > 0 ? financeRecords : null,
        timeseriesData: timeseriesRecords.length > 0 ? timeseriesRecords : null,
        academicPapers: academicRecords,
        newsArticles: newsRecords,
        products: productRecords,
        socialPosts: socialRecords,
        tabularData: tabularRecords,
        query: intent,
        queryIntelligence: qi, // pass through for AIXPLORE context
        _fullRecords: allRecords,
      },
    });
  } catch (err: any) {
    console.error("Scrape error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
