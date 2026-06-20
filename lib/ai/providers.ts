// ── AI provider registry ──────────────────────────────────────────────────────
// PROMPTSMITH's AI features (Boost + distill) run on a failover chain of free
// providers. Groq and OpenRouter are OpenAI-compatible (one code path); Anthropic
// is optional. Whichever keys are present become the chain, tried in order until
// one succeeds — so when one hits a rate limit or errors, the next takes over.
// That's what keeps the AI features up 24/7 on free tiers.

export type ProviderId = "groq" | "openrouter" | "anthropic";

export interface Provider {
  id: ProviderId;
  label: string;
  type: "openai" | "anthropic";
  baseUrl?: string; // OpenAI-compatible base (without /chat/completions)
  apiKeyEnv: string;
  defaultModel: string;
  modelEnv: string;
}

// Default models chosen for strong instruction-following on a free tier.
// Every one is overridable via its env var if a provider rotates its catalog.
export const PROVIDERS: Record<ProviderId, Provider> = {
  groq: {
    id: "groq",
    label: "Groq",
    type: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
    modelEnv: "GROQ_MODEL",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    type: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    modelEnv: "OPENROUTER_MODEL",
  },
  anthropic: {
    id: "anthropic",
    label: "Claude",
    type: "anthropic",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    defaultModel: "claude-sonnet-4-6",
    modelEnv: "PROMPTSMITH_BOOST_MODEL",
  },
};

const DEFAULT_ORDER: ProviderId[] = ["groq", "openrouter", "anthropic"];

/** The failover order, from PROMPTSMITH_AI_ORDER or the default. */
export function providerOrder(): ProviderId[] {
  const raw = process.env.PROMPTSMITH_AI_ORDER;
  if (!raw) return DEFAULT_ORDER;
  const ids = raw.split(",").map((s) => s.trim()).filter((s): s is ProviderId => s in PROVIDERS);
  return ids.length ? ids : DEFAULT_ORDER;
}

export function hasKey(p: Provider): boolean {
  return Boolean(process.env[p.apiKeyEnv]);
}

/** Providers with a configured key, in failover order. */
export function availableProviders(): Provider[] {
  return providerOrder().map((id) => PROVIDERS[id]).filter(hasKey);
}

export function modelFor(p: Provider): string {
  return process.env[p.modelEnv] || p.defaultModel;
}
