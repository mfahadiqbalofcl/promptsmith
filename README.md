# PROMPTSMITH: the prompt forge

> Raw layman input in. Master-grade prompt out.

![license](https://img.shields.io/badge/license-MIT-ff6a2b) ![next](https://img.shields.io/badge/Next.js-15-000) ![free](https://img.shields.io/badge/free-no%20key%20required-76c07a)

A free, open-source prompt compiler. Describe what you want in plain English and
PROMPTSMITH compiles it into an expert-grade, structured prompt that an AI (Claude,
v0, Cursor, ChatGPT, etc.) executes far better than a casually-typed request. It also
bakes in an anti-AI-slop ruleset (or, for code, a production-WordPress ruleset)
so the output looks human-made, not machine-stamped. It runs 100% free with no API key,
and it learns from your feedback so every prompt is sharper than the last.

Built for an agency, open-sourced for everyone. MIT licensed: use it, fork it, deploy it.

## Why it exists

"Vibe coding" gives garbage-in → garbage-out. A loose prompt produces the telltale
AI look: Inter/Space Grotesk fonts, purple-on-white gradients, the centered-hero +
3-card-grid template, lorem ipsum. PROMPTSMITH fixes the *input* so the output is
sharp, specific, and on-brand every time, regardless of who's prompting.

## Domains (v2)

PROMPTSMITH compiles prompts for four domains, across two pipelines:

| Domain | Pipeline | What it produces |
|---|---|---|
| **Frontend / Design** | design | Landing pages, sections, wireframes, redesigns (HTML/React/Next/Tailwind/Vue) |
| **Elementor** | design | Page templates, sections, headers/footers, popups (a build recipe + Custom CSS) |
| **Custom Widget** | engineering | Elementor widgets, Gutenberg blocks, shortcodes (production WP code) |
| **WP / Woo Plugin** | engineering | WordPress & WooCommerce plugins (secure, standards-compliant code) |

- The design pipeline runs the aesthetic-direction + anti-AI-slop + human-feel engine.
- The engineering pipeline swaps those for WordPress coding standards, security
  (sanitize / escape / nonces / capabilities / `$wpdb->prepare`), i18n, and an
  anti-boilerplate code-quality ruleset, and auto-injects a WooCommerce block
  when the brief touches Woo.

Adding a domain pack is mostly data: extend `lib/knowledge/domains.ts` (kinds + targets);
the compiler routes by `pipeline` automatically.

## How it works (the hybrid engine)

1. **Deterministic compiler** (`lib/compiler.ts`): 100% free, no API key, instant.
   Takes the structured intake and assembles a prompt using a CO-STAR-derived
   structure (Role · Context · Objective · Aesthetic · Constraints · Output) fused
   with the frontend-design discipline. This alone produces a ~1,000-word expert prompt.
2. **AI Boost** (optional, `app/api/boost/route.ts`): a "Boost" button hands the compiled
   prompt to an AI that sharpens it *without weakening any constraint*. It runs on a
   multi-provider failover chain (Groq → OpenRouter → Claude) so it stays up on free
   tiers: when one provider rate-limits or errors, the next takes over automatically. Works
   fully without any key; Boost just adds polish.

3. **The learning loop.** The system gets better the more it's used:
   - Every forge auto-saves to a shared server-side store (`data/promptsmith.json`).
   - After using a prompt, devs submit feedback: outcome (nailed / partly / missed),
     structured issue tags (e.g. "used a generic font", "fell back to the template layout"),
     and plain-language notes.
   - Failures distill into reinforced "lessons" (`lib/learning.ts`), scoped by
     project-type + framework, with a weight that grows as the same issue recurs.
   - Future prompts in that category auto-inject the relevant lessons as a
     high-priority block, and since AI Boost reads the whole prompt, Claude inherits
     them too. No model training; just feedback-driven rule reinforcement that compounds.
   - The Memory tab shows accumulated lessons, the success rate, and forge history.

The real IP is in `lib/knowledge/`. Edit these to tune your agency's house style:

| File | What it controls |
|---|---|
| `knowledge/antiSlop.ts` | The bans (fonts, gradients, template layouts) + positive forcing functions |
| `knowledge/humanFeel.ts` | Rules that make output read as human-crafted |
| `knowledge/aesthetics.ts` | 7 bold aesthetic directions + font pairings, auto-selected from the "vibe" |
| `knowledge/frameworks.ts` | Per-target tech constraints + output format (HTML, React, Next, Tailwind, Vue, Elementor) |
| `knowledge/projectTypes.ts` | How each deliverable (landing / section / wireframe / redesign) is framed |
| `knowledge/domains.ts` | The domain registry: 4 packs, each with kinds + targets + pipeline |
| `knowledge/wpEngineering.ts` | WP standards, security, code-quality, WooCommerce rulesets (engineering pipeline) |
| `learning.ts` | Maps feedback issue-tags → reinforcement rules; distills + selects lessons (domain-scoped) |
| `store.ts` | Shared JSON store (sessions / feedback / lessons), atomic writes, swappable for SQLite/Postgres |

## Features

**Forge view**
- Plain-English brief → expert prompt, with deliverable + build-target + density controls
- **Direction override:** auto-selects an aesthetic direction from your vibe, or force one of 7
- **Avoid field:** brief-specific negative constraints (hard bans)
- Live readiness signals + a count of learned lessons that will be injected
- **⌘↵ / Ctrl+↵** to forge; **Copy**, **download .md**, **AI Boost**, **↗ Claude / ↗ ChatGPT** (copies + opens), **Breakdown**, **Recompile**
- Draft auto-saves to localStorage; honest header chip shows whether AI Boost is configured

**Memory view (the growing brain)**
- Stats: prompts forged · feedback logged · lessons learned · success rate
- **Lessons:** auto-distilled from feedback, plus add your own house rules, mute, or delete any lesson
- **✦ Distill notes:** (with a key) Claude reads freeform feedback and proposes new lessons
- **Recent forges:** click any to reload its full brief back into the editor

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional AI Boost:

```bash
cp .env.example .env
# add ANTHROPIC_API_KEY=sk-ant-...
```

## Deploy your own (free)

One-click on Vercel, or:

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # production
```

It deploys with zero config and no env vars: the free deterministic engine
works out of the box. For a public instance, mind these:

| Env var | Why |
|---|---|
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY` | Enable AI Boost + AI-distill. Set any/all; they form a **failover chain** (tried in order; when one rate-limits or errors, the next takes over). Groq + OpenRouter both have free tiers → free, resilient AI for your devs. |
| `GROQ_MODEL` / `OPENROUTER_MODEL` / `PROMPTSMITH_BOOST_MODEL` | Optional model overrides (good free-tier defaults built in). |
| `PROMPTSMITH_AI_ORDER` | Failover order, e.g. `groq,openrouter,anthropic` (default). |
| `PROMPTSMITH_ADMIN_TOKEN` | **Set on any public deploy.** Locks store-mutating endpoints (add/mute/delete lessons, AI-distill) behind an `x-promptsmith-admin` header. AI Boost stays open for users. |
| `NEXT_PUBLIC_SITE_URL` | Your deploy URL, for OG/social share cards. |

**Persistence note:** on serverless (Vercel), the JSON store falls back to the temp
dir, so the learned "brain" is per-instance and ephemeral (the app detects this and
shows a banner). The prompt compiler is fully stateless and works perfectly. For a
durable, shared brain, self-host on a persistent server, or swap `lib/store.ts` for
KV/Postgres (the module's API is the only surface callers depend on).

## License

[MIT](./LICENSE) © Systical. Free for any use, including commercial. No warranty.

## Tech stack

- **Next.js 15** (App Router, TypeScript): standalone web app + the Boost API route
- **Bespoke CSS** (`app/globals.css`): no Tailwind; full control over the
  obsidian-and-ember precision-instrument aesthetic (deliberately not AI-slop)
- **@anthropic-ai/sdk**: optional, only used by the Boost route (system prompt is cached)

## Roadmap

- **v1:** frontend / design prompts (landing, section, wireframe, redesign). ✓
- **v1.1:** direction override, avoid field, lesson management, AI-distill, history reload, QoL. ✓
- **v2 (this build):** domain packs (Elementor, Custom Widget, WP/Woo Plugin), with a full
  engineering pipeline (WP standards / security / i18n / code-quality / WooCommerce). ✓
- **Next:** per-dev house-style profiles, prompt presets, a Gutenberg full-site-editing pack,
  and optional SQLite/Postgres for the store.
