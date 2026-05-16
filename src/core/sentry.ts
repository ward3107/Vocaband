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
//
// CSP note: the ingest host below MUST be on `connect-src` in
// public/_headers, and `https://browser.sentry-cdn.com` MUST be on
// `script-src-elem` for the lazy replay integration to load.  If you
// change the DSN project, update both at the same time or events
// silently disappear.

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
    // browserTracingIntegration is added lazily after first paint
    // (see addBrowserTracingLazy below) so its ~25 kB of perf-API
    // instrumentation doesn't sit on the critical path.  Without it
    // here Sentry still captures errors normally; tracing kicks in
    // a few hundred ms later, which is fine since the spans we care
    // about are page-load / nav transitions that the integration
    // back-fills from the Performance Timeline.
    integrations: [],
    // 5% performance sampling — enough to spot slow pageloads without
    // burning through the free-tier event quota.
    tracesSampleRate: 0.05,
    // tracePropagationTargets is a top-level option (not a
    // browserTracingIntegration option) — it controls which outbound
    // requests get sentry-trace headers attached regardless of when
    // the tracing integration is added.
    tracePropagationTargets: [
      /^\//,
      /^https:\/\/(?:www\.|api\.|auth\.|audio\.)?vocaband\.com/,
      /^https:\/\/.*\.supabase\.co/,
    ],
    // Replay sample rates picked up by the lazily-added replay
    // integration (see addReplayIntegrationLazy).  Setting them here
    // means the integration starts honouring them the instant it
    // loads from the CDN, without re-passing them.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
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

/** Add Sentry's browserTracing integration after first paint.
 *
 * Tracing instrumentation (Performance Observer wiring, fetch/xhr
 * patching, web-vitals collection) is ~25 kB gzipped.  Holding it
 * out of `Sentry.init`'s eager integration list and adding it from
 * a requestIdleCallback keeps it off the critical path while still
 * back-filling the page-load transaction via the Performance Timeline.
 */
export function addBrowserTracingLazy(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === "undefined") return;

  const schedule = (cb: () => void): void => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof ric === "function") {
      ric(cb, { timeout: 5000 });
    } else {
      setTimeout(cb, 1500);
    }
  };

  schedule(() => {
    try {
      Sentry.addIntegration(Sentry.browserTracingIntegration());
    } catch {
      // Best-effort.
    }
  });
}

/** Lazily add Sentry's session-replay integration AFTER first paint.
 *
 * Replay is ~50 KB gzipped — bundling it eagerly would blow up the
 * entry chunk and undo the school-Wi-Fi gains from R1-R4.  Instead
 * we let Sentry pull it from `browser.sentry-cdn.com` when the page
 * is idle, so it never competes with the user's first interaction.
 *
 * Privacy: `maskAllText` + `blockAllMedia` means recordings never
 * contain student names, chat, or media — defensible under the
 * Israeli MoE student-data rules and any future GDPR scrutiny.
 *
 * On any failure (school firewall blocks sentry-cdn, CSP mismatch,
 * offline at boot), this swallows silently.  Replay is opportunistic;
 * normal error capture continues regardless.
 */
export function addReplayIntegrationLazy(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === "undefined") return;

  const schedule = (cb: () => void): void => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof ric === "function") {
      ric(cb, { timeout: 5000 });
    } else {
      // Safari < 16.4 doesn't ship requestIdleCallback yet.  A small
      // setTimeout still keeps us out of the user's critical path.
      setTimeout(cb, 2000);
    }
  };

  schedule(async () => {
    try {
      const replayIntegration = await Sentry.lazyLoadIntegration("replayIntegration");
      Sentry.addIntegration(
        replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      );
    } catch {
      // Best-effort — see comment above.
    }
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
