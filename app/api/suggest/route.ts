import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

// All available Groq models — tried in order, each has its own rate limit bucket.
// Best quality first, fastest/most available last.
const MODELS = [
  "llama-3.3-70b-versatile", // best quality
  "llama-3.1-70b-versatile", // alternate 70b
  "llama3-70b-8192", // older 70b, separate quota
  "mixtral-8x7b-32768", // mixtral, high quality
  "llama-3.1-8b-instant", // fast 8b
  "llama3-8b-8192", // 8b separate quota
  "llama-3.2-11b-text-preview", // 11b preview
  "llama-3.2-3b-preview", // 3b lightweight
  "gemma2-9b-it", // gemma fallback
  "gemma-7b-it", // gemma 7b last resort
];

export interface SuggestedSite {
  id: string;
  name: string;
  url: string;
  domain: string;
  description: string;
  category:
    | "academic"
    | "finance"
    | "news"
    | "shopping"
    | "social"
    | "science"
    | "general";
  fetchMethod: "api" | "firecrawl" | "free";
  creditCost: number;
  relevanceScore: number;
  favicon: string;
}

export interface SuggestionResponse {
  sites: SuggestedSite[];
  queryCategory: string;
  subjectLine: string;
  displayType:
    | "products"
    | "research"
    | "finance"
    | "news"
    | "mixed"
    | "tabular";
}

function buildPrompt(intent: string): string {
  return `You are a search intelligence expert. The user wants: "${intent}"

Generate exactly 10 of the BEST websites/sources to get this data. Mix free APIs, scraped sites, and research sources based on query type.

Rules:
- For stocks/finance: include Yahoo Finance, Moneycontrol, Alpha Vantage, NSE India, BSE India, MarketWatch, Bloomberg, Google Finance, Economic Times, Investing.com
- For research/science/medicine: include Google Scholar, arXiv, PubMed, IEEE Xplore, Semantic Scholar, Nature, ScienceDirect, ResearchGate, bioRxiv, JSTOR
- For e-commerce/products: include Flipkart, Amazon India, JioMart, Myntra, Nykaa, Snapdeal, Meesho, Croma, Reliance Digital, Tata Cliq
- For tech/news: include Hacker News, TechCrunch, The Verge, Wired, Ars Technica, Reddit, GitHub, Product Hunt, Engadget, MIT Tech Review
- For general news: include Reuters, BBC, The Guardian, AP News, Times of India, NDTV, Hindu, Al Jazeera, CNN, Bloomberg
- For space/NASA: include NASA.gov, Space.com, ESA, Sky & Telescope, SpaceNews, Astronomy.com, Universe Today, SpaceWeather.com, Jet Propulsion Lab, SpaceX
- For health/nutrition: include PubMed, WebMD, Mayo Clinic, NIH, WHO, CDC, Healthline, MedRxiv, JAMA, Lancet
- For sports stats/player career stats/cricket/football: MUST include ESPN Cricinfo stats page (stats.espncricinfo.com), Howstat (howstat.com), Cricbuzz, Wikipedia player article (direct URL), ICC, BCCI, FBref, WhoScored
- For statistics/data/records/rankings/career numbers: MUST include Wikipedia (direct article URL) + Kaggle (kaggle.com/datasets?search=QUERY), Our World in Data, Statista

Return ONLY raw JSON (no markdown, start with { end with }):
{"queryCategory":"finance|academic|ecommerce|news|science|health|technology|social|general|sports|statistics","subjectLine":"clean 3-5 word subject","displayType":"products|research|finance|news|mixed|tabular","sites":[{"id":"site_1","name":"Name","url":"https://actual-search-url-with-query","domain":"domain.com","description":"8 words about what data this has","category":"academic|finance|news|shopping|social|science|general","fetchMethod":"api|firecrawl|free","creditCost":0,"relevanceScore":95,"favicon":"https://www.google.com/s2/favicons?domain=domain.com&sz=32"},{"id":"site_2",...},{"id":"site_3",...},{"id":"site_4",...},{"id":"site_5",...},{"id":"site_6",...},{"id":"site_7",...},{"id":"site_8",...},{"id":"site_9",...},{"id":"site_10",...}]}

CRITICAL: URL = actual search page with query embedded. creditCost: 0 for free APIs, 1 for scraped. displayType = "tabular" for stats/records/career data queries. All 10 sites required.`;
}

function parseGroqResponse(raw: string): SuggestionResponse | null {
  if (!raw) return null;
  const strategies = [
    () => JSON.parse(raw),
    () => {
      const s = raw.indexOf("{"),
        e = raw.lastIndexOf("}");
      if (s === -1 || e === -1) return null;
      return JSON.parse(raw.slice(s, e + 1));
    },
    () => JSON.parse(raw.replace(/```json\s*|```\s*/g, "").trim()),
    () => {
      const m = raw.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    },
  ];
  for (const fn of strategies) {
    try {
      const r = fn();
      if (r?.sites?.length >= 1) return r as SuggestionResponse;
    } catch {}
  }
  return null;
}

async function tryModel(
  model: string,
  intent: string,
): Promise<SuggestionResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildPrompt(intent) }],
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });
    clearTimeout(timer);

    const data = await res.json();

    if (res.status === 429) {
      console.warn(`[suggest] ${model} rate limited (429), trying next...`);
      return null;
    }
    if (res.status === 404 || res.status === 400) {
      // Model doesn't exist or bad request — skip silently
      console.warn(
        `[suggest] ${model} unavailable (${res.status}), trying next...`,
      );
      return null;
    }
    if (!res.ok) {
      console.error(
        `[suggest] ${model} HTTP ${res.status}:`,
        data?.error?.message ?? "unknown",
      );
      return null;
    }

    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    const parsed = parseGroqResponse(raw);

    if (parsed) {
      console.log(
        `[suggest] ✓ Success with ${model} — ${parsed.sites.length} sites`,
      );
    } else {
      console.warn(`[suggest] ${model} parse failed. Raw:`, raw.slice(0, 150));
    }
    return parsed;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(
      `[suggest] ${model}:`,
      err.name === "AbortError" ? "TIMEOUT" : err.message,
    );
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { intent } = await req.json();
    if (!intent?.trim())
      return NextResponse.json({ error: "Intent required" }, { status: 400 });

    console.log("[suggest] Intent:", intent);

    let parsed: SuggestionResponse | null = null;
    for (const model of MODELS) {
      parsed = await tryModel(model, intent);
      if (parsed) break;
    }

    if (!parsed) {
      console.error(
        "[suggest] All",
        MODELS.length,
        "models failed for:",
        intent,
      );
      return NextResponse.json(
        { error: "Failed to generate suggestions" },
        { status: 503 },
      );
    }

    parsed.sites = parsed.sites
      .filter((s) => s.name && s.url)
      .map((s, i) => ({
        ...s,
        id: s.id || `site_${i + 1}`,
        favicon:
          s.favicon ||
          `https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`,
        creditCost: s.creditCost ?? (s.fetchMethod === "firecrawl" ? 1 : 0),
        relevanceScore: s.relevanceScore || 70,
      }))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 10);

    return NextResponse.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error("[suggest] Unhandled error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
