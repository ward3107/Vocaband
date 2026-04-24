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
const RELOAD_GUARD_WINDOW_MS = 60_000;

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
