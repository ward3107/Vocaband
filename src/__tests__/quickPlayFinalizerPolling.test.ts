import { afterEach, expect, it, vi } from 'vitest';
import { createQuickPlayFinalizer } from '../utils/quickPlayFinalizer.server';
import { createQuickPlayStore } from '../utils/quickPlayStore.server';

afterEach(() => vi.useRealTimers());
it('checks an empty durable queue at most once per minute after startup', async () => {
  vi.useFakeTimers();
  const evalCommand = vi.fn().mockResolvedValue('[]');
  const finalizer = createQuickPlayFinalizer({ redis: { eval: evalCommand }, store: createQuickPlayStore(), persist: vi.fn(), closed: vi.fn(), warn: vi.fn() });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(evalCommand).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(evalCommand).toHaveBeenCalledTimes(2);
  finalizer.stop();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(evalCommand).toHaveBeenCalledTimes(2);
});
it('backs off repeated Redis quota failures instead of spending a command each second', async () => {
  vi.useFakeTimers();
  const evalCommand = vi.fn().mockRejectedValue(new Error('max requests limit exceeded'));
  const finalizer = createQuickPlayFinalizer({ redis: { eval: evalCommand }, store: createQuickPlayStore(), persist: vi.fn(), closed: vi.fn(), warn: vi.fn() });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(evalCommand.mock.calls.length).toBeLessThanOrEqual(6);
  finalizer.stop();
});
