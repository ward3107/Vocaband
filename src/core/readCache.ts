// Stale-while-revalidate read cache for dashboard/assignment fetches.
//
// Why: on weak school Wi-Fi, every dashboard mount stalls on a Supabase
// Frankfurt round-trip (60–300 ms+).  Cached classes/assignments render
// instantly while the freshness fetch runs in the background.
//
// Storage: localStorage, mirroring saveQueue.ts's choice — small payloads
// (a teacher's classes + assignments fit in ~10 KB), no IndexedDB
// schema migration headache, and works in private-mode Safari just
// often enough that we don't have to design around it.
//
// Privacy: every key is namespaced by a `userScope` (auth uid).  Two
// students sharing a tablet won't see each other's data even before
// the network confirms — and `clearReadCacheForScope` is invoked on
// logout to scrub stale rows the moment the session ends.

const NAMESPACE = 'vocaband_rc';
const MAX_ENTRY_BYTES = 256 * 1024;       // refuse any single value > 256 KB
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;  // soft ceiling on namespace footprint

interface CacheEntry<T> {
  // Schema version — bump if the shape changes so old entries get ignored.
  v: 1;
  data: T;
  storedAt: number;
}

function storageKey(scope: string, key: string): string {
  return `${NAMESPACE}:${scope}:${key}`;
}

function readEntry<T>(k: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed?.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function namespaceFootprint(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(NAMESPACE + ':')) continue;
      const v = localStorage.getItem(k);
      if (v) total += v.length + k.length;
    }
  } catch { /* best effort */ }
  return total;
}

function evictOldest(): void {
  try {
    const entries: Array<{ key: string; storedAt: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(NAMESPACE + ':')) continue;
      const e = readEntry<unknown>(k);
      if (e) entries.push({ key: k, storedAt: e.storedAt });
    }
    entries.sort((a, b) => a.storedAt - b.storedAt);
    // Drop the oldest 25% so we don't ping-pong on the next write.
    const toEvict = Math.max(1, Math.ceil(entries.length / 4));
    for (let i = 0; i < toEvict; i++) localStorage.removeItem(entries[i].key);
  } catch { /* best effort */ }
}

function writeEntry<T>(k: string, entry: CacheEntry<T>): void {
  try {
    const raw = JSON.stringify(entry);
    if (raw.length > MAX_ENTRY_BYTES) return;
    if (namespaceFootprint() + raw.length > MAX_TOTAL_BYTES) evictOldest();
    localStorage.setItem(k, raw);
  } catch {
    // QuotaExceeded etc. — evict + retry once, then give up silently.
    // The cache is a perf optimisation, not a correctness requirement.
    evictOldest();
    try { localStorage.setItem(k, JSON.stringify(entry)); } catch { /* give up */ }
  }
}

export interface CachedReadOptions<T> {
  /** Per-user namespace — usually the auth uid.  Prevents data leakage
   *  on shared classroom devices when accounts swap. */
  userScope: string;
  /** Freshness window in ms.  Currently informational — the cache always
   *  returns whatever is stored and the network always runs.  Reserved
   *  for a future "skip network if very fresh" optimisation. */
  ttlMs: number;
  /** Called via microtask with the cached value, if any, so the UI can
   *  render before the network fetch resolves. */
  onCacheHit?: (cached: T) => void;
}

/**
 * Stale-while-revalidate read.
 *
 * Behaviour:
 *   1. If a cached entry exists for this scope+key, schedule
 *      `onCacheHit(cached)` as a microtask so the caller's render
 *      happens before any awaited network work.
 *   2. Always invoke `fetcher` to get fresh data from the network.
 *   3. On success: store fresh in cache and resolve with it.
 *   4. On `fetcher` rejection: resolve with the cached value if we
 *      have one, otherwise rethrow so the caller's error path runs.
 *
 * Note: Supabase JS doesn't throw on network errors (it returns
 * `{ data: null, error }`), so the rejection-fallback path mainly
 * covers our own RPC fetchers that may throw on schema mismatches.
 */
export async function cachedRead<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CachedReadOptions<T>,
): Promise<T> {
  const k = storageKey(opts.userScope, key);
  const cached = readEntry<T>(k);

  if (cached && opts.onCacheHit) {
    queueMicrotask(() => {
      try { opts.onCacheHit!(cached.data); } catch { /* swallow — perf path */ }
    });
  }

  try {
    const fresh = await fetcher();
    writeEntry<T>(k, { v: 1, data: fresh, storedAt: Date.now() });
    return fresh;
  } catch (err) {
    if (cached) return cached.data;
    throw err;
  }
}

/** Wipe every cached entry for a given user scope.  Call on logout so
 *  the next teacher/student to sign in on the same device sees nothing
 *  from the previous session. */
export function clearReadCacheForScope(userScope: string): void {
  try {
    const prefix = `${NAMESPACE}:${userScope}:`;
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  } catch { /* best effort */ }
}

/** Wipe the entire read cache.  Reserved for "Reset app" support paths. */
export function clearAllReadCache(): void {
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NAMESPACE + ':')) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  } catch { /* best effort */ }
}
