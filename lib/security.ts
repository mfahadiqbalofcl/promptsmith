// ── Lightweight request guards for the public deploy ──────────────────────────
// The compiler itself is free and open. The store-mutating and paid (Anthropic)
// endpoints are protected so a public instance can't be vandalized or run up a
// bill. When PROMPTSMITH_ADMIN_TOKEN is unset (local dev / self-host), these are
// open; when set, mutating + AI routes require a matching header.

import type { NextRequest } from "next/server";

export function isLocked(): boolean {
  return Boolean(process.env.PROMPTSMITH_ADMIN_TOKEN);
}

/** True if the request may perform a protected (mutating / paid) action. */
export function adminAllowed(req: NextRequest): boolean {
  const token = process.env.PROMPTSMITH_ADMIN_TOKEN;
  if (!token) return true; // unlocked instance
  const header = req.headers.get("x-promptsmith-admin");
  return header === token;
}

/** Clamp a string to a max length, trimming. Defends the store + AI input size. */
export function clampStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
