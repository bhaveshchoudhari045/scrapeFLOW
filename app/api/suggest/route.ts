import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const GROQ_API_KEY    = process.env.GROQ_API_KEY!;
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY!;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "llama-3.1-8b-instant",
];

export interface QueryIntelligence {
  refinedQuery:    string;          // Precise rewritten query
  intent:          string;          // What user actually wants
  entities: {
    primarySubject:  string;        // "laptops", "NVIDIA stock", "CRISPR"
    constraints:     string[];      // ["under ₹50000", "8GB RAM", "India"]
    location:        string;        // "India", "Mumbai", "" 
    timeframe:       string;        // "latest", "2024", "last 5 years", ""
    format:          string;        // "laptop", "research paper", "stock price"
    priceRange?:     { min?: number; max?: number; currency: string };
    brand?:          string;        // "Apple", "Samsung", ""
    category:        string;        // "ecommerce", "finance", "academic" etc.
  };
  extractionRules: {                // Tells scraper exactly what to look for
    mustHaveFields:  string[];      // ["Name", "Price", "Rating", "Specs"]
    mustFilter:      string[];      // ["price < 50000", "category = laptop"]  
    mustExclude:     string[];      // ["bags", "accessories", "cases"]
    outputFormat:    string;        // "product_list", "news_articles", "data_table"
  };
  displayType:     "products" | "research" | "finance" | "news" | "mixed" | "tabular";
  queryCategory:   string;
  subjectLine:     string;
}

export interface SuggestedSite {
  id:              string;
  name:            string;
  url:             string;
  domain:          string;
  description:     string;
  category:        string;
  fetchMethod:     "api" | "firecrawl" | "free";
  creditCost:      number;
  relevanceScore:  number;
  favicon:         string;
  extractionHint:  string;          // NEW — what to extract from this specific site
}

// ── Step 1: Query Intelligence — understand what user REALLY wants ────────
async function analyzeQuery(intent: string): Promise<QueryIntelligence> {
  const prompt = `You are a search query analyst. Parse this user query and extract precise structured intent.

User query: "${intent}"

Return ONLY raw JSON, no markdown:
{
  "refinedQuery": "Precise rewritten version of the query with all constraints explicit. E.g. 'laptops under ₹50,000 in India with minimum 8GB RAM' instead of 'cheap laptops'",
  "intent": "One sentence: what exactly the user wants to find or do",
  "entities": {
    "primarySubject": "The main thing being searched for (e.g. 'laptop', 'NVIDIA stock', 'CRISPR research papers', 'Rohit Sharma batting stats')",
    "constraints": ["constraint 1 e.g. 'price under ₹50000'", "constraint 2 e.g. 'in India'", "constraint 3 if any"],
    "location": "Country or city if mentioned, else empty string",
    "timeframe": "Time constraint like 'latest 2024' or 'last 5 years' or empty",
    "format": "What kind of data: 'product listing', 'research paper', 'stock price', 'news article', 'career statistics', 'dataset'",
    "priceRange": {"min": null_or_number, "max": null_or_number, "currency": "INR or USD or empty"},
    "brand": "Brand name if specified, else empty string",
    "category": "One of: ecommerce | finance | academic | news | science | health | technology | social | sports | statistics | general"
  },
  "extractionRules": {
    "mustHaveFields": ["field1", "field2"] e.g. for laptops: ["Name", "Price", "RAM", "Processor", "Storage", "Rating"],
    "mustFilter": ["rule1"] e.g. ["price between 20000 and 50000", "category is laptop not bag"],
    "mustExclude": ["thing1", "thing2"] e.g. ["laptop bags", "laptop accessories", "laptop cases", "laptop sleeves", "backpacks"],
    "outputFormat": "product_list | news_articles | research_papers | stock_data | career_stats | data_table | general"
  },
  "displayType": "products | research | finance | news | mixed | tabular",
  "queryCategory": "ecommerce | finance | academic | news | science | health | technology | social | sports | statistics | general",
  "subjectLine": "3-5 word clean subject for display"
}`;

  // Try Claude first (best at structured understanding)
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await res.json();
    if (res.ok) {
      const raw = (d.content?.[0]?.text ?? "").trim();
      const parsed = safeParseJSON(raw);
      if (parsed?.entities?.category) return parsed as QueryIntelligence;
    }
  } catch {}

  // Groq fallback
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });
      if (!res.ok) continue;
      const d = await res.json();
      const raw = (d.choices?.[0]?.message?.content ?? "").trim();
      const parsed = safeParseJSON(raw);
      if (parsed?.entities?.category) return parsed as QueryIntelligence;
    } catch {}
  }

  // Hard fallback — basic extraction
  return buildFallbackIntelligence(intent);
}

function buildFallbackIntelligence(intent: string): QueryIntelligence {
  const lower = intent.toLowerCase();
  const isEcom    = /flipkart|amazon|myntra|nykaa|meesho|jiomart|croma|buy|price|shop|under|₹|\brs\b/i.test(intent);
  const isFinance = /stock|share|nse|bse|sensex|nifty|bitcoin|crypto|gold|oil|market|reliance|tata|infosys/i.test(intent);
  const isAcademic= /research|paper|study|arxiv|pubmed|journal|citation|abstract/i.test(intent);
  const isSports  = /cricket|football|ipl|wicket|runs|average|batting|bowling|player|stats/i.test(intent);
  const isNews    = /news|latest|today|current|breaking|update/i.test(intent);

  const priceMatch = intent.match(/under\s*[₹$]?\s*([\d,]+)/i);
  const maxPrice   = priceMatch ? parseInt(priceMatch[1].replace(/,/g,"")) : undefined;

  const category = isEcom?"ecommerce":isFinance?"finance":isAcademic?"academic":isSports?"sports":isNews?"news":"general";

  return {
    refinedQuery: intent,
    intent: `Find ${intent}`,
    entities: {
      primarySubject: intent.replace(/(show|get|find|search|give me)/gi,"").trim().slice(0,50),
      constraints: maxPrice ? [`price under ₹${maxPrice.toLocaleString()}`] : [],
      location: lower.includes("india")?"India":lower.includes("mumbai")?"Mumbai":"",
      timeframe: lower.includes("latest")||lower.includes("2024")?"2024":"",
      format: isEcom?"product listing":isFinance?"stock data":isAcademic?"research paper":isSports?"career statistics":"general",
      priceRange: maxPrice ? { max: maxPrice, currency: "INR" } : undefined,
      brand: "",
      category,
    },
    extractionRules: {
      mustHaveFields: isEcom?["Name","Price","Rating","Specs"]:isFinance?["Price","Change","Volume"]:["Title","Description","Date"],
      mustFilter: maxPrice?[`price less than ${maxPrice}`]:[],
      mustExclude: isEcom?["bags","accessories","cases","sleeves","backpacks","covers"]:[],
      outputFormat: isEcom?"product_list":isFinance?"stock_data":isAcademic?"research_papers":isSports?"career_stats":"general",
    },
    displayType: isEcom?"products":isFinance?"finance":isAcademic?"research":isSports?"tabular":"mixed",
    queryCategory: category,
    subjectLine: intent.slice(0,30),
  };
}

// ── Step 2: Generate sources WITH extraction hints ────────────────────────
async function generateSources(qi: QueryIntelligence, originalIntent: string): Promise<SuggestedSite[]> {
  const { entities, extractionRules } = qi;

  const prompt = `You are a search intelligence expert. Generate exactly 10 best data sources for this query.

REFINED QUERY: "${qi.refinedQuery}"
ORIGINAL QUERY: "${originalIntent}"
PRIMARY SUBJECT: ${entities.primarySubject}
CATEGORY: ${entities.category}
CONSTRAINTS: ${entities.constraints.join(", ") || "none"}
MUST EXTRACT: ${extractionRules.mustHaveFields.join(", ")}
MUST EXCLUDE: ${extractionRules.mustExclude.join(", ") || "nothing"}
PRICE RANGE: ${entities.priceRange ? `${entities.priceRange.currency} max ${entities.priceRange.max}` : "none"}
LOCATION: ${entities.location || "any"}

CRITICAL URL RULES:
- For Flipkart: use https://www.flipkart.com/search?q=${encodeQueryForURL(entities.primarySubject)}&sort=price_asc${entities.priceRange?.max ? `&p%5B%5D=facets.price_range.from%3D0+TO+${entities.priceRange.max}` : ""}
- For Amazon India: use https://www.amazon.in/s?k=${encodeQueryForURL(entities.primarySubject)}${entities.priceRange?.max ? `&rh=p_36%3A-${entities.priceRange.max}00` : ""}
- For academic: embed the exact search term in URL
- For news: use exact topic search URL
- NEVER use homepage URLs — always search/results URLs

Return ONLY raw JSON (no markdown, start { end }):
{
  "sites": [
    {
      "id": "site_1",
      "name": "Site Name",
      "url": "https://exact-search-url-with-constraints-embedded",
      "domain": "domain.com",
      "description": "What specific data this has for this exact query",
      "category": "academic|finance|news|shopping|social|science|general",
      "fetchMethod": "api|firecrawl|free",
      "creditCost": 0,
      "relevanceScore": 95,
      "favicon": "https://www.google.com/s2/favicons?domain=domain.com&sz=32",
      "extractionHint": "Extract ONLY: ${extractionRules.mustHaveFields.join(", ")}. EXCLUDE: ${extractionRules.mustExclude.join(", ") || "nothing irrelevant"}. Filter: ${extractionRules.mustFilter.join(", ") || "relevant items only"}"
    }
  ]
}

SOURCE SELECTION RULES BY CATEGORY:
- ecommerce: Flipkart (primary), Amazon India, Croma, Reliance Digital, Tata Cliq, JioMart, Meesho, Snapdeal + 2 review sites
- finance: Alpha Vantage (API), Moneycontrol, NSE India, Economic Times Markets, Yahoo Finance, Investing.com + 4 more
- academic: Semantic Scholar (API), arXiv (API), PubMed (API), Google Scholar, ResearchGate, IEEE, Nature, ScienceDirect, JSTOR, bioRxiv
- news: NewsAPI (free API), Reuters, BBC, Guardian, NDTV, Times of India, Hindu, Al Jazeera, Economic Times, Mint
- sports: ESPN Cricinfo stats, Howstat, Cricbuzz, Wikipedia player page, ICC, BCCI, Statsguru
- science: NASA APIs (free), Space.com, ESA, arXiv
- health: PubMed (API), WHO, NIH, Mayo Clinic, WebMD, MedRxiv

Generate all 10.`;

  // Try both AI providers
  const raw = await tryAI(prompt, 2000);
  if (!raw) return [];

  const parsed = safeParseJSON(raw);
  const sites: SuggestedSite[] = parsed?.sites ?? [];

  return sites
    .filter(s => s.name && s.url)
    .map((s, i) => ({
      ...s,
      id: s.id || `site_${i+1}`,
      favicon: s.favicon || `https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`,
      creditCost: s.creditCost ?? (s.fetchMethod === "firecrawl" ? 1 : 0),
      relevanceScore: s.relevanceScore || 70,
      extractionHint: s.extractionHint || `Extract ${extractionRules.mustHaveFields.join(", ")} relevant to: ${qi.refinedQuery}`,
    }))
    .sort((a,b) => (b.relevanceScore||0) - (a.relevanceScore||0))
    .slice(0, 10);
}

function encodeQueryForURL(q: string): string {
  return encodeURIComponent(q.replace(/\s+/g,"+"));
}

async function tryAI(prompt: string, maxTokens: number): Promise<string> {
  // Claude first
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-api-key":ANTHROPIC_KEY, "anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:maxTokens, messages:[{ role:"user", content:prompt }] }),
    });
    const d = await res.json();
    if (res.ok) return (d.content?.[0]?.text ?? "").trim();
  } catch {}

  // Groq fallback
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model, messages:[{ role:"user", content:prompt }], temperature:0.3, max_tokens:maxTokens }),
      });
      if (res.status === 429 || res.status === 404 || res.status === 400) continue;
      if (!res.ok) continue;
      const d = await res.json();
      const text = (d.choices?.[0]?.message?.content ?? "").trim();
      if (text) return text;
    } catch {}
  }
  return "";
}

function safeParseJSON(raw: string): any | null {
  if (!raw) return null;
  for (const fn of [
    () => JSON.parse(raw),
    () => JSON.parse(raw.replace(/```json\s*/i,"").replace(/```\s*$/,"").trim()),
    () => { const m=raw.match(/\{[\s\S]*\}/); return m?JSON.parse(m[0]):null; },
  ]) {
    try { const r=fn(); if(r&&typeof r==="object") return r; } catch {}
  }
  return null;
}

// ── POST ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    const { intent } = await req.json();
    if (!intent?.trim()) return NextResponse.json({ error:"Intent required" }, { status:400 });

    console.log("[suggest] Analyzing query:", intent);

    // Step 1: Deep query understanding
    const qi = await analyzeQuery(intent);
    console.log("[suggest] Query intelligence:", JSON.stringify(qi.entities));
    console.log("[suggest] Refined query:", qi.refinedQuery);

    // Step 2: Generate targeted sources
    const sites = await generateSources(qi, intent);

    if (!sites.length) {
      return NextResponse.json({ error:"Failed to generate suggestions" }, { status:503 });
    }

    console.log(`[suggest] Generated ${sites.length} sites for: ${qi.refinedQuery}`);

    return NextResponse.json({
      success: true,
      sites,
      queryCategory: qi.queryCategory,
      subjectLine:   qi.subjectLine,
      displayType:   qi.displayType,
      // Pass full intelligence to scrape route
      queryIntelligence: qi,
    });

  } catch (err: any) {
    console.error("[suggest] Error:", err);
    return NextResponse.json({ error:err.message }, { status:500 });
  }
}