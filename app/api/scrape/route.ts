import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const SITE_CONFIGS: Record<
  string,
  {
    url: string;
    selectors: string[];
    dataKeys: string[];
    siteType: string;
    waitFor: number;
  }
> = {
  hackernews: {
    url: "https://news.ycombinator.com/",
    selectors: [".titleline > a", ".score", ".age a", ".hnuser"],
    dataKeys: ["title", "points", "posted", "author"],
    siteType: "news",
    waitFor: 1000,
  },
  nasa: {
    url: "https://www.nasa.gov/news/",
    selectors: [
      "h3.hds-content-item__title",
      ".hds-content-item__description",
      "time",
    ],
    dataKeys: ["title", "description", "date"],
    siteType: "science",
    waitFor: 2000,
  },
  finance: {
    url: "https://finance.yahoo.com/markets/stocks/most-active/",
    selectors: [
      'td[aria-label="Symbol"]',
      'td[aria-label="Name"]',
      'td[aria-label="Price (Intraday)"]',
      'td[aria-label="% Change"]',
      'td[aria-label="Volume"]',
    ],
    dataKeys: ["symbol", "name", "price", "change%", "volume"],
    siteType: "finance",
    waitFor: 3000,
  },
};

function detectSite(input: string): string {
  const lower = input.toLowerCase();
  if (
    lower.includes("hacker") ||
    lower.includes("hn") ||
    lower.includes("tech news")
  )
    return "hackernews";
  if (
    lower.includes("nasa") ||
    lower.includes("space") ||
    lower.includes("science")
  )
    return "nasa";
  if (
    lower.includes("stock") ||
    lower.includes("finance") ||
    lower.includes("yahoo") ||
    lower.includes("market") ||
    lower.includes("tata") ||
    lower.includes("nifty") ||
    lower.includes("sensex") ||
    lower.includes("price") ||
    lower.includes("byfinance")
  )
    return "finance";
  return "hackernews"; // safe default
}

async function scrape(
  url: string,
  selectors: string[],
  dataKeys: string[],
  waitFor: number,
) {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await new Promise((resolve) => setTimeout(resolve, waitFor));

    const extracted: Record<string, string[]> = {};
    for (let i = 0; i < selectors.length; i++) {
      try {
        extracted[dataKeys[i]] = await page.$$eval(selectors[i], (els) =>
          els
            .slice(0, 30)
            .map((el) => (el as HTMLElement).innerText?.trim() || "")
            .filter(Boolean),
        );
      } catch {
        extracted[dataKeys[i]] = [];
      }
    }

    const maxLen = Math.max(
      ...Object.values(extracted).map((v) => v.length),
      0,
    );
    const records: Record<string, string>[] = [];
    for (let i = 0; i < Math.min(maxLen, 20); i++) {
      const row: Record<string, string> = {};
      let hasValue = false;
      for (const key of dataKeys) {
        if (extracted[key]?.[i]) {
          row[key] = extracted[key][i];
          hasValue = true;
        }
      }
      if (hasValue) records.push(row);
    }

    const images: string[] = await page
      .$$eval("img[src]", (els) =>
        els
          .map((el) => el.getAttribute("src") || "")
          .filter(
            (s) =>
              s.startsWith("http") &&
              !s.includes("icon") &&
              !s.includes("pixel"),
          )
          .slice(0, 8),
      )
      .catch(() => []);

    const rawText = await page
      .evaluate(() => (document.body.innerText || "").slice(0, 4000))
      .catch(() => "");
    return { records, images, rawText };
  } finally {
    await browser.close();
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

    const siteKey = detectSite(intent);
    const config = SITE_CONFIGS[siteKey];
    const { records, images, rawText } = await scrape(
      config.url,
      config.selectors,
      config.dataKeys,
      config.waitFor,
    );

    if (records.length === 0) {
      return NextResponse.json({
        error: "no_data",
        message: "Could not extract data. Try one of the suggested sources.",
        suggestions: [
          "Get me tech news from Hacker News",
          "Show latest stock prices from Yahoo Finance",
          "Get NASA space science articles",
        ],
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        url: config.url,
        siteType: config.siteType,
        selectors: config.selectors,
        dataKeys: config.dataKeys,
      },
      data: { records, images, rawText },
      meta: {
        totalRecords: records.length,
        scrapedAt: new Date().toISOString(),
        sourceUrl: config.url,
        dataSize: `~${Math.max(1, Math.round(JSON.stringify(records).length / 1024))} KB`,
      },
    });
  } catch (err: any) {
    console.error("Scrape error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
