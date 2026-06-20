import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { recentNotes, addAiLessons } from "@/lib/store";
import { DISTILL_SYSTEM, buildDistillUser, parseDistill } from "@/lib/metaprompt";
import { adminAllowed } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Paid + mutating — protected on a locked (public) instance.
  if (!adminAllowed(req)) {
    return NextResponse.json({ error: "locked", message: "Distill is locked on this instance." }, { status: 403 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "no_key", message: "AI-distill needs ANTHROPIC_API_KEY. Auto-distilled lessons from issue tags still work without it." },
      { status: 503 }
    );
  }

  const notes = await recentNotes(40);
  if (notes.length === 0) {
    return NextResponse.json({ error: "no_notes", message: "No freeform feedback notes yet to distill." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const model = process.env.PROMPTSMITH_BOOST_MODEL || "claude-sonnet-4-6";
    const msg = await client.messages.create({
      model,
      max_tokens: 1500,
      system: [{ type: "text", text: DISTILL_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildDistillUser(notes) }],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const candidates = parseDistill(text).map((c) => ({
      text: c.text,
      scope: {
        kind: c.scope.kind?.trim() || undefined,
        framework: c.scope.framework?.trim() || undefined,
      },
    }));

    if (candidates.length === 0) {
      return NextResponse.json({ lessons: null, added: 0, message: "Nothing new to distill from the current notes." });
    }

    const lessons = await addAiLessons(candidates);
    return NextResponse.json({ lessons, added: candidates.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Distill failed.";
    return NextResponse.json({ error: "distill_failed", message }, { status: 502 });
  }
}
