import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../utils/rateLimit';

describe('createRateLimiter', () => {
  it('allows calls under the cap', () => {
    const rl = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      expect(rl.tryConsume('u1', 1000 + i)).toBe(true);
    }
  });

  it('rejects the 6th call within the window', () => {
    const rl = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) rl.tryConsume('u1', 1000 + i);
    expect(rl.tryConsume('u1', 1005)).toBe(false);
  });

  it('re-allows after the window slides', () => {
    const rl = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) rl.tryConsume('u1', 1000 + i);
    expect(rl.tryConsume('u1', 61_100)).toBe(true);
  });

  it('tracks keys independently', () => {
    const rl = createRateLimiter(2, 60_000);
    rl.tryConsume('u1', 1000);
    rl.tryConsume('u1', 1001);
    expect(rl.tryConsume('u1', 1002)).toBe(false);
    expect(rl.tryConsume('u2', 1003)).toBe(true);
  });

  it('is empty-history-safe', () => {
    const rl = createRateLimiter(5, 60_000);
    expect(rl.tryConsume('new', 1000)).toBe(true);
  });
});
