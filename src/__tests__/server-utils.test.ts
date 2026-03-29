import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isValidClassCode,
  isValidName,
  isValidUid,
  isValidToken,
  createSocketRateLimiter,
  VALIDATION,
} from '../server-utils';

// ─── isValidClassCode ───────────────────────────────────────────────────────

describe('isValidClassCode', () => {
  it('accepts a normal class code', () => {
    expect(isValidClassCode('ABC123')).toBe(true);
  });

  it('accepts a single-character code (min length)', () => {
    expect(isValidClassCode('A')).toBe(true);
  });

  it('accepts a code at max length (64 chars)', () => {
    expect(isValidClassCode('a'.repeat(64))).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidClassCode('')).toBe(false);
  });

  it('rejects string exceeding max length', () => {
    expect(isValidClassCode('a'.repeat(65))).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidClassCode(123)).toBe(false);
    expect(isValidClassCode(null)).toBe(false);
    expect(isValidClassCode(undefined)).toBe(false);
    expect(isValidClassCode({})).toBe(false);
    expect(isValidClassCode(true)).toBe(false);
  });
});

// ─── isValidName ────────────────────────────────────────────────────────────

describe('isValidName', () => {
  it('accepts a normal name', () => {
    expect(isValidName('Alice')).toBe(true);
  });

  it('accepts Hebrew name', () => {
    expect(isValidName('אליס')).toBe(true);
  });

  it('accepts Arabic name', () => {
    expect(isValidName('أليس')).toBe(true);
  });

  it('accepts name with spaces', () => {
    expect(isValidName('Alice Smith')).toBe(true);
  });

  it('accepts single-character name', () => {
    expect(isValidName('A')).toBe(true);
  });

  it('accepts name at max length (100 chars)', () => {
    expect(isValidName('a'.repeat(100))).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidName('')).toBe(false);
  });

  it('rejects name exceeding max length', () => {
    expect(isValidName('a'.repeat(101))).toBe(false);
  });

  it('rejects name with control characters (null byte)', () => {
    expect(isValidName('Alice\x00')).toBe(false);
  });

  it('rejects name with newline', () => {
    expect(isValidName('Alice\n')).toBe(false);
  });

  it('rejects name with tab', () => {
    expect(isValidName('Alice\t')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidName(42)).toBe(false);
    expect(isValidName(null)).toBe(false);
    expect(isValidName(undefined)).toBe(false);
  });
});

// ─── isValidUid ─────────────────────────────────────────────────────────────

describe('isValidUid', () => {
  it('accepts a UUID-like string', () => {
    expect(isValidUid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts single character', () => {
    expect(isValidUid('a')).toBe(true);
  });

  it('accepts uid at max length (128 chars)', () => {
    expect(isValidUid('x'.repeat(128))).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUid('')).toBe(false);
  });

  it('rejects uid exceeding max length', () => {
    expect(isValidUid('x'.repeat(129))).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidUid(123)).toBe(false);
    expect(isValidUid(null)).toBe(false);
    expect(isValidUid(undefined)).toBe(false);
  });
});

// ─── isValidToken ───────────────────────────────────────────────────────────

describe('isValidToken', () => {
  it('accepts a normal token string', () => {
    expect(isValidToken('eyJhbGciOiJIUzI1NiJ9.token')).toBe(true);
  });

  it('accepts single character', () => {
    expect(isValidToken('x')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidToken('')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidToken(0)).toBe(false);
    expect(isValidToken(null)).toBe(false);
    expect(isValidToken(undefined)).toBe(false);
    expect(isValidToken(false)).toBe(false);
  });
});

// ─── createSocketRateLimiter ────────────────────────────────────────────────

describe('createSocketRateLimiter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('allows requests up to the max', () => {
    vi.useFakeTimers();
    const limiter = createSocketRateLimiter(60_000, 3, 60_000);
    expect(limiter.checkLimit('ip1')).toBe(true);  // count 1
    expect(limiter.checkLimit('ip1')).toBe(true);  // count 2
    expect(limiter.checkLimit('ip1')).toBe(true);  // count 3
    limiter.shutdown();
  });

  it('blocks after exceeding the max', () => {
    vi.useFakeTimers();
    const limiter = createSocketRateLimiter(60_000, 2, 60_000);
    limiter.checkLimit('ip1'); // count 1
    limiter.checkLimit('ip1'); // count 2
    expect(limiter.checkLimit('ip1')).toBe(false); // blocked
    limiter.shutdown();
  });

  it('tracks different IPs independently', () => {
    vi.useFakeTimers();
    const limiter = createSocketRateLimiter(60_000, 1, 60_000);
    expect(limiter.checkLimit('ip1')).toBe(true);
    expect(limiter.checkLimit('ip1')).toBe(false); // ip1 blocked
    expect(limiter.checkLimit('ip2')).toBe(true);  // ip2 still allowed
    limiter.shutdown();
  });

  it('resets after the time window expires', () => {
    vi.useFakeTimers();
    const limiter = createSocketRateLimiter(1000, 1, 60_000);
    expect(limiter.checkLimit('ip1')).toBe(true);
    expect(limiter.checkLimit('ip1')).toBe(false); // blocked

    vi.advanceTimersByTime(1001); // window expires
    expect(limiter.checkLimit('ip1')).toBe(true);  // allowed again
    limiter.shutdown();
  });

  it('cleanup removes expired entries', () => {
    vi.useFakeTimers();
    const limiter = createSocketRateLimiter(1000, 5, 60_000);
    limiter.checkLimit('ip1');
    limiter.checkLimit('ip2');
    expect(Object.keys(limiter.records)).toHaveLength(2);

    vi.advanceTimersByTime(1001);
    const cleaned = limiter.cleanup();
    expect(cleaned).toBe(2);
    expect(Object.keys(limiter.records)).toHaveLength(0);
    limiter.shutdown();
  });

  it('cleanup does not remove active entries', () => {
    vi.useFakeTimers();
    const limiter = createSocketRateLimiter(60_000, 5, 60_000);
    limiter.checkLimit('ip1');
    const cleaned = limiter.cleanup();
    expect(cleaned).toBe(0);
    expect(Object.keys(limiter.records)).toHaveLength(1);
    limiter.shutdown();
  });

  it('shutdown clears all records and stops interval', () => {
    vi.useFakeTimers();
    const limiter = createSocketRateLimiter(60_000, 5, 60_000);
    limiter.checkLimit('ip1');
    limiter.checkLimit('ip2');
    limiter.shutdown();
    expect(Object.keys(limiter.records)).toHaveLength(0);
  });
});
