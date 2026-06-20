// ── Domain registry ───────────────────────────────────────────────────────────
// The single source of truth for "what can we build". Each domain declares its
// pipeline (design vs engineering), its deliverable kinds, and its build targets.
// The compiler and the UI both read from here, so adding a domain pack is mostly
// adding data — no new plumbing.

import type { Domain, Pipeline, KindSpec, TargetSpec } from "../types";
import { FRONTEND_KINDS } from "./projectTypes";
import { FRONTEND_TARGETS } from "./frameworks";

export interface DomainPack {
  id: Domain;
  label: string;
  blurb: string;
  pipeline: Pipeline;
  kinds: KindSpec[];
  targets: TargetSpec[];
}

// ── Elementor (design pipeline) ───────────────────────────────────────────────
const ELEMENTOR_KINDS: KindSpec[] = [
  {
    id: "template",
    label: "Page template",
    role: "a senior Elementor designer who builds award-quality, conversion-focused page templates that look bespoke — never like a stock Elementor kit",
    objective: (b) =>
      `Design a complete Elementor page template for: ${b}. It must read as custom-designed, with a clear narrative and a distinctive look — not a generic template kit.`,
    structure: [
      "Decide the page's narrative arc first, then map it to a container tree (prefer Flexbox/Grid containers over legacy sections).",
      "For each block, specify the exact widget choices and their key settings: spacing, typography, colors, and the responsive values for desktop/tablet/mobile.",
      "Call out precisely where a Custom HTML widget or custom CSS beats stacking native widgets — that's where the bespoke feel comes from.",
    ],
  },
  {
    id: "section",
    label: "Section / block",
    role: "a senior Elementor designer who crafts reusable, distinctive sections",
    objective: (b) => `Design a single Elementor section/block for: ${b}. Self-contained, reusable across pages, and visually memorable.`,
    structure: [
      "Define the container structure and the responsive behavior at each breakpoint.",
      "Specify widget settings precisely enough to reproduce in the editor without guessing.",
      "Give it one signature detail (a custom-CSS flourish, an overlap, a motion effect) so it doesn't look stock.",
    ],
  },
  {
    id: "header-footer",
    label: "Header / footer",
    role: "a senior Elementor designer building Theme Builder header/footer templates",
    objective: (b) => `Design a Theme Builder ${"header or footer"} for: ${b}. Sticky/scroll behavior and mobile nav must be considered.`,
    structure: [
      "Define the desktop layout and the mobile/hamburger behavior explicitly.",
      "Specify sticky/transparent-on-scroll behavior and the exact settings to achieve it.",
      "Cover the dynamic bits (site logo, nav menu, cart icon) using the right native widgets.",
    ],
  },
  {
    id: "popup",
    label: "Popup",
    role: "a senior Elementor designer building conversion popups with the Popup Builder",
    objective: (b) => `Design an Elementor popup for: ${b}. Define its trigger, display conditions, and a non-annoying UX.`,
    structure: [
      "Specify the trigger and display/advanced rules (timing, exit-intent, frequency, conditions).",
      "Design the popup content with a single clear goal and an obvious close affordance.",
      "Keep it lightweight and accessible (focus trap, escape to close).",
    ],
  },
];

const ELEMENTOR_TARGETS: TargetSpec[] = [
  {
    id: "native",
    label: "Native widgets recipe",
    stack: "Reproduce entirely in the Elementor editor using native widgets and Flexbox/Grid containers.",
    output: "Return a precise step-by-step build recipe: the container/widget tree, each widget's key settings (spacing, typography, colors, responsive values), plus any Custom CSS. Flag where a Custom HTML widget would be cleaner.",
    notes: "Prefer modern containers over legacy sections/columns. Name widgets so a dev can follow in the editor.",
  },
  {
    id: "custom-css",
    label: "Native + Custom CSS",
    stack: "Native widgets for structure, with targeted Custom CSS (per-widget or page) for the distinctive styling Elementor can't do cleanly.",
    output: "Return the build recipe AND the complete Custom CSS, with selectors and where to paste each block (widget Advanced > Custom CSS, or page settings).",
    notes: "Use Elementor's selector helper (selector {}) for widget-scoped CSS.",
  },
  {
    id: "html-widget",
    label: "Custom HTML/CSS widget",
    stack: "Deliver the design as a self-contained block to drop into a single Custom HTML widget.",
    output: "Return one self-contained HTML + <style> block to paste into an HTML widget, with a note on where it goes. Keep it responsive and conflict-safe (scoped class names).",
    notes: "Scope all class names to avoid clashing with the theme/Elementor. No external build step.",
  },
];

// ── Custom widget (engineering pipeline) ──────────────────────────────────────
const WIDGET_KINDS: KindSpec[] = [
  {
    id: "elementor-widget",
    label: "Elementor widget",
    role: "a senior WordPress/Elementor developer who builds robust, production-grade custom Elementor widgets",
    objective: (b) => `Build a custom Elementor widget that: ${b}. It must register cleanly, expose proper controls, and render escaped output.`,
    structure: [
      "Define the Content and Style control tabs (the settings the user should be able to change) before writing render().",
      "Implement get_name/get_title/get_icon/get_categories/get_keywords, render() with fully escaped output, and _content_template() for live editor preview where feasible.",
      "Ship it inside a small, properly-structured addon plugin that registers the widget on the elementor/widgets/register hook.",
    ],
  },
  {
    id: "gutenberg-block",
    label: "Gutenberg block",
    role: "a senior WordPress block-editor developer who builds custom Gutenberg blocks the modern way",
    objective: (b) => `Build a custom Gutenberg block that: ${b}. Use the current block API, not deprecated patterns.`,
    structure: [
      "Define block.json (apiVersion 3) with attributes, supports, and asset handles.",
      "Implement edit (and save, or render.php for a dynamic block) with @wordpress/components for the controls.",
      "Register server-side with register_block_type() pointing at block.json; build with @wordpress/scripts.",
    ],
  },
  {
    id: "shortcode",
    label: "Shortcode",
    role: "a senior WordPress developer building clean, safe shortcodes",
    objective: (b) => `Build a WordPress shortcode that: ${b}.`,
    structure: [
      "Register with add_shortcode; parse attributes through shortcode_atts with sane defaults.",
      "RETURN markup (never echo), with all output escaped.",
      "Enqueue any assets only when the shortcode actually renders on the page.",
    ],
  },
];

const WIDGET_TARGETS: TargetSpec[] = [
  {
    id: "elementor-php",
    label: "Elementor Widget (PHP)",
    stack: "Extend \\Elementor\\Widget_Base inside its own addon plugin; register controls with start_controls_section/add_control; render() with escaped output; _content_template() for live preview.",
    output: "Return the full widget class, the addon-plugin bootstrap that registers it on elementor/widgets/register (with the Elementor-active guard), any enqueued assets, and the file tree. Complete and installable.",
    notes: "Guard for Elementor being active. Prefix the class and text domain.",
  },
  {
    id: "gutenberg-js",
    label: "Gutenberg block (block.json + JS)",
    stack: "block.json (apiVersion 3) + edit/save JS (or render.php for dynamic) built with @wordpress/scripts; register_block_type() in PHP.",
    output: "Return block.json, the JS source (edit/save), any render.php, the PHP registration, package.json scripts, and the file tree.",
    notes: "Use @wordpress/components for controls and @wordpress/i18n for strings.",
  },
  {
    id: "shortcode-php",
    label: "Shortcode (PHP)",
    stack: "A small plugin registering the shortcode with shortcode_atts defaults, returning escaped markup, enqueuing assets conditionally.",
    output: "Return the complete plugin file(s) with the shortcode handler, conditional asset enqueue, and file tree.",
    notes: "Return, don't echo. Prefix everything.",
  },
];

// ── Plugin (engineering pipeline) ─────────────────────────────────────────────
const PLUGIN_KINDS: KindSpec[] = [
  {
    id: "utility",
    label: "Utility plugin",
    role: "a senior WordPress plugin engineer who ships secure, standards-compliant plugins to real client sites",
    objective: (b) => `Build a WordPress plugin that: ${b}. Production-grade, secure, and upgrade-safe.`,
    structure: [
      "Decide the architecture (main bootstrap + includes/classes) before coding; keep concerns separated.",
      "Wire activation/deactivation and a real uninstall.php; register hooks where a real plugin would.",
      "Add a settings screen only if the feature needs one, via the Settings API.",
    ],
  },
  {
    id: "woo-extension",
    label: "WooCommerce extension",
    role: "a senior WooCommerce extension developer who builds HPOS-safe, upgrade-safe Woo plugins",
    objective: (b) => `Build a WooCommerce extension that: ${b}. It must use Woo APIs/CRUD and stay HPOS-compatible.`,
    structure: [
      "Guard on WooCommerce being active; declare HPOS compatibility.",
      "Use Woo CRUD/data stores and the correct Woo hooks — never raw post meta for Woo data.",
      "Respect Woo templates and keep the storefront/admin integration upgrade-safe.",
    ],
  },
  {
    id: "admin-tool",
    label: "Admin tool / settings",
    role: "a senior WordPress engineer building secure admin tools and settings screens",
    objective: (b) => `Build a WordPress admin tool that: ${b}. Capability-gated, nonce-protected, fully sanitized/escaped.`,
    structure: [
      "Add the admin menu/page and build the form with the Settings API (register_setting/sections/fields).",
      "Gate every action with current_user_can() and a nonce; sanitize on save and escape on render.",
      "Give clear admin UX: notices, validation feedback, sensible defaults.",
    ],
  },
  {
    id: "integration",
    label: "API integration",
    role: "a senior WordPress engineer who builds reliable third-party API integrations",
    objective: (b) => `Build a WordPress plugin that integrates with: ${b}. Resilient to API failures and secure with credentials.`,
    structure: [
      "Use the WordPress HTTP API (wp_remote_*); never bundle curl hacks. Handle non-200s and timeouts with WP_Error.",
      "Store API credentials safely (options with care, or constants), never hardcoded in the repo; expose a settings screen to enter them.",
      "Cache responses with transients; add webhooks/cron where the integration needs them.",
    ],
  },
];

const PLUGIN_TARGETS: TargetSpec[] = [
  {
    id: "oop",
    label: "Standard plugin (OOP)",
    stack: "A bootstrap file with the plugin header + a main class wiring includes; single-responsibility classes under includes/ (admin/ vs public/).",
    output: "Return the main plugin file, the key classes, uninstall.php, readme.txt header, and the full file tree. Complete and installable.",
    notes: "Namespace or prefix everything; autoload or require cleanly.",
  },
  {
    id: "single-file",
    label: "Lightweight (single-file)",
    stack: "One well-structured plugin file with prefixed functions and hooks — right for a small utility.",
    output: "Return the complete single-file plugin including the header and uninstall logic (register_uninstall_hook).",
    notes: "Still fully secure and standards-compliant despite being one file.",
  },
  {
    id: "react-admin",
    label: "Plugin w/ React admin",
    stack: "PHP backend exposing REST routes (with real permission_callbacks) + a React admin app built with @wordpress/scripts using @wordpress/components and @wordpress/api-fetch.",
    output: "Return the PHP (REST registration + plugin bootstrap), the React admin source, the build config, and the file tree.",
    notes: "Never __return_true on privileged REST routes; nonce via wpApiSettings.",
  },
];

export const DOMAINS: Record<Domain, DomainPack> = {
  frontend: {
    id: "frontend",
    label: "Frontend / Design",
    blurb: "Websites, landing pages, sections, UI — the aesthetic engine.",
    pipeline: "design",
    kinds: FRONTEND_KINDS,
    targets: FRONTEND_TARGETS,
  },
  elementor: {
    id: "elementor",
    label: "Elementor",
    blurb: "Elementor page templates, sections, headers, popups — design output as a build recipe.",
    pipeline: "design",
    kinds: ELEMENTOR_KINDS,
    targets: ELEMENTOR_TARGETS,
  },
  widget: {
    id: "widget",
    label: "Custom Widget",
    blurb: "Elementor widgets, Gutenberg blocks, shortcodes — production WP code.",
    pipeline: "engineering",
    kinds: WIDGET_KINDS,
    targets: WIDGET_TARGETS,
  },
  plugin: {
    id: "plugin",
    label: "WP / Woo Plugin",
    blurb: "WordPress & WooCommerce plugins — secure, standards-compliant code.",
    pipeline: "engineering",
    kinds: PLUGIN_KINDS,
    targets: PLUGIN_TARGETS,
  },
};

export const DOMAIN_LIST: DomainPack[] = [DOMAINS.frontend, DOMAINS.elementor, DOMAINS.widget, DOMAINS.plugin];

export function resolveDomain(id: Domain): DomainPack {
  return DOMAINS[id] ?? DOMAINS.frontend;
}
export function resolveKind(domainId: Domain, kindId: string): KindSpec {
  const d = resolveDomain(domainId);
  return d.kinds.find((k) => k.id === kindId) ?? d.kinds[0];
}
export function resolveTarget(domainId: Domain, targetId: string): TargetSpec {
  const d = resolveDomain(domainId);
  return d.targets.find((t) => t.id === targetId) ?? d.targets[0];
}
