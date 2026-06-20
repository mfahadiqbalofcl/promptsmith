// ── The deterministic prompt compiler ─────────────────────────────────────────
// Takes the layman Intake and assembles an expert-grade prompt using a CO-STAR-
// derived structure. Domain-aware: a DESIGN pipeline (frontend + Elementor) runs
// the aesthetic/anti-slop/human-feel engine; an ENGINEERING pipeline (widgets +
// plugins) runs the WordPress standards/security/anti-bloat engine. 100% local.

import type { CompiledPrompt, Intake, KindSpec, TargetSpec, Lesson } from "./types";
import { DOMAIN_PIPELINE } from "./types";
import { resolveDomain, resolveKind, resolveTarget } from "./knowledge/domains";
import { selectDirection, getDirectionById, renderAestheticBlock } from "./knowledge/aesthetics";
import { renderAntiSlopBlock } from "./knowledge/antiSlop";
import { renderHumanFeelBlock } from "./knowledge/humanFeel";
import {
  renderStandardsBlock,
  renderSecurityBlock,
  renderCodeQualityBlock,
  renderWooBlock,
  touchesWoo,
} from "./knowledge/wpEngineering";
import { selectRelevantLessons, renderLessonsBlock } from "./learning";

const DENSITY_NOTE: Record<Intake["density"], string> = {
  minimal: "Lean hard into restraint: one strong idea, generous negative space, a tight palette, very few elements. Premium = less.",
  balanced: "Balance density and breathing room — rich enough to feel substantial, edited enough to feel intentional.",
  rich: "Embrace controlled density: layered detail, texture, and information, orchestrated so it reads as curated maximalism, not clutter.",
};

// ── shared renderers ──────────────────────────────────────────────────────────
function roleLine(kind: KindSpec): string {
  return `You are ${kind.role}.`;
}
function objectiveBlock(kind: KindSpec, brief: string): string {
  return [
    `OBJECTIVE (${kind.label}):`,
    kind.objective(brief),
    "",
    "Approach this like a senior practitioner:",
    kind.structure.map((s) => `- ${s}`).join("\n"),
  ].join("\n");
}
function mustHavesBlock(mustHaves: string): string {
  const items = mustHaves.trim().split(/[;\n]+/).map((s) => s.trim()).filter(Boolean);
  return ["MUST INCLUDE (non-negotiable requirements):", `- ${items.join("\n- ")}`].join("\n");
}
function avoidBlock(avoid: string): string {
  const items = avoid.trim().split(/[;\n]+/).map((s) => s.trim()).filter(Boolean);
  return ["ALSO AVOID (explicit constraints from the brief — treat as hard bans):", `- ${items.join("\n- ")}`].join("\n");
}
function outputBlock(target: TargetSpec, leadLine: string): string {
  return [
    "OUTPUT FORMAT:",
    `- ${target.output}`,
    `- ${leadLine}`,
    "- The result must be complete and runnable/usable as specified — no '...rest of code' elisions.",
  ].join("\n");
}

// The one-shot contract — what makes a single PROMPTSMITH prompt enough to get
// the whole thing done, so a developer doesn't burn AI credits iterating.
function deliveryContractBlock(): string {
  return [
    "ONE-SHOT DELIVERY CONTRACT — produce the COMPLETE result in this single response:",
    "- Deliver everything now, in full: every page, section, and file, production-ready and runnable/usable as-is. The developer is spending limited AI budget — make this one response count so no follow-up is needed.",
    "- Do NOT ask clarifying questions first and do NOT wait for confirmation. If something is ambiguous, make the best professional assumption and note it in one short line.",
    "- Do NOT truncate, summarize, or leave placeholders ('...rest unchanged', '// TODO', 'continue in the next message'). If it is long, keep going until it is genuinely finished.",
    "- Model-agnostic: this must work whether executed by Claude, Gemini, GPT, Cursor, or Google AI Studio.",
  ].join("\n");
}

// ── readiness signals ─────────────────────────────────────────────────────────
export function computeSignals(intake: Intake): CompiledPrompt["signals"] {
  const wordCount = intake.brief.trim().split(/\s+/).filter(Boolean).length;
  const engineering = DOMAIN_PIPELINE[intake.domain] === "engineering";
  return [
    {
      label: "Brief has substance",
      ok: wordCount >= 6,
      hint: wordCount >= 6 ? "Enough to work with." : "Add a sentence or two — what is it and what should it do?",
    },
    {
      label: engineering ? "Context / where it runs" : "Audience defined",
      ok: intake.audience.trim().length > 0,
      hint: intake.audience.trim()
        ? "Set."
        : engineering
          ? "Who uses it and where (admin/front-end)? Sharper context → sharper code."
          : "Who is this for? Sharper audience → sharper design.",
    },
    engineering
      ? {
          label: "Requirements / features",
          ok: intake.mustHaves.trim().length > 0,
          hint: intake.mustHaves.trim() ? "Listed." : "List the required features/behaviour — they become hard requirements.",
        }
      : {
          label: "Vibe / tone given",
          ok: intake.vibe.trim().length > 0,
          hint: intake.vibe.trim() ? "Drives the aesthetic direction." : "Optional, but a vibe word locks the aesthetic direction.",
        },
    engineering
      ? {
          label: "Integrations / references",
          ok: intake.references.trim().length > 0,
          hint: intake.references.trim() ? "Noted." : "Optional — name any APIs/services or a similar plugin to anchor it.",
        }
      : {
          label: "Brand colors",
          ok: intake.brandColors.trim().length > 0,
          hint: intake.brandColors.trim() ? "Palette will build around these." : "Optional — without it, the direction picks a palette.",
        },
  ];
}

// ── pipelines ─────────────────────────────────────────────────────────────────
function designBlocks(intake: Intake, kind: KindSpec, target: TargetSpec, brief: string): CompiledPrompt["blocks"] {
  const dir =
    (intake.directionOverride && getDirectionById(intake.directionOverride)) ||
    selectDirection(intake.vibe, `${intake.kind} ${brief}`);
  const blocks: CompiledPrompt["blocks"] = [];

  blocks.push({ label: "Role", body: roleLine(kind) });

  const ctx: string[] = ["CONTEXT:"];
  if (intake.audience.trim()) ctx.push(`- Audience: ${intake.audience.trim()}.`);
  if (intake.vibe.trim()) ctx.push(`- Desired feeling / vibe: ${intake.vibe.trim()}.`);
  if (intake.references.trim()) ctx.push(`- References / inspiration to learn from (don't copy): ${intake.references.trim()}.`);
  ctx.push(`- Build target: ${target.label}.`);
  ctx.push(`- Density: ${DENSITY_NOTE[intake.density]}`);
  blocks.push({ label: "Context", body: ctx.join("\n") });

  blocks.push({ label: "Objective", body: objectiveBlock(kind, brief) });
  if (intake.mustHaves.trim()) blocks.push({ label: "Must include", body: mustHavesBlock(intake.mustHaves) });
  blocks.push({ label: "Aesthetic direction", body: renderAestheticBlock(dir, intake.brandColors) });
  if (intake.avoid.trim()) blocks.push({ label: "Avoid", body: avoidBlock(intake.avoid) });
  if (intake.enforceAntiSlop) blocks.push({ label: "Anti-slop ruleset", body: renderAntiSlopBlock() });
  if (intake.realContent) blocks.push({ label: "Human-feel ruleset", body: renderHumanFeelBlock() });

  const tech = [
    "TECHNICAL CONSTRAINTS:",
    `- Target: ${target.label}. ${target.stack}`,
    `- ${target.notes}`,
  ];
  if (intake.responsiveA11y) {
    tech.push(
      "- Responsive: design mobile-first; define behavior at mobile, tablet, and desktop. No horizontal scroll, no broken layouts at any width.",
      "- Accessibility baseline: semantic landmarks, visible focus states, sufficient color contrast (WCAG AA), keyboard operability, and alt text / aria where needed."
    );
  }
  tech.push("- Production-grade: clean, organized, commented where non-obvious. No dead code, no TODOs left in.");
  blocks.push({ label: "Technical constraints", body: tech.join("\n") });

  blocks.push({
    label: "Output format",
    body: outputBlock(target, "Lead with a 2-3 sentence statement of the aesthetic concept you committed to, then the deliverable."),
  });
  return blocks;
}

function engineeringBlocks(intake: Intake, kind: KindSpec, target: TargetSpec, brief: string): CompiledPrompt["blocks"] {
  const blocks: CompiledPrompt["blocks"] = [];

  blocks.push({ label: "Role", body: roleLine(kind) });

  const ctx: string[] = ["CONTEXT:"];
  if (intake.audience.trim()) ctx.push(`- Who uses it / where it runs: ${intake.audience.trim()}.`);
  if (intake.references.trim()) ctx.push(`- Integrations / APIs / similar tools: ${intake.references.trim()}.`);
  ctx.push(`- Build target: ${target.label}.`);
  ctx.push(`- Latest WordPress + PHP 8; assume a real client site, not a sandbox.`);
  blocks.push({ label: "Context", body: ctx.join("\n") });

  blocks.push({ label: "Objective", body: objectiveBlock(kind, brief) });
  if (intake.mustHaves.trim()) blocks.push({ label: "Requirements", body: mustHavesBlock(intake.mustHaves) });
  if (intake.avoid.trim()) blocks.push({ label: "Avoid", body: avoidBlock(intake.avoid) });

  blocks.push({ label: "WP engineering standards", body: renderStandardsBlock() });
  blocks.push({ label: "Security", body: renderSecurityBlock() });
  blocks.push({ label: "Code quality", body: renderCodeQualityBlock() });
  if (intake.domain === "plugin" && touchesWoo(intake.kind, intake.framework, `${brief} ${intake.mustHaves}`)) {
    blocks.push({ label: "WooCommerce", body: renderWooBlock() });
  }

  const tech = [
    "TECHNICAL CONSTRAINTS:",
    `- Target: ${target.label}. ${target.stack}`,
    `- ${target.notes}`,
    "- Production-grade and installable as-is; would pass a WordPress plugin review and PHPCS with the WordPress ruleset.",
  ];
  blocks.push({ label: "Technical constraints", body: tech.join("\n") });

  blocks.push({
    label: "Output format",
    body: outputBlock(target, "Lead with a 2-3 sentence summary of the architecture you chose, then the code and the file tree."),
  });
  return blocks;
}

export function compile(intake: Intake, lessons: Lesson[] = []): CompiledPrompt {
  const brief = intake.brief.trim() || "(no brief provided)";
  const domain = resolveDomain(intake.domain);
  const kind = resolveKind(intake.domain, intake.kind);
  const target = resolveTarget(intake.domain, intake.framework);
  const relevant = selectRelevantLessons(lessons, intake);

  const blocks =
    domain.pipeline === "engineering"
      ? engineeringBlocks(intake, kind, target, brief)
      : designBlocks(intake, kind, target, brief);

  // One-shot delivery contract — get the whole thing in a single prompt.
  blocks.push({ label: "Delivery contract", body: deliveryContractBlock() });

  // Lessons learned — injected from accumulated feedback (the learning loop).
  if (relevant.length) blocks.push({ label: "Lessons learned", body: renderLessonsBlock(relevant) });

  // Final directive (pipeline-flavored).
  blocks.push({
    label: "Final directive",
    body:
      domain.pipeline === "engineering"
        ? [
            "BEFORE YOU CODE: state the architecture (files/classes/hooks) you'll use, then implement it fully. Treat security and the WordPress standards above as hard requirements, not suggestions.",
            "Do not ship the generic AI plugin skeleton. Write what a senior WordPress engineer would actually commit.",
          ].join("\n")
        : [
            "BEFORE YOU CODE: silently commit to the single aesthetic concept above and name the one unforgettable element. Then execute with precision — every spacing value, font, and color chosen on purpose.",
            "Do not hedge toward a safe, generic result. Show what a top-tier designer would actually ship for this brief.",
          ].join("\n"),
  });

  const text = blocks.map((b) => b.body).join("\n\n");
  return { text, blocks, signals: computeSignals(intake) };
}
