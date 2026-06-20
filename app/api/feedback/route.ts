import { NextRequest, NextResponse } from "next/server";
import { addFeedback } from "@/lib/store";
import { distillLessons } from "@/lib/learning";
import { clampStr } from "@/lib/security";
import type { Outcome } from "@/lib/types";

export const runtime = "nodejs";

const OUTCOMES: Outcome[] = ["success", "partial", "fail"];

export async function POST(req: NextRequest) {
  let body: { sessionId?: string; outcome?: Outcome; issues?: string[]; worked?: string; improve?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const { sessionId, outcome } = body;
  if (!sessionId || !outcome || !OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Only canned issue-tag ids feed the deterministic distiller; bound them and
  // the freeform notes so the store can't be inflated by a public client.
  const issues = Array.isArray(body.issues) ? body.issues.filter((x) => typeof x === "string").slice(0, 20).map((x) => x.slice(0, 40)) : [];

  const { feedback, lessons } = await addFeedback(
    {
      sessionId: clampStr(sessionId, 64),
      outcome,
      issues,
      worked: clampStr(body.worked, 2000),
      improve: clampStr(body.improve, 2000),
    },
    distillLessons
  );

  return NextResponse.json({ feedback, lessons });
}
