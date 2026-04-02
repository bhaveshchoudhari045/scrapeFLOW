import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

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
  displayType: "products" | "research" | "finance" | "news" | "mixed";
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { intent } = await req.json();
    if (!intent?.trim())
      return NextResponse.json({ error: "Intent required" }, { status: 400 });

    const prompt = `You are a search intelligence expert. The user wants: "${intent}"

Generate exactly 10 of the BEST websites/sources to get this data. Mix free APIs, scraped sites, and research sources based on query type.

Rules:
- For stocks/finance: include Yahoo Finance, Moneycontrol, Alpha Vantage, NSE India, BSE India, MarketWatch, Bloomberg, Google Finance, Economic Times, Investing.com
- For research/science/medicine: include Google Scholar, arXiv, PubMed, IEEE Xplore, Semantic Scholar, Nature, ScienceDirect, ResearchGate, bioRxiv, JSTOR
- For e-commerce/products: include Flipkart, Amazon India, JioMart, Myntra, Nykaa, Snapdeal, Meesho, Croma, Reliance Digital, Tata Cliq
- For tech/news: include Hacker News, TechCrunch, The Verge, Wired, Ars Technica, Reddit, GitHub, Product Hunt, Engadget, MIT Tech Review
- For general news: include Reuters, BBC, The Guardian, AP News, Times of India, NDTV, Hindu, Al Jazeera, CNN, Bloomberg
- For space/NASA: include NASA.gov, Space.com, ESA, Sky & Telescope, SpaceNews, Astronomy.com, Universe Today, SpaceWeather.com, Jet Propulsion Lab, SpaceX
- For health/nutrition: include PubMed, WebMD, Mayo Clinic, NIH, WHO, CDC, Healthline, MedRxiv, JAMA, Lancet
- For legal/government: include government websites, legal databases, court records
- Always pick sources that ACTUALLY HAVE this specific data

Return ONLY raw JSON (no markdown):
{
  "queryCategory": "finance|academic|ecommerce|news|science|health|technology|social|general",
  "subjectLine": "clean 3-5 word subject extracted from query",
  "displayType": "products|research|finance|news|mixed",
  "sites": [
    {
      "id": "site_1",
      "name": "Site Name",
      "url": "https://exact-search-url-with-query-embedded",
      "domain": "domain.com",
      "description": "What specific data this site has for this query in 8-10 words",
      "category": "academic|finance|news|shopping|social|science|general",
      "fetchMethod": "api|firecrawl|free",
      "creditCost": 0,
      "relevanceScore": 95,
      "favicon": "https://www.google.com/s2/favicons?domain=domain.com&sz=32"
    }
  ]
}

CRITICAL: 
- The URL must be the ACTUAL search/results URL with the query embedded, not just the homepage
- creditCost: 0 for free APIs (NASA, PubMed, arXiv, HN, Reddit, Alpha Vantage), 1 for Firecrawl pages
- fetchMethod: "api" for known free APIs, "firecrawl" for pages needing scraping, "free" for direct JSON APIs
- relevanceScore: 1-100, sort by relevance descending
- Generate all 10 sites`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();

    let parsed: SuggestionResponse | null = null;
    for (const attempt of [
      () => JSON.parse(raw),
      () => {
        const m = raw.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
      },
      () => JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()),
    ]) {
      try {
        const r = attempt();
        if (r?.sites?.length) {
          parsed = r;
          break;
        }
      } catch {}
    }

    if (!parsed)
      return NextResponse.json(
        { error: "Failed to generate suggestions" },
        { status: 500 },
      );

    // Ensure IDs are set and sites sorted by relevance
    parsed.sites = parsed.sites
      .map((s, i) => ({ ...s, id: s.id || `site_${i + 1}` }))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 10);

    return NextResponse.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error("Suggest error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
