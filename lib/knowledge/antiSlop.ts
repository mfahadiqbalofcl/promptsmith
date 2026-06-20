// ── Anti-AI-slop ruleset ──────────────────────────────────────────────────────
// This is the heart of PROMPTSMITH. These are the tells that make AI output
// instantly recognizable as machine-generated, and the constraints that force
// the model away from them. Curated from the frontend-design discipline.
//
// Edit this file to tune your agency's house style — every compiled prompt
// inherits it.

/** Hard bans. Things the model must NOT do. */
export const SLOP_BANS: string[] = [
  "Do NOT use generic fonts: no Inter, Roboto, Arial, Helvetica, Open Sans, Lato, Montserrat, Poppins, or system-ui as the primary typeface. Choose distinctive, characterful fonts instead.",
  "Do NOT default to Space Grotesk — it has become its own cliché. Pick something less expected.",
  "Do NOT use the purple/violet-to-blue gradient on a white or near-white background. This is the single most overused AI color scheme.",
  "Do NOT produce the predictable layout: centered hero with a headline + subtext + two buttons, followed by a 3-column feature card grid with emoji or generic line icons, followed by a testimonial row, followed by a CTA band. Break this template.",
  "Do NOT use evenly-distributed, timid pastel palettes where every color has equal weight. Commit to a dominant color with sharp, intentional accents.",
  "Do NOT fill the page with lorem ipsum or vague placeholder copy ('Lorem ipsum', 'Your headline here', 'Feature one'). Write specific, real, context-appropriate content.",
  "Do NOT decorate with random emoji as icons, or with the default Heroicons/Feather set used without thought.",
  "Do NOT center everything. Avoid the all-centered, perfectly-symmetrical, single-column stack that signals a template.",
  "Do NOT use glassmorphism, neumorphism, or a generic 'gradient blob' background unless it is genuinely the right call for the concept — never as a reflex.",
  "Do NOT use uniform, safe spacing and identical card components everywhere. Vary rhythm and scale.",
];

/** Positive forcing functions. Things the model MUST do. */
export const SLOP_COUNTERS: string[] = [
  "Commit to ONE bold, specific aesthetic direction and execute it with precision. Intentionality beats intensity — both refined minimalism and confident maximalism work; timid middle-ground does not.",
  "Pair a distinctive DISPLAY typeface with a refined BODY typeface. State the exact font names and where to load them.",
  "Build a real type scale and spacing scale as CSS variables. Use them consistently.",
  "Introduce deliberate asymmetry, overlap, diagonal flow, or grid-breaking elements where they serve the concept.",
  "Create atmosphere: layered backgrounds, grain/noise texture, depth via shadow, fine grids, or other context-appropriate detail instead of flat solid fills.",
  "Design one high-impact, well-orchestrated moment (e.g. a staggered page-load reveal) rather than scattering shallow micro-interactions everywhere.",
  "Make at least one element genuinely memorable — the thing a viewer describes afterward. Name what that element is.",
  "Treat every detail — focus states, empty states, hover, the smallest label — as deliberately designed.",
];

/** Rendered as a labeled block inside the compiled prompt. */
export function renderAntiSlopBlock(): string {
  const bans = SLOP_BANS.map((r) => `- ${r}`).join("\n");
  const counters = SLOP_COUNTERS.map((r) => `- ${r}`).join("\n");
  return [
    "AVOID GENERIC AI-GENERATED AESTHETICS. The output must not look machine-generated.",
    "",
    "Never do these:",
    bans,
    "",
    "Always do these:",
    counters,
  ].join("\n");
}
