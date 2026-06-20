import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BOOST_SYSTEM, buildBoostUser } from "@/lib/metaprompt";
import type { Intake } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "no_key", message: "AI Boost is disabled — no ANTHROPIC_API_KEY set. The deterministic prompt is fully usable as-is." },
      { status: 503 }
    );
  }

  let body: { compiledPrompt?: string; intake?: Intake };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const { compiledPrompt, intake } = body;
  if (!compiledPrompt || !intake) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  // Bound the input so a public instance can't be used to forward huge payloads
  // to the paid API.
  if (typeof compiledPrompt !== "string" || compiledPrompt.length > 24000) {
    return NextResponse.json({ error: "too_large", message: "Prompt too large to boost." }, { status: 413 });
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const model = process.env.PROMPTSMITH_BOOST_MODEL || "claude-sonnet-4-6";

    const msg = await client.messages.create({
      model,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: BOOST_SYSTEM,
          // Cache the system prompt — it's identical on every request.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildBoostUser(compiledPrompt, intake) }],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling the model.";
    return NextResponse.json({ error: "boost_failed", message }, { status: 502 });
  }
}
