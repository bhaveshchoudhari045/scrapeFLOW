import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY!;
const NEWS_API_KEY = process.env.NEWS_API_KEY!;
const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";

// ── Stock Universe ─────────────────────────────────────────────────────────
const STOCK_UNIVERSE: Record<
  string,
  { symbol: string; name: string; market: string; country: string }
> = {
  // Indian Stocks
  reliance: {
    symbol: "RELIANCE.BSE",
    name: "Reliance Industries",
    market: "BSE",
    country: "India",
  },
  tcs: {
    symbol: "TCS.BSE",
    name: "Tata Consultancy Services",
    market: "BSE",
    country: "India",
  },
  tata: {
    symbol: "TCS.BSE",
    name: "Tata Consultancy Services",
    market: "BSE",
    country: "India",
  },
  infosys: {
    symbol: "INFY",
    name: "Infosys Ltd.",
    market: "NYSE",
    country: "India",
  },
  hdfc: {
    symbol: "HDB",
    name: "HDFC Bank Ltd.",
    market: "NYSE",
    country: "India",
  },
  adani: {
    symbol: "ADANIENT.BSE",
    name: "Adani Enterprises",
    market: "BSE",
    country: "India",
  },
  wipro: {
    symbol: "WIT",
    name: "Wipro Ltd.",
    market: "NYSE",
    country: "India",
  },
  icici: {
    symbol: "IBN",
    name: "ICICI Bank Ltd.",
    market: "NYSE",
    country: "India",
  },
  bajaj: {
    symbol: "BAJFINANCE.BSE",
    name: "Bajaj Finance",
    market: "BSE",
    country: "India",
  },
  vodafone: {
    symbol: "IDEA.BSE",
    name: "Vodafone Idea Ltd.",
    market: "BSE",
    country: "India",
  },
  idea: {
    symbol: "IDEA.BSE",
    name: "Vodafone Idea Ltd.",
    market: "BSE",
    country: "India",
  },
  // US Tech
  apple: {
    symbol: "AAPL",
    name: "Apple Inc.",
    market: "NASDAQ",
    country: "USA",
  },
  nvidia: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    market: "NASDAQ",
    country: "USA",
  },
  microsoft: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    market: "NASDAQ",
    country: "USA",
  },
  google: {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    market: "NASDAQ",
    country: "USA",
  },
  amazon: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    market: "NASDAQ",
    country: "USA",
  },
  tesla: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    market: "NASDAQ",
    country: "USA",
  },
  meta: {
    symbol: "META",
    name: "Meta Platforms Inc.",
    market: "NASDAQ",
    country: "USA",
  },
  // Commodities via Alpha Vantage
  gold: {
    symbol: "GLD",
    name: "SPDR Gold Shares ETF",
    market: "NYSE",
    country: "Global",
  },
  silver: {
    symbol: "SLV",
    name: "iShares Silver Trust",
    market: "NYSE",
    country: "Global",
  },
  oil: {
    symbol: "USO",
    name: "US Oil Fund ETF",
    market: "NYSE",
    country: "Global",
  },
  crude: {
    symbol: "USO",
    name: "US Oil Fund ETF",
    market: "NYSE",
    country: "Global",
  },
};

// Default watchlist for landing view
const DEFAULT_WATCHLIST = [
  { symbol: "RELIANCE.BSE", name: "Reliance Industries", flag: "🇮🇳" },
  { symbol: "TCS.BSE", name: "TCS", flag: "🇮🇳" },
  { symbol: "INFY", name: "Infosys", flag: "🇮🇳" },
  { symbol: "HDB", name: "HDFC Bank", flag: "🇮🇳" },
  { symbol: "GLD", name: "Gold ETF", flag: "🥇" },
  { symbol: "USO", name: "Crude Oil ETF", flag: "🛢️" },
  { symbol: "AAPL", name: "Apple", flag: "🇺🇸" },
  { symbol: "NVDA", name: "NVIDIA", flag: "🇺🇸" },
];

// ── Intent Detection ───────────────────────────────────────────────────────
function detectIntent(input: string): {
  type: "finance" | "nasa" | "hackernews";
  stockKey?: string;
  multiStock?: boolean;
  searchQuery?: string;
} {
  const lower = input.toLowerCase();

  if (
    lower.includes("nasa") ||
    lower.includes("space") ||
    lower.includes("asteroid") ||
    lower.includes("mars") ||
    lower.includes("rocket") ||
    lower.includes("science") ||
    lower.includes("planet") ||
    lower.includes("galaxy") ||
    lower.includes("telescope") ||
    lower.includes("earth event") ||
    lower.includes("wildfire") ||
    lower.includes("volcano")
  )
    return { type: "nasa" };

  if (
    lower.includes("hacker") ||
    lower.includes("tech news") ||
    lower.includes("hacker news") ||
    lower.includes("hn")
  )
    return { type: "hackernews" };

  if (
    lower.includes("stock") ||
    lower.includes("finance") ||
    lower.includes("market") ||
    lower.includes("price") ||
    lower.includes("share") ||
    lower.includes("invest") ||
    lower.includes("trading") ||
    lower.includes("nifty") ||
    lower.includes("sensex") ||
    lower.includes("gold") ||
    lower.includes("oil") ||
    lower.includes("crude") ||
    lower.includes("commodity")
  ) {
    for (const [key] of Object.entries(STOCK_UNIVERSE)) {
      if (lower.includes(key)) {
        return { type: "finance", stockKey: key, searchQuery: key };
      }
    }
    return { type: "finance", multiStock: true };
  }

  // Try to match any word as a stock name
  for (const [key] of Object.entries(STOCK_UNIVERSE)) {
    if (lower.includes(key)) {
      return { type: "finance", stockKey: key, searchQuery: key };
    }
  }

  return { type: "hackernews" };
}

// ── Alpha Vantage: Deep single stock ──────────────────────────────────────
async function fetchDeepStockData(symbol: string) {
  const base = "https://www.alphavantage.co/query";

  const [quoteRes, dailyRes, overviewRes, incomeRes] = await Promise.all([
    fetch(
      `${base}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`,
    ),
    fetch(
      `${base}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`,
    ),
    fetch(
      `${base}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`,
    ),
    fetch(
      `${base}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`,
    ),
  ]);

  const [quoteData, dailyData, overview, incomeData] = await Promise.all([
    quoteRes.json(),
    dailyRes.json(),
    overviewRes.json(),
    incomeRes.json(),
  ]);

  const quote = quoteData["Global Quote"] || {};
  const timeSeries = dailyData["Time Series (Daily)"] || {};
  const annualReports = incomeData?.annualReports || [];

  // Build OHLCV array (last 60 days)
  const ohlcv = Object.entries(timeSeries)
    .slice(0, 60)
    .map(([date, v]: [string, any]) => ({
      date,
      open: parseFloat(v["1. open"]),
      high: parseFloat(v["2. high"]),
      low: parseFloat(v["3. low"]),
      close: parseFloat(v["4. close"]),
      volume: parseInt(v["5. volume"]),
    }));

  const closes = ohlcv.map((d) => d.close).reverse();

  // Technical Indicators
  const rsi14 = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const bollinger = calculateBollinger(closes);
  const ma20 = avg(closes.slice(-20));
  const ma50 = avg(closes.slice(-50));
  const ma200 = avg(closes.slice(-200));
  const atr = calculateATR(ohlcv.slice(0, 14));
  const momentum =
    closes.length >= 10
      ? ((closes[closes.length - 1] - closes[closes.length - 10]) /
          closes[closes.length - 10]) *
        100
      : 0;

  // Volume analysis
  const avgVolume = avg(ohlcv.slice(0, 20).map((d) => d.volume));
  const currentVolume = ohlcv[0]?.volume || 0;
  const volumeSignal =
    currentVolume > avgVolume * 1.5
      ? "High volume ⚠️"
      : currentVolume < avgVolume * 0.5
        ? "Low volume"
        : "Normal volume";

  // Income statement
  const latestIncome = annualReports[0] || {};
  const prevIncome = annualReports[1] || {};
  const revenueGrowth =
    latestIncome.totalRevenue && prevIncome.totalRevenue
      ? (
          ((parseInt(latestIncome.totalRevenue) -
            parseInt(prevIncome.totalRevenue)) /
            parseInt(prevIncome.totalRevenue)) *
          100
        ).toFixed(2) + "%"
      : overview.RevenueGrowthYOY || "N/A";

  return {
    symbol,
    quote: {
      price: parseFloat(quote["05. price"] || "0"),
      open: parseFloat(quote["02. open"] || "0"),
      high: parseFloat(quote["03. high"] || "0"),
      low: parseFloat(quote["04. low"] || "0"),
      previousClose: parseFloat(quote["08. previous close"] || "0"),
      change: parseFloat(quote["09. change"] || "0"),
      changePercent: quote["10. change percent"] || "0%",
      volume: parseInt(quote["06. volume"] || "0"),
      latestTradingDay: quote["07. latest trading day"] || "",
    },
    fundamentals: {
      companyName: overview.Name || "",
      description: overview.Description || "",
      sector: overview.Sector || "",
      industry: overview.Industry || "",
      exchange: overview.Exchange || "",
      currency: overview.Currency || "",
      country: overview.Country || "",
      employees: overview.FullTimeEmployees || "",
      founded: overview.FiscalYearEnd || "",
      marketCap: formatLargeNumber(overview.MarketCapitalization),
      peRatio: overview.PERatio || "N/A",
      pegRatio: overview.PEGRatio || "N/A",
      pbRatio: overview.PriceToBookRatio || "N/A",
      eps: overview.EPS || "N/A",
      dividendYield: overview.DividendYield
        ? (parseFloat(overview.DividendYield) * 100).toFixed(2) + "%"
        : "N/A",
      roe: overview.ReturnOnEquityTTM
        ? (parseFloat(overview.ReturnOnEquityTTM) * 100).toFixed(2) + "%"
        : "N/A",
      roa: overview.ReturnOnAssetsTTM
        ? (parseFloat(overview.ReturnOnAssetsTTM) * 100).toFixed(2) + "%"
        : "N/A",
      debtToEquity: overview.DebtToEquityRatio || "N/A",
      currentRatio: overview.CurrentRatio || "N/A",
      profitMargin: overview.ProfitMargin
        ? (parseFloat(overview.ProfitMargin) * 100).toFixed(2) + "%"
        : "N/A",
      grossMargin: overview.GrossProfitTTM || "N/A",
      revenueGrowth,
      week52High: overview["52WeekHigh"] || "",
      week52Low: overview["52WeekLow"] || "",
      analystTarget: overview.AnalystTargetPrice || "N/A",
      beta: overview.Beta || "N/A",
      sharesOutstanding: formatLargeNumber(overview.SharesOutstanding),
      freeCashFlow: formatLargeNumber(overview.FreeCashflow),
    },
    technicals: {
      rsi14,
      rsiSignal: getRSISignal(rsi14),
      macd,
      bollinger,
      ma20: parseFloat(ma20.toFixed(2)),
      ma50: parseFloat(ma50.toFixed(2)),
      ma200: parseFloat(ma200.toFixed(2)),
      atr: parseFloat(atr.toFixed(2)),
      momentum: parseFloat(momentum.toFixed(2)),
      volumeSignal,
      avgVolume: Math.round(avgVolume).toLocaleString(),
      trend:
        ma50 > ma200 ? "📈 Bullish (Golden Cross)" : "📉 Bearish (Death Cross)",
      priceVsMa50:
        closes[closes.length - 1] > ma50 ? "Above MA50 ✅" : "Below MA50 ⚠️",
      priceVsMa200:
        closes[closes.length - 1] > ma200 ? "Above MA200 ✅" : "Below MA200 ⚠️",
      overallSignal: getOverallSignal(
        rsi14,
        macd,
        closes[closes.length - 1],
        ma50,
        ma200,
      ),
    },
    ohlcv: ohlcv.slice(0, 30),
  };
}

// ── Watchlist fetcher ──────────────────────────────────────────────────────
async function fetchWatchlist() {
  const base = "https://www.alphavantage.co/query";
  const results = [];

  for (const stock of DEFAULT_WATCHLIST.slice(0, 6)) {
    try {
      const res = await fetch(
        `${base}?function=GLOBAL_QUOTE&symbol=${stock.symbol}&apikey=${ALPHA_VANTAGE_KEY}`,
      );
      const data = await res.json();
      const q = data["Global Quote"] || {};
      if (!q["05. price"]) continue;

      const price = parseFloat(q["05. price"]);
      const prevClose = parseFloat(q["08. previous close"]);
      const change = parseFloat(q["09. change"]);
      const changePct = q["10. change percent"]?.replace("%", "").trim();

      results.push({
        flag: stock.flag,
        symbol: stock.symbol.replace(".BSE", ""),
        name: stock.name,
        price: price.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePct,
        direction: change >= 0 ? "▲" : "▼",
        sentiment: change >= 0 ? "positive" : "negative",
        volume: parseInt(q["06. volume"] || "0").toLocaleString(),
        high: parseFloat(q["03. high"]).toFixed(2),
        low: parseFloat(q["04. low"]).toFixed(2),
        date: q["07. latest trading day"],
      });
      await new Promise((r) => setTimeout(r, 400)); // rate limit
    } catch {
      continue;
    }
  }
  return results;
}

// ── NewsAPI: Stock news + sentiment ───────────────────────────────────────
async function fetchStockNews(query: string, companyName: string) {
  const searchQuery = encodeURIComponent(`${companyName} stock`);
  const url = `https://newsapi.org/v2/everything?q=${searchQuery}&sortBy=publishedAt&language=en&pageSize=15&apiKey=${NEWS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "ok") return [];

    return (data.articles || []).map((a: any) => {
      const sentiment = analyzeSentiment(a.title + " " + (a.description || ""));
      return {
        title: a.title || "",
        source: a.source?.name || "",
        url: a.url || "",
        publishedAt: a.publishedAt?.split("T")[0] || "",
        description: a.description?.slice(0, 200) || "",
        sentiment: sentiment.label,
        sentimentScore: sentiment.score,
        author: a.author || "",
      };
    });
  } catch {
    return [];
  }
}

// ── Simple keyword-based sentiment ────────────────────────────────────────
function analyzeSentiment(text: string): { label: string; score: number } {
  const lower = text.toLowerCase();
  const bullish = [
    "surge",
    "soar",
    "rally",
    "jump",
    "gain",
    "rise",
    "profit",
    "beat",
    "exceed",
    "strong",
    "growth",
    "bullish",
    "upgrade",
    "buy",
    "positive",
    "record",
    "high",
    "outperform",
    "boost",
    "expand",
  ];
  const bearish = [
    "fall",
    "drop",
    "crash",
    "loss",
    "decline",
    "plunge",
    "weak",
    "miss",
    "below",
    "bearish",
    "downgrade",
    "sell",
    "negative",
    "low",
    "cut",
    "risk",
    "concern",
    "warning",
    "debt",
    "lawsuit",
  ];

  let score = 0;
  bullish.forEach((w) => {
    if (lower.includes(w)) score += 1;
  });
  bearish.forEach((w) => {
    if (lower.includes(w)) score -= 1;
  });

  if (score > 1) return { label: "🟢 Bullish", score };
  if (score < -1) return { label: "🔴 Bearish", score };
  return { label: "🟡 Neutral", score };
}

// ── NASA APIs ──────────────────────────────────────────────────────────────
async function fetchNASAData(intent: string) {
  const lower = intent.toLowerCase();
  const imageQuery = lower.includes("mars")
    ? "mars"
    : lower.includes("asteroid")
      ? "asteroid"
      : "space nebula";

  const [apodRes, neoRes, eonetRes, imageRes] = await Promise.all([
    fetch(
      `https://api.nasa.gov/planetary/apod?count=5&api_key=${NASA_API_KEY}`,
    ),
    fetch(
      `https://api.nasa.gov/neo/rest/v1/feed?start_date=${getTodayStr()}&end_date=${getTodayStr()}&api_key=${NASA_API_KEY}`,
    ),
    fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?limit=10&status=open`),
    fetch(
      `https://images-api.nasa.gov/search?q=${encodeURIComponent(imageQuery)}&media_type=image&year_start=2023&page_size=6`,
    ),
  ]);

  const [apodData, neoData, eonetData, imageData] = await Promise.all([
    apodRes.json(),
    neoRes.json(),
    eonetRes.json(),
    imageRes.json(),
  ]);

  const articles = Array.isArray(apodData)
    ? apodData.map((item: any) => ({
        title: item.title || "",
        date: item.date || "",
        explanation: item.explanation?.slice(0, 500) + "..." || "",
        mediaType: item.media_type || "",
        url: item.url || "",
        hdUrl: item.hdurl || "",
        copyright: item.copyright || "NASA",
      }))
    : [];

  const neoRaw = neoData?.near_earth_objects || {};
  const asteroids = Object.values(neoRaw)
    .flat()
    .slice(0, 8)
    .map((neo: any) => ({
      name: neo.name || "",
      hazardous: neo.is_potentially_hazardous_asteroid
        ? "⚠️ HAZARDOUS"
        : "✅ Safe",
      diameter_min_km:
        neo.estimated_diameter?.kilometers?.estimated_diameter_min?.toFixed(
          3,
        ) || "",
      diameter_max_km:
        neo.estimated_diameter?.kilometers?.estimated_diameter_max?.toFixed(
          3,
        ) || "",
      closest_approach: neo.close_approach_data?.[0]?.close_approach_date || "",
      miss_distance_km: parseFloat(
        neo.close_approach_data?.[0]?.miss_distance?.kilometers || "0",
      ).toLocaleString(),
      velocity_kmh:
        parseFloat(
          neo.close_approach_data?.[0]?.relative_velocity
            ?.kilometers_per_hour || "0",
        ).toFixed(0) + " km/h",
      orbiting_body: neo.close_approach_data?.[0]?.orbiting_body || "",
    }));

  const events = (eonetData?.events || []).slice(0, 8).map((e: any) => ({
    title: e.title || "",
    category: e.categories?.[0]?.title || "",
    status: e.status || "",
    date: e.geometry?.[0]?.date?.split("T")[0] || "",
    latitude: e.geometry?.[0]?.coordinates?.[1] || "",
    longitude: e.geometry?.[0]?.coordinates?.[0] || "",
  }));

  const nasaImages = (imageData?.collection?.items || [])
    .slice(0, 6)
    .map((item: any) => ({
      title: item.data?.[0]?.title || "",
      description: item.data?.[0]?.description?.slice(0, 200) || "",
      date: item.data?.[0]?.date_created?.split("T")[0] || "",
      nasa_id: item.data?.[0]?.nasa_id || "",
      image_url: item.links?.[0]?.href || "",
      center: item.data?.[0]?.center || "",
    }));

  return { articles, asteroids, events, nasaImages };
}

// ── HackerNews official API ────────────────────────────────────────────────
async function fetchHackerNews() {
  const topRes = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json",
  );
  const topIds: number[] = await topRes.json();
  const stories = await Promise.all(
    topIds.slice(0, 25).map((id) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        .then((r) => r.json())
        .catch(() => null),
    ),
  );
  return stories
    .filter(Boolean)
    .filter((s) => s.title && s.score)
    .map((s) => ({
      title: s.title || "",
      url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
      score: s.score || 0,
      author: s.by || "",
      comments: s.descendants || 0,
      time: new Date(s.time * 1000).toISOString(),
      domain: s.url
        ? (() => {
            try {
              return new URL(s.url).hostname.replace("www.", "");
            } catch {
              return "ycombinator.com";
            }
          })()
        : "ycombinator.com",
    }));
}

// ── Technical Indicators ──────────────────────────────────────────────────
function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0,
    losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return parseFloat((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
}

function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++)
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  return ema;
}

function calculateMACD(closes: number[]) {
  if (closes.length < 26)
    return { macd: 0, signal: 0, histogram: 0, trend: "Insufficient data" };
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = calculateEMA(macdLine.slice(-9), 9);
  const macd = parseFloat(macdLine[macdLine.length - 1].toFixed(4));
  const sig = parseFloat(signal[signal.length - 1].toFixed(4));
  return {
    macd,
    signal: sig,
    histogram: parseFloat((macd - sig).toFixed(4)),
    trend: macd > sig ? "📈 Bullish crossover" : "📉 Bearish crossover",
  };
}

function calculateBollinger(closes: number[], period = 20) {
  if (closes.length < period)
    return { upper: 0, middle: 0, lower: 0, bandwidth: 0 };
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(
    slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period,
  );
  const upper = parseFloat((mean + 2 * stdDev).toFixed(2));
  const lower = parseFloat((mean - 2 * stdDev).toFixed(2));
  return {
    upper,
    middle: parseFloat(mean.toFixed(2)),
    lower,
    bandwidth: parseFloat((((upper - lower) / mean) * 100).toFixed(2)),
  };
}

function calculateATR(
  ohlcv: { high: number; low: number; close: number }[],
): number {
  if (ohlcv.length < 2) return 0;
  const trs = ohlcv
    .slice(0, -1)
    .map((d, i) =>
      Math.max(
        d.high - d.low,
        Math.abs(d.high - ohlcv[i + 1].close),
        Math.abs(d.low - ohlcv[i + 1].close),
      ),
    );
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

function getOverallSignal(
  rsi: number,
  macd: any,
  price: number,
  ma50: number,
  ma200: number,
): string {
  let bullPoints = 0,
    bearPoints = 0;
  if (rsi < 70 && rsi > 40) bullPoints++;
  if (rsi >= 70) bearPoints++;
  if (rsi <= 30) bullPoints += 2;
  if (macd.histogram > 0) bullPoints++;
  else bearPoints++;
  if (price > ma50) bullPoints++;
  else bearPoints++;
  if (price > ma200) bullPoints++;
  else bearPoints++;
  if (ma50 > ma200) bullPoints++;
  else bearPoints++;

  const total = bullPoints + bearPoints;
  const pct = Math.round((bullPoints / total) * 100);
  if (pct >= 70) return `🟢 Strong Buy (${pct}% bullish signals)`;
  if (pct >= 55) return `🟩 Buy (${pct}% bullish signals)`;
  if (pct >= 45) return `🟡 Hold (${pct}% bullish signals)`;
  if (pct >= 30) return `🟥 Sell (${pct}% bullish signals)`;
  return `🔴 Strong Sell (${pct}% bullish signals)`;
}

function getRSISignal(rsi: number): string {
  if (rsi >= 80) return "Extremely Overbought 🔴";
  if (rsi >= 70) return "Overbought ⚠️";
  if (rsi <= 20) return "Extremely Oversold 🟢";
  if (rsi <= 30) return "Oversold — Potential Buy 📈";
  if (rsi >= 55) return "Bullish Momentum 📈";
  if (rsi <= 45) return "Bearish Pressure 📉";
  return "Neutral ➡️";
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatLargeNumber(n: string): string {
  const num = parseFloat(n);
  if (!num || isNaN(num)) return n || "N/A";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Main POST ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { intent } = await req.json();
    if (!intent?.trim())
      return NextResponse.json({ error: "Intent required" }, { status: 400 });

    const detected = detectIntent(intent);

    // ── FINANCE DEEP ──────────────────────────────────────────────
    if (detected.type === "finance" && detected.stockKey) {
      const stockInfo = STOCK_UNIVERSE[detected.stockKey];
      const [stockData, newsArticles] = await Promise.all([
        fetchDeepStockData(stockInfo.symbol),
        fetchStockNews(stockInfo.symbol, stockInfo.name),
      ]);

      // News sentiment summary
      const bullishCount = newsArticles.filter((n: any) =>
        n.sentiment.includes("Bullish"),
      ).length;
      const bearishCount = newsArticles.filter((n: any) =>
        n.sentiment.includes("Bearish"),
      ).length;
      const neutralCount = newsArticles.length - bullishCount - bearishCount;
      const overallNewsSentiment =
        bullishCount > bearishCount
          ? "🟢 Bullish"
          : bearishCount > bullishCount
            ? "🔴 Bearish"
            : "🟡 Mixed";

      const records = [
        // ── Price Panel
        {
          Category: "💰 Price",
          Metric: "Current Price",
          Value: `${stockData.quote.price} ${stockData.fundamentals.currency}`,
        },
        {
          Category: "💰 Price",
          Metric: "Day Open",
          Value: `${stockData.quote.open}`,
        },
        {
          Category: "💰 Price",
          Metric: "Day High",
          Value: `${stockData.quote.high}`,
        },
        {
          Category: "💰 Price",
          Metric: "Day Low",
          Value: `${stockData.quote.low}`,
        },
        {
          Category: "💰 Price",
          Metric: "Previous Close",
          Value: `${stockData.quote.previousClose}`,
        },
        {
          Category: "💰 Price",
          Metric: "Change",
          Value: `${stockData.quote.change} (${stockData.quote.changePercent})`,
        },
        {
          Category: "💰 Price",
          Metric: "Volume",
          Value: stockData.quote.volume.toLocaleString(),
        },
        {
          Category: "💰 Price",
          Metric: "Avg Volume (20d)",
          Value: stockData.technicals.avgVolume,
        },
        {
          Category: "💰 Price",
          Metric: "Volume Signal",
          Value: stockData.technicals.volumeSignal,
        },
        {
          Category: "💰 Price",
          Metric: "Latest Trading Day",
          Value: stockData.quote.latestTradingDay,
        },
        // ── Company
        {
          Category: "🏢 Company",
          Metric: "Name",
          Value: stockData.fundamentals.companyName,
        },
        {
          Category: "🏢 Company",
          Metric: "Sector",
          Value: stockData.fundamentals.sector,
        },
        {
          Category: "🏢 Company",
          Metric: "Industry",
          Value: stockData.fundamentals.industry,
        },
        {
          Category: "🏢 Company",
          Metric: "Exchange",
          Value: stockData.fundamentals.exchange,
        },
        {
          Category: "🏢 Company",
          Metric: "Country",
          Value: stockData.fundamentals.country,
        },
        {
          Category: "🏢 Company",
          Metric: "Employees",
          Value: parseInt(
            stockData.fundamentals.employees || "0",
          ).toLocaleString(),
        },
        // ── Fundamentals
        {
          Category: "📊 Fundamentals",
          Metric: "Market Cap",
          Value: stockData.fundamentals.marketCap,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "P/E Ratio",
          Value: stockData.fundamentals.peRatio,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "PEG Ratio",
          Value: stockData.fundamentals.pegRatio,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "P/B Ratio",
          Value: stockData.fundamentals.pbRatio,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "EPS",
          Value: stockData.fundamentals.eps,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Dividend Yield",
          Value: stockData.fundamentals.dividendYield,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "ROE",
          Value: stockData.fundamentals.roe,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "ROA",
          Value: stockData.fundamentals.roa,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Debt/Equity",
          Value: stockData.fundamentals.debtToEquity,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Current Ratio",
          Value: stockData.fundamentals.currentRatio,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Profit Margin",
          Value: stockData.fundamentals.profitMargin,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Revenue Growth (YOY)",
          Value: stockData.fundamentals.revenueGrowth,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Free Cash Flow",
          Value: stockData.fundamentals.freeCashFlow,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Shares Outstanding",
          Value: stockData.fundamentals.sharesOutstanding,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Beta",
          Value: stockData.fundamentals.beta,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "52W High",
          Value: stockData.fundamentals.week52High,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "52W Low",
          Value: stockData.fundamentals.week52Low,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "Analyst Target Price",
          Value: stockData.fundamentals.analystTarget,
        },
        // ── Technicals
        {
          Category: "📈 Technicals",
          Metric: "Overall Signal",
          Value: stockData.technicals.overallSignal,
        },
        {
          Category: "📈 Technicals",
          Metric: "Trend (MA50 vs MA200)",
          Value: stockData.technicals.trend,
        },
        {
          Category: "📈 Technicals",
          Metric: "RSI (14)",
          Value: `${stockData.technicals.rsi14} — ${stockData.technicals.rsiSignal}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "MACD",
          Value: `${stockData.technicals.macd.macd} — ${stockData.technicals.macd.trend}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "MACD Signal",
          Value: `${stockData.technicals.macd.signal}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "MACD Histogram",
          Value: `${stockData.technicals.macd.histogram}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "MA 20",
          Value: `${stockData.technicals.ma20}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "MA 50",
          Value: `${stockData.technicals.ma50}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "MA 200",
          Value: `${stockData.technicals.ma200}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "Bollinger Upper",
          Value: `${stockData.technicals.bollinger.upper}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "Bollinger Middle",
          Value: `${stockData.technicals.bollinger.middle}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "Bollinger Lower",
          Value: `${stockData.technicals.bollinger.lower}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "BB Bandwidth",
          Value: `${stockData.technicals.bollinger.bandwidth}%`,
        },
        {
          Category: "📈 Technicals",
          Metric: "ATR (14)",
          Value: `${stockData.technicals.atr}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "10d Momentum",
          Value: `${stockData.technicals.momentum}%`,
        },
        {
          Category: "📈 Technicals",
          Metric: "Price vs MA50",
          Value: stockData.technicals.priceVsMa50,
        },
        {
          Category: "📈 Technicals",
          Metric: "Price vs MA200",
          Value: stockData.technicals.priceVsMa200,
        },
        // ── News Sentiment
        {
          Category: "📰 News",
          Metric: "Overall News Sentiment",
          Value: overallNewsSentiment,
        },
        {
          Category: "📰 News",
          Metric: "Bullish Articles",
          Value: `${bullishCount}`,
        },
        {
          Category: "📰 News",
          Metric: "Bearish Articles",
          Value: `${bearishCount}`,
        },
        {
          Category: "📰 News",
          Metric: "Neutral Articles",
          Value: `${neutralCount}`,
        },
        ...newsArticles.slice(0, 10).map((n: any) => ({
          Category: "📰 News",
          Metric: `${n.sentiment} — ${n.source}`,
          Value: `${n.title} (${n.publishedAt})`,
        })),
      ].filter(
        (r) =>
          r.Value &&
          r.Value !== "N/A" &&
          r.Value !== "undefined" &&
          r.Value !== "0",
      );

      return NextResponse.json({
        success: true,
        config: {
          url: "Alpha Vantage + NewsAPI",
          siteType: "finance_deep",
          selectors: [],
          dataKeys: [],
        },
        data: {
          records,
          images: [],
          rawText: stockData.fundamentals.description || "",
        },
        meta: {
          totalRecords: records.length,
          scrapedAt: new Date().toISOString(),
          sourceUrl: `https://www.alphavantage.co`,
          dataSize: `~${Math.max(1, Math.round(JSON.stringify(records).length / 1024))} KB`,
        },
        enriched: {
          stockDetail: stockData,
          news: newsArticles,
          sentiment: {
            overall: overallNewsSentiment,
            bullish: bullishCount,
            bearish: bearishCount,
            neutral: neutralCount,
          },
        },
      });
    }

    // ── FINANCE WATCHLIST ─────────────────────────────────────────
    if (detected.type === "finance" && detected.multiStock) {
      const stocks = await fetchWatchlist();
      if (!stocks.length) {
        return NextResponse.json({
          error: "no_data",
          message: "Could not fetch market data. Please try again.",
        });
      }
      const records = stocks.map((s) => ({
        Flag: s.flag,
        Symbol: s.symbol,
        Company: s.name,
        Price: s.price,
        Change: `${s.direction} ${s.change}`,
        "Change %": `${s.changePercent}%`,
        Volume: s.volume,
        "Day High": s.high,
        "Day Low": s.low,
        Sentiment: s.direction === "▲" ? "🟢 Positive" : "🔴 Negative",
        Date: s.date,
      }));
      return NextResponse.json({
        success: true,
        config: {
          url: "Alpha Vantage API",
          siteType: "finance_watchlist",
          selectors: [],
          dataKeys: [],
        },
        data: { records, images: [], rawText: JSON.stringify(stocks, null, 2) },
        meta: {
          totalRecords: records.length,
          scrapedAt: new Date().toISOString(),
          sourceUrl: "https://www.alphavantage.co",
          dataSize: `~${Math.max(1, Math.round(JSON.stringify(records).length / 1024))} KB`,
        },
        enriched: { watchlist: stocks },
      });
    }

    // ── NASA ──────────────────────────────────────────────────────
    if (detected.type === "nasa") {
      const { articles, asteroids, events, nasaImages } =
        await fetchNASAData(intent);
      const records = [
        ...articles.map((a) => ({
          "Data Type": "📸 APOD",
          Title: a.title,
          Date: a.date,
          Summary: a.explanation,
          Copyright: a.copyright,
          "Image URL": a.url,
        })),
        ...asteroids.map((a) => ({
          "Data Type": "☄️ Near Earth Object",
          Name: a.name,
          "Hazard Status": a.hazardous,
          "Diameter Min": `${a.diameter_min_km} km`,
          "Diameter Max": `${a.diameter_max_km} km`,
          "Closest Approach": a.closest_approach,
          "Miss Distance": `${a.miss_distance_km} km`,
          Velocity: a.velocity_kmh,
        })),
        ...events.map((e: any) => ({
          "Data Type": "🌍 Earth Event",
          Title: e.title,
          Category: e.category,
          Status: e.status,
          Date: e.date,
          Location: `${e.latitude}, ${e.longitude}`,
        })),
        ...nasaImages.map((img: any) => ({
          "Data Type": "🖼️ NASA Image",
          Title: img.title,
          Description: img.description,
          Date: img.date,
          "NASA ID": img.nasa_id,
          Center: img.center,
          "Image URL": img.image_url,
        })),
      ];
      const images = [
        ...articles.filter((a) => a.mediaType === "image").map((a) => a.url),
        ...nasaImages.map((img: any) => img.image_url),
      ]
        .filter(Boolean)
        .slice(0, 10);
      return NextResponse.json({
        success: true,
        config: {
          url: "NASA Open APIs",
          siteType: "science",
          selectors: [],
          dataKeys: [],
        },
        data: {
          records,
          images,
          rawText: articles
            .map((a) => `${a.title}\n${a.explanation}`)
            .join("\n\n"),
        },
        meta: {
          totalRecords: records.length,
          scrapedAt: new Date().toISOString(),
          sourceUrl: "https://api.nasa.gov",
          dataSize: `~${Math.max(1, Math.round(JSON.stringify(records).length / 1024))} KB`,
        },
        enriched: { articles, asteroids, events, nasaImages },
      });
    }

    // ── HACKERNEWS ────────────────────────────────────────────────
    if (detected.type === "hackernews") {
      const stories = await fetchHackerNews();
      const records = stories.map((s) => ({
        Title: s.title,
        Domain: s.domain,
        Score: `${s.score} pts`,
        Author: s.author,
        Comments: `${s.comments}`,
        Posted: new Date(s.time).toLocaleString(),
        URL: s.url,
      }));
      return NextResponse.json({
        success: true,
        config: {
          url: "HackerNews Firebase API",
          siteType: "news",
          selectors: [],
          dataKeys: [],
        },
        data: {
          records,
          images: [],
          rawText: stories
            .map((s) => `${s.score}pts — ${s.title} (${s.domain})`)
            .join("\n"),
        },
        meta: {
          totalRecords: records.length,
          scrapedAt: new Date().toISOString(),
          sourceUrl: "https://hacker-news.firebaseio.com",
          dataSize: `~${Math.max(1, Math.round(JSON.stringify(records).length / 1024))} KB`,
        },
        enriched: { stories },
      });
    }

    return NextResponse.json({
      error: "no_data",
      message:
        "Try: 'Show Apple stock analysis', 'Vodafone Idea stock', 'NASA space news', 'Hacker News'",
      suggestions: [
        "Show Apple stock deep analysis",
        "Vodafone Idea stock analysis",
        "Show Reliance Industries stock",
        "Get NASA space science articles",
        "Show me tech news from Hacker News",
        "Show Indian stock market watchlist",
        "Show Gold and Oil prices",
      ],
    });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
