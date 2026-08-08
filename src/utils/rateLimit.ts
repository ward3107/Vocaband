// Simple rolling-window rate limiter. Pure function factory — pass `now`
// explicitly so tests are deterministic and callers can inject their own
// clock (server-side uses Date.now(); tests use fixed integers).
export function createRateLimiter(maxCalls: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  function tryConsume(key: string, now: number): boolean {
    const cutoff = now - windowMs;
    const history = (hits.get(key) ?? []).filter((t) => t > cutoff);
    if (history.length >= maxCalls) {
      hits.set(key, history);
      return false;
    }
    history.push(now);
    hits.set(key, history);
    return true;
  }

  return { tryConsume };
}
