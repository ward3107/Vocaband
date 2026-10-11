import { RedisStore } from 'rate-limit-redis';
import type { Options, Store } from 'express-rate-limit';

// rate-limit-redis caches failed SCRIPT LOAD promises. Initializing lazily and
// discarding a failed instance lets a restored Redis recover without a deploy.
// Requests remain denied while counters are unavailable: never fail open or
// silently replace a shared security limit with independent per-machine RAM.
export function recoveringRateLimitStore(sendCommand: (...args: string[]) => Promise<unknown>, prefix: string): Store {
  let options!: Options;
  let pending: Promise<RedisStore> | undefined;
  let retryAt = 0;
  const unavailable = () => Object.assign(new Error('Rate limit service temporarily unavailable'), { status: 503 });
  const ready = () => {
    pending ??= (async () => {
      const store = new RedisStore({ sendCommand: sendCommand as never, prefix });
      await store.init(options);
      return store;
    })();
    return pending;
  };
  async function run<T>(operation: (store: RedisStore) => Promise<T>): Promise<T> {
    // Traffic during the cooldown must not extend it indefinitely.
    if (Date.now() < retryAt) throw unavailable();
    try { return await operation(await ready()); }
    catch {
      pending = undefined;
      retryAt = Date.now() + 30_000;
      throw unavailable();
    }
  }
  return {
    prefix,
    init(value) { options = value; },
    increment: key => run(store => store.increment(key)),
    decrement: key => run(store => store.decrement(key)),
    resetKey: key => run(store => store.resetKey(key)),
  };
}
