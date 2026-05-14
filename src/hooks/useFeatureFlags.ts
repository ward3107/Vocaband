/**
 * Feature flags — runtime on/off switches for gradual rollouts.
 *
 * The frontend reads flag state from public.feature_flags (migration
 * 20260514_feature_flags.sql).  Admins toggle flags in the Supabase
 * dashboard — no redeploy needed.
 *
 * USAGE in a component:
 *
 *   const { isOn } = useFeatureFlag();
 *   if (isOn('spelling_race', user?.classCode)) {
 *     return <SpellingRaceButton />;
 *   }
 *
 * The `classCode` second argument is what lets us beta a feature for
 * one class at a time.  Pass undefined if the feature is per-user-only
 * (the flag's `enabled` master switch still governs everyone in that
 * case).
 *
 * CACHING:
 *   - One module-level fetch per page load, shared across all hook
 *     callers via a listener Set.  No per-component re-fetch.
 *   - Last successful fetch is mirrored to localStorage so the next
 *     cold-start renders with the known flag state immediately, even
 *     before Supabase responds.  A stale read is far better than a
 *     flicker that toggles features off and back on.
 *   - The cache refreshes every REFRESH_MS so a kill-switch flip
 *     reaches live sessions within ~1 minute.
 *
 * FAIL-CLOSED:
 *   - Unknown flag name → returns false.
 *   - Fetch error and no cache → returns false.
 *   This means a broken table or RLS policy makes flagged features
 *   *disappear*, not *appear*.  Safer default for a school product.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase, mapFeatureFlag, FEATURE_FLAG_COLUMNS, type FeatureFlag } from '../core/supabase';

const STORAGE_KEY = 'vocaband_feature_flags_v1';
const REFRESH_MS = 60_000;

// --- module-level singleton state ---
let cache: Record<string, FeatureFlag> = loadFromStorage();
let lastFetchAt = 0;
let inFlight: Promise<void> | null = null;
const listeners: Set<() => void> = new Set();

function loadFromStorage(): Record<string, FeatureFlag> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, FeatureFlag>;
  } catch {
    return {};
  }
}

function saveToStorage(next: Record<string, FeatureFlag>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private-mode — non-fatal, in-memory cache still works.
  }
}

function notify(): void {
  for (const l of listeners) l();
}

async function fetchFlags(): Promise<void> {
  // Coalesce concurrent calls — only one network request in flight at a time.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select(FEATURE_FLAG_COLUMNS);

      if (error) {
        console.warn('[feature-flags] fetch failed, using cached values', error.message);
        return;
      }

      const next: Record<string, FeatureFlag> = {};
      for (const row of data ?? []) {
        const flag = mapFeatureFlag(row);
        next[flag.name] = flag;
      }
      cache = next;
      lastFetchAt = Date.now();
      saveToStorage(next);
      notify();
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Evaluate a flag.  Pure function over the current cache — no async,
 * no React state.  Safe to call inline during render.
 *
 * Semantics:
 *   1. Flag missing from the table   → false  (fail-closed)
 *   2. classCode is in enabledForClasses → true  (beta override always wins)
 *   3. Otherwise → flag.enabled
 */
export function isFlagOn(name: string, classCode?: string | null): boolean {
  const flag = cache[name];
  if (!flag) return false;
  if (classCode && flag.enabledForClasses.includes(classCode)) return true;
  return flag.enabled;
}

export interface UseFeatureFlagsResult {
  /** Has at least one successful fetch landed (or a cached value from a prior session)? */
  ready: boolean;
  /** Evaluate a flag.  See `isFlagOn` for semantics. */
  isOn: (name: string, classCode?: string | null) => boolean;
  /** Force a refresh — useful after an admin flips a flag in another tab. */
  refresh: () => Promise<void>;
  /** Current flag map (read-only snapshot).  Mostly for an admin debug view. */
  all: Record<string, FeatureFlag>;
}

export function useFeatureFlag(): UseFeatureFlagsResult {
  // Bump a counter to re-render this caller whenever the module-level
  // cache updates.  We never read this value — it just forces a render.
  const [, bump] = useState(0);

  useEffect(() => {
    const listener = () => bump((n) => n + 1);
    listeners.add(listener);

    // Trigger initial fetch if cache is empty or stale.
    if (Object.keys(cache).length === 0 || Date.now() - lastFetchAt > REFRESH_MS) {
      void fetchFlags();
    }

    // Periodic refresh so kill-switch flips reach live sessions within
    // ~1 minute without the user reloading.
    const id = setInterval(() => void fetchFlags(), REFRESH_MS);

    return () => {
      listeners.delete(listener);
      clearInterval(id);
    };
  }, []);

  const isOn = useCallback(
    (name: string, classCode?: string | null) => isFlagOn(name, classCode),
    []
  );

  const refresh = useCallback(async () => {
    await fetchFlags();
  }, []);

  return {
    ready: Object.keys(cache).length > 0,
    isOn,
    refresh,
    all: cache,
  };
}
