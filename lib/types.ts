// ── PROMPTSMITH core types ───────────────────────────────────────────────────
// The intake is what a layman fills in. The compiler turns it into an expert
// prompt. Keep this shape stable — the deterministic engine and the AI Boost
// route both depend on it.

// Kept as named unions for the FRONTEND pack (referenced by its knowledge data).
// Other domains define their own kind/target ids, so Intake.kind/framework are
// widened to string below and resolved through the domain registry.
export type ProjectKind =
  | "landing"
  | "section"
  | "wireframe"
  | "redesign";

export type Framework =
  | "html"
  | "react"
  | "next"
  | "tailwind"
  | "vue";

export type Density = "minimal" | "balanced" | "rich";

// Shared spec shapes used by every domain pack (see lib/knowledge/domains.ts).
export interface KindSpec {
  id: string;
  label: string;
  /** "You are <role>." */
  role: string;
  objective: (brief: string) => string;
  /** Designer/engineer approach bullets for this deliverable. */
  structure: string[];
}
export interface TargetSpec {
  id: string;
  label: string;
  stack: string;
  output: string;
  notes: string;
}

// ── Domains (v2) ──────────────────────────────────────────────────────────────
// A domain is "what kind of thing are we building". Each maps to a pipeline:
//  - design      → aesthetic + anti-slop + human-feel engine (visual output)
//  - engineering → WordPress coding-standards + security + anti-bloat engine (code)
export type Domain = "frontend" | "elementor" | "widget" | "plugin";
export type Pipeline = "design" | "engineering";

export const DOMAIN_PIPELINE: Record<Domain, Pipeline> = {
  frontend: "design",
  elementor: "design",
  widget: "engineering",
  plugin: "engineering",
};

export interface Intake {
  /** What kind of thing we're building. Selects the pipeline + available options. */
  domain: Domain;
  /** The raw, plain-English ask. The one required field. */
  brief: string;
  /** Deliverable id, relative to the domain (resolved via the domain registry). */
  kind: string;
  /** Who is this for? Free text — "busy ER nurses", "crypto traders", etc. */
  audience: string;
  /** What feeling should it give? Free text. Drives aesthetic direction. */
  vibe: string;
  /** Optional brand colors (hex or names), comma separated. */
  brandColors: string;
  /** Optional must-have elements / sections / features. */
  mustHaves: string;
  /** Optional references or inspiration. */
  references: string;
  /** Optional: things to deliberately avoid (negative constraints from the brief). */
  avoid: string;
  /** Optional: force a specific aesthetic direction by id. "" = auto-select from vibe. */
  directionOverride: string;
  /** Build target id, relative to the domain (resolved via the domain registry). */
  framework: string;
  density: Density;
  /** Toggle: should the prompt force a hard anti-AI-slop pass? Default true. */
  enforceAntiSlop: boolean;
  /** Toggle: should the prompt demand real content (no lorem ipsum)? Default true. */
  realContent: boolean;
  /** Toggle: demand responsive + accessibility baseline. Default true. */
  responsiveA11y: boolean;
}

export const DEFAULT_INTAKE: Intake = {
  domain: "frontend",
  brief: "",
  kind: "landing",
  audience: "",
  vibe: "",
  brandColors: "",
  mustHaves: "",
  references: "",
  avoid: "",
  directionOverride: "",
  framework: "html",
  density: "balanced",
  enforceAntiSlop: true,
  realContent: true,
  responsiveA11y: true,
};

/** What the compiler returns. */
export interface CompiledPrompt {
  /** The full prompt, ready to paste into any AI. */
  text: string;
  /** Section-by-section breakdown, for the "show your work" view. */
  blocks: { label: string; body: string }[];
  /** Heuristic completeness signals shown to the user before they compile. */
  signals: { label: string; ok: boolean; hint: string }[];
}

// ── Learning loop ─────────────────────────────────────────────────────────────
// The store accumulates these. Feedback distills into Lessons, which get injected
// back into future prompts. Shared server-side so the whole agency trains one brain.

/** One forge event. Saved automatically when a prompt is compiled. */
export interface SessionRecord {
  id: string;
  createdAt: string;
  intake: Intake;
  domain: Domain;
  kind: string;
  framework: string;
  /** The aesthetic direction id the engine selected (design pipeline only). */
  direction: string;
  /** The deterministic prompt text (pre-boost). */
  prompt: string;
  boosted: boolean;
  /** Whether feedback has been submitted for this session yet. */
  hasFeedback?: boolean;
}

export type Outcome = "success" | "partial" | "fail";

export interface IssueTag {
  id: string;
  label: string;
}

/** Design-pipeline failure tags (frontend + Elementor). */
export const DESIGN_ISSUE_TAGS: IssueTag[] = [
  { id: "generic-fonts", label: "Used a generic / banned font" },
  { id: "template-layout", label: "Fell back to the predictable template layout" },
  { id: "ignored-brand", label: "Ignored the brand colors" },
  { id: "lorem", label: "Used placeholder / lorem copy" },
  { id: "weak-hierarchy", label: "Weak visual hierarchy" },
  { id: "no-memorable-moment", label: "No memorable / signature element" },
  { id: "ignored-musthaves", label: "Missed a must-have requirement" },
  { id: "not-responsive", label: "Broke on mobile / not responsive" },
  { id: "bad-contrast-a11y", label: "Contrast / accessibility problems" },
  { id: "too-generic", label: "Just felt generic / AI-made overall" },
];

/** Engineering-pipeline failure tags (widgets + plugins). */
export const ENGINEERING_ISSUE_TAGS: IssueTag[] = [
  { id: "missing-escaping", label: "Output not escaped (esc_html/attr/url)" },
  { id: "missing-sanitization", label: "Input not sanitized" },
  { id: "no-nonce", label: "Missing nonce / CSRF check" },
  { id: "no-cap-check", label: "No capability check" },
  { id: "direct-db", label: "Raw SQL / no $wpdb->prepare()" },
  { id: "not-prefixed", label: "Unprefixed names (collision risk)" },
  { id: "reinvented-wp", label: "Reinvented a WordPress/Woo API" },
  { id: "not-i18n", label: "Strings not translation-ready" },
  { id: "god-function", label: "Monolithic / no architecture" },
  { id: "left-boilerplate", label: "Left boilerplate / TODOs / dead code" },
  { id: "ignored-musthaves", label: "Missed a required feature" },
  { id: "perf-heavy", label: "Performance / loads everything always" },
];

/** Back-compat alias (design tags). Prefer issueTagsFor(domain). */
export const ISSUE_TAGS = DESIGN_ISSUE_TAGS;

export function issueTagsFor(domain: Domain): IssueTag[] {
  return DOMAIN_PIPELINE[domain] === "engineering" ? ENGINEERING_ISSUE_TAGS : DESIGN_ISSUE_TAGS;
}

/** Feedback a dev submits after using the prompt in their AI. */
export interface FeedbackRecord {
  id: string;
  sessionId: string;
  createdAt: string;
  outcome: Outcome;
  /** Selected issue-tag ids (the structured part). */
  issues: string[];
  /** Freeform: what worked well. */
  worked: string;
  /** Freeform, in plain language: what the AI got wrong / how to improve. */
  improve: string;
}

/** A distilled, reinforced rule injected into future prompts. */
export interface Lesson {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Where it applies. Undefined fields = applies broadly. */
  scope: { domain?: Domain; kind?: string; framework?: string };
  /** The reinforcement text injected into the prompt. */
  text: string;
  source: "auto" | "ai" | "manual";
  /** How many feedback signals reinforced it. Higher = stronger. */
  weight: number;
  /** Muted lessons are kept for the record but not injected into prompts. */
  muted?: boolean;
}
