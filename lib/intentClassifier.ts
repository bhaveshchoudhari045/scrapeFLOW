// ── Universal Keyword-Based Intent Classifier ─────────────────────────────
// No API key needed — pure keyword matching, instant, zero cost

export interface ClassifiedIntent {
  category: string;
  subCategory: string;
  subjectLine: string;
  fetchStrategy: string[];
  searchQuery: string;
  url?: string;
}

const ECOMMERCE_SITES: Record<string, string> = {
  amazon: "https://www.amazon.in/s?k=",
  flipkart: "https://www.flipkart.com/search?q=",
  jiomart: "https://www.jiomart.com/search#q=",
  meesho: "https://www.meesho.com/search?q=",
  myntra: "https://www.myntra.com/",
  snapdeal: "https://www.snapdeal.com/search?keyword=",
  nykaa: "https://www.nykaa.com/search/result/?q=",
};

export function classifyIntent(input: string): ClassifiedIntent {
  const lower = input.toLowerCase().trim();

  // ── Extract URL if pasted directly ──────────────────────────────────────
  const urlMatch = input.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    const url = urlMatch[0];
    const domain = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/)?.[1] ?? "";
    return {
      category: "direct_url",
      subCategory: detectDomainType(domain),
      subjectLine: `Content from ${domain}`,
      fetchStrategy: ["firecrawl"],
      searchQuery: input,
      url,
    };
  }

  // ── NASA / Space ─────────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "nasa",
      "space",
      "asteroid",
      "mars",
      "moon",
      "rocket",
      "satellite",
      "planet",
      "galaxy",
      "telescope",
      "cosmos",
      "orbit",
      "iss ",
      "artemis",
      "jwst",
      "solar",
      "nebula",
      "comet",
      "lunar",
      "spacecraft",
      "astronomy",
    ])
  ) {
    return {
      category: "science_space",
      subCategory: "nasa",
      subjectLine: extractSubject(input, ["nasa", "space", "asteroid"]),
      fetchStrategy: ["nasa"],
      searchQuery: input,
    };
  }

  // ── Finance: Crypto ───────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "bitcoin",
      "btc",
      "ethereum",
      "eth",
      "crypto",
      "cryptocurrency",
      "blockchain",
      "defi",
      "nft",
      "solana",
      "dogecoin",
      "binance",
      "coinbase",
      "web3",
      "altcoin",
      "token",
      "wallet",
    ])
  ) {
    return {
      category: "finance_crypto",
      subCategory: "crypto",
      subjectLine: extractSubject(input, ["bitcoin", "crypto", "ethereum"]),
      fetchStrategy: ["news", "hackernews"],
      searchQuery: input,
    };
  }

  // ── Finance: Stocks ───────────────────────────────────────────────────────
  const stockKeywords = [
    "stock",
    "share",
    "equity",
    "nifty",
    "sensex",
    "bse",
    "nse",
    "nasdaq",
    "nyse",
    "market cap",
    "ipo",
    "dividend",
    "portfolio",
    "trading",
    "invest",
    "bull",
    "bear",
    "rally",
    "correction",
    "mutual fund",
  ];
  const stockCompanies = [
    "reliance",
    "tata",
    "infosys",
    "hdfc",
    "adani",
    "wipro",
    "apple",
    "nvidia",
    "microsoft",
    "google",
    "amazon",
    "tesla",
    "meta",
    "icici",
    "bajaj",
    "gold",
    "silver",
    "oil",
    "crude",
  ];

  if (matchAny(lower, [...stockKeywords, ...stockCompanies])) {
    const company = stockCompanies.find((c) => lower.includes(c));
    return {
      category: "finance_stocks",
      subCategory: company ? "single_stock" : "market",
      subjectLine: company ?? "stock market",
      fetchStrategy: ["alphavantage", "news"],
      searchQuery: company ?? input,
    };
  }

  // ── E-commerce: Products ──────────────────────────────────────────────────
  const ecomSites = Object.keys(ECOMMERCE_SITES);
  const ecomKeywords = [
    "buy",
    "price",
    "deal",
    "offer",
    "sale",
    "discount",
    "cheap",
    "product",
    "shop",
    "order",
    "cart",
    "review",
    "rating",
    "best",
    "under ₹",
    "under rs",
    "under inr",
    "laptop",
    "phone",
    "mobile",
    "headphone",
    "tv ",
    "refrigerator",
    "washing machine",
    "shoes",
    "dress",
    "shirt",
    "trouser",
    "watch",
    "camera",
    "tablet",
    "gaming",
    "furniture",
    "mattress",
    "grocery",
    "vegetable",
    "fruit",
    "dal",
    "rice",
    "oil",
  ];

  const detectedSite = ecomSites.find((s) => lower.includes(s));

  if (detectedSite || matchAny(lower, ecomKeywords)) {
    const site = detectedSite ?? "flipkart";
    const product = extractProduct(input, [...ecomSites, ...ecomKeywords]);
    return {
      category: "ecommerce_product",
      subCategory: site,
      subjectLine: product,
      fetchStrategy: ["firecrawl"],
      searchQuery: product,
      url: ECOMMERCE_SITES[site] + encodeURIComponent(product),
    };
  }

  // ── Health / Medical ──────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "disease",
      "medicine",
      "drug",
      "treatment",
      "symptom",
      "diagnosis",
      "hospital",
      "doctor",
      "health",
      "medical",
      "clinical",
      "patient",
      "cancer",
      "diabetes",
      "covid",
      "vaccine",
      "surgery",
      "therapy",
      "mental health",
      "depression",
      "anxiety",
      "nutrition",
      "diet",
      "vitamin",
    ])
  ) {
    return {
      category: "health_medical",
      subCategory: "medical",
      subjectLine: extractSubject(input, [
        "disease",
        "medicine",
        "treatment",
        "health",
      ]),
      fetchStrategy: ["pubmed", "news", "wikipedia"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Academic / Research ───────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "research",
      "paper",
      "study",
      "journal",
      "academic",
      "science",
      "biology",
      "chemistry",
      "physics",
      "mathematics",
      "algorithm",
      "machine learning",
      "deep learning",
      "neural",
      "quantum",
      "dna",
      "gene",
      "protein",
      "climate",
      "ecology",
      "evolution",
      "thesis",
      "arxiv",
      "pubmed",
      "scholar",
      "citation",
      "experiment",
      "hypothesis",
    ])
  ) {
    return {
      category: "academic_research",
      subCategory: "research",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["semantic_scholar", "arxiv", "pubmed", "wikipedia"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Technology / AI ───────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "ai",
      "artificial intelligence",
      "chatgpt",
      "openai",
      "claude",
      "llm",
      "gpt",
      "programming",
      "code",
      "software",
      "developer",
      "startup",
      "tech",
      "javascript",
      "python",
      "rust",
      "golang",
      "framework",
      "database",
      "cloud",
      "aws",
      "azure",
      "kubernetes",
      "docker",
      "cybersecurity",
      "hack",
      "vulnerability",
      "open source",
      "api",
    ])
  ) {
    return {
      category: "technology",
      subCategory: "tech",
      subjectLine: extractSubject(input, ["ai", "tech", "software", "code"]),
      fetchStrategy: ["hackernews", "news", "reddit"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── News / Current Events ─────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "news",
      "latest",
      "today",
      "breaking",
      "update",
      "current",
      "war",
      "conflict",
      "election",
      "politics",
      "government",
      "policy",
      "economy",
      "inflation",
      "gdp",
      "recession",
      "sanctions",
      "trade",
      "protest",
      "strike",
      "disaster",
      "earthquake",
      "flood",
      "hurricane",
      "iran",
      "russia",
      "ukraine",
      "china",
      "usa",
      "india",
      "pakistan",
      "israel",
      "gaza",
      "nato",
      "un ",
      "g20",
      "summit",
      "treaty",
    ])
  ) {
    return {
      category: "news_current",
      subCategory: "geopolitical",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["news", "reddit", "hackernews"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Reddit / Community ────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "reddit",
      "r/",
      "subreddit",
      "upvote",
      "community opinion",
      "what do people think",
      "discussion",
      "forum",
      "opinion",
      "review",
    ])
  ) {
    return {
      category: "social_reddit",
      subCategory: "reddit",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["reddit", "hackernews"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Jobs / Hiring ─────────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "job",
      "hiring",
      "salary",
      "career",
      "internship",
      "fresher",
      "resume",
      "interview",
      "work from home",
      "remote",
      "linkedin",
      "naukri",
      "indeed",
      "glassdoor",
      "fresherworld",
      "placement",
    ])
  ) {
    return {
      category: "jobs_career",
      subCategory: "jobs",
      subjectLine: extractSubject(input, ["job", "hiring", "salary", "career"]),
      fetchStrategy: ["news", "hackernews", "reddit"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Sports ────────────────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "cricket",
      "football",
      "ipl",
      "fifa",
      "nba",
      "tennis",
      "sport",
      "match",
      "score",
      "team",
      "player",
      "tournament",
      "league",
      "icc",
      "bcci",
      "epl",
      "champions league",
      "olympics",
    ])
  ) {
    return {
      category: "sports",
      subCategory: "sports",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["news", "reddit"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Entertainment ─────────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "movie",
      "film",
      "series",
      "netflix",
      "amazon prime",
      "hotstar",
      "bollywood",
      "hollywood",
      "actor",
      "actress",
      "director",
      "music",
      "song",
      "album",
      "artist",
      "concert",
      "anime",
      "manga",
      "game",
      "gaming",
      "playstation",
      "xbox",
      "nintendo",
      "streaming",
    ])
  ) {
    return {
      category: "entertainment",
      subCategory: "entertainment",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["news", "reddit"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Environment / Climate ─────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "climate",
      "environment",
      "global warming",
      "carbon",
      "emission",
      "renewable",
      "solar energy",
      "wind energy",
      "pollution",
      "plastic",
      "sustainability",
      "green",
      "ecosystem",
      "deforestation",
      "biodiversity",
    ])
  ) {
    return {
      category: "environment",
      subCategory: "climate",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["news", "semantic_scholar", "reddit"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Travel ────────────────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "travel",
      "trip",
      "tour",
      "hotel",
      "flight",
      "visa",
      "passport",
      "destination",
      "tourist",
      "vacation",
      "holiday",
      "backpack",
      "airbnb",
      "booking.com",
      "makemytrip",
      "goibibo",
    ])
  ) {
    return {
      category: "travel",
      subCategory: "travel",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["news", "reddit"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Real Estate ───────────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "property",
      "real estate",
      "apartment",
      "flat",
      "house",
      "rent",
      "buy home",
      "plot",
      "commercial",
      "residential",
      "magicbricks",
      "99acres",
      "housing",
      "builder",
      "construction",
      "interior",
    ])
  ) {
    return {
      category: "real_estate",
      subCategory: "property",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["news", "reddit"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Food / Recipe ─────────────────────────────────────────────────────────
  if (
    matchAny(lower, [
      "recipe",
      "food",
      "cook",
      "restaurant",
      "cuisine",
      "ingredient",
      "dish",
      "meal",
      "breakfast",
      "lunch",
      "dinner",
      "snack",
      "dessert",
      "vegetarian",
      "vegan",
      "zomato",
      "swiggy",
      "uber eats",
    ])
  ) {
    return {
      category: "food",
      subCategory: "food",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["news", "reddit"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── HackerNews default for tech-adjacent ─────────────────────────────────
  if (
    matchAny(lower, ["hacker news", "hackernews", "hn ", "show hn", "ask hn"])
  ) {
    return {
      category: "social_hn",
      subCategory: "hackernews",
      subjectLine: cleanQuery(input),
      fetchStrategy: ["hackernews"],
      searchQuery: cleanQuery(input),
    };
  }

  // ── Universal fallback — news + wikipedia + reddit ────────────────────────
  return {
    category: "general",
    subCategory: "general",
    subjectLine: cleanQuery(input),
    fetchStrategy: ["news", "wikipedia", "reddit"],
    searchQuery: cleanQuery(input),
  };
}

// ── Helper functions ───────────────────────────────────────────────────────
function matchAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function cleanQuery(input: string): string {
  return input
    .replace(
      /show me|get me|fetch|find|search|tell me about|what is|give me|i want|can you|please/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractSubject(input: string, stopWords: string[]): string {
  const cleaned = cleanQuery(input);
  for (const word of stopWords) {
    const idx = cleaned.toLowerCase().indexOf(word);
    if (idx !== -1) {
      const after = cleaned
        .slice(idx)
        .replace(new RegExp(word, "i"), "")
        .trim();
      if (after.length > 3) return after.slice(0, 60);
    }
  }
  return cleaned.slice(0, 60);
}

function extractProduct(input: string, stopWords: string[]): string {
  let cleaned = cleanQuery(input);
  for (const word of stopWords) {
    cleaned = cleaned.replace(new RegExp(word, "gi"), "").trim();
  }
  return cleaned.replace(/\s+/g, " ").trim().slice(0, 80) || input.slice(0, 80);
}

function detectDomainType(domain: string): string {
  if (matchAny(domain, ["amazon", "flipkart", "jiomart", "meesho", "myntra"]))
    return "ecommerce";
  if (matchAny(domain, ["reddit"])) return "social";
  if (matchAny(domain, ["github"])) return "code";
  if (matchAny(domain, ["youtube"])) return "video";
  if (matchAny(domain, ["wikipedia"])) return "encyclopedia";
  return "article";
}
