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
    waitUntil: "domcontentloaded" | "networkidle2" | "networkidle0" | "load";
    extraHeaders?: Record<string, string>;
    scrollPage?: boolean;
  }
> = {
  hackernews: {
    url: "https://news.ycombinator.com/",
    selectors: [".titleline > a", ".score", ".age a", ".hnuser"],
    dataKeys: ["title", "points", "posted", "author"],
    siteType: "news",
    waitFor: 1000,
    waitUntil: "domcontentloaded",
  },

  nasa: {
    url: "https://www.nasa.gov/news/",
    selectors: [
      // Try multiple selector patterns — NASA redesigns frequently
      "h2.entry-title a, h3.entry-title a, .entry-title a",
      ".entry-summary p, .entry-content p, .article-blurb",
      "time.entry-date, time[datetime], .entry-date",
      ".entry-categories a, .cat-links a",
    ],
    dataKeys: ["title", "summary", "date", "category"],
    siteType: "science",
    waitFor: 4000,
    waitUntil: "networkidle2",
    scrollPage: true,
  },

  finance: {
    url: "https://finance.yahoo.com/markets/stocks/most-active/",
    selectors: [
      // Yahoo Finance 2024 selectors
      "fin-streamer[data-field='regularMarketPrice']",
      "[data-testid='table-cell-ticker'] a, .Va\\(0\\) span",
      "td[aria-label='Symbol'] span, .symbol",
      "td[aria-label='Name'] span",
      "td[aria-label='Price (Intraday)'] fin-streamer",
      "td[aria-label='% Change'] fin-streamer",
    ],
    dataKeys: ["price", "ticker", "symbol", "name", "price2", "change"],
    siteType: "finance",
    waitFor: 5000,
    waitUntil: "networkidle2",
    scrollPage: true,
    extraHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
  },
};

function detectSite(input: string): string {
  const lower = input.toLowerCase();
  if (
    lower.includes("hacker") ||
    lower.includes(" hn") ||
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
  return "hackernews";
}

async function scrape(config: (typeof SITE_CONFIGS)[string]) {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled", // hide puppeteer from bot detection
      "--disable-infobars",
      "--window-size=1920,1080",
    ],
  });

  try {
    const page = await browser.newPage();

    // ── Spoof fingerprint ──────────────────────────────────────────
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Remove webdriver flag that sites use to detect puppeteer
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    // Set extra headers if configured
    if (config.extraHeaders) {
      await page.setExtraHTTPHeaders(config.extraHeaders);
    }

    // ── Navigate ───────────────────────────────────────────────────
    await page.goto(config.url, {
      waitUntil: config.waitUntil,
      timeout: 30000,
    });

    // Extra wait for JS-heavy sites
    await new Promise((r) => setTimeout(r, config.waitFor));

    // Scroll page to trigger lazy loading
    if (config.scrollPage) {
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= 3000) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      // Wait again after scroll for content to load
      await new Promise((r) => setTimeout(r, 2000));
    }

    // ── Extract data ───────────────────────────────────────────────
    const extracted: Record<string, string[]> = {};
    for (let i = 0; i < config.selectors.length; i++) {
      try {
        // Handle comma-separated fallback selectors
        const selectorList = config.selectors[i]
          .split(",")
          .map((s) => s.trim());
        let values: string[] = [];

        for (const sel of selectorList) {
          try {
            values = await page.$$eval(sel, (els) =>
              els
                .slice(0, 30)
                .map((el) => (el as HTMLElement).innerText?.trim() || "")
                .filter(Boolean),
            );
            if (values.length > 0) break; // use first selector that works
          } catch {
            continue;
          }
        }
        extracted[config.dataKeys[i]] = values;
      } catch {
        extracted[config.dataKeys[i]] = [];
      }
    }

    // ── Fallback: parse raw text if selectors failed ───────────────
    const totalExtracted = Object.values(extracted).flat().length;
    if (totalExtracted === 0) {
      // For NASA — try grabbing all article-like headings
      if (config.siteType === "science") {
        extracted["title"] = await page
          .$$eval("h1, h2, h3", (els) =>
            els
              .map((el) => (el as HTMLElement).innerText?.trim())
              .filter((t) => t && t.length > 20 && t.length < 200)
              .slice(0, 20),
          )
          .catch(() => []);
        extracted["summary"] = await page
          .$$eval("p", (els) =>
            els
              .map((el) => (el as HTMLElement).innerText?.trim())
              .filter((t) => t && t.length > 50 && t.length < 400)
              .slice(0, 20),
          )
          .catch(() => []);
      }

      // For Yahoo Finance — try grabbing table rows directly
      if (config.siteType === "finance") {
        const tableData = await page
          .evaluate(() => {
            const rows = Array.from(document.querySelectorAll("tr")).slice(
              1,
              25,
            );
            return rows
              .map((row) => {
                const cells = Array.from(row.querySelectorAll("td")).map((td) =>
                  td.innerText?.trim(),
                );
                return cells.filter(Boolean).join(" | ");
              })
              .filter((r) => r.length > 5);
          })
          .catch(() => [] as string[]);

        extracted["data"] = tableData;
      }
    }

    // ── Build records ──────────────────────────────────────────────
    const maxLen = Math.max(
      ...Object.values(extracted).map((v) => v.length),
      0,
    );
    const records: Record<string, string>[] = [];

    for (let i = 0; i < Math.min(maxLen, 25); i++) {
      const row: Record<string, string> = {};
      let hasValue = false;
      for (const key of Object.keys(extracted)) {
        if (extracted[key]?.[i]) {
          row[key] = extracted[key][i];
          hasValue = true;
        }
      }
      if (hasValue) records.push(row);
    }

    // ── Images ─────────────────────────────────────────────────────
    const images: string[] = await page
      .$$eval("img[src]", (els) =>
        els
          .map((el) => el.getAttribute("src") || "")
          .filter(
            (s) =>
              s.startsWith("http") &&
              !s.includes("icon") &&
              !s.includes("pixel") &&
              !s.includes("logo") &&
              !s.includes("1x1") &&
              !s.includes("tracking"),
          )
          .slice(0, 8),
      )
      .catch(() => []);

    // ── Raw text ───────────────────────────────────────────────────
    const rawText = await page
      .evaluate(() => (document.body.innerText || "").slice(0, 5000))
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
    const { records, images, rawText } = await scrape(config);

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
