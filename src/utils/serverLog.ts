/**
 * serverLog — privacy-safe console wrapper for the Fly.io server.
 *
 * Sentry already scrubs PII via `beforeSend` (see `scrubPii.ts`), but
 * Fly.io captures stdout/stderr as a separate log stream that bypasses
 * Sentry entirely. Historical `console.log` calls in server.ts
 * interpolate emails, UIDs, and JWT prefixes directly into log lines.
 * GDPR Art. 5(1)(c) (data minimisation) + Art. 32 (confidentiality)
 * require us to scrub before write.
 *
 * `installScrubbingConsole()` patches console.{log,warn,error,info,debug}
 * to apply scrubPii() to every argument before delegating to the
 * original method. Same scrubber as Sentry → single source of truth.
 *
 * `redactEmail()` and `hashUid()` are call-site helpers for when you
 * want a more useful log line than the generic `[email]` / `[redacted]`
 * (e.g. preserving the domain to spot school-vs-personal accounts).
 */
import { createHash } from "crypto";
import { scrubPii } from "./scrubPii";

// Captured at install time (not module load), so tests can swap
// console.* in beforeEach and still have the wrapper see their mocks.
type Method = (...args: unknown[]) => void;
let installed = false;
let original: { log: Method; warn: Method; error: Method; info: Method; debug: Method } | null = null;

function scrubArg(value: unknown): unknown {
  // Error instances need special handling: their `message` and `stack`
  // are non-enumerable, so scrubPii's generic object walker would lose
  // them. Rebuild an Error-shaped clone so node's console still renders
  // it naturally as `Error: <scrubbed message>` with a stack trace.
  if (value instanceof Error) {
    const clone = Object.create(Object.getPrototypeOf(value)) as Error;
    clone.name = value.name;
    clone.message = typeof value.message === "string" ? scrubPii(value.message) : value.message;
    if (typeof value.stack === "string") clone.stack = scrubPii(value.stack);
    return clone;
  }
  return scrubPii(value);
}

function scrubArgs(args: unknown[]): unknown[] {
  return args.map(scrubArg);
}

/**
 * Patches global console methods so every argument is scrubbed before
 * the underlying writer sees it. Idempotent — safe to call twice.
 */
export function installScrubbingConsole(): void {
  if (installed) return;
  installed = true;
  original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
  };
  const o = original;
  console.log = (...args: unknown[]) => o.log(...scrubArgs(args));
  console.warn = (...args: unknown[]) => o.warn(...scrubArgs(args));
  console.error = (...args: unknown[]) => o.error(...scrubArgs(args));
  console.info = (...args: unknown[]) => o.info(...scrubArgs(args));
  console.debug = (...args: unknown[]) => o.debug(...scrubArgs(args));
}

/** Restores the original console — used by tests. */
export function uninstallScrubbingConsole(): void {
  if (!installed || !original) return;
  installed = false;
  console.log = original.log;
  console.warn = original.warn;
  console.error = original.error;
  console.info = original.info;
  console.debug = original.debug;
  original = null;
}

/**
 * Returns a short, stable, non-reversible identifier for a UID.
 * `uid:7a8f3c2e` is enough to correlate log lines for one user
 * without storing the raw UID.
 */
export function hashUid(uid: string | null | undefined): string {
  if (!uid || typeof uid !== "string") return "uid:none";
  return "uid:" + createHash("sha256").update(uid).digest("hex").slice(0, 8);
}

/**
 * Returns a redacted email keeping only the domain visible.
 * `student@school.edu` → `[email:school.edu]`. Lets us see at a glance
 * whether a user is on a school domain without identifying the person.
 * Falls back to `[email]` for malformed input.
 */
export function redactEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") return "[no-email]";
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "[email]";
  return "[email:" + email.slice(at + 1) + "]";
}
