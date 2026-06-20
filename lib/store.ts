// ── Shared server-side store ──────────────────────────────────────────────────
// A single JSON file written atomically, guarded by an in-process queue so
// concurrent forges/feedback don't corrupt it. Zero external deps.
//
// Serverless-aware: on a read-only platform filesystem (Vercel/Lambda) it falls
// back to the writable temp dir, and EVERY write is fail-soft — a write that
// can't persist never throws, so the API never 500s. On such platforms the data
// is per-instance and ephemeral (see isPersistent); for a durable shared brain,
// run on a persistent host or swap this module for KV/Postgres (the public API
// below is the only surface callers depend on).

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { SessionRecord, FeedbackRecord, Lesson } from "./types";

interface DB {
  sessions: SessionRecord[];
  feedback: FeedbackRecord[];
  lessons: Lesson[];
}

const EMPTY: DB = { sessions: [], feedback: [], lessons: [] };

// Caps keep the store (and every compiled prompt that injects lessons) bounded.
const MAX_SESSIONS = 500;
const MAX_FEEDBACK = 1000;
const MAX_LESSONS = 200;

// On serverless platforms the project dir is read-only; use the temp dir.
const SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = SERVERLESS ? path.join(os.tmpdir(), "promptsmith") : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "promptsmith.json");

/** False on serverless (data is ephemeral / per-instance), true on a persistent host. */
export function isPersistent(): boolean {
  return !SERVERLESS;
}

// Serialize all reads/writes through one promise chain to avoid races.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(() => undefined, () => undefined);
  return run;
}

async function read(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DB>;
    return { ...EMPTY, ...parsed };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code && code !== "ENOENT") {
      // File exists but is unreadable/corrupt — preserve it instead of letting
      // the next write silently overwrite the brain with empty data.
      try { await fs.rename(DB_FILE, `${DB_FILE}.corrupt`); } catch { /* best effort */ }
    }
    return { ...EMPTY };
  }
}

/** Fail-soft: returns true if persisted, false if the platform refused the write. */
async function write(db: DB): Promise<boolean> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, DB_FILE); // atomic on same filesystem
    return true;
  } catch {
    return false; // read-only FS etc. — never throw to the caller
  }
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── public API ────────────────────────────────────────────────────────────────

export function addSession(rec: Omit<SessionRecord, "id" | "createdAt">): Promise<SessionRecord> {
  return withLock(async () => {
    const db = await read();
    const session: SessionRecord = { ...rec, id: id("s"), createdAt: new Date().toISOString() };
    db.sessions.unshift(session);
    db.sessions = db.sessions.slice(0, MAX_SESSIONS);
    await write(db);
    return session;
  });
}

export function listSessions(limit = 50): Promise<SessionRecord[]> {
  return withLock(async () => (await read()).sessions.slice(0, limit));
}

export function getLessons(): Promise<Lesson[]> {
  return withLock(async () => (await read()).lessons);
}

export function addFeedback(
  rec: Omit<FeedbackRecord, "id" | "createdAt">,
  distill: (sessions: SessionRecord[], feedback: FeedbackRecord[], existing: Lesson[]) => Lesson[]
): Promise<{ feedback: FeedbackRecord; lessons: Lesson[] }> {
  return withLock(async () => {
    const db = await read();
    const feedback: FeedbackRecord = { ...rec, id: id("f"), createdAt: new Date().toISOString() };
    db.feedback.unshift(feedback);
    db.feedback = db.feedback.slice(0, MAX_FEEDBACK);
    const s = db.sessions.find((x) => x.id === feedback.sessionId);
    if (s) s.hasFeedback = true;
    db.lessons = distill(db.sessions, db.feedback, db.lessons).slice(0, MAX_LESSONS);
    await write(db);
    return { feedback, lessons: db.lessons };
  });
}

export function setLessons(lessons: Lesson[]): Promise<Lesson[]> {
  return withLock(async () => {
    const db = await read();
    db.lessons = lessons.slice(0, MAX_LESSONS);
    await write(db);
    return db.lessons;
  });
}

export function addManualLesson(input: { text: string; scope: Lesson["scope"] }): Promise<Lesson[]> {
  return withLock(async () => {
    const db = await read();
    const now = new Date().toISOString();
    db.lessons.unshift({
      id: id("L:manual"),
      createdAt: now,
      updatedAt: now,
      scope: input.scope,
      text: input.text,
      source: "manual",
      weight: 99, // hand-authored house rules outrank auto-distilled ones
    });
    db.lessons.sort((a, b) => b.weight - a.weight);
    db.lessons = db.lessons.slice(0, MAX_LESSONS);
    await write(db);
    return db.lessons;
  });
}

export function addAiLessons(items: { text: string; scope: Lesson["scope"] }[]): Promise<Lesson[]> {
  return withLock(async () => {
    const db = await read();
    const now = new Date().toISOString();
    const seen = new Set(db.lessons.map((l) => l.text.trim().toLowerCase()));
    for (const it of items) {
      const key = it.text.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      db.lessons.unshift({ id: id("L:ai"), createdAt: now, updatedAt: now, scope: it.scope, text: it.text.trim(), source: "ai", weight: 2 });
    }
    db.lessons.sort((a, b) => b.weight - a.weight);
    db.lessons = db.lessons.slice(0, MAX_LESSONS);
    await write(db);
    return db.lessons;
  });
}

export function muteLesson(lessonId: string, muted: boolean): Promise<Lesson[]> {
  return withLock(async () => {
    const db = await read();
    const l = db.lessons.find((x) => x.id === lessonId);
    if (l) { l.muted = muted; l.updatedAt = new Date().toISOString(); }
    await write(db);
    return db.lessons;
  });
}

export function deleteLesson(lessonId: string): Promise<Lesson[]> {
  return withLock(async () => {
    const db = await read();
    db.lessons = db.lessons.filter((x) => x.id !== lessonId);
    await write(db);
    return db.lessons;
  });
}

/** Recent freeform feedback notes, newest first — fuel for the AI-distill pass. */
export function recentNotes(limit = 40): Promise<{ kind?: string; framework?: string; outcome: string; worked: string; improve: string }[]> {
  return withLock(async () => {
    const db = await read();
    const byId = new Map(db.sessions.map((s) => [s.id, s]));
    return db.feedback
      .filter((f) => f.improve.trim() || f.worked.trim())
      .slice(0, limit)
      .map((f) => {
        const s = byId.get(f.sessionId);
        return { kind: s?.kind, framework: s?.framework, outcome: f.outcome, worked: f.worked, improve: f.improve };
      });
  });
}

export function stats(): Promise<{ sessions: number; feedback: number; lessons: number; successRate: number | null }> {
  return withLock(async () => {
    const db = await read();
    const rated = db.feedback.length;
    const wins = db.feedback.filter((f) => f.outcome === "success").length;
    return {
      sessions: db.sessions.length,
      feedback: rated,
      lessons: db.lessons.length,
      successRate: rated ? Math.round((wins / rated) * 100) : null,
    };
  });
}
