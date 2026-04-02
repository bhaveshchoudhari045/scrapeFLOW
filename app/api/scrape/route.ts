import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY!;
const NEWS_API_KEY = process.env.NEWS_API_KEY!;
const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

// ── Sentiment scorer ────────────────────────────────────────────────
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
    "innovation",
    "positive",
    "high",
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
    "lawsuit",
    "ban",
    "fail",
    "crisis",
    "war",
    "attack",
    "negative",
    "low",
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

// ── Technical indicators ────────────────────────────────────────────
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

// ── Individual source fetchers ──────────────────────────────────────

async function fetchFromAlphaVantage(url: string, intent: string) {
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
      Category: "📊 Fundamentals",
      Metric: "Analyst Target",
      Value: ov.AnalystTargetPrice ?? "N/A",
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📊 Fundamentals",
      Metric: "Beta",
      Value: ov.Beta ?? "N/A",
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
      Metric: "MA50 / MA200",
      Value: `${ma50.toFixed(2)} / ${ma200.toFixed(2)}`,
    },
    {
      _sourceName: "Alpha Vantage",
      _sourceType: "finance",
      Category: "📈 Technicals",
      Metric: "Trend",
      Value:
        ma50 > ma200 ? "📈 Bullish (Golden Cross)" : "📉 Bearish (Death Cross)",
    },
  ].filter(
    (r) => r.Value && r.Value !== "N/A / N/A" && r.Value !== "undefined",
  );
}

async function fetchFromNewsAPI(url: string, intent: string) {
  const q = encodeURIComponent(
    intent.replace(/(show|get|fetch|find|search|give me)/gi, "").trim(),
  );
  const apiUrl = `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&language=en&pageSize=15&apiKey=${NEWS_API_KEY}`;
  const res = await fetch(apiUrl);
  const data = await res.json();
  if (data.status !== "ok") return [];
  return (data.articles ?? [])
    .filter((a: any) => a.title && !a.title.includes("[Removed]"))
    .map((a: any) => ({
      _sourceName: a.source?.name || "News",
      _sourceType: "news",
      Source: a.source?.name || "",
      Title: a.title || "",
      Description: a.description?.slice(0, 200) || "",
      Author: a.author || "",
      Published: a.publishedAt?.split("T")[0] || "",
      URL: a.url || "",
      Sentiment: sentiment(a.title + " " + (a.description ?? "")),
    }));
}

async function fetchFromNASA(url: string, intent: string) {
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
      Summary: a.explanation?.slice(0, 300) + "...",
      URL: a.url,
      _imageUrl: a.media_type === "image" ? a.url : "",
    })),
    ...asteroids.map((a: any) => ({
      _sourceName: "NASA NEO",
      _sourceType: "science",
      Type: "☄️ NEO",
      Name: a.name,
      Hazardous: a.is_potentially_hazardous_asteroid ? "⚠️ YES" : "✅ Safe",
      Diameter: `${a.estimated_diameter?.kilometers?.estimated_diameter_min?.toFixed(3)}–${a.estimated_diameter?.kilometers?.estimated_diameter_max?.toFixed(3)} km`,
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
      Description: i.data?.[0]?.description?.slice(0, 200),
      Date: i.data?.[0]?.date_created?.split("T")[0],
      _imageUrl: i.links?.[0]?.href,
    })),
  ];
}

async function fetchFromSemanticScholar(url: string, intent: string) {
  const q = encodeURIComponent(
    intent
      .replace(/(research|papers|study|studies|show|find|get)/gi, "")
      .trim(),
  );
  const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${q}&limit=10&fields=title,abstract,authors,year,citationCount,externalIds,publicationVenue,fieldsOfStudy`;
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "FlowScrape/1.0" },
  });
  const data = await res.json();
  return (data?.data ?? [])
    .map((p: any) => ({
      _sourceName: "Semantic Scholar",
      _sourceType: "academic",
      Source: "🎓 Semantic Scholar",
      Title: p.title ?? "",
      Authors: (p.authors ?? [])
        .slice(0, 3)
        .map((a: any) => a.name)
        .join(", "),
      Year: String(p.year ?? ""),
      Citations: String(p.citationCount ?? 0),
      Abstract: p.abstract?.slice(0, 300) ?? "",
      Venue: p.publicationVenue?.name ?? "",
      Fields: (p.fieldsOfStudy ?? []).join(", "),
      DOI: p.externalIds?.DOI ?? "",
      URL: p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : "",
    }))
    .filter((r: any) => r.Title);
}

async function fetchFromArXiv(url: string, intent: string) {
  const q = encodeURIComponent(
    intent.replace(/(research|papers|show|find|get)/gi, "").trim(),
  );
  const apiUrl = `https://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=8&sortBy=relevance`;
  const res = await fetch(apiUrl);
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
        .slice(0, 3)
        .map((m) => m[1])
        .join(", ");
      const arxivId = get("id").split("/abs/")[1] ?? "";
      return {
        _sourceName: "arXiv",
        _sourceType: "academic",
        Source: "📄 arXiv",
        Title: get("title").replace(/\s+/g, " "),
        Authors: authors,
        Abstract: get("summary").slice(0, 300) + "…",
        Published: get("published").slice(0, 10),
        Categories:
          e
            .match(/term="([^"]+)"/g)
            ?.slice(0, 2)
            .map((t) => t.replace(/term="/, "").replace(/"/, ""))
            .join(", ") ?? "",
        URL: `https://arxiv.org/abs/${arxivId}`,
      };
    })
    .filter((r) => r.Title);
}

async function fetchFromPubMed(url: string, intent: string) {
  const q = encodeURIComponent(
    intent
      .replace(/(research|papers|show|find|get|medical|health)/gi, "")
      .trim(),
  );
  const searchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${q}&retmax=8&retmode=json&sort=relevance`,
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
          .slice(0, 3)
          .map((a: any) => a.name)
          .join(", "),
        Journal: p.source ?? "",
        Year: p.pubdate?.split(" ")[0] ?? "",
        Citations: "NCBI",
        Abstract: "",
        URL: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      };
    })
    .filter((r) => r.Title);
}

async function fetchFromHackerNews(url: string, intent: string) {
  const q = encodeURIComponent(
    intent.replace(/(show|get|hacker news|hn|tech news)/gi, "").trim() ||
      intent,
  );
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=20`,
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
    }))
    .filter((r: any) => r.Title);
}

async function fetchFromReddit(url: string, intent: string) {
  const q = encodeURIComponent(intent);
  const res = await fetch(
    `https://www.reddit.com/search.json?q=${q}&sort=top&limit=15&t=month`,
    {
      headers: { "User-Agent": "FlowScrape/1.0" },
    },
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
      Subreddit: `r/${p.subreddit}`,
      Date: new Date((p.created_utc || 0) * 1000).toISOString().split("T")[0],
      Sentiment: sentiment(p.title + " " + (p.selftext ?? "")),
      URL: `https://reddit.com${p.permalink}`,
    }))
    .filter((r: any) => r.Title);
}

async function fetchFromWikipedia(url: string, intent: string) {
  const q = intent.replace(/(show|get|find|about|what is)/gi, "").trim();
  const [sumRes, searchRes] = await Promise.all([
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/ /g, "_"))}`,
    ),
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*`,
    ),
  ]);
  const [sumData, searchData] = await Promise.all([
    sumRes.json(),
    searchRes.json(),
  ]);
  const records = [];
  if (sumData?.extract && sumData.type === "standard") {
    records.push({
      _sourceName: "Wikipedia",
      _sourceType: "general",
      Source: "📖 Wikipedia",
      Title: sumData.title,
      Abstract: sumData.extract?.slice(0, 400),
      URL: sumData.content_urls?.desktop?.page ?? "",
      Date: "Current",
      _imageUrl: sumData.thumbnail?.source ?? "",
    });
  }
  const searchResults = searchData?.query?.search ?? [];
  records.push(
    ...searchResults.slice(0, 4).map((r: any) => ({
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
}

async function fetchFromFirecrawl(
  url: string,
  intent: string,
  sourceName: string,
) {
  if (!FIRECRAWL_KEY) return [];
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
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.success || !data.data?.markdown) return [];

  const markdown = data.data.markdown;

  // Use Groq to extract structured records from the markdown
  const structRes = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Extract ALL relevant items from this page. User intent: "${intent}". Source: ${sourceName}

Page content (markdown):
${markdown.slice(0, 7000)}

Return ONLY a raw JSON array. No markdown. Start with [ end with ]:
For products: [{"_sourceName":"${sourceName}","_sourceType":"product","Name":"...","Price":"₹X,XXX","OriginalPrice":"₹X,XXX","Discount":"X% off","Rating":"X/5","Reviews":"X,XXX","Brand":"...","Specs":"...","Availability":"In Stock"}]
For news/articles: [{"_sourceName":"${sourceName}","_sourceType":"news","Title":"...","Description":"...","Author":"...","Date":"...","URL":"..."}]
For research: [{"_sourceName":"${sourceName}","_sourceType":"academic","Title":"...","Authors":"...","Abstract":"...","Year":"..."}]
For general data: [{"_sourceName":"${sourceName}","_sourceType":"general","Title":"...","Content":"...","Value":"...","URL":"..."}]
Extract up to 15 real items only.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    },
  );
  const sData = await structRes.json();
  const sRaw = (sData.choices?.[0]?.message?.content ?? "").trim();
  let records: any[] = [];
  try {
    const m = sRaw.match(/\[[\s\S]*\]/);
    if (m) records = JSON.parse(m[0]);
  } catch {}

  // Extract images from markdown
  const imgs = (markdown.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g) ?? [])
    .map((m: string) => m.match(/\((https?:\/\/[^)]+)\)/)?.[1] ?? "")
    .filter(Boolean)
    .slice(0, 8);

  return records
    .filter((r: any) => r.Name || r.Title || r.Content)
    .map((r: any) => ({ ...r, _imageUrl: imgs[0] ?? "" }));
}

// ── Route each selected site to correct handler ─────────────────────
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
  try {
    // Finance APIs
    if (
      domain.includes("alphavantage") ||
      domain.includes("finance.yahoo") ||
      domain.includes("moneycontrol") ||
      domain.includes("nseindia") ||
      domain.includes("bseindia") ||
      domain.includes("investing.com")
    ) {
      if (
        domain.includes("alphavantage") ||
        domain.includes("yahoo") ||
        domain.includes("moneycontrol") ||
        domain.includes("nseindia") ||
        domain.includes("bseindia")
      ) {
        return await fetchFromAlphaVantage(site.url, intent);
      }
    }
    // News APIs
    if (
      domain.includes("newsapi") ||
      domain.includes("reuters") ||
      domain.includes("bbc") ||
      domain.includes("guardian") ||
      domain.includes("ndtv") ||
      domain.includes("timesofindia") ||
      domain.includes("thehindu") ||
      domain.includes("economictimes") ||
      domain.includes("bloomberg") ||
      domain.includes("cnn") ||
      domain.includes("aljazeera") ||
      domain.includes("apnews")
    ) {
      return await fetchFromNewsAPI(site.url, intent);
    }
    // NASA
    if (
      domain.includes("nasa") ||
      domain.includes("jpl") ||
      domain.includes("spacenews") ||
      domain.includes("space.com") ||
      domain.includes("astronomy") ||
      domain.includes("esa")
    ) {
      return await fetchFromNASA(site.url, intent);
    }
    // Academic — Semantic Scholar
    if (
      domain.includes("semanticscholar") ||
      domain.includes("scholar.google")
    ) {
      return await fetchFromSemanticScholar(site.url, intent);
    }
    // arXiv
    if (domain.includes("arxiv")) {
      return await fetchFromArXiv(site.url, intent);
    }
    // PubMed / NCBI
    if (
      domain.includes("pubmed") ||
      domain.includes("ncbi") ||
      domain.includes("nih.gov") ||
      domain.includes("medRxiv") ||
      domain.includes("biorxiv")
    ) {
      return await fetchFromPubMed(site.url, intent);
    }
    // Hacker News
    if (domain.includes("ycombinator") || domain.includes("news.ycomb")) {
      return await fetchFromHackerNews(site.url, intent);
    }
    // Reddit
    if (domain.includes("reddit")) {
      return await fetchFromReddit(site.url, intent);
    }
    // Wikipedia
    if (domain.includes("wikipedia")) {
      return await fetchFromWikipedia(site.url, intent);
    }
    // E-commerce / all other — Firecrawl
    return await fetchFromFirecrawl(site.url, intent, site.name);
  } catch (err) {
    console.error(`Failed fetching ${site.name}:`, err);
    return [];
  }
}

// ── POST handler ────────────────────────────────────────────────────
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

    // Fetch all selected sites in parallel
    const results = await Promise.allSettled(
      selectedSites.map((site: any) => fetchFromSite(site, intent)),
    );

    const allRecords: any[] = [];
    const allImages: string[] = [];
    const sourceNames: string[] = [];

    results.forEach((result, i) => {
      const site = selectedSites[i];
      if (result.status === "fulfilled" && result.value?.length) {
        allRecords.push(...result.value);
        result.value.forEach((r: any) => {
          if (r._imageUrl) allImages.push(r._imageUrl);
        });
        sourceNames.push(site.name);
      }
    });

    if (!allRecords.length) {
      return NextResponse.json({
        error: "no_data",
        message:
          "Could not fetch data from selected sources. Try different sites or rephrase your query.",
        suggestions: [
          "Show Apple stock analysis",
          "CRISPR gene editing research",
          "Laptops on Flipkart",
          "NASA space news",
          "Hacker News top stories",
        ],
      });
    }

    // Clean records — remove internal _fields from display but keep for enriched
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
            clean[k] = String(v).slice(0, 400);
          }
        }
        return clean;
      })
      .filter((r) => Object.keys(r).length > 1);

    // Build enriched for AIXPLORE
    const financeRecords = allRecords.filter(
      (r) => r._sourceType === "finance",
    );
    const academicRecords = allRecords.filter(
      (r) => r._sourceType === "academic",
    );
    const newsRecords = allRecords.filter((r) => r._sourceType === "news");
    const productRecords = allRecords.filter(
      (r) => r._sourceType === "product",
    );
    const socialRecords = allRecords.filter((r) => r._sourceType === "social");

    const bullishNews = newsRecords.filter((r) =>
      String(r.Sentiment || "").includes("Positive"),
    ).length;
    const bearishNews = newsRecords.filter((r) =>
      String(r.Sentiment || "").includes("Negative"),
    ).length;

    // Determine siteType for AIXPLORE
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
                  : "general_news";

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
        images: [...new Set(allImages)].filter(Boolean).slice(0, 15),
        rawText: allRecords
          .slice(0, 10)
          .map(
            (r) =>
              `[${r._sourceName}] ${r.Title || r.Name || ""}: ${r.Abstract || r.Description || r.Summary || ""}`,
          )
          .join("\n\n")
          .slice(0, 6000),
      },
      meta: {
        totalRecords: cleanRecords.length,
        scrapedAt: new Date().toISOString(),
        sourceUrl: sourceNames.join(", "),
        dataSize: `~${Math.max(1, Math.round(JSON.stringify(cleanRecords).length / 1024))} KB`,
        sourcesUsed: sourceNames,
      },
      enriched: {
        sourceResults: sourceNames.map((name, i) => ({
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
        financeData: financeRecords.length > 0 ? financeRecords[0] : null,
        academicPapers: academicRecords,
        newsArticles: newsRecords,
        products: productRecords,
        socialPosts: socialRecords,
        query: intent,
      },
    });
  } catch (err: any) {
    console.error("Scrape error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
