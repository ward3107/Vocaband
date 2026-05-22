/**
 * serverLog.test.ts — privacy-safe console wrapper for the Fly.io
 * server (audit finding C-2: PII in logs).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installScrubbingConsole,
  uninstallScrubbingConsole,
  hashUid,
  redactEmail,
} from '../utils/serverLog';

describe('redactEmail', () => {
  it('keeps the domain but drops the local-part', () => {
    expect(redactEmail('alice@example.com')).toBe('[email:example.com]');
  });

  it('handles subdomains', () => {
    expect(redactEmail('user@mail.school.ac.il')).toBe('[email:mail.school.ac.il]');
  });

  it('falls back to [email] for malformed input', () => {
    expect(redactEmail('not-an-email')).toBe('[email]');
    expect(redactEmail('@nodomain')).toBe('[email]');
    expect(redactEmail('nolocal@')).toBe('[email]');
  });

  it('returns [no-email] for empty / null / wrong type', () => {
    expect(redactEmail('')).toBe('[no-email]');
    expect(redactEmail(null)).toBe('[no-email]');
    expect(redactEmail(undefined)).toBe('[no-email]');
  });
});

describe('hashUid', () => {
  it('produces a stable 8-char hex hash prefixed with `uid:`', () => {
    const out = hashUid('00000000-0000-0000-0000-000000000001');
    expect(out).toMatch(/^uid:[0-9a-f]{8}$/);
  });

  it('returns the same hash for the same uid', () => {
    expect(hashUid('user-123')).toBe(hashUid('user-123'));
  });

  it('returns different hashes for different uids', () => {
    expect(hashUid('user-a')).not.toBe(hashUid('user-b'));
  });

  it('handles missing input', () => {
    expect(hashUid(null)).toBe('uid:none');
    expect(hashUid(undefined)).toBe('uid:none');
    expect(hashUid('')).toBe('uid:none');
  });
});

describe('installScrubbingConsole', () => {
  // Trick: replace console.{log,warn,error} with vi.fn() BEFORE installing.
  // installScrubbingConsole captures whatever's there as `ORIGINAL`, then
  // wraps it. After install, calling console.log('email@x.com') invokes
  // the wrapper, which scrubs, then calls ORIGINAL.log — which is our
  // mock. So our mock receives the scrubbed args.
  type LogFn = (...args: unknown[]) => void;
  let logMock: ReturnType<typeof vi.fn>;
  let warnMock: ReturnType<typeof vi.fn>;
  let errorMock: ReturnType<typeof vi.fn>;
  let origLog: typeof console.log;
  let origWarn: typeof console.warn;
  let origError: typeof console.error;

  beforeEach(() => {
    origLog = console.log;
    origWarn = console.warn;
    origError = console.error;
    logMock = vi.fn();
    warnMock = vi.fn();
    errorMock = vi.fn();
    console.log = logMock as unknown as LogFn;
    console.warn = warnMock as unknown as LogFn;
    console.error = errorMock as unknown as LogFn;
    installScrubbingConsole();
  });

  afterEach(() => {
    uninstallScrubbingConsole();
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
  });

  const joinCalls = (mock: ReturnType<typeof vi.fn>): string =>
    mock.mock.calls.map(args => args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')).join('\n');

  it('strips emails from console.log strings', () => {
    console.log('user is teacher@school.edu');
    const out = joinCalls(logMock);
    expect(out).toContain('[email]');
    expect(out).not.toContain('teacher@school.edu');
  });

  it('strips emails from interpolated template strings', () => {
    const email = 'kid@gmail.com';
    console.log(`[TTS] ${email}: ok`);
    const out = joinCalls(logMock);
    expect(out).toContain('[email]');
    expect(out).not.toContain('kid@gmail.com');
  });

  it('strips JWTs from console.warn', () => {
    const jwt = 'eyJfakeTESTfixture.fakepayload.fakesignature';
    console.warn(`token=${jwt}`);
    const out = joinCalls(warnMock);
    expect(out).toContain('[jwt]');
    expect(out).not.toContain('eyJ');
  });

  it('strips Bearer tokens from console.error', () => {
    console.error('Authorization: Bearer some-token-value');
    const out = joinCalls(errorMock);
    expect(out).toContain('Bearer [redacted]');
  });

  it('preserves Error instances with scrubbed messages and stacks', () => {
    const err = new Error('Save failed for student@example.com');
    console.error(err);
    // The first arg passed to ORIGINAL.error should still be an Error
    // instance (so node's console pretty-printer renders it natively),
    // but its message must be scrubbed.
    const firstArg = errorMock.mock.calls[0]?.[0];
    expect(firstArg).toBeInstanceOf(Error);
    expect((firstArg as Error).message).toContain('[email]');
    expect((firstArg as Error).message).not.toContain('student@example.com');
  });

  it('leaves non-PII content untouched', () => {
    console.log('score=95 mode=classic level=B2');
    const out = joinCalls(logMock);
    expect(out).toContain('score=95 mode=classic level=B2');
  });

  it('is idempotent — calling install twice does not double-wrap', () => {
    installScrubbingConsole();
    installScrubbingConsole();
    console.log('email@test.com');
    const out = joinCalls(logMock);
    expect(out).toContain('[email]');
    expect(out.match(/\[email\]/g)?.length).toBe(1);
  });

  it('strips Supabase publishable / secret keys', () => {
    console.log('using sb_publishable_FAKEtestFIXTURE000000');
    const out = joinCalls(logMock);
    expect(out).toContain('[supabase-key]');
    expect(out).not.toContain('sb_publishable_');
  });

  it('scrubs PII inside object args (e.g. Sentry-style payloads)', () => {
    console.warn('context:', { message: 'failed for user@x.com', Authorization: 'Bearer xyz' });
    const secondArg = warnMock.mock.calls[0]?.[1] as { message: string; Authorization: string };
    expect(secondArg.message).toBe('failed for [email]');
    expect(secondArg.Authorization).toBe('[redacted]');
  });
});
