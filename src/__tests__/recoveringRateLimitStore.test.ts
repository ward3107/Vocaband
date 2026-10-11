import { afterEach, expect, it, vi } from 'vitest';
import type { Options } from 'express-rate-limit';
import { recoveringRateLimitStore } from '../utils/recoveringRateLimitStore.server';

afterEach(() => vi.useRealTimers());
it('fails closed, bounds retries and reloads scripts after quota recovery', async () => {
  vi.useFakeTimers();
  const send = vi.fn<(...args: string[]) => Promise<unknown>>().mockRejectedValue(new Error('ERR max requests limit exceeded'));
  const store = recoveringRateLimitStore(send, 'rl:test:');
  await store.init!({ windowMs: 60_000 } as Options);
  expect(send).not.toHaveBeenCalled();
  await expect(store.increment('client')).rejects.toMatchObject({ status: 503 });
  const calls = send.mock.calls.length;
  await vi.advanceTimersByTimeAsync(20_000);
  await expect(store.increment('client')).rejects.toMatchObject({ status: 503 });
  expect(send).toHaveBeenCalledTimes(calls);
  send.mockImplementation(async (...args) => args[0] === 'SCRIPT' ? 'loaded-script' : [1, 60_000]);
  await vi.advanceTimersByTimeAsync(10_001);
  await expect(store.increment('client')).resolves.toMatchObject({ totalHits: 1 });
  expect(send.mock.calls.some(args => args.includes('rl:test:client'))).toBe(true);
});
