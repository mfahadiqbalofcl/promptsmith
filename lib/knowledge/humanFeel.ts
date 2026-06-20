// ── Human-feel ruleset ────────────────────────────────────────────────────────
// Constraints that make output read as crafted by a person, not assembled by a
// machine. These are about judgment, restraint, and intentional imperfection.

export const HUMAN_FEEL_RULES: string[] = [
  "Write copy a real human in this domain would write: specific nouns, a point of view, an actual voice. No filler, no 'Welcome to our website', no buzzword soup.",
  "Use real, plausible content — real-sounding names, prices, dates, stats, product names — not placeholders. Invent specifics that fit the brief.",
  "Allow intentional imperfection: an off-grid element, a hand-tuned line-height, an asymmetric margin. Perfection on every axis reads as templated.",
  "Vary sentence and element length. Mechanical uniformity (every card the same height, every paragraph the same length) is a tell.",
  "Give the design an opinion. A human designer makes choices that exclude things; list what this design deliberately leaves OUT.",
  "Honor visual hierarchy the way a person scanning the page actually reads it — not a flat field of equally-weighted blocks.",
  "Micro-copy matters: button labels, placeholders, error and empty states should sound human and specific to the product, not generic.",
  "Prefer restraint where the brief is premium/elite/luxury: one strong idea, generous whitespace, a tight palette. Feature-density reads as amateur.",
];

export function renderHumanFeelBlock(): string {
  return [
    "MAKE IT FEEL HUMAN-CRAFTED, not AI-generated:",
    HUMAN_FEEL_RULES.map((r) => `- ${r}`).join("\n"),
  ].join("\n");
}
