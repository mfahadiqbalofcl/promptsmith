import { NextRequest, NextResponse } from "next/server";
import { getLessons, addManualLesson, muteLesson, deleteLesson } from "@/lib/store";
import { adminAllowed, clampStr } from "@/lib/security";
import { DOMAINS } from "@/lib/knowledge/domains";
import type { Domain } from "@/lib/types";

export const runtime = "nodejs";

const DOMAIN_IDS = Object.keys(DOMAINS) as Domain[];

export async function GET() {
  const lessons = await getLessons();
  return NextResponse.json({ lessons });
}

export async function POST(req: NextRequest) {
  // Mutating the shared brain is a protected action on a locked (public) instance.
  if (!adminAllowed(req)) {
    return NextResponse.json({ error: "locked", message: "Lesson editing is locked on this instance." }, { status: 403 });
  }

  let body: {
    action?: "add" | "mute" | "delete";
    id?: string;
    muted?: boolean;
    text?: string;
    domain?: string;
    kind?: string;
    framework?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  switch (body.action) {
    case "add": {
      const text = clampStr(body.text, 400);
      if (!text) return NextResponse.json({ error: "empty_text" }, { status: 400 });
      const domain = DOMAIN_IDS.includes(body.domain as Domain) ? (body.domain as Domain) : undefined;
      const lessons = await addManualLesson({
        text,
        scope: { domain, kind: clampStr(body.kind, 40) || undefined, framework: clampStr(body.framework, 40) || undefined },
      });
      return NextResponse.json({ lessons });
    }
    case "mute": {
      if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
      const lessons = await muteLesson(body.id, Boolean(body.muted));
      return NextResponse.json({ lessons });
    }
    case "delete": {
      if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
      const lessons = await deleteLesson(body.id);
      return NextResponse.json({ lessons });
    }
    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }
}
