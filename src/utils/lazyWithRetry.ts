// Self-healing wrapper around React.lazy that survives the "stale deploy"
// failure mode without requiring every consumer to wrap a LazyErrorBoundary.
//
// The failure: when Vite rotates content-hashed chunk filenames on a new
// deploy, returning users with a cached index.html still reference the old
// hashes (e.g. `TeacherLoginView-C_OH4lc_.js`). Those URLs 404 on the new
// build, and Cloudflare's SPA fallback returns the fresh index.html with
// a 200 status — so the browser receives HTML for a JS module request and
// throws "Failed to fetch dynamically imported module" / "disallowed MIME
// type" once it tries to evaluate it.
//
// Behaviour:
//  1. First attempt — the normal dynamic import.
//  2. On a chunk-load error, wait briefly (covers transient mobile network
//     blips where the chunk really does exist) and retry once.
//  3. If the retry also fails with a chunk-load error, hand off to
//     attemptChunkReload() — which unregisters the SW, drops the caches,
//     and reloads with a cache-buster so the browser picks up a fresh
//     index.html with current hashes. When a reload is actually kicked
//     off we suspend forever so React keeps the Suspense fallback up
//     while the tab tears down (the alternative — letting the rejection
//     propagate — would surface a scary error screen for the split
//     second before the browser navigates).
//     But attemptChunkReload() returns false when its 60 s guard blocks
//     a repeat reload (we already reloaded once and the chunk *still*
//     won't load). Suspending forever in that case would strand the user
//     on an infinite spinner with no escape — so we re-throw instead, and
//     the nearest ErrorBoundary renders its fallback (which offers a
//     manual recovery button via forceFullRecovery).
//  4. Non-chunk errors fall through unchanged so real bugs still surface.

import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { isChunkLoadError, attemptChunkReload } from "./chunkReload";

const RETRY_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// `ComponentType<any>` here mirrors React.lazy's own upper bound — using
// `unknown` would force callers to type their components contravariantly
// and reject the existing component signatures throughout the codebase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;

      await delay(RETRY_DELAY_MS);
      try {
        return await factory();
      } catch (err2) {
        if (!isChunkLoadError(err2)) throw err2;

        // Only block the promise when a reload is genuinely in flight —
        // then Suspense keeps the fallback up until the navigation tears
        // the tab down. If the guard refused the reload (returns false),
        // navigation won't happen, so falling through to re-throw lets an
        // ErrorBoundary surface a recoverable fallback instead of hanging
        // on the spinner forever.
        if (attemptChunkReload()) {
          await new Promise<never>(() => { /* never resolves */ });
        }
        throw err2;
      }
    }
  });
}
