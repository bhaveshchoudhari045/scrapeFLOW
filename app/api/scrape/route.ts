import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY!;
const NEWS_API_KEY = process.env.NEWS_API_KEY!;
const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

// ── Only models confirmed working on free tier ──────────────────────
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

// ── Domains that always block scrapers → use NewsAPI instead ─────────
const NEWS_API_DOMAINS = [
  "reuters.com",
  "bloomberg.com",
  "nytimes.com",
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "washingtonpost.com",
  "ft.com",
  "wsj.com",
  "economist.com",
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

// ── Domains that block all scraping entirely ─────────────────────────
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

async function callGroq(prompt: string, maxTokens = 3000): Promise<string> {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: maxTokens,
          }),
        },
      );
      if (res.status === 429) {
        console.warn(`[groq] ${model} rate limited, trying next`);
        continue;
      }
      if (res.status === 413) {
        console.warn(`[groq] ${model} prompt too large, trying next`);
        continue;
      }
      if (!res.ok) {
        console.warn(`[groq] ${model} HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const text = (data.choices?.[0]?.message?.content ?? "").trim();
      if (text) return text;
    } catch (e: any) {
      console.warn(`[groq] ${model}:`, e.message?.slice(0, 80));
    }
  }
  return "";
}

// ── Sentiment ───────────────────────────────────────────────────────
function sentiment(text: string): "🟢 Positive" | "🔴 Negative" | "🟡 Neutral" {
  const t = text.toLowerCase();
  const pos = [
    "surge",
    "soar",
    "rally",
    "gain",
    "rise",
    "profit",
    "beat",
    "strong",
    "growth",
    "record",
    "bullish",
    "upgrade",
    "breakthrough",
    "success",
    "win",
    "positive",
    "increase",
    "improve",
    "boost",
    "advance",
  ];
  const neg = [
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
    "concern",
    "warning",
    "debt",
    "fail",
    "crisis",
    "war",
    "attack",
    "negative",
    "decrease",
    "threat",
    "conflict",
    "sanction",
  ];
  let s = 0;
  pos.forEach((w) => {
    if (t.includes(w)) s++;
  });
  neg.forEach((w) => {
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

// ── Safe HTML fetch ─────────────────────────────────────────────────
async function safeFetch(url: string, maxChars = 8000): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(
        `[safeFetch] ${new URL(url).hostname} returned ${res.status}`,
      );
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
      .slice(0, maxChars); // Strict limit to avoid 413
  } catch (err: any) {
    console.warn(
      `[safeFetch] ${url.slice(0, 60)} failed:`,
      err.message?.slice(0, 60),
    );
    return "";
  }
}

// ── Extract structured records from page text ───────────────────────
async function extractWithGroq(
  text: string,
  intent: string,
  sourceName: string,
  url: string,
): Promise<any[]> {
  if (!text || text.length < 50) return [];

  // Keep prompt small to avoid 413
  const trimmedText = text.slice(0, 6000);

  const raw = await callGroq(
    `Extract structured data from this page for: "${intent.slice(0, 100)}"
Source: ${sourceName}

Page text:
${trimmedText}

Return ONLY a JSON array. No markdown. Start [ end ].
- News articles: [{"_sourceName":"${sourceName}","_sourceType":"news","Title":"full title","Description":"full paragraph - keep complete","Author":"","Date":"YYYY-MM-DD","URL":"","Sentiment":""}]
- Research papers: [{"_sourceName":"${sourceName}","_sourceType":"academic","Title":"","Authors":"","Abstract":"full abstract","Year":"","URL":""}]
- Stats/tables: [{"_sourceName":"${sourceName}","_sourceType":"tabular","col1":"val","col2":"val"}]
- Products: [{"_sourceName":"${sourceName}","_sourceType":"product","Name":"","Price":"","Rating":"","Specs":""}]
Extract ALL items found. Minimum 5 if data exists.`,
    3000,
  );

  if (!raw) return [];
  let records: any[] = [];
  try {
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) records = JSON.parse(m[0]);
  } catch {
    try {
      const fixed = raw.replace(/,\s*$/, "") + "]";
      const m2 = fixed.match(/\[[\s\S]*/);
      if (m2) records = JSON.parse(m2[0] + (m2[0].endsWith("]") ? "" : "]"));
    } catch {}
  }
  console.log(`[extract] ${sourceName}: ${records.length} records`);
  return records.filter(
    (r: any) => Object.keys(r).filter((k) => !k.startsWith("_")).length >= 2,
  );
}

// ── NewsAPI — fetches 30 articles for ANY news query ────────────────
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
    // Also fetch abstracts
    const fetchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.slice(0, 10).join(",")}&retmode=xml`,
    );
    const xml = await fetchRes.text();
    return ids
      .map((id) => {
        const p = result[id] ?? {};
        const abstractMatch = xml.match(
          new RegExp(
            `<PMID[^>]*>${id}</PMID>[\\s\\S]*?<AbstractText[^>]*>([\\s\\S]*?)</AbstractText>`,
            "i",
          ),
        );
        const abstract =
          abstractMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
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
          Abstract: abstract,
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
    if (u.pathname.startsWith("/wiki/")) {
      articleTitle = decodeURIComponent(
        u.pathname.replace("/wiki/", "").replace(/_/g, " "),
      );
    }
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
    if (sumData?.extract && sumData.type === "standard") {
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
    }
    const searchResults = searchData?.query?.search ?? [];
    records.push(
      ...searchResults.slice(0, 8).map((r: any) => ({
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

async function fetchFromFirecrawl(
  url: string,
  intent: string,
  sourceName: string,
) {
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
    return await extractWithGroq(
      data.data.markdown.slice(0, 6000),
      intent,
      sourceName,
      url,
    );
  } catch {
    return [];
  }
}

// ── Route each site ─────────────────────────────────────────────────
async function fetchFromSite(site: any, intent: string): Promise<any[]> {
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
    // Structured free APIs
    if (domain.includes("alphavantage"))
      return await fetchFromAlphaVantage(intent);
    if (domain === "newsapi.org") return await fetchFromNewsAPI(intent);
    if (
      domain.includes("nasa.gov") ||
      domain.includes("eonet.gsfc") ||
      domain.includes("images-api.nasa")
    )
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

    // CSV files
    if (
      site.url?.endsWith(".csv") ||
      domain.includes("raw.githubusercontent.com")
    )
      return await fetchFromCSV(site.url, site.name);

    // Sites that always block scraping → use NewsAPI with source filter
    const isBlockedDomain = BLOCKED_DOMAINS.some((d) => domain.includes(d));
    if (isBlockedDomain) {
      console.log(
        `[scrape] ${site.name} is blocked domain, using NewsAPI fallback`,
      );
      return await fetchFromNewsAPI(intent, site.name);
    }

    // News sites that block direct fetch → use NewsAPI
    const isNewsDomain = NEWS_API_DOMAINS.some((d) => domain.includes(d));
    if (isNewsDomain) {
      console.log(`[scrape] ${site.name} is news domain, using NewsAPI`);
      return await fetchFromNewsAPI(intent, site.name);
    }

    // Try Firecrawl first for other sites
    if (FIRECRAWL_KEY) {
      const fc = await fetchFromFirecrawl(site.url, intent, site.name);
      if (fc.length > 0) return fc;
    }

    // Direct fetch fallback
    const text = await safeFetch(site.url);
    if (text) return await extractWithGroq(text, intent, site.name, site.url);

    return [];
  } catch (err: any) {
    console.error(`[scrape] Failed ${site.name}:`, err.message?.slice(0, 100));
    return [];
  }
}

// ── POST ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { intent, selectedSites, queryCategory, subjectLine, displayType } =
      await req.json();
    if (!intent?.trim())
      return NextResponse.json({ error: "Intent required" }, { status: 400 });
    if (!selectedSites?.length)
      return NextResponse.json({ error: "No sites selected" }, { status: 400 });

    const results = await Promise.allSettled(
      selectedSites.map((site: any) => fetchFromSite(site, intent)),
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
          ) {
            clean[k] = String(v);
          }
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

    // Build rich raw text for AI analysis — actual content not metadata
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
        subjectLine: subjectLine || intent,
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
        _fullRecords: allRecords,
      },
    });
  } catch (err: any) {
    console.error("Scrape error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
