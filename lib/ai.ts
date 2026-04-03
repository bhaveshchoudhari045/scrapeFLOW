// lib/ai.ts — NEW FILE
// AI provider abstraction used by AISummarizer and GenerateAnalyticalReport executors

import prisma from "@/lib/prisma";

export class AIError extends Error {
  constructor(
    public provider: string,
    message: string,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export function getSummaryLengthInstruction(length: string): string {
  switch (length) {
    case "short":
      return "Summarize in 1-2 sentences only. Be extremely concise.";
    case "long":
      return "Provide a detailed summary covering all key points, insights, and implications in multiple paragraphs.";
    default:
      return "Summarize in one clear paragraph covering the main points.";
  }
}

// ── Credential resolver ────────────────────────────────────────────────────
async function getCredential(
  credentialId: string,
): Promise<{ provider: string; apiKey: string }> {
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
    select: { value: true, name: true },
  });
  if (!credential)
    throw new AIError("unknown", `Credential not found: ${credentialId}`);

  // Decrypt — use your existing encryption utility
  const { symmetricDecrypt } = await import("@/lib/encryption");
  const decrypted = symmetricDecrypt(credential.value);

  // Detect provider from credential name or try to parse
  const lower = credential.name.toLowerCase();
  if (lower.includes("openai") || lower.includes("gpt"))
    return { provider: "openai", apiKey: decrypted };
  if (lower.includes("groq")) return { provider: "groq", apiKey: decrypted };
  if (lower.includes("anthropic") || lower.includes("claude"))
    return { provider: "anthropic", apiKey: decrypted };
  if (lower.includes("gemini") || lower.includes("google"))
    return { provider: "gemini", apiKey: decrypted };
  // Default: try OpenAI format
  return { provider: "openai", apiKey: decrypted };
}

// ── Generic AI call ────────────────────────────────────────────────────────
export async function callAI(
  credentialId: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<{ content: string }> {
  const { provider, apiKey } = await getCredential(credentialId);
  const { temperature = 0.4, maxTokens = 2000 } = options;

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: messages.find((m) => m.role === "system")?.content,
        messages: messages.filter((m) => m.role !== "system"),
      }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new AIError(
        "anthropic",
        data.error?.message || "Anthropic API error",
      );
    return { content: data.content?.[0]?.text || "" };
  }

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new AIError("groq", data.error?.message || "Groq API error");
    return { content: data.choices?.[0]?.message?.content || "" };
  }

  if (provider === "gemini") {
    const parts = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: parts,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok)
      throw new AIError("gemini", data.error?.message || "Gemini API error");
    return { content: data.candidates?.[0]?.content?.parts?.[0]?.text || "" };
  }

  // Default: OpenAI-compatible
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const data = await res.json();
  if (!res.ok)
    throw new AIError("openai", data.error?.message || "OpenAI API error");
  return { content: data.choices?.[0]?.message?.content || "" };
}

// ── Summarizer convenience wrapper ─────────────────────────────────────────
export async function summarizeWithAI(
  credentialId: string,
  text: string,
  lengthInstruction: string,
): Promise<{ data: { summary: string } }> {
  const result = await callAI(
    credentialId,
    [
      {
        role: "system",
        content:
          "You are a professional summarizer. Return only the summary text, nothing else.",
      },
      {
        role: "user",
        content: `${lengthInstruction}\n\nText to summarize:\n${text}`,
      },
    ],
    { temperature: 0.3, maxTokens: 800 },
  );
  return { data: { summary: result.content.trim() } };
}
export async function getAnalyticalReportPrompt(
  data: any,
  reportType: string,
  focusArea?: string,
): Promise<string> {
  return `You are a data analyst. Generate a comprehensive analytical report based on the following data:

${JSON.stringify(data, null, 2)}

Report Type: ${reportType}
${focusArea ? `Focus Area: ${focusArea}` : ""}

Provide:
1. Executive Summary
2. Key Findings
3. Data Analysis
4. Trends and Patterns
5. Recommendations
6. Conclusion

Format the report in clear, professional markdown.`;
}
