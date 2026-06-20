// ── Aesthetic direction engine ────────────────────────────────────────────────
// Maps the layman's free-text "vibe" onto a concrete, bold aesthetic direction
// with real font pairings and palette guidance. This is what turns "make it
// look cool" into something a model can execute decisively.

export interface AestheticDirection {
  id: string;
  /** Display name shown to the user. */
  name: string;
  /** One-line essence. */
  essence: string;
  /** Words that, if present in the vibe, select this direction. */
  match: string[];
  /** Concrete font pairing suggestions (display / body / mono optional). */
  fonts: { display: string; body: string; mono?: string };
  /** Palette guidance — a directive, not a fixed set. */
  palette: string;
  /** Signature move that makes it memorable. */
  signature: string;
}

export const DIRECTIONS: AestheticDirection[] = [
  {
    id: "editorial",
    name: "Editorial / Magazine",
    essence: "Print-grade typography, confident whitespace, a strong grid that knows when to break.",
    match: ["editorial", "magazine", "elegant", "sophisticated", "clean", "premium", "luxury", "refined", "minimal"],
    fonts: { display: "Fraunces or Canela", body: "Hanken Grotesk or Söhne", mono: "JetBrains Mono" },
    palette: "Warm off-white or rich cream base, near-black ink, ONE saturated accent (oxblood, cobalt, or ochre). No gradients.",
    signature: "Oversized display headline that overlaps a rule line or image, with generous margins around it.",
  },
  {
    id: "brutalist",
    name: "Brutalist / Raw",
    essence: "Monospace, hard edges, exposed structure, high contrast, zero decoration.",
    match: ["brutalist", "raw", "bold", "technical", "developer", "indie", "underground", "stark", "loud"],
    fonts: { display: "Archivo Expanded or Neue Haas Grotesk Display", body: "IBM Plex Mono or Spline Sans Mono", mono: "IBM Plex Mono" },
    palette: "Stark mono base (paper-white or black) with one electric accent (acid green, hot red, or safety orange). Borders as the primary device.",
    signature: "Visible grid lines and labeled sections, like a blueprint or a system manual.",
  },
  {
    id: "retrofuture",
    name: "Retro-futuristic / Cyber",
    essence: "Dark, atmospheric, neon-on-obsidian, a controlled sci-fi mood.",
    match: ["cyber", "futuristic", "neon", "tech", "ai", "crypto", "gaming", "dark", "sci-fi", "space", "hud", "terminal"],
    fonts: { display: "Clash Display or Chakra Petch", body: "Geist Sans or Hanken Grotesk", mono: "Spline Sans Mono or JetBrains Mono" },
    palette: "Deep obsidian / near-black base, with one luminous accent (cyan, ember-amber, or magenta) used sparingly for glow and emphasis.",
    signature: "A single atmospheric background effect (fine grid, subtle noise, or a glow) with crisp data-dense foreground.",
  },
  {
    id: "organic",
    name: "Organic / Natural",
    essence: "Warm, tactile, earthy, soft curves and natural texture.",
    match: ["organic", "natural", "warm", "earthy", "wellness", "calm", "soft", "human", "cozy", "handmade", "eco"],
    fonts: { display: "Fraunces or Reckless", body: "Hanken Grotesk or Mona Sans" },
    palette: "Earth tones — clay, sand, moss, terracotta — with a deep ink for text. Avoid pure white; use warm paper.",
    signature: "Rounded organic shapes, grain texture, and imagery that feels photographed, not stock.",
  },
  {
    id: "playful",
    name: "Playful / Toy-like",
    essence: "Bright, bouncy, friendly, confident use of color and motion.",
    match: ["playful", "fun", "friendly", "kids", "bright", "colorful", "energetic", "bold color", "youthful", "quirky"],
    fonts: { display: "Clash Display or Gabarito", body: "Mona Sans or Hanken Grotesk" },
    palette: "Two or three saturated, joyful colors on a clean base. Use color in big confident fields, not timid accents.",
    signature: "Springy, physical micro-interactions and a hero element that moves or reacts.",
  },
  {
    id: "deco",
    name: "Art-deco / Geometric",
    essence: "Symmetry, gold-line geometry, luxe restraint, structured ornament.",
    match: ["deco", "geometric", "luxe", "gold", "classic", "heritage", "ornate", "structured", "architectural"],
    fonts: { display: "Cormorant or Playfair Display", body: "Hanken Grotesk or Söhne" },
    palette: "Deep jewel base (emerald, navy, oxblood) with metallic gold/brass linework as accent. High contrast, low color count.",
    signature: "Thin geometric frame/linework motif repeated as a structural device.",
  },
  {
    id: "industrial",
    name: "Industrial / Utilitarian",
    essence: "Function-first, data-dense, precise, no fluff — a control panel aesthetic.",
    match: ["industrial", "utilitarian", "dashboard", "saas", "data", "enterprise", "tool", "admin", "b2b", "functional"],
    fonts: { display: "Neue Haas Grotesk Display or Archivo", body: "Geist Sans or Söhne", mono: "JetBrains Mono" },
    palette: "Neutral graphite/slate base, with a single functional accent for action/state. Restrained, legible, honest.",
    signature: "Tight, information-dense layout with a precise type scale and purposeful use of mono for data.",
  },
];

/** Resolve a direction by id (for manual override). Returns undefined if unknown. */
export function getDirectionById(id: string): AestheticDirection | undefined {
  return DIRECTIONS.find((d) => d.id === id);
}

/**
 * Pick the best-matching direction. The explicit `vibe` field is the user's
 * deliberate aesthetic signal, so matches there are weighted higher than matches
 * found in the looser `fallbackHint` (kind + brief) — otherwise a stray adjective
 * in the brief can hijack the direction.
 */
export function selectDirection(vibe: string, fallbackHint = ""): AestheticDirection {
  const v = vibe.toLowerCase();
  const f = fallbackHint.toLowerCase();
  let best: { dir: AestheticDirection; score: number } | null = null;
  for (const dir of DIRECTIONS) {
    const score = dir.match.reduce((n, kw) => n + (v.includes(kw) ? 3 : 0) + (f.includes(kw) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { dir, score };
  }
  // Default: editorial is the safest "designed, not slop" baseline.
  return best?.dir ?? DIRECTIONS[0];
}

export function renderAestheticBlock(dir: AestheticDirection, brandColors: string): string {
  const lines = [
    `AESTHETIC DIRECTION — commit fully to: ${dir.name}.`,
    `Essence: ${dir.essence}`,
    `Typography: pair ${dir.fonts.display} (display) with ${dir.fonts.body} (body)${dir.fonts.mono ? `, and ${dir.fonts.mono} for any code/data` : ""}. State exact font names and import them (e.g. Google Fonts / Fontshare). Do not substitute generic fonts.`,
  ];
  if (brandColors.trim()) {
    lines.push(
      `Color: the brand colors are ${brandColors.trim()} — build the palette AROUND these as the dominant identity, applying the direction's logic (dominant color + sharp accent, real depth, no timid pastels).`
    );
  } else {
    lines.push(`Color: ${dir.palette}`);
  }
  lines.push(`Signature move (make it memorable): ${dir.signature}`);
  return lines.join("\n");
}
