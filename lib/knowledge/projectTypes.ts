// ── Frontend deliverables ─────────────────────────────────────────────────────
// Pure data for the FRONTEND domain pack. Each kind reframes the layman brief
// into a sharp objective + the structural guidance a designer brings to that
// specific deliverable. (Render logic lives in the compiler.)

import type { KindSpec } from "../types";

export const FRONTEND_KINDS: KindSpec[] = [
  {
    id: "landing",
    label: "Full page / landing page",
    role: "a senior product designer and front-end engineer who ships award-quality marketing pages",
    objective: (b) =>
      `Design and build a complete, single landing page that achieves this goal: ${b}. The page must persuade its specific audience and feel like a real, shipped product — not a template.`,
    structure: [
      "Decide the narrative arc of the page (what the visitor feels and understands, in order) before choosing sections — let content drive structure, not a fixed template.",
      "Every section must earn its place and look distinct from the others; avoid the repeated identical-card rhythm.",
      "Include a deliberate, memorable hero moment and a clear, single primary call-to-action.",
    ],
  },
  {
    id: "fullsite",
    label: "Complete website (from scratch)",
    role: "a senior product designer and front-end engineer who ships entire production websites end-to-end, from concept to the last page",
    objective: (b) =>
      `Design and build a COMPLETE, multi-page website from scratch for: ${b}. Deliver the whole site — every page built in full — not a single page and not a fragment.`,
    structure: [
      "Plan the full sitemap (home + every inner page the brief implies) and a shared design system — tokens, type scale, components, header, footer, nav — applied consistently across all pages.",
      "Build EVERY page in full with real, specific content and working navigation between them. No 'coming soon', no stub pages, no lorem.",
      "Make it responsive across breakpoints, add basic per-page SEO meta, and lay out a clear file/page structure the developer can drop in and run.",
    ],
  },
  {
    id: "section",
    label: "Section / component",
    role: "a senior front-end engineer and interaction designer who builds reusable, polished UI pieces",
    objective: (b) =>
      `Design and build this specific component/section: ${b}. It must be self-contained, reusable, and visually distinctive while fitting into a larger page.`,
    structure: [
      "Define the component's states (default, hover, active, focus, loading, empty, error) where relevant.",
      "Make the API/props (or structure) clean and obvious for another dev to reuse.",
      "Give it one signature detail so it doesn't look like a stock component.",
    ],
  },
  {
    id: "wireframe",
    label: "Wireframe / layout / structure",
    role: "a senior UX designer who turns rough ideas into clear, intentional information architecture and layout",
    objective: (b) =>
      `Produce the structure and layout for: ${b}. Focus on hierarchy, flow, and spatial composition first — the skeleton a strong design hangs on.`,
    structure: [
      "Lay out the information architecture: what content blocks exist, their priority, and their reading order.",
      "Define the grid, the spatial rhythm, and where the layout intentionally breaks symmetry to create interest.",
      "Annotate intent for each region (purpose, hierarchy, interaction) — this is a blueprint, so be explicit, but still commit to a non-generic spatial concept.",
    ],
  },
  {
    id: "redesign",
    label: "Redesign / restyle",
    role: "a senior designer who elevates existing products without throwing away what works",
    objective: (b) =>
      `Redesign / restyle this: ${b}. IMPROVE IN PLACE — keep the existing content and information, restyle and re-compose it, add new sections only where they strengthen the goal. Do not invent a different product or discard the brand.`,
    structure: [
      "Preserve the existing content and core structure; derive the new palette from the brand's own identity rather than swapping in unrelated colors.",
      "Identify the specific weaknesses (generic layout, weak hierarchy, dated styling) and target those.",
      "Show the before-intent and the after-intent so the improvement is legible.",
    ],
  },
];
