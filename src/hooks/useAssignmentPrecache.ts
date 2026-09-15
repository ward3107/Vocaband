import { useEffect } from 'react';
import { getWordAudioUrl } from '../utils/audioUrl';
import { isSlowConnection } from './useEffectiveConnection';
import type { Word } from '../data/vocabulary';

const PRECACHE_BATCH_SIZE = 8;

/**
 * Warm the audio cache for the active assignment so a student who loses
 * Wi-Fi mid-lesson can still hear word pronunciations.
 *
 * Why fetch() instead of caches.open(...).addAll(...): the SW fetch
 * handler (workbox CacheFirst rule on `/storage/v1/.../sound/`) already
 * stores responses in the `vocaband-word-audio` cache as a side effect
 * of any successful fetch. Using fetch() lets us hand the SW the URL
 * once, and workbox does the cache write — no need to know the cache
 * name from the page, no risk of drifting from the workbox rule config.
 *
 * Skipped entirely on 2G / data-saver — the 2G fallback in useAudio
 * routes those students to speechSynthesis anyway, so prefetching MP3s
 * they'll never play is pure waste of their data plan.
 */
export function useAssignmentPrecache(
  words: Word[] | null | undefined,
  opts?: { enabled?: boolean },
): void {
  // Depend on membership, not array identity: parent renders must not cancel
  // and restart work. Ignore invalid IDs before building URLs, and fetch each
  // recording once even when a word appears several times in the assignment.
  const key = [...new Set((words ?? []).map(w => w.id).filter(Number.isFinite))]
    .sort((a, b) => a - b)
    .join(',');

  useEffect(() => {
    if (opts?.enabled === false) return;
    if (!key) return;
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    if (isSlowConnection()) return;

    const urls = key.split(',')
      .map(id => getWordAudioUrl(Number(id), 'en'))
      .filter((u): u is string => typeof u === 'string' && u.length > 0);
    if (urls.length === 0) return;

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;

    const controller = new AbortController();
    const run = () => {
      if (!controller.signal.aborted) void precacheInBatches(urls, controller.signal);
    };

    // Defer to idle so the precache doesn't compete with React's render
    // pass or the very first audio request the student actually triggers.
    const idleId = typeof ric === 'function' ? ric.call(window, run, { timeout: 4000 }) : null;
    const timerId = idleId === null ? window.setTimeout(run, 800) : null;
    return () => {
      controller.abort();
      if (idleId !== null) window.cancelIdleCallback?.(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [key, opts?.enabled]);
}

async function precacheInBatches(urls: string[], signal: AbortSignal): Promise<void> {
  // Chunk the fetches so we don't fire 50 parallel requests on a school
  // Wi-Fi pipe — that's worse than no precache because it competes with
  // whatever the student is actively trying to load.
  for (let i = 0; i < urls.length; i += PRECACHE_BATCH_SIZE) {
    if (signal.aborted || isSlowConnection() || navigator.onLine === false) return;
    const batch = urls.slice(i, i + PRECACHE_BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async url => {
        const response = await fetch(url, { method: 'GET', cache: 'force-cache', signal });
        // fetch resolves at headers; wait for the body too so the next batch
        // cannot overlap eight unfinished audio downloads on classroom Wi-Fi.
        await response.arrayBuffer();
      }),
    );
  }
}
