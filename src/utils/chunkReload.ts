// Shared helper used by every ErrorBoundary in the app to detect and recover
// from stale-deploy chunk-load failures — the browser still has an old
// index.html that references hashed filenames that no longer exist on the
// server, so fetching any lazy route returns HTML instead of JS.
//
// A one-shot reload (guarded by sessionStorage timestamp) fixes it by
// picking up the fresh index.html with current chunk names.

const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|Loading chunk \d+ failed|ChunkLoadError|Failed to load module script|Importing a module script failed/i;

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

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .catch(() => {})
      .finally(() => window.location.reload());
  } else {
    window.location.reload();
  }
  return true;
}
