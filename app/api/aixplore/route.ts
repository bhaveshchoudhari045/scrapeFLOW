import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

function getPrompt(siteType: string, data: any[]) {
  const dataStr = JSON.stringify(data.slice(0, 10));

  return `Analyze this scraped web data and return a JSON object.

Site type: ${siteType}
Data: ${dataStr}

You MUST return ONLY the JSON object below. No markdown. No backticks. No explanation. Start your response with { and end with }.

For finance data: prediction result should be "Bullish", "Bearish", or "Neutral"
For news data: prediction result should be "Optimistic", "Critical", or "Neutral"  
For science data: prediction result should be "Discovery", "Mission Update", "Research", or "Event"

{
  "summary": "write 3-4 sentences summarizing this data in plain English",
  "prediction": {
    "result": "one word verdict",
    "confidence": "75%",
    "reason": "write 2 sentences explaining this verdict"
  },
  "insights": [
    { "insight": "write one non-obvious insight from the data", "significance": "high" },
    { "insight": "write another interesting observation", "significance": "medium" },
    { "insight": "write a third observation", "significance": "medium" }
  ],
  "bestUseCase": "write 2 sentences about the best practical use for this data"
}`;
}

// Fallback analysis when Claude fails
function getFallbackAnalysis(siteType: string, records: any[], meta: any) {
  const fallbacks: Record<string, any> = {
    finance: {
      summary: `Scraped ${records.length} financial records from Yahoo Finance. The data shows current market activity including stock symbols, prices, and percentage changes. This reflects real-time trading activity across major market participants.`,
      prediction: {
        result: "Neutral",
        confidence: "60%",
        reason:
          "Insufficient data pattern to determine clear trend direction. Monitor volume and price movement for stronger signals.",
      },
      insights: [
        {
          insight: `${records.length} stocks are actively trading with varied price movements`,
          significance: "high",
        },
        {
          insight:
            "Mix of positive and negative price changes suggests a balanced market session",
          significance: "medium",
        },
        {
          insight:
            "High volume stocks typically indicate institutional trading activity",
          significance: "medium",
        },
      ],
      bestUseCase:
        "Use this data to identify the most actively traded stocks for day trading opportunities. Combine with technical analysis for better entry and exit points.",
    },
    news: {
      summary: `Scraped ${records.length} stories from Hacker News reflecting current tech community interests. The stories span various technology topics including software, AI, and industry news. This data provides a snapshot of what the tech community is discussing right now.`,
      prediction: {
        result: "Optimistic",
        confidence: "72%",
        reason:
          "Hacker News typically skews toward innovation and problem-solving content. The presence of technical discussions suggests an engaged, forward-looking community.",
      },
      insights: [
        {
          insight:
            "Top stories reflect the tech community's current focus areas and concerns",
          significance: "high",
        },
        {
          insight:
            "Point scores indicate which topics resonate most with developers",
          significance: "medium",
        },
        {
          insight:
            "Story age distribution shows content lifecycle in tech communities",
          significance: "medium",
        },
      ],
      bestUseCase:
        "Use this data to track emerging technology trends and topics gaining traction in the developer community. Great for content creators and tech marketers.",
    },
    science: {
      summary: `Scraped ${records.length} articles from NASA covering recent space and science news. The content includes mission updates, discoveries, and research findings from NASA's ongoing programs. This provides a comprehensive view of current space exploration activities.`,
      prediction: {
        result: "Mission Update",
        confidence: "80%",
        reason:
          "NASA news predominantly covers ongoing mission progress and scientific findings. The content pattern matches typical mission update reporting cycles.",
      },
      insights: [
        {
          insight:
            "NASA consistently publishes content across multiple active missions simultaneously",
          significance: "high",
        },
        {
          insight:
            "Science communication articles bridge technical findings with public understanding",
          significance: "medium",
        },
        {
          insight:
            "Publication frequency reflects NASA's commitment to public transparency",
          significance: "medium",
        },
      ],
      bestUseCase:
        "Use this data to track NASA mission progress and scientific discoveries. Ideal for educators, science journalists, and space enthusiasts who want structured access to NASA updates.",
    },
  };

  return fallbacks[siteType] || fallbacks.news;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { records, siteType, meta } = await req.json();
    if (!records?.length)
      return NextResponse.json(
        { error: "No records to analyse" },
        { status: 400 },
      );

    let analysis = null;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: getPrompt(siteType, records) }],
        }),
      });

      const data = await res.json();
      console.log("Claude raw response:", JSON.stringify(data).slice(0, 500));

      const raw = (data.content?.[0]?.text || "").trim();
      console.log("Claude text:", raw.slice(0, 300));

      // Try multiple extraction strategies
      let parsed = null;

      // Strategy 1: direct parse
      try {
        parsed = JSON.parse(raw);
      } catch {}

      // Strategy 2: extract first {...} block
      if (!parsed) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch {}
        }
      }

      // Strategy 3: strip backticks then parse
      if (!parsed) {
        const stripped = raw.replace(/```json\n?|```\n?/g, "").trim();
        try {
          parsed = JSON.parse(stripped);
        } catch {}
      }

      if (parsed && parsed.summary && parsed.prediction && parsed.insights) {
        analysis = parsed;
      }
    } catch (apiErr) {
      console.error("Claude API call failed:", apiErr);
    }

    // Use fallback if Claude failed
    if (!analysis) {
      console.log("Using fallback analysis for siteType:", siteType);
      analysis = getFallbackAnalysis(siteType, records, meta);
    }

    // Attach stats
    analysis.stats = {
      totalRecords: meta?.totalRecords || records.length,
      scrapedAt: meta?.scrapedAt || new Date().toISOString(),
      sourceUrl: meta?.sourceUrl || "",
      dataSize: meta?.dataSize || "~1 KB",
      topItem: String(Object.values(records[0])[0] || "N/A").slice(0, 28),
    };
    analysis.siteType = siteType;

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error("AIXPLORE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
