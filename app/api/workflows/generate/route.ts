// app/api/workflows/generate/route.ts — NEW FILE
// Natural language → workflow JSON generator

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

// ── The full system prompt with all 33 task types ──
// (Copy the full generateWorkflowPrompt function from your friend's code
//  and paste it here as the SYSTEM_PROMPT string)
// For now, using a condensed version:

const SYSTEM_PROMPT = `You are an expert workflow builder for a web scraping automation platform.

You have access to these task types:
LAUNCH_BROWSER, PAGE_TO_HTML, EXTRACT_TEXT_FROM_ELEMENT, EXTRACT_STRUCTURED_LIST,
EXTRACT_STRUCTURED_OBJECT, EXTRACT_TABLE_DATA, EXTRACT_DATA_WITH_AI,
FILL_INPUT, CLICK_ELEMENT, WAIT_FOR_ELEMENT, SCROLL_TO_ELEMENT, INFINITE_SCROLL,
NAVIGATE_TO_URL, RANDOM_DELAY, SESSION_COOKIES,
READ_PROPERTY_FROM_JSON, ADD_PROPERTY_TO_JSON, FILTER_ARRAY, TRANSFORM_ARRAYS_TO_OBJECTS,
CONVERT_FIELDS_TO_NUMBER, LOOP_START_ARRAY, LOOP_START_REPEAT, LOOP_START_UNTIL_CONDITION,
LOOP_END, FLOW_CONTROL_ACTION, IF_CONDITION, STOP_WORKFLOW, BATCH_LOOP_OVER,
SENTIMENT_ANALYZER, AI_SUMMARIZER, VISUALIZER, GENERATE_ANALYTICAL_REPORT,
DELIVER_VIA_WEBHOOK, EXPORT_CSV

KEY CONNECTION RULES:
- BROWSER_INSTANCE flows: use "Web page" → "Web page"
- HTML flows: PAGE_TO_HTML "Html" → "Html"
- EXTRACT_STRUCTURED_LIST outputs "Extracted Data"
- FILTER_ARRAY inputs "Array", outputs "Filtered Array"
- EXPORT_CSV inputs "Data" (STRING, not browser)
- LOOP_END inputs "Item Result", outputs "Data"

Return ONLY valid JSON:
{
  "nodes": [{"type": "TASK_TYPE", "inputs": {"Key": "value"}}],
  "connections": [{"fromIndex": 0, "toIndex": 1, "fromOutput": "Web page", "toInput": "Web page"}],
  "description": "What this workflow does"
}`;

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, existingWorkflow } = await req.json();
    if (!prompt?.trim())
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const userMessage = existingWorkflow
      ? `Modify this workflow:\n${JSON.stringify(existingWorkflow, null, 2)}\n\nUser request: ${prompt}`
      : `Build a workflow for: ${prompt}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await res.json();
    const raw = (data.content?.[0]?.text ?? "").trim();

    let workflow = null;
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
        if (r?.nodes && r?.connections) {
          workflow = r;
          break;
        }
      } catch {}
    }

    if (!workflow)
      return NextResponse.json(
        { error: "Failed to generate workflow" },
        { status: 500 },
      );

    return NextResponse.json({ success: true, workflow });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
