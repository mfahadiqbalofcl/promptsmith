// ── Learning engine ───────────────────────────────────────────────────────────
// Turns accumulated feedback into reinforced "lessons", and selects the lessons
// relevant to a given intake so the compiler can inject them. This is the loop
// that makes PROMPTSMITH get better the more it's used — no model training, just
// feedback-driven rule reinforcement that compounds.

import type { Lesson, SessionRecord, FeedbackRecord, Intake, Domain } from "./types";

// Each failure tag maps to the corrective rule we reinforce when devs report it.
// Covers both pipelines — design tags and engineering tags.
const REINFORCEMENT: Record<string, string> = {
  // ── design ──
  "generic-fonts":
    "Font discipline is a known weak spot: explicitly name the exact display and body typefaces AND include the import line. Re-state that generic fonts (Inter, Roboto, Arial, system-ui, Space Grotesk) are forbidden — do not substitute.",
  "template-layout":
    "Past outputs in this category collapsed into the default template. Forbid the centered-hero + 3-card-grid + testimonial + CTA-band skeleton outright. Require a section structure derived from the content, with at least one grid-breaking or asymmetric move.",
  "ignored-brand":
    "Brand colors have been ignored before. Make the supplied brand colors the dominant identity of the palette and reference them by name in the design rationale.",
  "lorem":
    "Placeholder copy has slipped through. Require fully specific, real-sounding content end to end — invent concrete names, numbers, and product details. Zero lorem ipsum or 'your text here'.",
  "weak-hierarchy":
    "Hierarchy has read flat in past results. Require a deliberate type scale and a clear primary/secondary/tertiary reading order; the most important element must dominate.",
  "no-memorable-moment":
    "Outputs have lacked a signature element. Require ONE specific, named, memorable moment (a hero treatment, an interaction, a visual device) and describe it explicitly.",
  "ignored-musthaves":
    "Required items have been dropped before. Treat every listed requirement as non-negotiable and confirm each is present before finishing.",
  "not-responsive":
    "Mobile layouts have broken before. Require explicit mobile, tablet, and desktop behavior with no horizontal scroll, and test the narrow viewport mentally.",
  "bad-contrast-a11y":
    "Accessibility has regressed in past results. Enforce WCAG AA contrast, visible focus states, and keyboard operability as hard requirements.",
  "too-generic":
    "Whole outputs have felt AI-generic. Push harder on a single bold, specific aesthetic point of view; reject any safe middle-ground result.",
  // ── engineering ──
  "missing-escaping":
    "Output escaping has been missed before. Require that EVERY dynamic value printed to the page is escaped at the point of output (esc_html/esc_attr/esc_url/wp_kses) — call it out explicitly.",
  "missing-sanitization":
    "Input sanitization has slipped. Require sanitizing every piece of input on the way in (sanitize_text_field, absint, sanitize_email, wp_kses_post) and never trusting superglobals.",
  "no-nonce":
    "Nonce checks have been omitted. Require a nonce on every form/AJAX/state-changing request, verified with check_admin_referer / wp_verify_nonce / check_ajax_referer.",
  "no-cap-check":
    "Capability checks have been missing. Require current_user_can() before any privileged read or write; never authorize via is_admin() or hidden fields.",
  "direct-db":
    "Raw SQL has appeared. Require $wpdb->prepare() for every dynamic query, and prefer core APIs (WP_Query/get_posts) over hand-written SQL.",
  "not-prefixed":
    "Unprefixed globals have caused collision risk. Require a unique prefix/namespace on all functions, classes, hooks, options, transients, and enqueue handles.",
  "reinvented-wp":
    "Core APIs have been reinvented. Require using WordPress/Woo APIs (Options/Settings, HTTP API, Transients, WP_Query, CRUD) instead of hand-rolled equivalents.",
  "not-i18n":
    "Strings have not been translation-ready. Require wrapping every user-facing string in the i18n functions with one consistent text domain.",
  "god-function":
    "Monolithic code has appeared. Require a real architecture — separated files/classes with single responsibilities; no 500-line god-file.",
  "left-boilerplate":
    "Boilerplate/TODOs/dead code have been left in. Require finished, committed-quality code: no placeholders, no commented-out blocks, no fake @since noise.",
  "perf-heavy":
    "Performance has been careless. Require caching expensive work (transients/object cache), no queries in loops, conditional asset loading, and early bailouts.",
};

// Reinforce a lesson once feedback in a scope hits this many reports.
const THRESHOLD = 1;

function lessonId(domain: string, kind: string, fw: string, issue: string): string {
  return `L:${domain || "*"}:${kind || "*"}:${fw || "*"}:${issue}`;
}

/**
 * Recompute lessons from all feedback. Deterministic and idempotent: the same
 * feedback set always yields the same lessons, with weight = number of reports.
 * Preserves any AI/manual lessons already present.
 */
export function distillLessons(
  sessions: SessionRecord[],
  feedback: FeedbackRecord[],
  existing: Lesson[]
): Lesson[] {
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  // Tally: scope+issue -> { count, domain, kind, framework, lastAt }
  const tally = new Map<
    string,
    { count: number; domain?: Domain; kind?: string; framework?: string; issue: string; lastAt: string }
  >();

  for (const f of feedback) {
    if (f.outcome === "success") continue; // only failures/partials teach corrections
    const s = sessionById.get(f.sessionId);
    const domain = s?.domain;
    const kind = s?.kind;
    const framework = s?.framework;
    for (const issue of f.issues) {
      if (!REINFORCEMENT[issue]) continue;
      const key = lessonId(domain ?? "", kind ?? "", framework ?? "", issue);
      const cur = tally.get(key);
      if (cur) {
        cur.count += 1;
        if (f.createdAt > cur.lastAt) cur.lastAt = f.createdAt;
      } else {
        tally.set(key, { count: 1, domain, kind, framework, issue, lastAt: f.createdAt });
      }
    }
  }

  // Keep human/AI lessons; rebuild the auto ones from the tally.
  const kept = existing.filter((l) => l.source !== "auto");
  const auto: Lesson[] = [];
  const now = new Date().toISOString();

  for (const [key, t] of tally) {
    if (t.count < THRESHOLD) continue;
    const prior = existing.find((l) => l.id === key);
    auto.push({
      id: key,
      createdAt: prior?.createdAt ?? now,
      updatedAt: now,
      scope: { domain: t.domain, kind: t.kind, framework: t.framework },
      text: REINFORCEMENT[t.issue],
      source: "auto",
      weight: t.count,
      muted: prior?.muted, // preserve a mute set by a human across recomputes
    });
  }

  // Strongest lessons first.
  return [...auto, ...kept].sort((a, b) => b.weight - a.weight);
}

/** Pick the lessons relevant to a given intake (matching scope or broad). */
export function selectRelevantLessons(lessons: Lesson[], intake: Pick<Intake, "domain" | "kind" | "framework">, max = 6): Lesson[] {
  return lessons
    .filter((l) => {
      if (l.muted) return false;
      const domainOk = !l.scope.domain || l.scope.domain === intake.domain;
      const kindOk = !l.scope.kind || l.scope.kind === intake.kind;
      const fwOk = !l.scope.framework || l.scope.framework === intake.framework;
      return domainOk && kindOk && fwOk;
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, max);
}

export function renderLessonsBlock(lessons: Lesson[]): string {
  if (!lessons.length) return "";
  const lines = lessons.map((l) => `- ${l.text}${l.weight > 1 ? ` (reported ${l.weight}×)` : ""}`);
  return [
    "LESSONS LEARNED — apply these. They come from real feedback on past prompts in this category and override any tendency to regress:",
    lines.join("\n"),
  ].join("\n");
}
