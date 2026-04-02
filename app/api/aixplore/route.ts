import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

// ── Call Groq ──────────────────────────────────────────────────────────────
async function callGroq(prompt: string, maxTokens = 2000): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are an elite data analyst. You ALWAYS respond with raw valid JSON only. No markdown fences, no backticks, no explanation. Start with { and end with }.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// ── Parse JSON safely ──────────────────────────────────────────────────────
function parseJSON(raw: string): any | null {
  const attempts = [
    () => JSON.parse(raw),
    () => JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim()),
    () => {
      const m = raw.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    },
  ];
  for (const attempt of attempts) {
    try {
      const r = attempt();
      if (r?.summary) return r;
    } catch {}
  }
  return null;
}

// ── Universal prompt builder ───────────────────────────────────────────────
function buildPrompt(
  category: string,
  subject: string,
  records: any[],
  rawText: string,
  enriched: any,
): string {
  const total = records.length;
  const sample = JSON.stringify(records.slice(0, 10)).slice(0, 3000);

  // Finance deep
  if (category === "finance_deep") {
    const s = enriched?.stockDetail;
    const news = enriched?.news ?? [];
    const bullish = enriched?.sentiment?.bullish ?? 0;
    const bearish = enriched?.sentiment?.bearish ?? 0;
    const context = s
      ? `
Company: ${s.fundamentals?.companyName} (${s.symbol})
Price: ${s.quote?.price} ${s.fundamentals?.currency}, Change: ${s.quote?.changePercent}
Signal: ${s.technicals?.overallSignal}
RSI(14): ${s.technicals?.rsi14} — ${s.technicals?.rsiSignal}
MACD: ${s.technicals?.macd?.trend}
MA Trend: ${s.technicals?.trend}
P/E: ${s.fundamentals?.peRatio}, Market Cap: ${s.fundamentals?.marketCap}
Profit Margin: ${s.fundamentals?.profitMargin}, ROE: ${s.fundamentals?.roe}
News: ${bullish} positive / ${bearish} negative articles
Top headlines: ${news
          .slice(0, 4)
          .map((n: any) => `"${n.title}" [${n.sentiment}]`)
          .join("; ")}
`
      : sample;
    return `You are a Goldman Sachs equity analyst. Analyze this stock data and return ONLY raw JSON.

${context}

Return this exact JSON structure:
{
  "summary": "4-5 sentences of specific institutional analysis. Reference the actual company name, current price, P/E, signal, and news sentiment ratio. Be specific.",
  "prediction": {
    "result": "Strong Buy OR Buy OR Hold OR Sell OR Strong Sell",
    "confidence": "XX%",
    "reason": "2-3 sentences referencing specific RSI value, MACD signal, and news sentiment ratio."
  },
  "insights": [
    { "insight": "Valuation insight referencing actual P/E vs typical sector range", "significance": "high", "category": "Valuation" },
    { "insight": "Technical insight referencing RSI and MACD specific values", "significance": "high", "category": "Technical" },
    { "insight": "News sentiment insight: ${bullish} positive vs ${bearish} negative articles — what narrative is forming?", "significance": "medium", "category": "Sentiment" },
    { "insight": "Risk assessment using Beta and 52-week range data", "significance": "medium", "category": "Risk" },
    { "insight": "One actionable trading insight for this stock right now", "significance": "medium", "category": "Action" }
  ],
  "scenarios": {
    "bull": "Specific bull case for this stock in 30 days",
    "base": "Most probable near-term trajectory",
    "bear": "Specific downside risk scenario"
  },
  "bestUseCase": "Optimal strategy for this stock given all current signals."
}`;
  }

  // Science / NASA
  if (category === "science_space") {
    const hazardous = (enriched?.asteroids ?? []).filter(
      (a: any) => a.is_potentially_hazardous_asteroid,
    ).length;
    const apodTitles = (enriched?.articles ?? [])
      .map((a: any) => a.title)
      .join(", ");
    const events = (enriched?.events ?? [])
      .map((e: any) => `${e.categories?.[0]?.title}: ${e.title}`)
      .join("; ");
    return `You are NASA's chief science communicator. Analyze this space data and return ONLY raw JSON.

APOD articles: ${apodTitles || "None"}
Near-Earth Objects today: ${(enriched?.asteroids ?? []).length} total, ${hazardous} potentially hazardous
Active Earth Events: ${events || "None"}

Return this exact JSON:
{
  "summary": "4-5 sentences covering today's astronomical highlights, the ${hazardous} hazardous NEO status, active Earth events, and what this reveals about current NASA mission priorities. Reference specific article titles.",
  "prediction": {
    "result": "${hazardous > 0 ? "Planetary Alert" : "Normal Monitoring"}",
    "confidence": "${hazardous > 0 ? "88" : "92"}%",
    "reason": "2-3 sentences on NEO safety (miss distances), Earth event severity, and overall space activity level today."
  },
  "insights": [
    { "insight": "Planetary defense assessment: are today's ${hazardous} hazardous NEOs concerning or routine?", "significance": "${hazardous > 0 ? "high" : "medium"}", "category": "Planetary Defense" },
    { "insight": "Specific insight from the APOD content — what astronomical phenomenon or mission does it highlight?", "significance": "high", "category": "Astronomy" },
    { "insight": "Earth systems: what do the active EONET events reveal about current planetary dynamics?", "significance": "medium", "category": "Earth Science" },
    { "insight": "How does today's data connect to NASA's current flagship missions (Artemis, Webb, Perseverance)?", "significance": "medium", "category": "Missions" }
  ],
  "scenarios": {
    "bull": "Best-case discovery or mission milestone based on current data",
    "base": "Standard monitoring continuation for current missions",
    "bear": "Risk scenario if any orbital uncertainties resolve unfavorably"
  },
  "bestUseCase": "Most actionable use of this NASA data for educators, journalists, or planetary defense researchers."
}`;
  }

  // HackerNews / Tech news
  if (
    category === "news" ||
    category === "technology" ||
    category === "social_hn"
  ) {
    const stories = enriched?.stories ?? records;
    const top5 = stories
      .slice(0, 5)
      .map(
        (s: any) =>
          `"${s.title || s.Title}" (${s.score || s.Score || 0} pts, ${s.domain || s.Domain || ""})`,
      )
      .join("; ");
    const positive = records.filter((r: any) =>
      r.Sentiment?.includes("Positive"),
    ).length;
    const negative = records.filter((r: any) =>
      r.Sentiment?.includes("Negative"),
    ).length;
    return `You are a senior technology analyst. Analyze these ${total} tech stories/articles and return ONLY raw JSON.

Top stories: ${top5}
Sentiment: ${positive} positive / ${negative} negative
Subject: ${subject}

Return this exact JSON:
{
  "summary": "4-5 sentences about what these ${total} stories reveal about current tech community priorities. Reference specific story titles and point scores. Identify the dominant theme.",
  "prediction": {
    "result": "Optimistic OR Critical OR Mixed OR Neutral OR Trending",
    "confidence": "XX%",
    "reason": "2-3 sentences on community sentiment based on point scores and story topics."
  },
  "insights": [
    { "insight": "Dominant theme: what topic appears most across the top stories and why is it resonating now?", "significance": "high", "category": "Trend" },
    { "insight": "Point score distribution: what does the engagement gap between top and bottom stories reveal?", "significance": "high", "category": "Engagement" },
    { "insight": "Emerging signal: what topic has fewer stories but is rapidly gaining community attention?", "significance": "medium", "category": "Emerging" },
    { "insight": "Domain analysis: which sources/domains appear most and what does this say about content authority?", "significance": "medium", "category": "Sources" },
    { "insight": "Practical implication: what should a developer or tech founder act on from today's top stories?", "significance": "medium", "category": "Action" }
  ],
  "scenarios": {
    "bull": "If top trending topics reach mainstream: what happens in 6 months?",
    "base": "Most probable near-term development for the top story",
    "bear": "What concerns or risks are buried in the lower-scoring stories?"
  },
  "bestUseCase": "Most actionable insight for a developer, startup founder, or tech investor from today's HN data."
}`;
  }

  // Academic research
  if (category === "academic_research") {
    const papers = records.filter(
      (r: any) =>
        r.Source?.includes("Scholar") ||
        r.Source?.includes("arXiv") ||
        r.Source?.includes("PubMed"),
    );
    const topCited = [...papers]
      .sort(
        (a: any, b: any) =>
          (parseInt(b.Citations) || 0) - (parseInt(a.Citations) || 0),
      )
      .slice(0, 3);
    return `You are a senior research analyst. Analyze these ${total} academic records about "${subject}" and return ONLY raw JSON.

Top cited papers: ${topCited.map((p: any) => `"${p.Title}" (${p.Citations} citations, ${p.Year})`).join("; ")}
Sources: ${[...new Set(records.map((r: any) => r.Source))].join(", ")}
Data sample: ${sample}

Return this exact JSON:
{
  "summary": "4-5 sentences synthesizing the research landscape for '${subject}'. Reference specific paper titles, citation counts, and year range. Identify consensus vs controversy.",
  "prediction": {
    "result": "Emerging Field OR Established Field OR Breakthrough Imminent OR Rapidly Advancing OR Contested Area",
    "confidence": "XX%",
    "reason": "2-3 sentences on field trajectory based on citation patterns and publication years."
  },
  "insights": [
    { "insight": "Citation concentration: what does the gap between top-cited and average papers reveal about consensus in this field?", "significance": "high", "category": "Research Depth" },
    { "insight": "Temporal evolution: how has the research direction changed from the oldest to newest papers in this set?", "significance": "high", "category": "Evolution" },
    { "insight": "Source diversity: what does having data from ${[...new Set(records.map((r: any) => r.Source))].length} sources reveal about field breadth?", "significance": "medium", "category": "Coverage" },
    { "insight": "Application gap: where is the distance between current research and real-world deployment?", "significance": "medium", "category": "Impact" },
    { "insight": "Next frontier: based on publication trajectory, what will be the next major research focus?", "significance": "medium", "category": "Forecast" }
  ],
  "scenarios": {
    "bull": "Optimistic scenario if current research trends continue for 2-3 years",
    "base": "Most probable near-term development based on citation volume",
    "bear": "Obstacles that could slow progress in this field"
  },
  "bestUseCase": "Who benefits most from this research compilation and what is the single most actionable insight?"
}`;
  }

  // Health / Medical
  if (category === "health_medical") {
    return `You are a medical research analyst. Analyze these ${total} health/medical records about "${subject}" and return ONLY raw JSON.

Data: ${sample}

Return this exact JSON:
{
  "summary": "4-5 sentences synthesizing the medical findings for '${subject}'. Reference specific studies, clinical evidence strength, and practical implications.",
  "prediction": {
    "result": "Strong Evidence OR Emerging Evidence OR Preliminary Only OR Contested OR Well-Established",
    "confidence": "XX%",
    "reason": "2-3 sentences on evidence quality and clinical applicability."
  },
  "insights": [
    { "insight": "Evidence quality: what level of clinical evidence exists — RCTs, observational, or preliminary?", "significance": "high", "category": "Evidence" },
    { "insight": "Consensus vs debate: where do researchers agree and disagree on '${subject}'?", "significance": "high", "category": "Consensus" },
    { "insight": "Practical implication: what does this research mean for a patient or clinician today?", "significance": "medium", "category": "Clinical" },
    { "insight": "Safety considerations: what risks or contraindications appear in the data?", "significance": "medium", "category": "Safety" },
    { "insight": "Research gap: what critical question about '${subject}' remains unanswered?", "significance": "medium", "category": "Gap" }
  ],
  "scenarios": {
    "bull": "Best-case health outcome if evidence continues strengthening",
    "base": "Current clinical recommendation based on available evidence",
    "bear": "Worst-case if further research reveals complications"
  },
  "bestUseCase": "How should a patient, clinician, or researcher use this information responsibly?"
}`;
  }

  // E-commerce
  if (category === "ecommerce_product") {
    const products = records.filter((r: any) => r.Price || r.Name);
    const prices = products
      .map((p: any) =>
        parseFloat(String(p.Price || "").replace(/[^0-9.]/g, "")),
      )
      .filter((n) => n > 0);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;
    const avgP = prices.length
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;
    return `You are a smart shopping analyst. Analyze these ${products.length} products for "${subject}" and return ONLY raw JSON.

Price range: ₹${minP.toLocaleString()}–₹${maxP.toLocaleString()}, Average: ₹${avgP.toLocaleString()}
Data: ${sample}

Return this exact JSON:
{
  "summary": "4-5 sentences analyzing the ${subject} market. Cover price distribution, brand variety, and standout options at different budget points. Reference specific product names and prices.",
  "prediction": {
    "result": "Best Value Available OR Premium Market OR Budget Friendly OR Competitive Pricing OR Limited Options",
    "confidence": "XX%",
    "reason": "2-3 sentences: which specific product stands out and why, referencing actual price."
  },
  "insights": [
    { "insight": "Price spread: what drives the ₹${minP.toLocaleString()}–₹${maxP.toLocaleString()} range in this category?", "significance": "high", "category": "Pricing" },
    { "insight": "Best value pick: identify the single specific product with the best price-to-spec ratio", "significance": "high", "category": "Recommendation" },
    { "insight": "Brand distribution: which brands dominate and what does this reveal about market trust?", "significance": "medium", "category": "Market" },
    { "insight": "Spec-price correlation: which specifications most strongly justify price premiums here?", "significance": "medium", "category": "Specs" },
    { "insight": "Buyer warning: what red flags or hidden costs should this buyer watch for?", "significance": "medium", "category": "Caution" }
  ],
  "scenarios": {
    "bull": "Best premium pick if budget is above ₹${maxP > 0 ? Math.round(maxP * 0.7).toLocaleString() : "50,000"}",
    "base": "Best balanced pick around ₹${avgP.toLocaleString()}",
    "bear": "Best budget pick under ₹${minP > 0 ? Math.round(minP * 1.5).toLocaleString() : "20,000"}"
  },
  "bestUseCase": "Specific top recommendation with justification for the buyer searching for '${subject}'."
}`;
  }

  // General news / current events / sports / entertainment / everything else
  const positive = records.filter((r: any) =>
    r.Sentiment?.includes("Positive"),
  ).length;
  const negative = records.filter((r: any) =>
    r.Sentiment?.includes("Negative"),
  ).length;
  const sources = [
    ...new Set(
      records.map((r: any) => r.Source || r.source || "").filter(Boolean),
    ),
  ]
    .slice(0, 4)
    .join(", ");
  const topTitles = records
    .slice(0, 5)
    .map((r: any) => r.Title || r.title || r.Content || "")
    .filter(Boolean)
    .join("; ");

  return `You are a world-class research analyst. Analyze these ${total} records about "${subject}" and return ONLY raw JSON.

Sources: ${sources || "Multiple"}
Sentiment: ${positive} positive / ${negative} negative
Top items: ${topTitles}
Data: ${sample}

Return this exact JSON:
{
  "summary": "4-5 sentences synthesizing everything found about '${subject}' across ${total} records. Reference specific titles, names, or data points. Give a nuanced picture connecting dots across sources.",
  "prediction": {
    "result": "choose the single most appropriate verdict for '${subject}'",
    "confidence": "XX%",
    "reason": "2-3 sentences of specific evidence from the actual data above."
  },
  "insights": [
    { "insight": "Most important cross-source pattern found in this data about '${subject}'", "significance": "high", "category": "Key Finding" },
    { "insight": "Most surprising or counter-intuitive finding from the data", "significance": "high", "category": "Discovery" },
    { "insight": "Sentiment analysis: what does ${positive} positive vs ${negative} negative records reveal?", "significance": "medium", "category": "Sentiment" },
    { "insight": "Knowledge gap: what important aspect of '${subject}' was not covered by any source?", "significance": "medium", "category": "Gap" },
    { "insight": "Single most actionable takeaway from all ${total} records", "significance": "medium", "category": "Action" }
  ],
  "scenarios": {
    "bull": "Best-case scenario if the most positive signals in this data prove accurate",
    "base": "Most probable near-term development based on the weight of evidence",
    "bear": "Worst-case if the concerns raised in negative records materialize"
  },
  "bestUseCase": "Who benefits most from this data and what is the single most actionable insight?"
}`;
}

// ── Fallback ───────────────────────────────────────────────────────────────
function buildFallback(
  category: string,
  subject: string,
  records: any[],
  enriched: any,
): any {
  const total = records.length;
  const sources = [
    ...new Set(
      records.map((r: any) => r.Source || r.source || "data").filter(Boolean),
    ),
  ]
    .slice(0, 3)
    .join(", ");
  return {
    summary: `Fetched ${total} records about "${subject}" from ${sources || "multiple sources"}. The data covers various aspects of this topic across different source types. Review the Data tab for the complete structured records.`,
    prediction: {
      result: "Analysis Ready",
      confidence: "65%",
      reason: `${total} records fetched from ${sources || "multiple sources"}. Use the Insights tab for patterns and the Data tab for raw records.`,
    },
    insights: [
      {
        insight: `${total} records fetched across sources: ${sources}`,
        significance: "high",
        category: "Coverage",
      },
      {
        insight:
          "Multiple source types provide cross-validated perspective on this topic",
        significance: "medium",
        category: "Depth",
      },
      {
        insight:
          "Use table view in Data tab to sort and compare records across sources",
        significance: "medium",
        category: "Usage",
      },
    ],
    scenarios: {
      bull: "Best-case interpretation of the positive signals in this dataset",
      base: "Most balanced reading of the full dataset",
      bear: "Key concerns or risks visible in the data",
    },
    bestUseCase: `Download the JSON or CSV for further analysis of these ${total} records about "${subject}".`,
  };
}

// ── Main POST ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      records,
      siteType,
      meta,
      enriched,
      rawText,
      category,
      subjectLine,
    } = await req.json();
    if (!records?.length)
      return NextResponse.json(
        { error: "No records to analyse" },
        { status: 400 },
      );

    const cat = category || siteType || "general";
    const subject =
      subjectLine ||
      enriched?.query ||
      enriched?.subjectLine ||
      meta?.sourceUrl ||
      "the topic";

    let analysis: any = null;

    try {
      const prompt = buildPrompt(
        cat,
        subject,
        records,
        rawText ?? "",
        enriched,
      );
      const raw = await callGroq(prompt);
      analysis = parseJSON(raw);
    } catch (err) {
      console.error("Groq API error:", err);
    }

    if (!analysis) {
      analysis = buildFallback(cat, subject, records, enriched);
    }

    // Attach stats + news sentiment if available
    analysis.stats = {
      totalRecords: meta?.totalRecords ?? records.length,
      scrapedAt: meta?.scrapedAt ?? new Date().toISOString(),
      sourceUrl: meta?.sourceUrl ?? "",
      dataSize: meta?.dataSize ?? "~1 KB",
      topItem: String(Object.values(records[0])[0] ?? "").slice(0, 30),
      category: cat,
      subjectLine: subject,
      ...(enriched?.sentiment
        ? {
            bullishNews: enriched.sentiment.bullish,
            bearishNews: enriched.sentiment.bearish,
            neutralNews: enriched.sentiment.neutral,
          }
        : {}),
    };
    analysis.siteType = cat;

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error("AIXPLORE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
