import { NextRequest, NextResponse } from "next/server";
import { addSession, listSessions, stats } from "@/lib/store";
import { clampStr } from "@/lib/security";
import { DOMAINS } from "@/lib/knowledge/domains";
import type { Intake, Domain } from "@/lib/types";

export const runtime = "nodejs";

const DOMAIN_IDS = Object.keys(DOMAINS) as Domain[];

export async function GET() {
  const [sessions, s] = await Promise.all([listSessions(60), stats()]);
  return NextResponse.json({ sessions, stats: s });
}

export async function POST(req: NextRequest) {
  let body: {
    intake?: Intake;
    domain?: Domain;
    kind?: string;
    framework?: string;
    direction?: string;
    prompt?: string;
    boosted?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const { intake, domain, kind, framework, direction, prompt, boosted } = body;
  if (!intake || !domain || !DOMAIN_IDS.includes(domain) || !kind || !framework || !prompt) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const session = await addSession({
    intake,
    domain,
    kind: clampStr(kind, 40),
    framework: clampStr(framework, 40),
    direction: clampStr(direction, 40),
    prompt: clampStr(prompt, 24000),
    boosted: Boolean(boosted),
  });
  return NextResponse.json({ session });
}
