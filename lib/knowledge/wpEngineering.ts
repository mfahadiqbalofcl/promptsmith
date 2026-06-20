// ── WordPress engineering knowledge ───────────────────────────────────────────
// The engineering-pipeline counterpart to the design rulesets. These force
// AI-generated widget/plugin code toward production-grade, secure, standards-
// compliant WordPress — and away from the generic "one giant file of unrelated
// functions" that LLMs default to. Edit to tune your agency's WP house style.

export const WP_STANDARDS: string[] = [
  "Follow the WordPress Plugin Handbook and WordPress Coding Standards (WPCS). Code as a senior WordPress engineer would for a plugin that ships to real sites.",
  "Prefix EVERYTHING global with a unique plugin prefix or namespace — functions, classes, hooks, option keys, transients, globals, enqueue handles — to avoid collisions.",
  "Use WordPress's own APIs; never reinvent them: Settings/Options API, Transients/object cache, HTTP API (wp_remote_get/post), WP_Query, the REST API, WP-Cron, and the i18n functions.",
  "Architect the code: an OOP or cleanly-namespaced structure with single-responsibility files/classes, and a sensible folder layout (admin/ vs public/ vs includes/). No 500-line god-file of unrelated functions.",
  "Include a correct plugin header, and register activation, deactivation, and a real uninstall.php that removes the plugin's options/tables/cron events cleanly.",
  "Enqueue assets the right way (wp_enqueue_script/style with versioning and dependencies); never echo <script>/<link> tags into markup, and load assets only where actually needed.",
  "Translation-ready: wrap every user-facing string in the i18n functions (__(), esc_html__(), esc_attr_e(), etc.) with a single consistent text domain matching the plugin slug.",
  "No leftover scaffolding: no TODOs, no commented-out dead code, no placeholder names, no fake '@since 1.0.0' noise on every line. Comment intent only where non-obvious.",
];

export const WP_SECURITY: string[] = [
  "Sanitize ALL input on the way in (sanitize_text_field, sanitize_email, absint, wp_kses_post, esc_url_raw, etc.). Never trust $_GET/$_POST/$_REQUEST.",
  "Escape ALL output as late as possible (esc_html, esc_attr, esc_url, wp_kses). Every dynamic value printed to the page must be escaped at the point of output.",
  "Verify a nonce (wp_nonce_field + check_admin_referer / wp_verify_nonce, or check_ajax_referer) on every form submission, AJAX call, and state-changing request.",
  "Check capabilities with current_user_can() before any privileged read or write — never rely on is_admin() or a hidden field for authorization.",
  "Use $wpdb->prepare() for every query that includes dynamic values; never interpolate user input into SQL. Prefer core APIs (WP_Query, get_posts) over raw SQL.",
  "For REST routes, provide a real permission_callback (never __return_true for privileged data) and validate/sanitize args.",
  "Validate file uploads and external input strictly; treat all third-party API responses as untrusted.",
];

export const WP_CODE_QUALITY: string[] = [
  "Do not emit the generic AI plugin skeleton (one file, unrelated functions, no structure). Design the architecture first, then implement it.",
  "Real error handling: check return values, use WP_Error where appropriate, and handle HTTP/API failures and empty states gracefully — no silent failures, no unguarded assumptions.",
  "Expose extensibility the way a real plugin does: provide do_action/apply_filters hooks at the points another developer would want to extend.",
  "Performance: cache expensive work with transients or the object cache, avoid queries inside loops, don't autoload large options, and bail early when not needed.",
  "Keep functions small and named for intent. Separate data, logic, and presentation; don't mix SQL, business logic, and HTML in one function.",
  "Write code that passes PHPCS with the WordPress ruleset and would survive a plugin review — not code that merely runs once.",
];

export const WOOCOMMERCE_RULES: string[] = [
  "Declare WooCommerce as a dependency and guard with class_exists('WooCommerce') / function_exists() before using Woo APIs.",
  "Use WooCommerce CRUD and data stores (wc_get_product, WC_Order, $order->get_*()/set_*()) — never read/write Woo data via raw post meta.",
  "Declare HPOS (High-Performance Order Storage) compatibility and don't assume orders live in the posts table.",
  "Hook into the correct Woo actions/filters and respect template overrides; use wc_get_template where extending the storefront.",
  "Follow WooCommerce extension guidelines (and marketplace requirements if relevant); keep it upgrade-safe.",
];

function bullets(items: string[]): string {
  return items.map((r) => `- ${r}`).join("\n");
}

export function renderStandardsBlock(): string {
  return ["WORDPRESS ENGINEERING STANDARDS (non-negotiable):", bullets(WP_STANDARDS)].join("\n");
}
export function renderSecurityBlock(): string {
  return ["SECURITY — apply WordPress security best practices rigorously:", bullets(WP_SECURITY)].join("\n");
}
export function renderCodeQualityBlock(): string {
  return ["CODE QUALITY — avoid AI-generated boilerplate; write a real engineer's plugin:", bullets(WP_CODE_QUALITY)].join("\n");
}
export function renderWooBlock(): string {
  return ["WOOCOMMERCE INTEGRATION:", bullets(WOOCOMMERCE_RULES)].join("\n");
}

/** Heuristic: does this intake touch WooCommerce? */
export function touchesWoo(kindId: string, targetId: string, text: string): boolean {
  const hay = `${kindId} ${targetId} ${text}`.toLowerCase();
  return /woo|woocommerce|cart|checkout|product|order|subscription|payment/.test(hay);
}
