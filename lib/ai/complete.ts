// ── Failover completion ───────────────────────────────────────────────────────
// One entry point for all AI calls. Walks the available providers (Groq, then
// OpenRouter) in order; on any error (rate limit, 5xx, timeout, bad model) it
// falls through to the next. Returns the first success with which provider/model
// served it. All providers are OpenAI-compatible, so it's one code path.

import { availableProviders, modelFor, type Provider } from "./providers";

export class NoProviderError extends Error {
  constructor() {
    super("No AI provider configured");
    this.name = "NoProviderError";
  }
}

export interface CompletionResult {
  text: string;
  provider: string;
  model: string;
}

const TIMEOUT_MS = 30_000;

async function callProvider(p: Provider, model: string, system: string, user: string, maxTokens: number): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env[p.apiKeyEnv]}`,
    };
    if (p.id === "openrouter") {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://promptsmith.vercel.app";
      headers["X-Title"] = "PROMPTSMITH";
    }
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${p.label} ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a completion across the failover chain. Throws NoProviderError if nothing
 * is configured, or the last error if every provider failed.
 */
export async function runCompletion(opts: { system: string; user: string; maxTokens?: number }): Promise<CompletionResult> {
  const providers = availableProviders();
  if (providers.length === 0) throw new NoProviderError();
  const maxTokens = opts.maxTokens ?? 2048;

  let lastErr: unknown;
  for (const p of providers) {
    const model = modelFor(p);
    try {
      const text = await callProvider(p, model, opts.system, opts.user, maxTokens);
      if (text && text.trim()) return { text: text.trim(), provider: p.label, model };
      lastErr = new Error(`${p.label} returned empty output`);
    } catch (err) {
      lastErr = err;
      // fall through to the next provider
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All AI providers failed");
}
