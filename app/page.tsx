"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_INTAKE,
  DOMAIN_PIPELINE,
  issueTagsFor,
  type Intake,
  type Domain,
  type Density,
  type Lesson,
  type SessionRecord,
  type Outcome,
} from "@/lib/types";
import { compile, computeSignals } from "@/lib/compiler";
import { DOMAIN_LIST, resolveDomain, resolveKind } from "@/lib/knowledge/domains";
import { DIRECTIONS, selectDirection, getDirectionById } from "@/lib/knowledge/aesthetics";

const DENSITY_ORDER: { id: Density; label: string }[] = [
  { id: "minimal", label: "Minimal" },
  { id: "balanced", label: "Balanced" },
  { id: "rich", label: "Rich" },
];
const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "success", label: "✓ Nailed it" },
  { id: "partial", label: "≈ Partly" },
  { id: "fail", label: "✕ Missed" },
];
const DRAFT_KEY = "promptsmith.draft.v2";
type View = "forge" | "memory";

export default function Page() {
  const [view, setView] = useState<View>("forge");
  const [intake, setIntake] = useState<Intake>(DEFAULT_INTAKE);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [stat, setStat] = useState<{ sessions: number; feedback: number; lessons: number; successRate: number | null } | null>(null);
  const [boostReady, setBoostReady] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [boostProvider, setBoostProvider] = useState<string | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [locked, setLocked] = useState(false);
  const [forgeCount, setForgeCount] = useState(0);

  const [compiled, setCompiled] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<{ label: string; body: string }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [forgedDomain, setForgedDomain] = useState<Domain>("frontend");
  const [boosted, setBoosted] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "warn" | "info"; text: string } | null>(null);

  // feedback form
  const [fbOpen, setFbOpen] = useState(false);
  const [fbOutcome, setFbOutcome] = useState<Outcome | null>(null);
  const [fbIssues, setFbIssues] = useState<string[]>([]);
  const [fbWorked, setFbWorked] = useState("");
  const [fbImprove, setFbImprove] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbSending, setFbSending] = useState(false);

  // memory controls
  const [newLesson, setNewLesson] = useState("");
  const [newScopeDomain, setNewScopeDomain] = useState<Domain | "">("");
  const [distilling, setDistilling] = useState(false);
  const [memNote, setMemNote] = useState<string | null>(null);

  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setIntake((s) => ({ ...s, [k]: v }));

  const domainPack = useMemo(() => resolveDomain(intake.domain), [intake.domain]);
  const pipeline = DOMAIN_PIPELINE[intake.domain];
  const isEng = pipeline === "engineering";

  function switchDomain(d: Domain) {
    const pack = resolveDomain(d);
    setIntake((s) => ({ ...s, domain: d, kind: pack.kinds[0].id, framework: pack.targets[0].id, directionOverride: "" }));
    setCompiled(null);
  }

  const refreshMemory = useCallback(async () => {
    try {
      const [lr, sr] = await Promise.all([fetch("/api/lessons"), fetch("/api/sessions")]);
      if (lr.ok) setLessons((await lr.json()).lessons ?? []);
      if (sr.ok) {
        const d = await sr.json();
        setSessions(d.sessions ?? []);
        setStat(d.stats ?? null);
      }
    } catch { /* engine works offline */ }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setIntake({ ...DEFAULT_INTAKE, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    fetch("/api/health").then((r) => r.ok && r.json()).then((d) => {
      if (!d) return;
      setBoostReady(Boolean(d.boost));
      setProviders(Array.isArray(d.providers) ? d.providers : []);
      setPersistent(d.persistent !== false);
      setLocked(Boolean(d.locked));
    }).catch(() => {});
    refreshMemory();
  }, [refreshMemory]);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(intake)); } catch { /* ignore */ }
  }, [intake]);

  const signals = useMemo(() => computeSignals(intake), [intake]);
  const ready = intake.brief.trim().split(/\s+/).filter(Boolean).length >= 3;
  const direction = useMemo(() => {
    const auto = selectDirection(intake.vibe, `${intake.kind} ${intake.brief}`);
    if (intake.directionOverride) return getDirectionById(intake.directionOverride) ?? auto;
    return auto;
  }, [intake.directionOverride, intake.vibe, intake.kind, intake.brief]);
  const activeLessonCount = useMemo(
    () => lessons.filter((l) => !l.muted
      && (!l.scope.domain || l.scope.domain === intake.domain)
      && (!l.scope.kind || l.scope.kind === intake.kind)
      && (!l.scope.framework || l.scope.framework === intake.framework)).length,
    [lessons, intake.domain, intake.kind, intake.framework]
  );
  const fbTags = useMemo(() => issueTagsFor(forgedDomain), [forgedDomain]);

  function resetFeedback() { setFbOpen(false); setFbOutcome(null); setFbIssues([]); setFbWorked(""); setFbImprove(""); setFbSent(false); }

  const onForge = useCallback(async () => {
    const result = compile(intake, lessons);
    setCompiled(result.text);
    setBlocks(result.blocks);
    setBoosted(false); setCopied(false); setNotice(null); setShowBreakdown(false);
    setForgedDomain(intake.domain);
    setForgeCount((c) => c + 1);
    resetFeedback();
    try {
      const res = await fetch("/api/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake, domain: intake.domain, kind: intake.kind, framework: intake.framework,
          direction: pipeline === "design" ? direction.id : "", prompt: result.text, boosted: false,
        }),
      });
      if (res.ok) { setSessionId((await res.json()).session?.id ?? null); refreshMemory(); }
    } catch { setSessionId(null); }
  }, [intake, lessons, direction.id, pipeline, refreshMemory]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready && view === "forge") { e.preventDefault(); onForge(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, view, onForge]);

  async function onBoost() {
    if (!compiled) return;
    setBoosting(true); setNotice(null);
    try {
      const res = await fetch("/api/boost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ compiledPrompt: compiled, intake }) });
      const data = await res.json();
      if (!res.ok) { setNotice({ kind: "warn", text: data?.message || "AI Boost unavailable. The prompt below is fully usable." }); return; }
      setCompiled(data.text); setBoosted(true); setBoostProvider(data.provider ?? null); setCopied(false);
    } catch { setNotice({ kind: "warn", text: "Network error reaching Boost. The prompt below still works." }); }
    finally { setBoosting(false); }
  }

  async function onCopy() { if (!compiled) return; await navigator.clipboard.writeText(compiled); setCopied(true); setTimeout(() => setCopied(false), 1600); }

  function onDownload() {
    if (!compiled) return;
    const blob = new Blob([compiled], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `promptsmith-${intake.domain}-${intake.kind}.md`; a.click(); URL.revokeObjectURL(url);
  }

  async function sendTo(target: "claude" | "chatgpt") {
    if (!compiled) return;
    try { await navigator.clipboard.writeText(compiled); } catch { /* ignore */ }
    setNotice({ kind: "info", text: `Prompt copied — paste it into ${target === "claude" ? "Claude" : "ChatGPT"} (opening now).` });
    window.open(target === "claude" ? "https://claude.ai/new" : "https://chatgpt.com/", "_blank", "noopener");
  }

  function toggleIssue(id: string) { setFbIssues((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }

  async function onSendFeedback() {
    if (!sessionId || !fbOutcome) return;
    setFbSending(true);
    try {
      const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, outcome: fbOutcome, issues: fbIssues, worked: fbWorked, improve: fbImprove }) });
      if (res.ok) { setLessons((await res.json()).lessons ?? []); setFbSent(true); refreshMemory(); }
    } catch { /* best-effort */ } finally { setFbSending(false); }
  }

  function loadSession(s: SessionRecord) {
    setIntake({ ...DEFAULT_INTAKE, ...s.intake });
    setView("forge"); setCompiled(null); setSessionId(null); resetFeedback();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function lessonAction(body: Record<string, unknown>) {
    try {
      const res = await fetch("/api/lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setLessons((await res.json()).lessons ?? []); refreshMemory(); }
      else if (res.status === 403) setMemNote("Lesson editing is locked on this instance.");
      else setMemNote("Couldn't update lessons.");
    } catch { setMemNote("Network error updating lessons."); }
  }
  async function onAddLesson() {
    if (!newLesson.trim()) return;
    await lessonAction({ action: "add", text: newLesson.trim(), domain: newScopeDomain });
    setNewLesson(""); setNewScopeDomain("");
  }
  async function onDistill() {
    setDistilling(true); setMemNote(null);
    try {
      const res = await fetch("/api/distill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMemNote(data?.message || "Distill unavailable."); return; }
      if (data.lessons) { setLessons(data.lessons); refreshMemory(); setMemNote(`Distilled ${data.added} lesson(s) from feedback notes.`); }
      else setMemNote(data.message || "Nothing new to distill.");
    } catch { setMemNote("Network error during distill."); }
    finally { setDistilling(false); }
  }

  const wordCount = compiled ? compiled.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <>
      <header className="top">
        <div className="top-inner">
          <div className="brand">
            <span className="wordmark">PROMPT<b>SMITH</b></span>
            <span className="tagline">the prompt forge</span>
          </div>
          <div className="top-right">
            <span className={`chip ${boostReady ? "live" : ""}`} title={boostReady ? `AI Boost failover chain: ${providers.join(" → ")}` : "Free engine — add GROQ_API_KEY / OPENROUTER_API_KEY to enable AI Boost"}>
              <span className="dot" /> {boostReady ? `AI Boost · ${providers.join("+") || "ready"}` : "free engine"}
            </span>
            <nav className="nav">
              <button className={view === "forge" ? "on" : ""} onClick={() => setView("forge")} type="button">Forge</button>
              <button className={view === "memory" ? "on" : ""} onClick={() => { setView("memory"); refreshMemory(); }} type="button">Memory{stat ? ` · ${stat.lessons}` : ""}</button>
            </nav>
          </div>
        </div>
      </header>

      {view === "forge" ? (
        <main className="shell">
          <section className="hero">
            <div className="kicker">layman in · master prompt out</div>
            <h1>Stop prompting like<br />everyone else. Forge it <em>sharp.</em></h1>
            <p>Describe what you want in plain English. PROMPTSMITH compiles it into one expert-grade prompt that gets the <em>whole thing</em> built in a single shot — a complete website from scratch, a page, a section, an Elementor template, a widget, or a WP/Woo plugin. Armed with anti-slop / production-WP rulesets, tuned to save your AI credits, and it learns from your feedback.</p>
          </section>

          {/* DOMAIN SWITCHER */}
          <div className="domains">
            {DOMAIN_LIST.map((d) => (
              <button key={d.id} className={`domain ${intake.domain === d.id ? "on" : ""}`} onClick={() => switchDomain(d.id)} type="button">
                <span className="d-label">{d.label}</span>
                <span className="d-blurb">{d.blurb}</span>
                <span className="d-pipe">{d.pipeline === "engineering" ? "code" : "design"}</span>
              </button>
            ))}
          </div>

          <section className="bench">
            {/* INPUT */}
            <div className="panel">
              <div className="panel-head"><span className="idx">01 /</span> raw input <span className="hk">⌘↵ to forge</span></div>

              <div className="field">
                <label htmlFor="brief">What do you want to build? <span className="opt">— say it however you'd say it out loud</span></label>
                <textarea id="brief" className="brief-area" placeholder={isEng
                  ? "e.g. an Elementor widget that shows a filterable grid of our case studies, pulled from a custom post type, with a category filter"
                  : "e.g. a landing page for a specialty coffee roastery, warm and craft but not hipster-cliché, with a bean-of-the-month spot and a subscribe form"} value={intake.brief} onChange={(e) => set("brief", e.target.value)} />
              </div>

              <div className="field">
                <label id="lbl-deliverable">Deliverable</label>
                <div className="seg" role="group" aria-labelledby="lbl-deliverable">
                  {domainPack.kinds.map((k) => (<button key={k.id} aria-pressed={intake.kind === k.id} onClick={() => set("kind", k.id)} type="button">{k.label.split(" / ")[0]}</button>))}
                </div>
              </div>

              <div className="field">
                <label id="lbl-target">Build target</label>
                <div className="seg" role="group" aria-labelledby="lbl-target">
                  {domainPack.targets.map((t) => (<button key={t.id} aria-pressed={intake.framework === t.id} onClick={() => set("framework", t.id)} type="button">{t.label.split(" (")[0]}</button>))}
                </div>
              </div>

              <div className="row2">
                <div className="field">
                  <label htmlFor="aud">{isEng ? "Who uses it / where it runs" : "Audience"} <span className="opt">opt.</span></label>
                  <input id="aud" type="text" placeholder={isEng ? "site admins, front-end visitors…" : "who's it for?"} value={intake.audience} onChange={(e) => set("audience", e.target.value)} />
                </div>
                {!isEng ? (
                  <div className="field">
                    <label htmlFor="vibe">Vibe / feeling <span className="opt">opt.</span></label>
                    <input id="vibe" type="text" placeholder="e.g. warm, brutalist, luxe…" value={intake.vibe} onChange={(e) => set("vibe", e.target.value)} />
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="ref2">Integrations / APIs <span className="opt">opt.</span></label>
                    <input id="ref2" type="text" placeholder="Stripe, a CPT, an external API…" value={intake.references} onChange={(e) => set("references", e.target.value)} />
                  </div>
                )}
              </div>

              {!isEng && (
                <>
                  <div className="field">
                    <label htmlFor="dir">Aesthetic direction <span className="opt">— auto-picks from your vibe, or force one</span></label>
                    <select id="dir" className="sel" value={intake.directionOverride} onChange={(e) => set("directionOverride", e.target.value)}>
                      <option value="">⚲ Auto ({direction.name})</option>
                      {DIRECTIONS.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  </div>
                  <div className="row2">
                    <div className="field">
                      <label htmlFor="bc">Brand colors <span className="opt">opt.</span></label>
                      <input id="bc" type="text" placeholder="#0b3d2e, forest green…" value={intake.brandColors} onChange={(e) => set("brandColors", e.target.value)} />
                    </div>
                    <div className="field">
                      <label id="lbl-density">Density</label>
                      <div className="seg" role="group" aria-labelledby="lbl-density">{DENSITY_ORDER.map((d) => (<button key={d.id} aria-pressed={intake.density === d.id} onClick={() => set("density", d.id)} type="button">{d.label}</button>))}</div>
                    </div>
                  </div>
                </>
              )}

              <div className="field">
                <label htmlFor="must">{isEng ? "Required features / behaviour" : "Must include"} <span className="opt">opt. — separate with ; or new lines</span></label>
                <input id="must" type="text" placeholder={isEng ? "category filter; AJAX load-more; cache results" : "newsletter signup; product of the month; story section"} value={intake.mustHaves} onChange={(e) => set("mustHaves", e.target.value)} />
              </div>

              <div className="field">
                <label htmlFor="avoid">Avoid <span className="opt">opt.</span></label>
                <input id="avoid" type="text" placeholder={isEng ? "no external libraries; don't touch core tables" : "stock photos; the color blue; carousels"} value={intake.avoid} onChange={(e) => set("avoid", e.target.value)} />
              </div>

              {!isEng ? (
                <div className="field">
                  <label htmlFor="ref">References / inspiration <span className="opt">opt.</span></label>
                  <input id="ref" type="text" placeholder="a site or style you like (we learn from it, never copy)" value={intake.references} onChange={(e) => set("references", e.target.value)} />
                </div>
              ) : null}

              {!isEng ? (
                <div className="field">
                  <label>Rules to enforce</label>
                  <div className="toggles">
                    <label className="tog"><input type="checkbox" checked={intake.enforceAntiSlop} onChange={(e) => set("enforceAntiSlop", e.target.checked)} /><span className="box" /><span className="lbl">Anti-AI-slop ruleset <small>bans the telltale fonts, gradients & template layouts</small></span></label>
                    <label className="tog"><input type="checkbox" checked={intake.realContent} onChange={(e) => set("realContent", e.target.checked)} /><span className="box" /><span className="lbl">Human-feel + real content <small>no lorem ipsum, real voice, intentional imperfection</small></span></label>
                    <label className="tog"><input type="checkbox" checked={intake.responsiveA11y} onChange={(e) => set("responsiveA11y", e.target.checked)} /><span className="box" /><span className="lbl">Responsive + accessible baseline <small>mobile-first, WCAG AA, keyboard & focus states</small></span></label>
                  </div>
                </div>
              ) : (
                <div className="enforced">WordPress coding standards, security (sanitize / escape / nonces / capabilities), i18n, and anti-boilerplate code quality are <b>always enforced</b> for {domainPack.label}.</div>
              )}

              <div className="signals">
                {signals.map((s) => (<div key={s.label} className={`sig ${s.ok ? "ok" : "no"}`}><span className="mark">{s.ok ? "●" : "○"}</span><span><b>{s.label}.</b> {s.hint}</span></div>))}
                {activeLessonCount > 0 && (<div className="sig ok"><span className="mark">✦</span><span><b>{activeLessonCount} learned lesson{activeLessonCount > 1 ? "s" : ""}</b> will be baked into this prompt.</span></div>)}
              </div>

              <button className="forge" onClick={onForge} disabled={!ready} type="button">▲ Forge prompt</button>
            </div>

            {/* OUTPUT */}
            <div className="panel">
              <div className="panel-head"><span className="idx">02 /</span> compiled prompt <span className="hk">{domainPack.label}</span></div>

              {!compiled ? (
                <div className="out-empty"><div className="glyph">⌖</div><p>Your master prompt appears here. Fill in the brief on the left and hit <b style={{ color: "var(--ember)" }}>Forge</b> (or ⌘↵).</p></div>
              ) : (
                <>
                  {notice && <div className={`notice ${notice.kind === "warn" ? "warn" : ""}`}>{notice.text}</div>}
                  <div className="out-actions">
                    <button className={`btn ${copied ? "copied" : ""}`} onClick={onCopy} type="button">{copied ? "✓ Copied" : "⧉ Copy"}</button>
                    <button className="btn" onClick={onDownload} type="button">⤓ .md</button>
                    <button className="btn primary" onClick={onBoost} disabled={boosting} type="button">{boosting ? <><span className="spin" /> Boosting…</> : boostReady ? "✦ AI Boost" : "✦ AI Boost (off)"}</button>
                    <button className="btn" onClick={() => sendTo("claude")} type="button">↗ Claude</button>
                    <button className="btn" onClick={() => sendTo("chatgpt")} type="button">↗ ChatGPT</button>
                    <button className="btn" onClick={() => setShowBreakdown((v) => !v)} type="button">{showBreakdown ? "▾ Hide" : "▸ Breakdown"}</button>
                    <button className="btn" onClick={onForge} type="button">↻ Recompile</button>
                  </div>

                  <div className={`prompt-box rise ${boosted ? "boosted" : ""}`} key={forgeCount + (boosted ? "b" : "")}>{compiled}</div>
                  <div className="meta-line"><span>{wordCount} words</span>{pipeline === "design" ? <span>direction · <b>{direction.name}</b></span> : <span>pipeline · <b>engineering</b></span>}<span>{boosted ? `✦ boosted${boostProvider ? ` · ${boostProvider}` : ""}` : "deterministic"}</span></div>

                  <div className="feedback">
                    {!fbOpen && !fbSent && (<button className="fb-open" onClick={() => setFbOpen(true)} type="button">✶ Used this prompt? Tell PROMPTSMITH how it went →</button>)}
                    {fbSent && (<div className="fb-done rise">✓ Logged. The system just learned from this — future {resolveDomain(forgedDomain).label} prompts will carry it forward.</div>)}
                    {fbOpen && !fbSent && (
                      <div className="fb-form rise">
                        <div className="fb-head" id="lbl-outcome">How did the AI's result turn out?</div>
                        <div className="seg fb-outcome" role="group" aria-labelledby="lbl-outcome">{OUTCOMES.map((o) => (<button key={o.id} aria-pressed={fbOutcome === o.id} onClick={() => setFbOutcome(o.id)} type="button">{o.label}</button>))}</div>
                        {fbOutcome && fbOutcome !== "success" && (
                          <div className="fb-issues rise">
                            <div className="fb-sub">What did the AI get wrong? (tap all that apply — this is what trains the system)</div>
                            <div className="chips">{fbTags.map((t) => (<button key={t.id} type="button" className={`tagchip ${fbIssues.includes(t.id) ? "on" : ""}`} onClick={() => toggleIssue(t.id)}>{t.label}</button>))}</div>
                          </div>
                        )}
                        <div className="field"><label htmlFor="worked">What worked well? <span className="opt">opt.</span></label><textarea id="worked" value={fbWorked} onChange={(e) => setFbWorked(e.target.value)} placeholder="The parts you'd keep…" style={{ minHeight: 70 }} /></div>
                        <div className="field"><label htmlFor="improve">In your own words — how should it have been better?</label><textarea id="improve" value={fbImprove} onChange={(e) => setFbImprove(e.target.value)} placeholder="Detail in plain language. The more specific, the smarter the next prompt." style={{ minHeight: 90 }} /></div>
                        <div className="out-actions">
                          <button className="btn primary" onClick={onSendFeedback} disabled={!fbOutcome || fbSending} type="button">{fbSending ? <><span className="spin" /> Saving…</> : "✦ Submit & teach the system"}</button>
                          <button className="btn" onClick={resetFeedback} type="button">Cancel</button>
                        </div>
                        {!sessionId && <div className="notice warn" style={{ marginTop: 12 }}>Heads up: the store didn't capture this session, so feedback can't be linked. The prompt still works.</div>}
                      </div>
                    )}
                  </div>

                  {showBreakdown && (<div className="breakdown">{blocks.map((b, i) => (<div className="blk rise" key={b.label} style={{ animationDelay: `${i * 40}ms` }}><h4>{b.label}</h4><pre>{b.body}</pre></div>))}</div>)}
                </>
              )}
            </div>
          </section>
        </main>
      ) : (
        // MEMORY
        <main className="shell">
          <section className="hero">
            <div className="kicker">the system's growing brain</div>
            <h1>What PROMPTSMITH <em>has learned.</em></h1>
            <p>Every forge is saved and every piece of feedback distills into reinforced rules — scoped per domain — injected into future prompts. Add your own house rules, mute what's noisy, and (with a key) let Claude distill freeform notes into lessons.</p>
          </section>

          {stat && (
            <div className="statgrid">
              <div className="stat"><b>{stat.sessions}</b><span>prompts forged</span></div>
              <div className="stat"><b>{stat.feedback}</b><span>feedback logged</span></div>
              <div className="stat"><b>{stat.lessons}</b><span>lessons learned</span></div>
              <div className="stat"><b>{stat.successRate === null ? "—" : `${stat.successRate}%`}</b><span>success rate</span></div>
            </div>
          )}

          {!persistent && (
            <div className="enforced" style={{ marginBottom: 28 }}>⚠ This hosted demo runs on serverless storage, so the memory is <b>ephemeral</b> — it resets between instances and isn&apos;t shared. For a durable shared brain, self-host on a persistent server (it&apos;s free & open-source).</div>
          )}

          <section className="memcols">
            <div className="panel">
              <div className="panel-head"><span className="idx">A /</span> lessons learned
                {!locked && <button className="btn mini" onClick={onDistill} disabled={distilling} type="button" title={boostReady ? "Use Claude to distill freeform notes into lessons" : "Needs ANTHROPIC_API_KEY"}>{distilling ? <><span className="spin" /> Distilling…</> : "✦ Distill notes"}</button>}
              </div>

              {locked ? (
                <div className="enforced" style={{ marginBottom: 18 }}>This is a managed public instance — lesson editing is locked, but feedback still trains the brain. Self-host (it&apos;s free & open-source) to manage your own house rules.</div>
              ) : (
                <div className="addlesson">
                  <input type="text" placeholder="Add a house rule (e.g. always prefix with 'sys_' and load text domain 'systical')" value={newLesson} onChange={(e) => setNewLesson(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAddLesson()} />
                  <select className="sel mini" aria-label="Lesson domain scope" value={newScopeDomain} onChange={(e) => setNewScopeDomain(e.target.value as Domain | "")}>
                    <option value="">all</option>
                    {DOMAIN_LIST.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
                  </select>
                  <button className="btn primary" onClick={onAddLesson} type="button">+ Add</button>
                </div>
              )}
              {memNote && <div className="notice" style={{ margin: "12px 0" }}>{memNote}</div>}

              {lessons.length === 0 ? (
                <div className="out-empty" style={{ minHeight: 160 }}><p>No lessons yet. Submit feedback on a forged prompt, or add a house rule above.</p></div>
              ) : (
                <div className="lessons">
                  {lessons.map((l) => (
                    <div className={`lesson rise ${l.muted ? "muted" : ""}`} key={l.id}>
                      <div className="lesson-meta">
                        <span className={`src ${l.source}`}>{l.source}</span>
                        <span className="scope">{[l.scope.domain, l.scope.kind, l.scope.framework].filter(Boolean).join(" · ") || "all"}</span>
                        <span className="wt">×{l.weight}</span>
                        {!locked && <button className="lx" onClick={() => lessonAction({ action: "mute", id: l.id, muted: !l.muted })} type="button" title={l.muted ? "unmute" : "mute"}>{l.muted ? "◌" : "●"}</button>}
                        {!locked && <button className="lx" onClick={() => lessonAction({ action: "delete", id: l.id })} type="button" title="delete">✕</button>}
                      </div>
                      <p>{l.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-head"><span className="idx">B /</span> recent forges <span className="hk">click to reload</span></div>
              {sessions.length === 0 ? (
                <div className="out-empty" style={{ minHeight: 160 }}><p>Nothing forged yet.</p></div>
              ) : (
                <div className="history">
                  {sessions.map((s) => (
                    <button className="hist rise" key={s.id} onClick={() => loadSession(s)} type="button">
                      <div className="hist-top"><span className="k">{resolveDomain(s.domain ?? "frontend").label}</span><span className="fw">{resolveKind(s.domain ?? "frontend", s.kind).label.split(" / ")[0]}</span>{s.hasFeedback && <span className="fb-dot" title="has feedback">✶</span>}</div>
                      <p>{s.intake.brief || "(no brief)"}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      <footer className="foot shell">
        <span>PROMPTSMITH · internal tooling</span>
        <span>{boostReady ? "AI Boost + distill live" : "free engine · no key required"} · 4 domains · learns from feedback</span>
      </footer>
    </>
  );
}
