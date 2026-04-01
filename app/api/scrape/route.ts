import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY!;
const NEWS_API_KEY = process.env.NEWS_API_KEY!;
const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

// ══════════════════════════════════════════════════════════════════
// STOCK UNIVERSE
// ══════════════════════════════════════════════════════════════════
const STOCK_UNIVERSE: Record<
  string,
  { symbol: string; name: string; market: string; country: string }
> = {
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

// ══════════════════════════════════════════════════════════════════
// DEMO DATA — shown when scraping succeeds but JS hasn't rendered
// These look real and give a great demo experience
// ══════════════════════════════════════════════════════════════════
function generateDemoData(
  category: string,
  intent: string,
): Record<string, string>[] {
  const cat = category.toLowerCase();

  if (/laptop|notebook|macbook/i.test(cat) || /laptop/i.test(intent)) {
    return [
      {
        name: "HP Pavilion 15 Core i5 12th Gen",
        price: "₹52,990",
        originalPrice: "₹67,990",
        discount: "22% off",
        rating: "4.3",
        reviews: "12,847",
        brand: "HP",
        specs: 'i5-1235U, 8GB RAM, 512GB SSD, 15.6" FHD',
        availability: "In Stock",
      },
      {
        name: "ASUS VivoBook 15 Ryzen 5 5500U",
        price: "₹42,990",
        originalPrice: "₹55,990",
        discount: "23% off",
        rating: "4.4",
        reviews: "9,234",
        brand: "ASUS",
        specs: 'Ryzen 5 5500U, 8GB RAM, 512GB SSD, 15.6" FHD',
        availability: "In Stock",
      },
      {
        name: "Lenovo IdeaPad Slim 3 Core i3 12th Gen",
        price: "₹34,990",
        originalPrice: "₹45,990",
        discount: "24% off",
        rating: "4.1",
        reviews: "7,561",
        brand: "Lenovo",
        specs: 'i3-1215U, 8GB RAM, 256GB SSD, 15.6" FHD',
        availability: "In Stock",
      },
      {
        name: "Dell Inspiron 15 Core i5 13th Gen",
        price: "₹58,990",
        originalPrice: "₹72,990",
        discount: "19% off",
        rating: "4.5",
        reviews: "5,892",
        brand: "Dell",
        specs: 'i5-1335U, 16GB RAM, 512GB SSD, 15.6" FHD',
        availability: "In Stock",
      },
      {
        name: "Acer Aspire 5 Core i5 12th Gen",
        price: "₹47,990",
        originalPrice: "₹60,990",
        discount: "21% off",
        rating: "4.2",
        reviews: "8,103",
        brand: "Acer",
        specs: 'i5-1235U, 8GB RAM, 512GB SSD, 15.6" FHD IPS',
        availability: "In Stock",
      },
      {
        name: "MSI Modern 15 Core i7 12th Gen",
        price: "₹72,990",
        originalPrice: "₹89,990",
        discount: "19% off",
        rating: "4.6",
        reviews: "3,421",
        brand: "MSI",
        specs: 'i7-1255U, 16GB RAM, 512GB SSD, 15.6" FHD IPS',
        availability: "In Stock",
      },
      {
        name: "Samsung Galaxy Book2 Core i5",
        price: "₹62,990",
        originalPrice: "₹79,990",
        discount: "21% off",
        rating: "4.3",
        reviews: "2,187",
        brand: "Samsung",
        specs: 'i5-1235U, 8GB RAM, 256GB SSD, 15.6" FHD AMOLED',
        availability: "In Stock",
      },
      {
        name: "Realme Book Prime Core i5 12th Gen",
        price: "₹44,990",
        originalPrice: "₹56,990",
        discount: "21% off",
        rating: "4.0",
        reviews: "4,329",
        brand: "Realme",
        specs: 'i5-1235U, 8GB RAM, 512GB SSD, 14" 2K IPS',
        availability: "In Stock",
      },
    ];
  }

  if (
    /phone|mobile|smartphone|iphone|samsung/i.test(cat) ||
    /phone|mobile/i.test(intent)
  ) {
    return [
      {
        name: "Samsung Galaxy S24 5G",
        price: "₹74,999",
        originalPrice: "₹79,999",
        discount: "6% off",
        rating: "4.5",
        reviews: "23,456",
        brand: "Samsung",
        specs: 'Snapdragon 8 Gen 3, 8GB RAM, 128GB, 6.2" AMOLED',
        availability: "In Stock",
      },
      {
        name: "iPhone 15 128GB",
        price: "₹79,900",
        originalPrice: "₹79,900",
        discount: "0% off",
        rating: "4.7",
        reviews: "18,932",
        brand: "Apple",
        specs: 'A16 Bionic, 6GB RAM, 128GB, 6.1" Super Retina XDR',
        availability: "In Stock",
      },
      {
        name: "OnePlus 12R 5G 128GB",
        price: "₹39,999",
        originalPrice: "₹42,999",
        discount: "7% off",
        rating: "4.4",
        reviews: "15,673",
        brand: "OnePlus",
        specs: 'Snapdragon 8 Gen 1, 8GB RAM, 128GB, 6.78" AMOLED',
        availability: "In Stock",
      },
      {
        name: "Redmi Note 13 Pro+ 5G",
        price: "₹29,999",
        originalPrice: "₹35,999",
        discount: "17% off",
        rating: "4.3",
        reviews: "31,245",
        brand: "Redmi",
        specs: 'Dimensity 7200, 8GB RAM, 256GB, 6.67" AMOLED 120Hz',
        availability: "In Stock",
      },
      {
        name: "Realme 12 Pro+ 5G 256GB",
        price: "₹26,999",
        originalPrice: "₹32,999",
        discount: "18% off",
        rating: "4.2",
        reviews: "12,087",
        brand: "Realme",
        specs: 'Snapdragon 7s Gen 2, 8GB RAM, 256GB, 6.7" AMOLED',
        availability: "In Stock",
      },
      {
        name: "Motorola Edge 50 Pro 5G",
        price: "₹31,999",
        originalPrice: "₹38,999",
        discount: "18% off",
        rating: "4.3",
        reviews: "8,543",
        brand: "Motorola",
        specs: 'Snapdragon 7 Gen 3, 12GB RAM, 256GB, 6.7" pOLED',
        availability: "In Stock",
      },
    ];
  }

  if (
    /vegetable|sabzi|grocery|fruit|dal|rice/i.test(cat) ||
    /vegetable|grocery/i.test(intent)
  ) {
    return [
      {
        name: "Fresh Tomato (Tamatar)",
        price: "₹35/kg",
        originalPrice: "₹45/kg",
        discount: "22% off",
        rating: "4.2",
        brand: "Fresh Harvest",
        specs: "Grade A, Farm Fresh, 500g pack",
        availability: "In Stock",
      },
      {
        name: "Potato (Aloo) Grade A",
        price: "₹28/kg",
        originalPrice: "₹32/kg",
        discount: "13% off",
        rating: "4.1",
        brand: "JioMart Fresh",
        specs: "Washed & Cleaned, 1kg pack",
        availability: "In Stock",
      },
      {
        name: "Onion (Pyaaz) Medium",
        price: "₹42/kg",
        originalPrice: "₹50/kg",
        discount: "16% off",
        rating: "4.3",
        brand: "Fresh Farms",
        specs: "Grade A, Red Onion, 500g",
        availability: "In Stock",
      },
      {
        name: "Spinach (Palak) Bundle",
        price: "₹25",
        originalPrice: "₹30",
        discount: "17% off",
        rating: "4.4",
        brand: "Organic India",
        specs: "Fresh, Pesticide-free, 250g bundle",
        availability: "In Stock",
      },
      {
        name: "Capsicum (Shimla Mirch) Mix",
        price: "₹60",
        originalPrice: "₹75",
        discount: "20% off",
        rating: "4.0",
        brand: "Fresh Harvest",
        specs: "Red+Yellow+Green Mix, 250g",
        availability: "In Stock",
      },
      {
        name: "Cauliflower (Gobi) Medium",
        price: "₹35",
        originalPrice: "₹40",
        discount: "13% off",
        rating: "4.1",
        brand: "JioMart Fresh",
        specs: "Medium size, Fresh, ~500g",
        availability: "In Stock",
      },
      {
        name: "Cucumber (Kheera)",
        price: "₹30/kg",
        originalPrice: "₹38/kg",
        discount: "21% off",
        rating: "4.2",
        brand: "Green Valley",
        specs: "Long English variety, 500g",
        availability: "In Stock",
      },
      {
        name: "Carrot (Gajar) Organic",
        price: "₹55/kg",
        originalPrice: "₹65/kg",
        discount: "15% off",
        rating: "4.5",
        brand: "Organic India",
        specs: "Organic, Red variety, 500g",
        availability: "In Stock",
      },
    ];
  }

  if (/tv|television/i.test(cat) || /tv|television/i.test(intent)) {
    return [
      {
        name: 'Samsung 55" 4K Crystal UHD Smart TV',
        price: "₹42,990",
        originalPrice: "₹62,990",
        discount: "32% off",
        rating: "4.4",
        reviews: "8,234",
        brand: "Samsung",
        specs: '55", 4K UHD, Crystal Processor, Tizen OS',
        availability: "In Stock",
      },
      {
        name: 'LG 43" 4K UHD Smart WebOS TV',
        price: "₹32,990",
        originalPrice: "₹48,990",
        discount: "33% off",
        rating: "4.3",
        reviews: "6,781",
        brand: "LG",
        specs: '43", 4K, α5 AI Processor, WebOS 23',
        availability: "In Stock",
      },
      {
        name: 'Sony Bravia 55" X75L 4K Google TV',
        price: "₹58,990",
        originalPrice: "₹79,990",
        discount: "26% off",
        rating: "4.6",
        reviews: "4,523",
        brand: "Sony",
        specs: '55", 4K, X1 Processor, Google TV, Dolby Vision',
        availability: "In Stock",
      },
      {
        name: 'Xiaomi Smart TV 5A 40" Full HD',
        price: "₹19,999",
        originalPrice: "₹28,999",
        discount: "31% off",
        rating: "4.1",
        reviews: "22,456",
        brand: "Xiaomi",
        specs: '40", Full HD, Android TV 11, 20W speakers',
        availability: "In Stock",
      },
    ];
  }

  if (
    /headphone|earphone|earbud|tws|speaker/i.test(cat) ||
    /headphone|audio/i.test(intent)
  ) {
    return [
      {
        name: "boAt Rockerz 550 Wireless Headphone",
        price: "₹1,299",
        originalPrice: "₹3,990",
        discount: "67% off",
        rating: "4.1",
        reviews: "45,231",
        brand: "boAt",
        specs: "40mm drivers, 20hr battery, BT 5.0, foldable",
        availability: "In Stock",
      },
      {
        name: "Sony WH-1000XM5 ANC Headphone",
        price: "₹24,990",
        originalPrice: "₹34,990",
        discount: "29% off",
        rating: "4.7",
        reviews: "12,087",
        brand: "Sony",
        specs: "30hr battery, ANC, LDAC, multipoint, foldable",
        availability: "In Stock",
      },
      {
        name: "JBL Tune 760NC Wireless Headphone",
        price: "₹4,999",
        originalPrice: "₹8,999",
        discount: "44% off",
        rating: "4.2",
        reviews: "18,932",
        brand: "JBL",
        specs: "50hr battery, ANC, Pure Bass, BT 5.0",
        availability: "In Stock",
      },
      {
        name: "Samsung Galaxy Buds2 Pro TWS",
        price: "₹8,999",
        originalPrice: "₹17,999",
        discount: "50% off",
        rating: "4.4",
        reviews: "9,345",
        brand: "Samsung",
        specs: "ANC, 29hr total, 360 Audio, IPX7",
        availability: "In Stock",
      },
      {
        name: "boAt Airdopes 141 TWS Earbuds",
        price: "₹999",
        originalPrice: "₹2,990",
        discount: "67% off",
        rating: "4.0",
        reviews: "89,123",
        brand: "boAt",
        specs: "42hr total, ENx tech, BT 5.1, IPX4",
        availability: "In Stock",
      },
    ];
  }

  // Generic product fallback
  const words = (category || intent).split(" ").slice(0, 2).join(" ");
  return [
    {
      name: `Premium ${words} - Model A`,
      price: "₹2,499",
      originalPrice: "₹3,999",
      discount: "38% off",
      rating: "4.3",
      reviews: "5,234",
      brand: "Brand A",
      specs: "Top specs, latest model, warranty included",
      availability: "In Stock",
    },
    {
      name: `${words} Pro Edition`,
      price: "₹3,999",
      originalPrice: "₹5,999",
      discount: "33% off",
      rating: "4.5",
      reviews: "3,891",
      brand: "Brand B",
      specs: "Pro grade, enhanced features, 1yr warranty",
      availability: "In Stock",
    },
    {
      name: `Budget ${words} - Value Pick`,
      price: "₹1,299",
      originalPrice: "₹1,999",
      discount: "35% off",
      rating: "4.0",
      reviews: "8,102",
      brand: "Brand C",
      specs: "Good for beginners, compact design",
      availability: "In Stock",
    },
    {
      name: `${words} Standard Edition`,
      price: "₹2,199",
      originalPrice: "₹2,999",
      discount: "27% off",
      rating: "4.2",
      reviews: "6,543",
      brand: "Brand D",
      specs: "Standard features, reliable build quality",
      availability: "In Stock",
    },
  ];
}

// ══════════════════════════════════════════════════════════════════
// HARDCODED URL PATTERNS — instant, zero Claude API call
// ══════════════════════════════════════════════════════════════════
function tryHardcodedUrl(intent: string): {
  url: string;
  displayType: "products" | "table" | "articles" | "comparison";
  category: string;
  searchHint: string;
} | null {
  const lower = intent.toLowerCase().trim();

  const cleanQuery = lower
    .replace(
      /on flipkart|on amazon(\.in)?|on jiomart|on myntra|on nykaa|on meesho|on snapdeal|on ajio/gi,
      "",
    )
    .replace(
      /\bflipkart\b|\bamazon\b|\bjiomart\b|\bmyntra\b|\bnykaa\b|\bmeesho\b|\bsnapdeal\b|\bajio\b/gi,
      "",
    )
    .replace(/\b(show me|find|search for|get|list|buy|look for|check)\b/gi, "")
    .replace(/\b(cheap|best|top|latest|new|good|affordable|premium)\b/gi, "")
    .replace(
      /under ₹?\d+k?|below ₹?\d+k?|above ₹?\d+k?|upto ₹?\d+k?|₹\d+[\d,]*/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  const searchTerm = cleanQuery || intent.trim();
  const encoded = encodeURIComponent(searchTerm);

  if (/\bflipkart\b/i.test(lower))
    return {
      url: `https://www.flipkart.com/search?q=${encoded}&sort=popularity`,
      displayType: "products",
      category: searchTerm,
      searchHint: "product cards",
    };
  if (/\bjiomart\b/i.test(lower))
    return {
      url: `https://www.jiomart.com/search#q=${encoded}&isSearchSubmitted=true`,
      displayType: "products",
      category: searchTerm,
      searchHint: "grocery listings",
    };
  if (/\bamazon\b/i.test(lower))
    return {
      url: `https://www.amazon.in/s?k=${encoded}`,
      displayType: "products",
      category: searchTerm,
      searchHint: "product cards",
    };
  if (/\bmyntra\b/i.test(lower))
    return {
      url: `https://www.myntra.com/${searchTerm.replace(/\s+/g, "-")}`,
      displayType: "products",
      category: searchTerm,
      searchHint: "fashion listings",
    };
  if (/\bnykaa\b/i.test(lower))
    return {
      url: `https://www.nykaa.com/search/result/?q=${encoded}`,
      displayType: "products",
      category: searchTerm,
      searchHint: "beauty product listings",
    };
  if (/\bzomato\b/i.test(lower))
    return {
      url: `https://www.zomato.com/mumbai/restaurants`,
      displayType: "table",
      category: "restaurants",
      searchHint: "restaurant listings",
    };
  if (/\bswiggy\b/i.test(lower))
    return {
      url: `https://www.swiggy.com/search?query=${encoded}`,
      displayType: "table",
      category: "food",
      searchHint: "food listings",
    };
  if (/\b(laptop|notebook|macbook|chromebook)\b/i.test(lower))
    return {
      url: `https://www.flipkart.com/search?q=${encoded}&sort=popularity`,
      displayType: "products",
      category: "laptops",
      searchHint: "laptop listings",
    };
  if (
    /\b(mobile|phone|smartphone|iphone|samsung|oneplus|redmi|realme|oppo|vivo|poco)\b/i.test(
      lower,
    )
  )
    return {
      url: `https://www.flipkart.com/search?q=${encoded}&sort=popularity`,
      displayType: "products",
      category: "smartphones",
      searchHint: "smartphone listings",
    };
  if (/\b(tv|television|smart tv|led tv|oled)\b/i.test(lower))
    return {
      url: `https://www.flipkart.com/search?q=${encoded}&sort=popularity`,
      displayType: "products",
      category: "televisions",
      searchHint: "TV listings",
    };
  if (
    /\b(headphone|earphone|earbud|tws|airpod|neckband|speaker|bluetooth)\b/i.test(
      lower,
    )
  )
    return {
      url: `https://www.flipkart.com/search?q=${encoded}&sort=popularity`,
      displayType: "products",
      category: "audio",
      searchHint: "audio listings",
    };
  if (
    /\b(vegetable|sabzi|fruit|grocery|groceries|dal|rice|atta|flour|oil|masala|spice|ration)\b/i.test(
      lower,
    )
  )
    return {
      url: `https://www.jiomart.com/search#q=${encoded}&isSearchSubmitted=true`,
      displayType: "products",
      category: "groceries",
      searchHint: "grocery listings",
    };
  if (/\b(shoe|sneaker|chappal|sandal|boot|footwear)\b/i.test(lower))
    return {
      url: `https://www.myntra.com/${encoded.replace(/%20/g, "-")}`,
      displayType: "products",
      category: "footwear",
      searchHint: "footwear listings",
    };
  if (
    /\b(shirt|kurta|dress|saree|jeans|pant|top|ethnic|tshirt|t-shirt|clothing|clothes|fashion)\b/i.test(
      lower,
    )
  )
    return {
      url: `https://www.myntra.com/${encoded.replace(/%20/g, "-")}`,
      displayType: "products",
      category: "clothing",
      searchHint: "clothing listings",
    };

  return null;
}

// ══════════════════════════════════════════════════════════════════
// INTENT ROUTER
// ══════════════════════════════════════════════════════════════════
type IntentType = "finance" | "nasa" | "hackernews" | "universal";

function detectIntent(input: string): {
  type: IntentType;
  stockKey?: string;
  multiStock?: boolean;
  pastedUrl?: string;
} {
  const lower = input.toLowerCase().trim();
  if (/^https?:\/\//i.test(input.trim()))
    return { type: "universal", pastedUrl: input.trim() };
  if (
    /nasa|space|asteroid|mars|rocket|planet|galaxy|telescope|wildfire|volcano|earth event/i.test(
      lower,
    )
  )
    return { type: "nasa" };
  if (/hacker.?news|hacker news|\bhn\b|tech news/i.test(lower))
    return { type: "hackernews" };

  const hasStockContext =
    /\bstock\b|\bshare\b|\binvest\b|\btrading\b|\bmarket cap\b|\bpe ratio\b|\banalysis\b/i.test(
      lower,
    );
  if (hasStockContext) {
    for (const key of Object.keys(STOCK_UNIVERSE)) {
      if (lower.includes(key)) return { type: "finance", stockKey: key };
    }
  }

  const hasEcommercePlatform =
    /flipkart|jiomart|amazon|myntra|nykaa|meesho|snapdeal|ajio|zomato|swiggy/i.test(
      lower,
    );
  if (
    !hasEcommercePlatform &&
    /\bstock\b|\bfinance\b|\bmarket\b|\bshare\b|\binvest\b|\btrading\b|\bnifty\b|\bsensex\b|\bcommodity\b/i.test(
      lower,
    )
  ) {
    return { type: "finance", multiStock: true };
  }

  return { type: "universal" };
}

// ══════════════════════════════════════════════════════════════════
// STEP 1: Claude resolves URL (fallback when hardcoded misses)
// ══════════════════════════════════════════════════════════════════
async function resolveUrlFromIntent(intent: string): Promise<{
  url: string;
  displayType: "products" | "table" | "articles" | "comparison";
  category: string;
  searchHint: string;
}> {
  const prompt = `User query: "${intent}"
Return ONLY raw JSON. Start with { end with }. No markdown, no explanation.
{"url":"complete https URL","displayType":"products","category":"one word","searchHint":"brief"}
Rules: products → flipkart.com search, groceries → jiomart.com, restaurants → zomato.com`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const raw = (data.content?.[0]?.text ?? "").trim();
      for (const fn of [
        () => JSON.parse(raw),
        () => {
          const m = raw.match(/\{[^{}]*\}/);
          return m ? JSON.parse(m[0]) : null;
        },
      ]) {
        try {
          const p = fn();
          if (p?.url?.startsWith("http"))
            return {
              url: p.url,
              displayType: p.displayType ?? "products",
              category: p.category ?? "products",
              searchHint: p.searchHint ?? "",
            };
        } catch {}
      }
      const urlMatch = raw.match(/https?:\/\/[^\s"']+/);
      if (urlMatch)
        return {
          url: urlMatch[0],
          displayType: "products",
          category: "products",
          searchHint: "",
        };
    } catch {
      if (attempt < 1) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Could not resolve URL");
}

// ══════════════════════════════════════════════════════════════════
// STEP 2: Firecrawl with JS-rendering actions
// ══════════════════════════════════════════════════════════════════
async function firecrawlScrape(url: string): Promise<{
  markdown: string;
  html: string;
  metadata: any;
}> {
  // Determine if this needs JS rendering actions
  const needsActions = /flipkart|amazon|myntra|nykaa|meesho|ajio/i.test(url);

  const body: any = {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
    waitFor: needsActions ? 4000 : 2500,
    timeout: 30000,
  };

  // For JS-heavy sites: scroll to trigger lazy loading
  if (needsActions) {
    body.actions = [
      { type: "wait", milliseconds: 2000 },
      { type: "scroll", direction: "down", amount: 800 },
      { type: "wait", milliseconds: 1000 },
      { type: "scroll", direction: "down", amount: 800 },
    ];
  }

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIRECRAWL_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok)
    throw new Error(`Firecrawl error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Firecrawl failed");

  return {
    markdown: data.data?.markdown ?? "",
    html: data.data?.html ?? "",
    metadata: data.data?.metadata ?? {},
  };
}

// ══════════════════════════════════════════════════════════════════
// STEP 3: Claude extracts structured records from markdown
// ══════════════════════════════════════════════════════════════════
async function structureWithClaude(
  markdown: string,
  intent: string,
  category: string,
  url: string,
): Promise<{
  records: Record<string, string>[];
  images: string[];
  siteType: string;
}> {
  const truncated = markdown.slice(0, 9000);
  const isProduct =
    /flipkart|amazon|myntra|nykaa|meesho|product|shop|store|buy/i.test(
      url + intent,
    );
  const siteType = isProduct ? "ecommerce" : "general";

  const prompt = `You are extracting structured data from a scraped webpage.

User searched for: "${intent}"
URL: ${url}
Category: ${category}

RAW PAGE CONTENT:
${truncated}

Your job: Find and extract EVERY product/item/listing visible in this content.

Look for patterns like:
- Product names followed by prices (₹ amounts)
- Ratings (like 4.2 or 4.2★)  
- Discount text (like "20% off" or "Save ₹500")
- Brand names
- Spec details

Even if the content is messy or incomplete, extract what you can.

Return ONLY raw JSON (no markdown, no backticks). Must start with { and end with }:
{
  "siteType": "${siteType}",
  "records": [
    {
      "name": "exact product name as it appears",
      "price": "price with ₹ symbol",
      "originalPrice": "MRP if crossed out",
      "discount": "% off or save amount",
      "rating": "numeric rating",
      "reviews": "review count",
      "brand": "brand name",
      "specs": "specs or description in one line",
      "availability": "In Stock or Out of Stock"
    }
  ],
  "pageTitle": "title of the page",
  "totalFound": "total results count if visible"
}

If you find fewer than 3 complete products, still return what you found. 
If the page has navigation/login walls/empty content, set records to [] and note it in pageTitle.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? "").trim();

  let parsed: any = null;
  for (const fn of [
    () => JSON.parse(raw),
    () => {
      const m = raw.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    },
    () => JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()),
  ]) {
    try {
      const r = fn();
      if (r?.records !== undefined) {
        parsed = r;
        break;
      }
    } catch {}
  }

  const records: Record<string, string>[] = (parsed?.records ?? [])
    .map((r: any) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        const val = String(v ?? "").trim();
        if (val && val !== "null" && val !== "undefined" && val !== "N/A")
          out[k] = val;
      }
      return out;
    })
    .filter((r: Record<string, string>) => Object.keys(r).length > 1);

  const imgMatches = markdown.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g) ?? [];
  const images = imgMatches
    .map((m) => m.match(/\((https?:\/\/[^)]+)\)/)?.[1] ?? "")
    .filter(Boolean)
    .slice(0, 12);

  return {
    records,
    images,
    siteType: parsed?.siteType ?? siteType,
  };
}

// ══════════════════════════════════════════════════════════════════
// EXISTING: Stock / NASA / HN data fetchers (unchanged)
// ══════════════════════════════════════════════════════════════════
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
  const avgVol = avg(ohlcv.slice(0, 20).map((d) => d.volume));
  const curVol = ohlcv[0]?.volume || 0;
  const volumeSignal =
    curVol > avgVol * 1.5
      ? "High volume ⚠️"
      : curVol < avgVol * 0.5
        ? "Low volume"
        : "Normal volume";
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
      avgVolume: Math.round(avgVol).toLocaleString(),
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
      const price = parseFloat(q["05. price"]),
        change = parseFloat(q["09. change"]);
      results.push({
        flag: stock.flag,
        symbol: stock.symbol.replace(".BSE", ""),
        name: stock.name,
        price: price.toFixed(2),
        change: change.toFixed(2),
        changePercent: q["10. change percent"]?.replace("%", "").trim(),
        direction: change >= 0 ? "▲" : "▼",
        sentiment: change >= 0 ? "positive" : "negative",
        volume: parseInt(q["06. volume"] || "0").toLocaleString(),
        high: parseFloat(q["03. high"]).toFixed(2),
        low: parseFloat(q["04. low"]).toFixed(2),
        date: q["07. latest trading day"],
      });
      await new Promise((r) => setTimeout(r, 400));
    } catch {
      continue;
    }
  }
  return results;
}

async function fetchStockNews(query: string, companyName: string) {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(companyName + " stock")}&sortBy=publishedAt&language=en&pageSize=15&apiKey=${NEWS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "ok") return [];
    return (data.articles || []).map((a: any) => {
      const s = analyzeSentiment(a.title + " " + (a.description || ""));
      return {
        title: a.title || "",
        source: a.source?.name || "",
        url: a.url || "",
        publishedAt: a.publishedAt?.split("T")[0] || "",
        description: a.description?.slice(0, 200) || "",
        sentiment: s.label,
        sentimentScore: s.score,
        author: a.author || "",
      };
    });
  } catch {
    return [];
  }
}

function analyzeSentiment(text: string) {
  const lower = text.toLowerCase();
  let score = 0;
  [
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
  ].forEach((w) => {
    if (lower.includes(w)) score += 1;
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
  ].forEach((w) => {
    if (lower.includes(w)) score -= 1;
  });
  if (score > 1) return { label: "🟢 Bullish", score };
  if (score < -1) return { label: "🔴 Bearish", score };
  return { label: "🟡 Neutral", score };
}

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
    .filter((s: any) => s.title && s.score)
    .map((s: any) => ({
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

// Technical helpers
function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0,
    losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const ag = gains / period,
    al = losses / period;
  if (al === 0) return 100;
  return parseFloat((100 - 100 / (1 + ag / al)).toFixed(2));
}
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1),
    ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++)
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  return ema;
}
function calculateMACD(closes: number[]) {
  if (closes.length < 26)
    return { macd: 0, signal: 0, histogram: 0, trend: "Insufficient data" };
  const ema12 = calculateEMA(closes, 12),
    ema26 = calculateEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = calculateEMA(macdLine.slice(-9), 9);
  const macd = parseFloat(macdLine[macdLine.length - 1].toFixed(4)),
    sig = parseFloat(signal[signal.length - 1].toFixed(4));
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
  const slice = closes.slice(-period),
    mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(
    slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period,
  );
  const upper = parseFloat((mean + 2 * std).toFixed(2)),
    lower = parseFloat((mean - 2 * std).toFixed(2));
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
  let b = 0,
    be = 0;
  if (rsi < 70 && rsi > 40) b++;
  if (rsi >= 70) be++;
  if (rsi <= 30) b += 2;
  if (macd.histogram > 0) b++;
  else be++;
  if (price > ma50) b++;
  else be++;
  if (price > ma200) b++;
  else be++;
  if (ma50 > ma200) b++;
  else be++;
  const t = b + be,
    p = Math.round((b / t) * 100);
  if (p >= 70) return `🟢 Strong Buy (${p}% bullish)`;
  if (p >= 55) return `🟩 Buy (${p}% bullish)`;
  if (p >= 45) return `🟡 Hold (${p}% bullish)`;
  if (p >= 30) return `🟥 Sell (${p}% bullish)`;
  return `🔴 Strong Sell (${p}% bullish)`;
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

// ══════════════════════════════════════════════════════════════════
// MAIN POST HANDLER
// ══════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { intent } = await req.json();
    if (!intent?.trim())
      return NextResponse.json({ error: "Intent required" }, { status: 400 });

    const detected = detectIntent(intent);

    // ── UNIVERSAL ENGINE ───────────────────────────────────────────
    if (detected.type === "universal") {
      let url = "";
      let displayType = "products";
      let category = "products";
      let pageTitle = "";
      let usedDemoData = false;

      try {
        // Resolve URL
        if (detected.pastedUrl) {
          url = detected.pastedUrl;
          displayType = /flipkart|amazon|myntra|nykaa|meesho/i.test(url)
            ? "products"
            : "table";
          category = "products";
        } else {
          const hardcoded = tryHardcodedUrl(intent);
          if (hardcoded) {
            url = hardcoded.url;
            displayType = hardcoded.displayType;
            category = hardcoded.category;
          } else {
            const resolved = await resolveUrlFromIntent(intent);
            url = resolved.url;
            displayType = resolved.displayType;
            category = resolved.category;
          }
        }

        // Scrape
        const { markdown, metadata } = await firecrawlScrape(url);
        pageTitle = metadata?.title ?? "";

        let records: Record<string, string>[] = [];
        let images: string[] = [];
        let siteType = displayType === "products" ? "ecommerce" : "general";

        if (markdown && markdown.length >= 100) {
          const structured = await structureWithClaude(
            markdown,
            intent,
            category,
            url,
          );
          records = structured.records;
          images = structured.images;
          siteType = structured.siteType;
        }

        // ── KEY FIX: if scraping got < 3 products, use demo data ──
        if (records.length < 3 && displayType === "products") {
          console.log(
            `[scrape] Only ${records.length} records from live scrape — using demo data for: ${intent}`,
          );
          records = generateDemoData(category, intent);
          usedDemoData = true;
          siteType = "ecommerce";
          pageTitle = pageTitle || `${category} — Sample Results`;
        }

        if (!records.length) {
          return NextResponse.json({
            error: "no_data",
            message:
              "Could not extract data from this page. Try a different query or paste a URL directly.",
            suggestions: [
              "Show Apple stock analysis",
              "Get NASA space news",
              "Show Hacker News top stories",
            ],
          });
        }

        return NextResponse.json({
          success: true,
          config: {
            url,
            siteType,
            selectors: [],
            dataKeys: [],
            displayType,
            category,
            pageTitle,
            usedDemoData,
          },
          data: { records, images, rawText: category },
          meta: {
            totalRecords: records.length,
            scrapedAt: new Date().toISOString(),
            sourceUrl: url,
            dataSize: `~${Math.max(1, Math.round(JSON.stringify(records).length / 1024))} KB`,
            note: usedDemoData
              ? "Showing representative sample data — live site blocked scraping"
              : undefined,
          },
          enriched: { displayType, category, pageTitle },
        });
      } catch (err: any) {
        console.error("Universal engine error:", err);

        // Last resort: serve demo data so the demo never fully breaks
        if (
          displayType === "products" ||
          /laptop|phone|mobile|tv|grocery|vegetable|shoe|cloth/i.test(intent)
        ) {
          const demoRecords = generateDemoData(category || "products", intent);
          return NextResponse.json({
            success: true,
            config: {
              url: url || "demo",
              siteType: "ecommerce",
              selectors: [],
              dataKeys: [],
              displayType: "products",
              category: category || "products",
              pageTitle: `${category || intent} — Sample Data`,
              usedDemoData: true,
            },
            data: { records: demoRecords, images: [], rawText: category },
            meta: {
              totalRecords: demoRecords.length,
              scrapedAt: new Date().toISOString(),
              sourceUrl: url || "demo",
              dataSize: "~2 KB",
              note: "Showing representative sample data — live site could not be scraped",
            },
            enriched: {
              displayType: "products",
              category: category || "products",
              pageTitle: "",
            },
          });
        }

        const msg = err.message ?? "";
        let userMessage = "Could not fetch this data. ";
        if (msg.includes("402") || msg.includes("429"))
          userMessage += "Firecrawl rate limit hit — try again in a moment.";
        else if (msg.includes("Firecrawl"))
          userMessage += "The website blocked scraping.";
        else userMessage += msg.slice(0, 120);

        return NextResponse.json({
          error: "no_data",
          message: userMessage,
          suggestions: [
            "Show Reliance stock analysis",
            "Get NASA space news",
            "Show Hacker News top stories",
          ],
        });
      }
    }

    // ── FINANCE DEEP ───────────────────────────────────────────────
    if (detected.type === "finance" && detected.stockKey) {
      const stockInfo = STOCK_UNIVERSE[detected.stockKey];
      const [stockData, newsArticles] = await Promise.all([
        fetchDeepStockData(stockInfo.symbol),
        fetchStockNews(stockInfo.symbol, stockInfo.name),
      ]);
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
        {
          Category: "💰 Price",
          Metric: "Current Price",
          Value: `${stockData.quote.price} ${stockData.fundamentals.currency}`,
        },
        {
          Category: "💰 Price",
          Metric: "Day Change",
          Value: `${stockData.quote.change} (${stockData.quote.changePercent})`,
        },
        {
          Category: "💰 Price",
          Metric: "Volume",
          Value: stockData.quote.volume.toLocaleString(),
        },
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
          Metric: "EPS",
          Value: stockData.fundamentals.eps,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "ROE",
          Value: stockData.fundamentals.roe,
        },
        {
          Category: "📊 Fundamentals",
          Metric: "52W High/Low",
          Value: `${stockData.fundamentals.week52High} / ${stockData.fundamentals.week52Low}`,
        },
        {
          Category: "📈 Technicals",
          Metric: "Overall Signal",
          Value: stockData.technicals.overallSignal,
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
          Metric: "Trend",
          Value: stockData.technicals.trend,
        },
        {
          Category: "📰 News",
          Metric: "Overall Sentiment",
          Value: overallNewsSentiment,
        },
        {
          Category: "📰 News",
          Metric: "Bullish / Bearish",
          Value: `${bullishCount} bullish, ${bearishCount} bearish`,
        },
        ...newsArticles.slice(0, 8).map((n: any) => ({
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
          sourceUrl: "https://www.alphavantage.co",
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

    // ── FINANCE WATCHLIST ──────────────────────────────────────────
    if (detected.type === "finance" && detected.multiStock) {
      const stocks = await fetchWatchlist();
      if (!stocks.length)
        return NextResponse.json({
          error: "no_data",
          message: "Could not fetch market data. Please try again.",
        });
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

    // ── NASA ───────────────────────────────────────────────────────
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
        })),
        ...nasaImages.map((img: any) => ({
          "Data Type": "🖼️ NASA Image",
          Title: img.title,
          Description: img.description,
          Date: img.date,
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

    // ── HACKERNEWS ─────────────────────────────────────────────────
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
        rawText: stories.map((s) => `${s.score}pts — ${s.title}`).join("\n"),
      },
      meta: {
        totalRecords: records.length,
        scrapedAt: new Date().toISOString(),
        sourceUrl: "https://hacker-news.firebaseio.com",
        dataSize: `~${Math.max(1, Math.round(JSON.stringify(records).length / 1024))} KB`,
      },
      enriched: { stories },
    });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
