import { NextRequest, NextResponse } from "next/server";
import { BOOST_SYSTEM, buildBoostUser } from "@/lib/metaprompt";
import { runCompletion, NoProviderError } from "@/lib/ai/complete";
import type { Intake } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
  // Bound input so a public instance can't forward huge payloads to the API.
  if (typeof compiledPrompt !== "string" || compiledPrompt.length > 24000) {
    return NextResponse.json({ error: "too_large", message: "Prompt too large to boost." }, { status: 413 });
  }

  try {
    const { text, provider, model } = await runCompletion({
      system: BOOST_SYSTEM,
      user: buildBoostUser(compiledPrompt, intake),
      maxTokens: 4096,
    });
    return NextResponse.json({ text, provider, model });
  } catch (err) {
    if (err instanceof NoProviderError) {
      return NextResponse.json(
        { error: "no_provider", message: "AI Boost is disabled — no AI provider key set. The deterministic prompt is fully usable as-is." },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : "All AI providers failed.";
    return NextResponse.json({ error: "boost_failed", message: `Every AI provider failed (rate-limited or down). The prompt below still works. (${message})` }, { status: 502 });
  }
}
