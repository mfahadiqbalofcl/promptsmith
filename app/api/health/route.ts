import { NextResponse } from "next/server";
import { isPersistent } from "@/lib/store";
import { isLocked } from "@/lib/security";
import { availableProviders } from "@/lib/ai/providers";

export const runtime = "nodejs";

// Reports which optional capabilities are live so the UI can be honest about AI
// availability, persistence durability, and admin lock — without exposing secrets.
export async function GET() {
  const providers = availableProviders().map((p) => p.label);
  return NextResponse.json({
    boost: providers.length > 0,
    providers,            // failover chain, in order, e.g. ["Groq","OpenRouter"]
    persistent: isPersistent(),
    locked: isLocked(),
  });
}
