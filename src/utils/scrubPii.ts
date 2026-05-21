/**
 * scrubPii — recursive PII scrubber for Sentry event payloads.
 *
 * Used by both the React SPA (`src/core/sentry.ts`) and the Fly
 * Express server (`server.ts`) via Sentry's `beforeSend` hook.
 * Closes QA framework item #9 (PII-in-logs audit + Sentry filter).
 *
 * Defends against INCIDENTAL leaks — emails in error messages, JWTs
 * in URLs, Authorization headers in breadcrumbs.  Deliberate identity
 * tagging via `Sentry.setUser({ email })` is still allowed because
 * it's a UX-vs-privacy tradeoff the operator can flip per-environment.
 *
 * Strategy:
 *   1. Walk the entire event JSON recursively.
 *   2. Redact known-sensitive object keys (Authorization, Cookie, …)
 *      outright — value is replaced before we even look at it.
 *   3. Run a small set of regex replacements on every remaining string.
 *
 * Performance: typical Sentry events are <50 KB and walked once per
 * capture — no measurable hot-path cost.
 *
 * Stays a pure function with no Sentry dependency so the unit tests
 * don't have to mock anything.
 */

// Keys whose values we redact regardless of content.  Case-insensitive
// match.  Pattern names chosen to cover both HTTP header conventions
// (`authorization`, `cookie`) and form-field conventions (`password`,
// `secret`, `token`, `api_key`).
const REDACT_KEY_RE = /^(authorization|cookie|set-cookie|x-api-key|x-auth-token|apikey|api[_-]?key|password|passwd|secret|token|access[_-]?token|refresh[_-]?token|session[_-]?id)$/i;

// Email-ish — RFC 5322 is overkill; this pattern catches the
// `user@host.tld` shape that Gmail / school addresses hit.
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Supabase / GoTrue JWTs always begin with `eyJ` (base64 of `{"`).
// Three dot-separated base64url segments.  The length floor on the
// header segment prevents matching short tokens of unrelated shape.
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

// Bearer / Token authorization values embedded mid-string (e.g. inside
// a stack-trace URL or a logged curl command).
const BEARER_RE = /\b(Bearer|Token)\s+\S+/gi;

// Supabase publishable / secret / service keys (`sb_publishable_…`,
// `sb_secret_…`, etc.).  These are static credentials we don't want
// leaked into issue text, even though the publishable variant is
// already public.
const SUPABASE_KEY_RE = /\bsb_(?:publishable|secret|service|anon)_[A-Za-z0-9_-]+/g;

function scrubString(value: string): string {
  // Order matters: BEARER_RE runs BEFORE JWT_RE so that a JWT carried
  // inside a `Bearer …` prefix collapses to `Bearer [redacted]` in
  // one step.  Running JWT_RE first would leave `Bearer [jwt]`, which
  // BEARER_RE would then eat (its `\S+` matches `[jwt]` too) and
  // produce `Bearer [redacted]` — same end result for security, but
  // breaks the "standalone JWT becomes [jwt]" contract that callers
  // (and the unit test) depend on for diagnosability.
  return value
    .replace(EMAIL_RE, "[email]")
    .replace(BEARER_RE, "$1 [redacted]")
    .replace(JWT_RE, "[jwt]")
    .replace(SUPABASE_KEY_RE, "[supabase-key]");
}

export function scrubPii<T>(value: T): T;
export function scrubPii(value: unknown): unknown {
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map(item => scrubPii(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACT_KEY_RE.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = scrubPii(v);
      }
    }
    return out;
  }
  // Numbers, booleans, null, undefined — pass through unchanged.
  return value;
}
