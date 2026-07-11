// Shared helper used by every ErrorBoundary in the app to detect and recover
// from stale-deploy chunk-load failures — the browser still has an old
// index.html that references hashed filenames that no longer exist on the
// server, so fetching any lazy route returns HTML instead of JS.
//
// A one-shot reload (guarded by sessionStorage timestamp) fixes it by
// picking up the fresh index.html with current chunk names.

// Each browser phrases the same "stale hashed bundle" failure differently:
//   Chrome:   "Failed to fetch dynamically imported module"
//   Firefox:  "error loading dynamically imported module"
//             "Loading module from … was blocked because of a disallowed
//              MIME type (text/html)"  — server served SPA fallback
//   Safari:   "Importing a module script failed"
//   Vite HMR: "Loading chunk NN failed" / "ChunkLoadError"
// Any of these mean the browser has a cached index.html pointing at
// hashes that no longer exist on the new deploy; the fix is always a
// hard reload that picks up the fresh index.html.
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk \d+ failed|ChunkLoadError|Failed to load module script|Importing a module script failed|disallowed MIME type/i;

const RELOAD_GUARD_KEY = "vocaband_chunk_reload_attempted_at";
// Guard window is short (3 s, was 60 s) — long enough to prevent an
// infinite reload loop if a fresh deploy is genuinely broken, but short
// enough that a stubborn service-worker cache (which sometimes needs a
// second reload to fully release the current document as controller) gets
// a quick second attempt instead of leaving the user stranded on an error
// screen for a full minute.
const RELOAD_GUARD_WINDOW_MS = 3_000;

export function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return CHUNK_ERROR_RE.test(msg);
}

/**
 * If enough time has elapsed since the last attempt, clear the service worker
 * (which may be caching the stale index.html) and reload. Returns true when a
 * reload is actually kicked off so callers can render a spinner instead of an
 * error screen while the tab tears down.
 */
export function attemptChunkReload(): boolean {
  try {
    const lastAttempt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || "0");
    const now = Date.now();
    if (lastAttempt && now - lastAttempt < RELOAD_GUARD_WINDOW_MS) {
      return false; // already tried recently — stop looping
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    /* sessionStorage unavailable — just reload */
  }

  clearSwAndCaches().finally(reloadWithCacheBust);
  return true;
}

/**
 * Same teardown as `attemptChunkReload`, but bypasses the 60 s guard so an
 * explicit user tap on "Retry" / "Refresh Page" always re-does the recovery
 * work.  Without this the button landed back on the same cached SW+HTML and
 * the user looped on the error screen; the only escape was the
 * `/?unregisterSW=1` kill switch.  This is the in-app equivalent.
 */
export function forceFullRecovery(): void {
  try { sessionStorage.removeItem(RELOAD_GUARD_KEY); } catch { /* ignore */ }
  clearSwAndCaches().finally(reloadWithCacheBust);
}

// ── Escalation ladder for the terminal "chunk STILL won't load" state ──────
//
// Recovery sequence before this: first import fails → lazyWithRetry retries
// once → still fails → attemptChunkReload() reloads with a cache-buster.  If
// the reloaded page ALSO fails within the 3 s guard, attemptChunkReload()
// returns false and the ErrorBoundary was left on a static "Failed to load
// component" + Retry button.  A returning user whose device is genuinely
// wedged (a stale SW serving an old shell that the soft cache-bust reload
// didn't dislodge) then had to KNOW the /?unregisterSW=1 kill switch existed
// to escape — most don't.
//
// This ladder makes the boundary self-heal: the first time it reaches the
// terminal state it automatically runs the full nuclear recovery
// (escalateToKillSwitch — unregister every SW, drop every cache, reload to a
// CLEAN url, exactly like the kill switch), and only after that ALSO fails
// does it fall back to a human-readable "reset the app" screen.  A persistent
// counter (sessionStorage, survives the reload) plus a hard cap stops it from
// hot-looping when the deploy is genuinely broken or the device is offline.
const TERMINAL_FAILURE_COUNT_KEY = "vocaband_chunk_terminal_failures";
// Auto-run the nuclear recovery at most this many times before giving up and
// showing the manual escape hatch.  One automatic nuke clears virtually every
// real stale-SW case; a second covers a SW that needed a beat to release the
// document as controller.  Beyond that, looping won't help.
const MAX_AUTO_KILL_SWITCH_ATTEMPTS = 2;

export type TerminalRecoveryDecision = "recovering" | "give-up";

/**
 * Record that an ErrorBoundary reached its terminal chunk-error state (already
 * reloaded once, still failing) and decide what happens next:
 *   "recovering" — under the retry cap; the caller should kick off
 *                  escalateToKillSwitch() and keep a spinner up.
 *   "give-up"    — cap exhausted; the caller should render the manual reset UI.
 * Pure aside from the sessionStorage counter, so the navigation side effect
 * stays in the caller (and out of React's render path).
 */
export function recordTerminalChunkFailure(): TerminalRecoveryDecision {
  let attempts = 0;
  try {
    attempts = Number(sessionStorage.getItem(TERMINAL_FAILURE_COUNT_KEY) || "0");
  } catch { /* sessionStorage unavailable — treat as first attempt */ }

  if (attempts >= MAX_AUTO_KILL_SWITCH_ATTEMPTS) return "give-up";

  try {
    sessionStorage.setItem(TERMINAL_FAILURE_COUNT_KEY, String(attempts + 1));
  } catch { /* best-effort */ }
  return "recovering";
}

/**
 * Clear every chunk-recovery bookkeeping key.  Called from lazyWithRetry the
 * moment ANY dynamic import succeeds — that success proves the recovery worked,
 * so a later unrelated chunk error in the same tab session starts from a clean
 * slate instead of inheriting a stale "give up" count.
 */
export function resetChunkRecovery(): void {
  try {
    sessionStorage.removeItem(TERMINAL_FAILURE_COUNT_KEY);
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch { /* best-effort */ }
}

/**
 * Nuclear recovery: unregister every SW, drop every cache, and hard-reload to a
 * CLEAN url — ALL query params stripped, mirroring the `/?unregisterSW=1` kill
 * switch in main.tsx.  Broader than forceFullRecovery, which keeps the query
 * string and only appends a `?_r=` cache-buster: stripping to the bare path
 * guarantees we escape any bad query-param state and never accumulate a
 * `?_r=…&_r=…` chain across repeated attempts.
 */
export function escalateToKillSwitch(): void {
  clearSwAndCaches().finally(reloadToCleanUrl);
}

// Reload to origin + pathname only (no search, no hash).  Same clean landing
// the kill switch produces; the try/catch falls back to a plain reload if
// constructing the URL ever throws (it shouldn't).
function reloadToCleanUrl(): void {
  try {
    window.location.replace(window.location.origin + window.location.pathname);
  } catch {
    window.location.reload();
  }
}

// Tear down every SW registration + every cached response in the Cache API.
// Clearing caches isn't strictly necessary once the SW is gone (only a SW
// can serve from them), but any newly-installed SW would otherwise adopt
// the same stale entries on its first fetch.  Always returns a resolved
// promise — best-effort, never throws.
function clearSwAndCaches(): Promise<void> {
  const swDone: Promise<unknown> =
    "serviceWorker" in navigator
      ? navigator.serviceWorker.getRegistrations()
          .then(regs => Promise.all(regs.map(r => r.unregister())))
          .catch(() => {})
      : Promise.resolve();
  const cachesDone: Promise<unknown> =
    typeof caches !== "undefined"
      ? caches.keys()
          .then(names => Promise.all(names.map(n => caches.delete(n))))
          .catch(() => {})
      : Promise.resolve();
  return Promise.all([swDone, cachesDone]).then(() => undefined);
}

// Append a cache-buster so Cloudflare's edge and the browser memory cache
// both fetch a fresh index.html instead of the stale one pointing at
// hashes that no longer exist. The ?_r= value is timestamp-based so it's
// always unique; the reload itself scrubs the URL after the new bundle
// boots (handled by any router that strips unknown query params).
function reloadWithCacheBust(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_r", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}
