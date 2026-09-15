import { describe, it, expect } from 'vitest';
import { createLiveScoreStore } from '../utils/liveScoreStore';

describe('live challenge score continuity', () => {
  it('restores 20 on rejoin and accepts the next answer at 30', async () => {
    const store = createLiveScoreStore();
    expect(await store.join('A', 'student', 0)).toBe(0);
    await store.update('A', 'student', 0, 10);
    await store.update('A', 'student', 0, 20);
    expect(await store.join('A', 'student', 0)).toBe(20);
    expect(await store.update('A', 'student', 0, 30)).toBe(30);
  });
  it('isolates classes, students and completed-progress baselines', async () => {
    const store = createLiveScoreStore();
    await store.join('A', 'student', 0);
    await store.update('A', 'student', 0, 10);
    expect(await store.join('B', 'student', 0)).toBe(0);
    expect(await store.join('A', 'other', 0)).toBe(0);
    expect(await store.join('A', 'student', 10)).toBe(0);
  });
  it('rejects jumps, regressions, invalid scores and updates without a join', async () => {
    const store = createLiveScoreStore();
    expect(await store.update('A', 'student', 0, 10)).toBeNull();
    await store.join('A', 'student', 0);
    for (const score of [20, -1, NaN, Infinity, 10001]) {
      expect(await store.update('A', 'student', 0, score)).toBeNull();
    }
    await store.update('A', 'student', 0, 10);
    expect(await store.update('A', 'student', 0, 0)).toBeNull();
    expect(await store.update('A', 'student', 0, 10)).toBe(10);
  });
  it('expires inactive scores and starts a fresh bounded record', async () => {
    let now = 0;
    const store = createLiveScoreStore(undefined, () => now);
    await store.join('A', 'student', 0);
    await store.update('A', 'student', 0, 10);
    now = 15 * 60 * 1000;
    expect(await store.update('A', 'student', 0, 20)).toBeNull();
    expect(await store.join('A', 'student', 0)).toBe(0);
  });
  it('fails closed when configured shared storage fails', async () => {
    const store = createLiveScoreStore({ eval: async () => { throw new Error('unavailable'); } });
    await expect(store.join('A', 'student', 0)).rejects.toThrow('unavailable');
    await expect(store.update('A', 'student', 0, 10)).rejects.toThrow('unavailable');
  });
});
