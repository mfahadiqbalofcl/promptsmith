// ── AI Boost meta-prompt ──────────────────────────────────────────────────────
// The deterministic compiler already produces a strong, structured prompt. The
// Boost pass hands that prompt to a model whose ONLY job is to sharpen it —
// resolve ambiguity, add specificity, tighten language — WITHOUT weakening any
// constraint or inflating it into vagueness.

import type { Intake } from "./types";

export const BOOST_SYSTEM = `You are a world-class prompt engineer who specializes in prompts for AI-driven frontend and UI design work. You do not design the interface yourself — you refine the PROMPT that another AI will execute.

Your job: take an already-structured prompt and make it sharper and more executable, while strictly preserving its intent and all of its constraints.

Rules for your edit:
- Keep every constraint, ban, and requirement intact. Never soften the anti-AI-slop rules or the human-feel rules — those are the point.
- Resolve vagueness with concrete, plausible specifics that fit the brief (specific section ideas, content angles, interaction details). Invent sensible specifics rather than leaving blanks.
- Improve clarity and ordering. Remove redundancy. Tighten wording so the model that receives it cannot drift toward a generic result.
- Do NOT add meta-commentary, do NOT explain your changes, do NOT wrap the result in markdown fences or quotes.
- Preserve the labeled-section structure. Output ONLY the finished, ready-to-paste prompt.`;

// ── AI-distill meta-prompt ────────────────────────────────────────────────────
// Reads accumulated freeform feedback and proposes crisp, reusable lessons. Each
// lesson is a corrective rule that, injected into future prompts, prevents the
// failure the feedback describes.

export const DISTILL_SYSTEM = `You are a prompt-engineering analyst. You read real feedback that developers left after using AI-generated frontend prompts, and you distill it into concise, reusable "lessons" — corrective rules that will be injected into future prompts to prevent the same failures.

Output a strict JSON array (and nothing else). Each item:
{ "scope": { "kind": <a short deliverable id if clear, e.g. "landing"/"plugin"/"elementor-widget", else omit> }, "text": "<the corrective rule, imperative, specific, 1-2 sentences>" }

Rules:
- Only include a scope.kind when the feedback clearly points to one deliverable type; otherwise omit scope entirely (a broad lesson).
- Make each lesson actionable and concrete — name the fix, not the complaint. Bad: "fonts were bad". Good: "Name the exact display and body fonts and forbid generic substitutes."
- Merge duplicates. Return at most 8 lessons. If the feedback contains nothing actionable, return [].
- Output ONLY the JSON array. No prose, no markdown fences.`;

export function buildDistillUser(
  notes: { kind?: string; framework?: string; outcome: string; worked: string; improve: string }[]
): string {
  const lines = notes.map((n, i) =>
    `#${i + 1} [${n.kind ?? "?"}/${n.framework ?? "?"}] outcome=${n.outcome}` +
    (n.worked ? `\n  worked: ${n.worked}` : "") +
    (n.improve ? `\n  improve: ${n.improve}` : "")
  );
  return ["Distill these feedback notes into lessons. Return JSON only.", "", lines.join("\n")].join("\n");
}

/** Tolerant parse of the distill model output into lesson candidates. */
export function parseDistill(text: string): { scope: { kind?: string; framework?: string }; text: string }[] {
  let raw = text.trim();
  // strip accidental code fences
  raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  // Try a direct parse first (the happy path); only fall back to bracket-slicing
  // if that fails, so prose containing a stray "[" can't corrupt a valid array.
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    try {
      arr = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(arr)) return [];
  return (arr as Array<Record<string, unknown>>)
    .filter((x) => x && typeof x.text === "string" && (x.text as string).trim())
    .map((x) => {
      const scope = (x.scope ?? {}) as Record<string, unknown>;
      return {
        scope: {
          kind: typeof scope.kind === "string" ? scope.kind : undefined,
          framework: typeof scope.framework === "string" ? scope.framework : undefined,
        },
        text: String(x.text).trim(),
      };
    });
}

export function buildBoostUser(compiledPrompt: string, intake: Intake): string {
  return [
    "Here is the structured prompt to refine. Return the improved version only.",
    "",
    "Original layman brief (for grounding — do not lose its intent):",
    `"""${intake.brief.trim()}"""`,
    "",
    "Structured prompt to sharpen:",
    `"""`,
    compiledPrompt,
    `"""`,
  ].join("\n");
}
