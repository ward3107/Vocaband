import { useEffect, useRef } from 'react';
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
  const ranKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (opts?.enabled === false) return;
    if (!words || words.length === 0) return;
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    if (isSlowConnection()) return;

    // Stable identity key — sort word IDs so React Strict Mode double-mounts
    // or render re-orderings don't re-trigger a duplicate batch.
    const key = words
      .map(w => w.id)
      .filter(id => typeof id === 'number' && !Number.isNaN(id))
      .sort((a, b) => a - b)
      .join(',');
    if (!key || ranKeyRef.current === key) return;
    ranKeyRef.current = key;

    const urls = words
      .map(w => getWordAudioUrl(w.id, 'en'))
      .filter((u): u is string => typeof u === 'string' && u.length > 0);
    if (urls.length === 0) return;

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;

    const run = () => {
      void precacheInBatches(urls);
    };

    // Defer to idle so the precache doesn't compete with React's render
    // pass or the very first audio request the student actually triggers.
    if (typeof ric === 'function') ric(run, { timeout: 4000 });
    else window.setTimeout(run, 800);
  }, [words, opts?.enabled]);
}

async function precacheInBatches(urls: string[]): Promise<void> {
  // Chunk the fetches so we don't fire 50 parallel requests on a school
  // Wi-Fi pipe — that's worse than no precache because it competes with
  // whatever the student is actively trying to load.
  for (let i = 0; i < urls.length; i += PRECACHE_BATCH_SIZE) {
    const batch = urls.slice(i, i + PRECACHE_BATCH_SIZE);
    await Promise.allSettled(
      batch.map(url =>
        fetch(url, { method: 'GET', cache: 'force-cache' }).catch(() => null),
      ),
    );
  }
}
