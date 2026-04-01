import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// ── Build data-specific Claude prompt ─────────────────────────────────────
function buildPrompt(
  siteType: string,
  records: any[],
  rawText: string,
  enriched: any,
): string {
  // ── Finance Deep Analysis ──────────────────────────────────────────────
  if (siteType === "finance_deep" && enriched?.stockDetail) {
    const s = enriched.stockDetail;
    const q = s.quote ?? {};
    const f = s.fundamentals ?? {};
    const t = s.technicals ?? {};
    const sen = enriched.sentiment ?? {};
    const news = (enriched.news ?? [])
      .slice(0, 8)
      .map((n: any) => `  - "${n.title}" [${n.sentiment}] — ${n.source}`)
      .join("\n");

    return `You are a senior equity analyst at a top-tier investment bank (Goldman Sachs level). Analyze this stock data and return ONLY a raw JSON object — no markdown, no backticks, no explanation. Start with { end with }.

═══ STOCK DATA ═══
Company: ${f.companyName} (${s.symbol}) | Exchange: ${f.exchange} | Sector: ${f.sector} | Industry: ${f.industry}
Country: ${f.country} | Employees: ${f.employees} | Currency: ${f.currency}

PRICE ACTION:
  Current: ${q.price} | Open: ${q.open} | High: ${q.high} | Low: ${q.low} | Prev Close: ${q.previousClose}
  Change: ${q.change} (${q.changePercent}) | Volume: ${q.volume?.toLocaleString()} | Avg Volume: ${t.avgVolume}
  Volume Signal: ${t.volumeSignal}

FUNDAMENTALS:
  Market Cap: ${f.marketCap} | P/E: ${f.peRatio} | PEG: ${f.pegRatio} | P/B: ${f.pbRatio}
  EPS: ${f.eps} | ROE: ${f.roe} | ROA: ${f.roa} | Debt/Equity: ${f.debtToEquity}
  Profit Margin: ${f.profitMargin} | Revenue Growth YOY: ${f.revenueGrowth}
  Free Cash Flow: ${f.freeCashFlow} | Dividend Yield: ${f.dividendYield}
  52W High: ${f.week52High} | 52W Low: ${f.week52Low} | Analyst Target: ${f.analystTarget} | Beta: ${f.beta}

TECHNICALS:
  Overall Signal: ${t.overallSignal}
  RSI (14): ${t.rsi14} → ${t.rsiSignal}
  MACD: ${t.macd?.macd} | Signal: ${t.macd?.signal} | Histogram: ${t.macd?.histogram} → ${t.macd?.trend}
  MA 20: ${t.ma20} | MA 50: ${t.ma50} | MA 200: ${t.ma200}
  Price vs MA50: ${t.priceVsMa50} | Price vs MA200: ${t.priceVsMa200}
  Trend: ${t.trend} | ATR: ${t.atr} | 10d Momentum: ${t.momentum}%
  Bollinger Upper: ${t.bollinger?.upper} | Middle: ${t.bollinger?.middle} | Lower: ${t.bollinger?.lower} | Bandwidth: ${t.bollinger?.bandwidth}%

NEWS SENTIMENT (${enriched.news?.length ?? 0} articles analyzed):
  Overall: ${sen.overall} | Bullish: ${sen.bullish} | Bearish: ${sen.bearish} | Neutral: ${sen.neutral}
  Latest headlines:
${news}

COMPANY DESCRIPTION: ${f.description?.slice(0, 300)}

Return this exact JSON structure:
{
  "summary": "4-5 sentences of institutional-grade analysis. Reference specific numbers: price, RSI value, MACD signal, news sentiment ratio, P/E vs sector, revenue growth. Give a nuanced view of what these signals collectively mean for the stock right now.",
  "prediction": {
    "result": "Strong Buy | Buy | Hold | Sell | Strong Sell",
    "confidence": "XX%",
    "reason": "3 sentences explaining the verdict using specific technical and fundamental data points from above. Reference RSI, MACD, MA cross, and news sentiment together."
  },
  "insights": [
    { "insight": "Specific technical insight referencing actual RSI/MACD/Bollinger values and what they indicate", "significance": "high", "category": "Technical" },
    { "insight": "Specific fundamental insight referencing actual P/E, revenue growth, or profit margin values", "significance": "high", "category": "Fundamental" },
    { "insight": "News sentiment insight: what the ${sen.bullish} bullish vs ${sen.bearish} bearish articles suggest about market narrative", "significance": "medium", "category": "Sentiment" },
    { "insight": "Risk assessment: Beta, ATR, debt/equity implications for position sizing", "significance": "medium", "category": "Risk" },
    { "insight": "Valuation insight: is current P/E of ${f.peRatio} cheap or expensive given ${f.revenueGrowth} revenue growth?", "significance": "medium", "category": "Valuation" }
  ],
  "scenarios": {
    "bull": "Bull case in 2-3 sentences: what conditions would push this stock to the analyst target of ${f.analystTarget}? Reference specific catalysts.",
    "base": "Base case in 2 sentences: most likely 30-day path given current RSI ${t.rsi14} and MACD histogram ${t.macd?.histogram}.",
    "bear": "Bear case in 2 sentences: what could cause a breakdown below MA200 of ${t.ma200}?"
  },
  "bestUseCase": "2 sentences on the optimal trading/investment strategy for this stock given current signals. Be specific about timeframe and entry conditions."
}`;
  }

  // ── Finance Watchlist ──────────────────────────────────────────────────
  if (siteType === "finance_watchlist" && enriched?.watchlist) {
    const stocks = enriched.watchlist;
    const upCount = stocks.filter((s: any) => s.direction === "▲").length;
    const downCount = stocks.length - upCount;
    const stockList = stocks
      .map(
        (s: any) =>
          `  ${s.flag} ${s.name} (${s.symbol}): ${s.price} | ${s.direction}${s.changePercent}% | Vol: ${s.volume}`,
      )
      .join("\n");

    return `You are a senior market strategist. Analyze this multi-asset watchlist and return ONLY raw JSON. Start with { end with }.

═══ WATCHLIST DATA ═══
${stockList}

Market breadth: ${upCount} advancing / ${downCount} declining out of ${stocks.length} tracked assets.
Asset classes: Indian equities (BSE), US equities (NASDAQ/NYSE), Commodity ETFs (Gold, Oil)

Return this exact JSON:
{
  "summary": "3-4 sentences analyzing the market breadth, which segments (India/US/Commodities) are leading, and what the mixed/aligned performance signals for macro direction. Reference actual symbols and percentage moves.",
  "prediction": {
    "result": "Risk-On | Risk-Off | Cautious Bullish | Cautious Bearish | Mixed",
    "confidence": "XX%",
    "reason": "2-3 sentences: reference the ${upCount}/${stocks.length} advance/decline ratio and specific movers by name. What is the market telling us?"
  },
  "insights": [
    { "insight": "Which specific asset in the list is the most significant mover and why does it matter", "significance": "high", "category": "Market Leader" },
    { "insight": "India vs US divergence or correlation — what does the BSE/NYSE comparison signal", "significance": "high", "category": "Global Macro" },
    { "insight": "Commodity signal — what Gold and Oil ETF movement tells us about inflation/risk appetite", "significance": "medium", "category": "Commodities" },
    { "insight": "Rotation signal — which sectors/geographies are attracting or losing capital today", "significance": "medium", "category": "Capital Flow" }
  ],
  "scenarios": {
    "bull": "If positive momentum continues, which 2-3 assets in the watchlist benefit most?",
    "base": "Most likely near-term trajectory for the watchlist as a whole.",
    "bear": "What macro event could reverse today's trend — and which assets would fall hardest?"
  },
  "bestUseCase": "Specific actionable strategy: which assets to watch for entry, which to avoid, and what signal to wait for."
}`;
  }

  // ── NASA / Science ─────────────────────────────────────────────────────
  if (siteType === "science" && enriched) {
    const { articles, asteroids, events, nasaImages } = enriched;
    const hazardous = (asteroids ?? []).filter((a: any) =>
      a.hazardous?.includes("HAZARDOUS"),
    );
    const apodTitles = (articles ?? [])
      .map((a: any) => `"${a.title}" (${a.date})`)
      .join(", ");
    const neoList = (asteroids ?? [])
      .slice(0, 5)
      .map(
        (a: any) =>
          `  ${a.name}: ${a.hazardous} | Diameter: ${a.diameter_min_km}–${a.diameter_max_km} km | Miss: ${a.miss_distance_km} km | Speed: ${a.velocity_kmh}`,
      )
      .join("\n");
    const eventList = (events ?? [])
      .slice(0, 5)
      .map((e: any) => `  ${e.category}: ${e.title} (${e.date})`)
      .join("\n");

    return `You are a NASA space science communicator and planetary defense analyst. Analyze this data and return ONLY raw JSON. Start with { end with }.

═══ NASA DATA ═══
APOD Articles today: ${apodTitles}

Near-Earth Objects (${asteroids?.length ?? 0} tracked today):
${neoList}
Potentially Hazardous: ${hazardous.length} objects

Active Earth Events (EONET):
${eventList}

Return this exact JSON:
{
  "summary": "4-5 sentences of science-grade analysis. Discuss the astronomical significance of today's APOD topics, assess the planetary defense situation (${hazardous.length} hazardous NEOs), and connect the Earth events to broader environmental patterns. Be scientifically precise.",
  "prediction": {
    "result": "${hazardous.length > 0 ? "Planetary Alert" : "Normal Monitoring"} | Discovery | Research Breakthrough | Mission Update",
    "confidence": "XX%",
    "reason": "2-3 sentences: if hazardous NEOs exist, discuss their actual miss distance and velocity. If not, discuss what the APOD content reveals about current NASA research priorities."
  },
  "insights": [
    { "insight": "Planetary defense assessment: specific analysis of the closest/largest NEO — actual size, speed, and miss distance context (is ${(asteroids?.[0]?.miss_distance_km ?? "").slice(0, 10)} km close in astronomical terms?)", "significance": "high", "category": "Planetary Defense" },
    { "insight": "Astronomical insight from APOD content — what scientific phenomenon or mission does today's imagery highlight?", "significance": "high", "category": "Astronomy" },
    { "insight": "Earth systems insight: what do the active EONET events (${events?.length ?? 0} open events) reveal about current Earth system dynamics?", "significance": "medium", "category": "Earth Science" },
    { "insight": "Context: how does today's NASA data compare to historical norms? Is activity high, low, or typical?", "significance": "medium", "category": "Context" }
  ],
  "scenarios": {
    "bull": "Best-case scientific outcome: what breakthrough or discovery do current NASA missions point toward?",
    "base": "Standard monitoring scenario: what should scientists and the public expect in the next 30 days?",
    "bear": "Risk scenario: if any hazardous NEOs have orbital uncertainty, what are the implications?"
  },
  "bestUseCase": "Who benefits most from this data (educators, journalists, researchers, policy makers) and how should they use it specifically?"
}`;
  }

  // ── HackerNews ─────────────────────────────────────────────────────────
  if (siteType === "news" && enriched?.stories) {
    const stories = enriched.stories.slice(0, 15);
    const topStories = stories
      .map(
        (s: any, i: number) =>
          `  ${i + 1}. [${s.score}pts, ${s.comments} comments] "${s.title}" — ${s.domain}`,
      )
      .join("\n");
    const domains = Array.from(new Set(stories.map((s: any) => s.domain)))
      .slice(0, 8)
      .join(", ");

    const avgScore = Math.round(
      stories.reduce((a: number, s: any) => a + s.score, 0) / stories.length,
    );

    return `You are a senior tech industry analyst and venture capital researcher. Analyze these Hacker News top stories and return ONLY raw JSON. Start with { end with }.

═══ HACKER NEWS DATA ═══
Top stories right now (sorted by community score):
${topStories}

Meta: ${stories.length} stories | Avg score: ${avgScore}pts | Source domains: ${domains}

Return this exact JSON:
{
  "summary": "4-5 sentences identifying the dominant themes across these stories (AI, infrastructure, security, business, etc). Reference specific story titles and their point scores. Explain what the developer community's attention distribution reveals about current industry priorities.",
  "prediction": {
    "result": "Bullish on AI | Infrastructure Surge | Security Focus | Business Critical | Mixed Signals",
    "confidence": "XX%",
    "reason": "2-3 sentences: what do the highest-scoring stories (by name) tell us about where developer mindshare and potentially VC dollars are flowing in the next 6 months?"
  },
  "insights": [
    { "insight": "Dominant theme analysis: which technology category captures the most attention and what does the score distribution reveal about consensus vs controversy?", "significance": "high", "category": "Trend" },
    { "insight": "High engagement outlier: identify the story with the highest comment-to-score ratio — controversy vs genuine interest analysis", "significance": "high", "category": "Community" },
    { "insight": "Domain diversity insight: what does the presence/absence of domains like ${domains.split(",")[0]} reveal about information sourcing?", "significance": "medium", "category": "Media" },
    { "insight": "Emerging signal: identify a lower-scoring story that may represent an early trend before mainstream adoption", "significance": "medium", "category": "Early Signal" },
    { "insight": "Business implication: which stories have the most direct monetization or enterprise impact?", "significance": "medium", "category": "Business" }
  ],
  "scenarios": {
    "bull": "If the dominant themes (AI/infrastructure/etc) continue trending, what products or companies will benefit in 6-12 months?",
    "base": "Most likely near-term developer ecosystem evolution based on today's story composition.",
    "bear": "Which stories signal potential risks, regulatory friction, or technology headwinds?"
  },
  "bestUseCase": "Specific use cases: for a tech startup founder, a VC, and a developer — what is the single most actionable insight from today's HN frontpage?"
}`;
  }
  // ── ADD THIS BLOCK inside buildPrompt() in your aixplore/route.ts ──
  // Add BEFORE the "Generic fallback" comment at the bottom

  // ── Ecommerce / Universal ─────────────────────────────────────────────────
  if (siteType === "ecommerce" || siteType === "general") {
    const category = enriched?.category ?? "products";
    const displayType = enriched?.displayType ?? "table";
    const itemCount = records.length;
    const sampleItems = records
      .slice(0, 8)
      .map((r: any, i: number) => {
        const entries = Object.entries(r)
          .slice(0, 6)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");
        return `  ${i + 1}. ${entries}`;
      })
      .join("\n");

    // Find price range if products
    const prices: number[] = [];
    records.forEach((r: any) => {
      const priceStr = r.price || r.Price || r.cost || "";
      const num = parseFloat(String(priceStr).replace(/[^0-9.]/g, ""));
      if (num > 0) prices.push(num);
    });
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;

    return `You are a smart shopping and data analyst. The user searched for: "${rawText.slice(0, 100) || category}"
Page scraped: ${enriched?.pageTitle || "product listing"}
Category: ${category} | Items found: ${itemCount}
${prices.length ? `Price range: ₹${minPrice.toLocaleString()} – ₹${maxPrice.toLocaleString()} | Avg: ₹${avgPrice.toLocaleString()}` : ""}

Sample items:
${sampleItems}

Return ONLY raw JSON (no markdown, no backticks). Start with { end with }:
{
  "summary": "4-5 sentences analyzing the ${category} listings. Mention the price range, variety available, which items seem to offer best value, and what the overall market positioning looks like for this category.",
  "prediction": {
    "result": "Best Value Pick | Premium Market | Budget Friendly | Mixed Range | Competitive Market",
    "confidence": "XX%",
    "reason": "2-3 sentences: reference specific price points and products from the list. Which item stands out as best value and why?"
  },
  "insights": [
    { "insight": "Price analysis: reference actual min/max prices (₹${minPrice}–₹${maxPrice}) and what drives the price difference in this category", "significance": "high", "category": "Pricing" },
    { "insight": "Best value pick: identify the specific product that offers the best price-to-spec ratio from the list", "significance": "high", "category": "Recommendation" },
    { "insight": "Brand/market insight: which brands dominate this listing and what does that reveal about the market", "significance": "medium", "category": "Market" },
    { "insight": "What features or specs most significantly drive the price difference in this category", "significance": "medium", "category": "Specs" },
    { "insight": "Buying advice: what should the buyer watch out for or prioritize when choosing from these options", "significance": "medium", "category": "Advice" }
  ],
  "scenarios": {
    "bull": "If budget is flexible (above ₹${maxPrice > 0 ? Math.round(maxPrice * 0.7) : 50000}), which product and why?",
    "base": "Best balanced choice around the average price point of ₹${avgPrice > 0 ? avgPrice : 30000}?",
    "bear": "What is the best budget pick under ₹${minPrice > 0 ? Math.round(minPrice * 1.3) : 20000} from this list?"
  },
  "bestUseCase": "Who should buy from this listing (student/professional/gamer/etc) and what is the specific top recommendation with justification?"
}`;
  }
  // Generic fallback
  return `Analyze this data and return ONLY raw JSON (no markdown). Start with { end with }.
Data: ${JSON.stringify(records.slice(0, 10))}
{
  "summary": "Specific 3-4 sentence analysis of the actual data values",
  "prediction": { "result": "verdict", "confidence": "70%", "reason": "specific reason" },
  "insights": [
    { "insight": "specific insight 1", "significance": "high" },
    { "insight": "specific insight 2", "significance": "medium" },
    { "insight": "specific insight 3", "significance": "medium" }
  ],
  "bestUseCase": "specific use case"
}`;
}

// ── Fallback if Claude fails ───────────────────────────────────────────────
function buildFallback(siteType: string, records: any[], enriched: any) {
  if (siteType === "finance_deep" && enriched?.stockDetail) {
    const s = enriched.stockDetail;
    const signalWord = s.technicals?.overallSignal?.includes("Buy")
      ? "Bullish"
      : s.technicals?.overallSignal?.includes("Sell")
        ? "Bearish"
        : "Neutral";
    return {
      summary: `${s.fundamentals?.companyName} (${s.symbol}) is trading at ${s.quote?.price} ${s.fundamentals?.currency}, ${s.quote?.changePercent} today. The technical composite signal reads ${s.technicals?.overallSignal}. RSI at ${s.technicals?.rsi14} indicates ${s.technicals?.rsiSignal}, while the MACD shows ${s.technicals?.macd?.trend}. The ${s.technicals?.trend} confirms the medium-term directional bias.`,
      prediction: {
        result: signalWord,
        confidence: "68%",
        reason: `RSI at ${s.technicals?.rsi14} and MACD histogram of ${s.technicals?.macd?.histogram} form the primary basis for this verdict. ${s.technicals?.priceVsMa50} and ${s.technicals?.priceVsMa200} support the ${signalWord.toLowerCase()} case.`,
      },
      insights: [
        {
          insight: `P/E of ${s.fundamentals?.peRatio} with ${s.fundamentals?.revenueGrowth} revenue growth gives a valuation baseline for relative comparison`,
          significance: "high",
          category: "Valuation",
        },
        {
          insight: `ATR of ${s.technicals?.atr} defines typical daily volatility — use for position sizing and stop-loss placement`,
          significance: "medium",
          category: "Risk",
        },
        {
          insight: `News sentiment: ${enriched.sentiment?.bullish ?? 0} bullish vs ${enriched.sentiment?.bearish ?? 0} bearish articles — market narrative leans ${enriched.sentiment?.overall ?? "mixed"}`,
          significance: "medium",
          category: "Sentiment",
        },
      ],
      scenarios: {
        bull: `Price reaches analyst target of ${s.fundamentals?.analystTarget} if revenue growth accelerates and RSI breaks above 70.`,
        base: `Consolidation near current levels with MA50 at ${s.technicals?.ma50} acting as support.`,
        bear: `Breakdown below MA200 at ${s.technicals?.ma200} if broader market deteriorates.`,
      },
      bestUseCase: `Use for swing trading decisions on ${s.fundamentals?.companyName}. Wait for RSI confirmation above/below 50 before entering.`,
    };
  }

  if (siteType === "finance_watchlist" && enriched?.watchlist) {
    const up = enriched.watchlist.filter(
      (s: any) => s.direction === "▲",
    ).length;
    const total = enriched.watchlist.length;
    return {
      summary: `Watchlist of ${total} assets shows ${up} advancing and ${total - up} declining. Market breadth of ${Math.round((up / total) * 100)}% positive suggests ${up > total / 2 ? "mild risk-on" : "risk-off"} conditions across Indian and US equities.`,
      prediction: {
        result: up > total / 2 ? "Cautious Bullish" : "Mixed",
        confidence: "62%",
        reason: `${up}/${total} positive breadth with mixed India/US signals. No clear directional conviction.`,
      },
      insights: [
        {
          insight: `${up}/${total} stocks advancing — breadth ${up > total / 2 ? "supports" : "does not support"} a broad rally`,
          significance: "high",
          category: "Breadth",
        },
        {
          insight:
            "Indian large-caps and US tech divergence reveals different macro trajectories",
          significance: "medium",
          category: "Global Macro",
        },
        {
          insight:
            "Commodity ETFs (Gold/Oil) provide hedging signal for the portfolio",
          significance: "medium",
          category: "Commodities",
        },
      ],
      scenarios: {
        bull: "All sectors align positive if US inflation data surprises to the downside.",
        base: "Continued mixed signals with sector rotation.",
        bear: "Risk-off if macro data disappoints — commodities would outperform equities.",
      },
      bestUseCase:
        "Use to identify which segment (Indian large-cap, US tech, commodities) is leading today and rotate into strength.",
    };
  }

  if (siteType === "science" && enriched) {
    const hazardous = (enriched.asteroids ?? []).filter((a: any) =>
      a.hazardous?.includes("HAZARDOUS"),
    ).length;
    return {
      summary: `NASA data today includes ${enriched.articles?.length ?? 0} APOD articles, ${enriched.asteroids?.length ?? 0} near-Earth objects (${hazardous} flagged hazardous), and ${enriched.events?.length ?? 0} active Earth events tracked by EONET. ${hazardous > 0 ? `${hazardous} potentially hazardous asteroid(s) are being monitored in today's close approach window.` : "No hazardous asteroids in today's close approach window."}`,
      prediction: {
        result: hazardous > 0 ? "Planetary Alert" : "Normal Monitoring",
        confidence: "85%",
        reason: `${hazardous > 0 ? `${hazardous} hazardous NEO(s) detected with standard monitoring protocols active.` : "No hazardous NEOs today."} EONET shows ${enriched.events?.length ?? 0} active natural events.`,
      },
      insights: [
        {
          insight: `${hazardous} hazardous NEO classification today — compare miss distances against planetary defense thresholds`,
          significance: hazardous > 0 ? "high" : "medium",
          category: "Planetary Defense",
        },
        {
          insight:
            "APOD content reflects current NASA mission priorities and public science communication focus",
          significance: "medium",
          category: "Astronomy",
        },
        {
          insight: `EONET tracking ${enriched.events?.length ?? 0} open events — natural disaster monitoring at current activity level`,
          significance: "medium",
          category: "Earth Science",
        },
      ],
      scenarios: {
        bull: "Current NASA mission tracks point toward upcoming discoveries.",
        base: "Standard space weather and NEO monitoring continues.",
        bear: "Orbital uncertainties on hazardous objects require continued tracking.",
      },
      bestUseCase:
        "Ideal for science educators, space journalists, and planetary defense researchers tracking real-time NEO and Earth event data.",
    };
  }

  // HN fallback
  const top3 = (enriched?.stories ?? records)
    .slice(0, 3)
    .map((s: any) => s.title || s.Title || "")
    .join("; ");
  return {
    summary: `Hacker News top stories reflect current developer priorities: "${top3}". The community's attention and score distribution reveals the most pressing technical and business topics in the ecosystem right now.`,
    prediction: {
      result: "Tech Bullish",
      confidence: "72%",
      reason:
        "High-scoring stories indicate strong community consensus around specific technology themes. Comment volume signals active debate and engagement.",
    },
    insights: [
      {
        insight:
          "Top story point distribution follows power law — top 3 stories capture majority of attention",
        significance: "high",
        category: "Trend",
      },
      {
        insight:
          "Domain diversity reveals cross-pollination between academia, startups, and enterprise tech",
        significance: "medium",
        category: "Media",
      },
      {
        insight:
          "Comment-to-score ratio identifies which topics generate debate vs simple approval",
        significance: "medium",
        category: "Community",
      },
    ],
    scenarios: {
      bull: "Dominant themes today predict next wave of tooling/startup activity in 6-12 months.",
      base: "Current trends continue with incremental developer adoption.",
      bear: "Regulatory or security stories signal potential headwinds for featured technologies.",
    },
    bestUseCase:
      "Use HN frontpage composition for trend intelligence — founders, VCs, and developers can identify emerging technology consensus 3-6 months before mainstream adoption.",
  };
}

// ── Main POST handler ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { records, siteType, meta, enriched, rawText } = await req.json();
    if (!records?.length)
      return NextResponse.json(
        { error: "No records to analyse" },
        { status: 400 },
      );

    let analysis: any = null;

    try {
      const prompt = buildPrompt(siteType, records, rawText ?? "", enriched);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      const raw = (data.content?.[0]?.text ?? "").trim();

      // Try multiple parse strategies
      for (const attempt of [
        () => JSON.parse(raw),
        () => JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()),
        () => {
          const m = raw.match(/\{[\s\S]*\}/);
          return m ? JSON.parse(m[0]) : null;
        },
      ]) {
        try {
          const parsed = attempt();
          if (parsed?.summary && parsed?.prediction && parsed?.insights) {
            analysis = parsed;
            break;
          }
        } catch {
          continue;
        }
      }
    } catch (apiErr) {
      console.error("Claude API error:", apiErr);
    }

    // Fallback if Claude fails
    if (!analysis) {
      analysis = buildFallback(siteType, records, enriched);
    }

    // Attach stats
    analysis.stats = {
      totalRecords: meta?.totalRecords ?? records.length,
      scrapedAt: meta?.scrapedAt ?? new Date().toISOString(),
      sourceUrl: meta?.sourceUrl ?? "",
      dataSize: meta?.dataSize ?? "~1 KB",
      topItem: String(Object.values(records[0])[0] ?? "").slice(0, 30),
      ...(enriched?.sentiment
        ? {
            bullishNews: enriched.sentiment.bullish,
            bearishNews: enriched.sentiment.bearish,
            neutralNews: enriched.sentiment.neutral,
          }
        : {}),
    };
    analysis.siteType = siteType;

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error("AIXPLORE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
