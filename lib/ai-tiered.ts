// lib/ai-tiered.ts
// Universal tiered AI caller — use this in all three routes
// Priority: Claude (quality) → Gemini Pro (quality backup) → Groq 70b (speed) → Groq 8b (emergency)

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const GEMINI_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY!;
const GROQ_KEY = process.env.GROQ_API_KEY!;
const NVIDIA_KEY = process.env.NVIDIA_API_KEY!;

// ── Individual callers ────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`Claude ${res.status}: ${d.error?.message}`);
  const text = (d.content?.[0]?.text ?? "").trim();
  if (!text) throw new Error("Claude returned empty");
  return text;
}

async function callGemini(prompt: string, maxTokens: number): Promise<string> {
  const model = "gemini-1.5-flash"; // Flash = free tier, high rate limit
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
      }),
    },
  );
  const d = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${d.error?.message}`);
  const text = (d.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  if (!text) throw new Error("Gemini returned empty");
  return text;
}

async function callGeminiPro(
  prompt: string,
  maxTokens: number,
): Promise<string> {
  const model = "gemini-1.5-pro"; // Pro = higher quality
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
      }),
    },
  );
  const d = await res.json();
  if (!res.ok) throw new Error(`Gemini Pro ${res.status}: ${d.error?.message}`);
  const text = (d.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  if (!text) throw new Error("Gemini Pro returned empty");
  return text;
}

async function callGroq(
  prompt: string,
  maxTokens: number,
  model = "llama-3.3-70b-versatile",
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an expert analyst. Respond ONLY with raw valid JSON. No markdown, no backticks. Start { end }.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const d = await res.json();
  if (res.status === 429) throw new Error(`Groq rate limited (${model})`);
  if (!res.ok) throw new Error(`Groq ${res.status}: ${d.error?.message}`);
  const text = (d.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error(`Groq (${model}) returned empty`);
  return text;
}

async function callNvidia(prompt: string, maxTokens: number): Promise<string> {
  // NVIDIA NIM — uses OpenAI-compatible API, supports Llama 3.1 405B
  const res = await fetch(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-405b-instruct",
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are an expert data analyst. Respond ONLY with raw valid JSON. No markdown.",
          },
          { role: "user", content: prompt },
        ],
      }),
    },
  );
  const d = await res.json();
  if (!res.ok) throw new Error(`NVIDIA ${res.status}: ${d.error?.message}`);
  const text = (d.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("NVIDIA returned empty");
  return text;
}

// ── Task types — different tasks get different tier priorities ────────────
type AITask = "analysis" | "extraction" | "suggestion" | "fast";

interface TierResult {
  text: string;
  provider: string;
  tier: number;
}

// ── MAIN: Tiered AI caller with smart task routing ────────────────────────
export async function callAITiered(
  prompt: string,
  options: {
    maxTokens?: number;
    task?: AITask;
    label?: string;
  } = {},
): Promise<TierResult> {
  const { maxTokens = 4000, task = "analysis", label = "" } = options;
  const tag = label ? `[${label}]` : `[${task}]`;

  // Define tier order per task type:
  // - analysis: need highest quality — Claude → Gemini Pro → NVIDIA 405B → Groq 70b → Gemini Flash → Groq 8b
  // - extraction: need structured output — Gemini Flash → Claude → Groq 70b → Gemini Pro → Groq 8b
  // - suggestion: need creativity + speed — Gemini Flash → Claude → Groq 70b → Groq 8b
  // - fast: speed first — Groq 70b → Gemini Flash → Groq 8b → Claude

  const tiers: Array<{
    name: string;
    fn: () => Promise<string>;
    enabled: boolean;
  }> =
    task === "analysis"
      ? [
          {
            name: "Claude Sonnet",
            fn: () => callClaude(prompt, maxTokens),
            enabled: !!ANTHROPIC_KEY,
          },
          {
            name: "Gemini Pro",
            fn: () => callGeminiPro(prompt, maxTokens),
            enabled: !!GEMINI_KEY,
          },
          {
            name: "NVIDIA 405B",
            fn: () => callNvidia(prompt, Math.min(maxTokens, 4096)),
            enabled: !!NVIDIA_KEY,
          },
          {
            name: "Groq 70b",
            fn: () => callGroq(prompt, maxTokens),
            enabled: !!GROQ_KEY,
          },
          {
            name: "Gemini Flash",
            fn: () => callGemini(prompt, maxTokens),
            enabled: !!GEMINI_KEY,
          },
          {
            name: "Groq 8b",
            fn: () => callGroq(prompt, maxTokens, "llama-3.1-8b-instant"),
            enabled: !!GROQ_KEY,
          },
        ]
      : task === "extraction"
        ? [
            {
              name: "Gemini Flash",
              fn: () => callGemini(prompt, maxTokens),
              enabled: !!GEMINI_KEY,
            },
            {
              name: "Claude Sonnet",
              fn: () => callClaude(prompt, maxTokens),
              enabled: !!ANTHROPIC_KEY,
            },
            {
              name: "Groq 70b",
              fn: () => callGroq(prompt, maxTokens),
              enabled: !!GROQ_KEY,
            },
            {
              name: "Gemini Pro",
              fn: () => callGeminiPro(prompt, maxTokens),
              enabled: !!GEMINI_KEY,
            },
            {
              name: "NVIDIA 405B",
              fn: () => callNvidia(prompt, Math.min(maxTokens, 4096)),
              enabled: !!NVIDIA_KEY,
            },
            {
              name: "Groq 8b",
              fn: () => callGroq(prompt, maxTokens, "llama-3.1-8b-instant"),
              enabled: !!GROQ_KEY,
            },
          ]
        : task === "suggestion"
          ? [
              {
                name: "Gemini Flash",
                fn: () => callGemini(prompt, maxTokens),
                enabled: !!GEMINI_KEY,
              },
              {
                name: "Claude Sonnet",
                fn: () => callClaude(prompt, Math.min(maxTokens, 2000)),
                enabled: !!ANTHROPIC_KEY,
              },
              {
                name: "Groq 70b",
                fn: () => callGroq(prompt, maxTokens),
                enabled: !!GROQ_KEY,
              },
              {
                name: "Groq Mixtral",
                fn: () => callGroq(prompt, maxTokens, "mixtral-8x7b-32768"),
                enabled: !!GROQ_KEY,
              },
              {
                name: "Groq 8b",
                fn: () => callGroq(prompt, maxTokens, "llama-3.1-8b-instant"),
                enabled: !!GROQ_KEY,
              },
              {
                name: "Gemini Pro",
                fn: () => callGeminiPro(prompt, maxTokens),
                enabled: !!GEMINI_KEY,
              },
            ]
          : /* fast */ [
              {
                name: "Groq 70b",
                fn: () => callGroq(prompt, maxTokens),
                enabled: !!GROQ_KEY,
              },
              {
                name: "Gemini Flash",
                fn: () => callGemini(prompt, maxTokens),
                enabled: !!GEMINI_KEY,
              },
              {
                name: "Groq 8b",
                fn: () => callGroq(prompt, maxTokens, "llama-3.1-8b-instant"),
                enabled: !!GROQ_KEY,
              },
              {
                name: "Claude Sonnet",
                fn: () => callClaude(prompt, maxTokens),
                enabled: !!ANTHROPIC_KEY,
              },
            ];

  let tier = 0;
  for (const t of tiers) {
    if (!t.enabled) continue;
    try {
      const text = await t.fn();
      return { text, provider: t.name, tier };
    } catch (e: any) {
      console.error(`${tag} ${t.name} failed: ${e.message}`);
    }
    tier++;
  }
  return { text: "ERROR: All tiers failed", provider: "ERROR", tier: -1 };
}
// Helper exports to resolve route errors
export async function callAIExtraction(prompt: string, maxTokens?: number) {
  return callAITiered(prompt, { maxTokens, task: "extraction" });
}

export async function callAISuggestion(prompt: string, maxTokens?: number) {
  return callAITiered(prompt, { maxTokens, task: "suggestion" });
}
export async function callAIFast(prompt: string, maxTokens?: number) {
  return callAITiered(prompt, { maxTokens, task: "fast" });
}
