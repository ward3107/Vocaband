// Sentry init for the React SPA.
//
// Captures unhandled errors from the browser so we see crashes that
// happen on student devices — old iPads, weird Android browsers,
// flaky school WiFi. Production-only by design: dev errors are loud
// in the console already, and we don't want localhost noise polluting
// the Sentry project.
//
// DSN: hard-coded fallback is intentional. Sentry DSNs are designed
// to live in browser-shipped code (every Sentry-instrumented site
// inlines theirs); they're rate-limited at the org level, not secret.
// VITE_SENTRY_DSN takes precedence so we can swap projects without
// a code change.

import * as Sentry from "@sentry/react";

// Same DSN as the Fly server uses (see SENTRY_DSN secret). Errors
// from both surfaces land in one project — easier triage at our
// current scale.
const FALLBACK_DSN =
  "https://ef54f258e904ec26c8b37d2d6705f965@o4511016408514560.ingest.de.sentry.io/4511016410546256";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  const envDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  const dsn = envDsn && envDsn.length > 0 ? envDsn : FALLBACK_DSN;

  Sentry.init({
    dsn,
    // Only fire in production — dev errors are visible in console and
    // we don't want localhost stack traces clogging the project.
    enabled: import.meta.env.PROD,
    environment: import.meta.env.MODE,
    // 5% performance sampling — enough to spot slow pageloads without
    // burning through the free-tier event quota.
    tracesSampleRate: 0.05,
    // Auto-capture console errors and unhandled rejections (defaults).
    // Browser extensions inject scripts that throw in our context; we
    // silence the most common false positives so the issue list stays
    // signal-heavy.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Common chunk-loading races on flaky networks — we already
      // recover from these in ErrorBoundary via chunkReload.ts; no
      // need to alert.
      /Loading chunk \d+ failed/,
      /ChunkLoadError/,
      // Translate/extension noise
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
    ],
    denyUrls: [
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],
    // Don't send default PII (cookies, IP). We attach the Supabase uid
    // explicitly via setSentryUser() when a teacher/student signs in.
    sendDefaultPii: false,
  });
}

/** Attach the signed-in user to subsequent Sentry events.
 * Call after a successful login so issues show "this affected user X". */
export function setSentryUser(user: { uid: string; role?: string; email?: string }): void {
  Sentry.setUser({
    id: user.uid,
    email: user.email,
    username: user.role,
  });
}

/** Clear user context on sign-out so a subsequent anonymous error
 * doesn't get tagged with the previous user. */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/** Manually report an error to Sentry. Useful in catch blocks where we
 * already swallow the throw (e.g. background sync failures) but want
 * the report. */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(err, context ? { contexts: { extra: context } } : undefined);
}
