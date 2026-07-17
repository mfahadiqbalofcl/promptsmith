# Changelog

All notable changes to PROMPTSMITH. Format based on [Keep a Changelog](https://keepachangelog.com).

## [1.1.0] - 2026-06-20

### Added
- **Multi-provider AI with automatic failover.** AI Boost + AI-distill now run on a
  failover chain of free providers: **Groq → OpenRouter → Claude** (whichever keys are
  set). When one provider rate-limits, errors, or times out, the next takes over
  automatically, so the AI features stay up 24/7 on free tiers. Models are env-overridable
  (`GROQ_MODEL`, `OPENROUTER_MODEL`), order via `PROMPTSMITH_AI_ORDER`.
- **"Complete website (from scratch)" deliverable.** A new frontend kind that builds an
  entire multi-page site (full sitemap, shared design system, every page built), not a
  single page.
- **One-shot delivery contract** baked into every compiled prompt: deliver the *complete*
  result in a single response (every page/section/file, runnable as-is), no clarifying
  questions, no truncation/placeholders, model-agnostic (Claude / Gemini / GPT / Cursor /
  Google AI Studio). Built to get the job done in one prompt and save AI credits.

### Changed
- `/api/health` now reports the live provider chain (e.g. `["Groq","OpenRouter"]`); the
  header chip shows it, and a boosted prompt shows which provider served it.
- Boost/distill error handling distinguishes "no provider configured" (503, graceful) from
  "all providers failed" (502, prompt still usable).

## [1.0.0] - 2026-06-20

### Added
- Initial public release. Free, open-source (MIT) prompt compiler.
- Deterministic CO-STAR compiler across **4 domains / 2 pipelines**: Frontend & Elementor
  (design: aesthetic + anti-AI-slop + human-feel) and Custom Widget & WP/Woo Plugin
  (engineering: WordPress standards + security + code-quality + WooCommerce).
- Feedback-driven, domain-scoped **learning loop** (auto-distilled lessons, manual house
  rules, mute/delete, optional AI-distill).
- Direction override, "avoid" constraints, draft autosave, download .md, send-to Claude/ChatGPT.
- Production hardening: serverless-resilient store, admin-gated mutating/paid endpoints,
  input validation + caps, WCAG-AA contrast, reduced-motion, focus-visible, mobile-responsive,
  dynamic OG share card.
