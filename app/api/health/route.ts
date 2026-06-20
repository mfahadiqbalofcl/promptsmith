import { NextResponse } from "next/server";
import { isPersistent } from "@/lib/store";
import { isLocked } from "@/lib/security";

export const runtime = "nodejs";

// Reports which optional capabilities are live, so the UI can be honest about
// AI Boost / distill availability, persistence durability, and admin lock —
// without exposing any secret.
export async function GET() {
  const boost = Boolean(process.env.ANTHROPIC_API_KEY);
  return NextResponse.json({
    boost,
    model: boost ? process.env.PROMPTSMITH_BOOST_MODEL || "claude-sonnet-4-6" : null,
    persistent: isPersistent(),
    locked: isLocked(),
  });
}
