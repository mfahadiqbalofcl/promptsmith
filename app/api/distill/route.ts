import { NextRequest, NextResponse } from "next/server";
import { recentNotes, addAiLessons } from "@/lib/store";
import { DISTILL_SYSTEM, buildDistillUser, parseDistill } from "@/lib/metaprompt";
import { runCompletion, NoProviderError } from "@/lib/ai/complete";
import { adminAllowed } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Paid + mutating — protected on a locked (public) instance.
  if (!adminAllowed(req)) {
    return NextResponse.json({ error: "locked", message: "Distill is locked on this instance." }, { status: 403 });
  }

  const notes = await recentNotes(40);
  if (notes.length === 0) {
    return NextResponse.json({ error: "no_notes", message: "No freeform feedback notes yet to distill." }, { status: 400 });
  }

  try {
    const { text } = await runCompletion({
      system: DISTILL_SYSTEM,
      user: buildDistillUser(notes),
      maxTokens: 1500,
    });

    const candidates = parseDistill(text).map((c) => ({
      text: c.text,
      scope: { kind: c.scope.kind?.trim() || undefined, framework: c.scope.framework?.trim() || undefined },
    }));

    if (candidates.length === 0) {
      return NextResponse.json({ lessons: null, added: 0, message: "Nothing new to distill from the current notes." });
    }

    const lessons = await addAiLessons(candidates);
    return NextResponse.json({ lessons, added: candidates.length });
  } catch (err) {
    if (err instanceof NoProviderError) {
      return NextResponse.json(
        { error: "no_provider", message: "AI-distill needs an AI provider key. Auto-distilled lessons from issue tags still work without it." },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : "Distill failed.";
    return NextResponse.json({ error: "distill_failed", message }, { status: 502 });
  }
}
