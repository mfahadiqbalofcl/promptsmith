// ── Frontend build targets ────────────────────────────────────────────────────
// Pure data for the FRONTEND domain pack. Each target translates into concrete
// technical constraints + an output-format spec. (Render logic lives in the
// compiler so every domain shares one renderer.) Elementor moved to its own
// domain in lib/knowledge/domains.ts.

import type { TargetSpec } from "../types";

export const FRONTEND_TARGETS: TargetSpec[] = [
  {
    id: "html",
    label: "HTML / CSS / JS",
    stack: "Semantic HTML5, modern CSS (custom properties, grid, flex, clamp), and vanilla JS only where needed.",
    output: "Return ONE self-contained .html file with a <style> block and minimal inline <script>. No build step, opens by double-click.",
    notes: "Use distinctive fonts via a <link> to Google Fonts / Fontshare. Keep JS dependency-free unless animation truly needs a library.",
  },
  {
    id: "react",
    label: "React",
    stack: "React 18+ function components with hooks. CSS Modules or styled-jsx for styles — no inline style soup.",
    output: "Return a small set of composable components with clear props. Name files and show the component tree.",
    notes: "Use the Motion library for animation when motion is called for. Keep state local and minimal.",
  },
  {
    id: "next",
    label: "Next.js (App Router)",
    stack: "Next.js App Router, TypeScript, Server Components by default, Client Components only where interactivity requires it.",
    output: "Return files mapped to the app/ directory with correct 'use client' boundaries. Show the file tree.",
    notes: "Co-locate styles. Use next/font for the chosen typefaces. Keep the client bundle lean.",
  },
  {
    id: "tailwind",
    label: "Tailwind CSS",
    stack: "Tailwind utility classes with a customized theme (extend fonts, colors, spacing in the config to match the direction).",
    output: "Return markup with Tailwind classes AND the tailwind.config theme extension needed for the custom fonts/colors.",
    notes: "Do not rely on default Tailwind grays/blues — extend the palette so it doesn't read as a stock Tailwind site.",
  },
  {
    id: "vue",
    label: "Vue 3",
    stack: "Vue 3 <script setup> SFCs with scoped styles.",
    output: "Return .vue single-file components with clear props/emits. Show the component tree.",
    notes: "Keep reactivity minimal and explicit. Scoped styles per component.",
  },
];
