/**
 * scrubPii.test.ts — PII scrubber for Sentry beforeSend (QA #9).
 *
 * Each rule has a positive test (PII gets scrubbed) and a negative
 * test (look-alike text that isn't PII stays unchanged).
 */
import { describe, it, expect } from 'vitest';
import { scrubPii } from '../utils/scrubPii';

describe('scrubPii — strings', () => {
  it('redacts email addresses', () => {
    expect(scrubPii('error from teacher@vocaband.com loading'))
      .toBe('error from [email] loading');
  });

  it('redacts multiple emails in one string', () => {
    expect(scrubPii('user1@gmail.com and user2@yahoo.co.il failed'))
      .toBe('[email] and [email] failed');
  });

  it('redacts standalone JWT tokens to [jwt]', () => {
    // Obviously-fake JWT (header decodes to gibberish) — keeps the
    // `eyJ` prefix + 3-segment shape that triggers the scrubber's
    // regex without tripping repo-level secret scanners.
    const jwt = 'eyJfakeTESTfixture.fakepayload.fakesignature';
    // Standalone JWT (no Bearer prefix) → tagged as [jwt] so the
    // category is preserved in the issue text.
    expect(scrubPii(`token was ${jwt} when it expired`)).toContain('[jwt]');
    expect(scrubPii(`token was ${jwt} when it expired`)).not.toContain('eyJ');
  });

  it('collapses a JWT carried inside Bearer to [redacted]', () => {
    // Bearer-prefixed JWT → goes through the BEARER rule first
    // (eats the whole `Bearer <token>` pair).  Either category tag
    // is fine for security; this test pins the behaviour so callers
    // know what to expect in stack-trace logs.
    const jwt = 'eyJfakeTESTfixture.fakepayload.fakesignature';
    const out = scrubPii(`Bearer ${jwt} expired`);
    expect(out).toContain('Bearer [redacted]');
    expect(out).not.toContain('eyJ');
  });

  it('redacts bearer tokens (non-JWT format)', () => {
    expect(scrubPii('curl -H "Authorization: Bearer fakeTESTfixture"'))
      .toContain('Bearer [redacted]');
  });

  it('redacts Supabase publishable / secret keys', () => {
    expect(scrubPii('using sb_publishable_FAKEtestFIXTURE000000'))
      .toBe('using [supabase-key]');
    expect(scrubPii('SECRET=sb_secret_FAKEtestFIXTURE000000'))
      .toBe('SECRET=[supabase-key]');
  });

  it('does not touch plain text', () => {
    expect(scrubPii('The student scored 95 in level B2 — well done!'))
      .toBe('The student scored 95 in level B2 — well done!');
  });

  it('does not redact words that merely contain "@" but are not emails', () => {
    // No TLD — not an email.  Preserve as-is.
    expect(scrubPii('npm install @vocaband/core')).toBe('npm install @vocaband/core');
  });

  it('passes through non-string scalars unchanged', () => {
    expect(scrubPii(42)).toBe(42);
    expect(scrubPii(true)).toBe(true);
    expect(scrubPii(null)).toBe(null);
    expect(scrubPii(undefined)).toBe(undefined);
  });
});

describe('scrubPii — object keys', () => {
  it('redacts the value of an Authorization header outright', () => {
    expect(scrubPii({ Authorization: 'Bearer anything-at-all' }))
      .toEqual({ Authorization: '[redacted]' });
  });

  it('redacts case-insensitively', () => {
    expect(scrubPii({ authorization: 'x', Cookie: 'y', 'X-API-Key': 'z' }))
      .toEqual({ authorization: '[redacted]', Cookie: '[redacted]', 'X-API-Key': '[redacted]' });
  });

  it('redacts common sensitive field names (password, secret, token)', () => {
    expect(scrubPii({ password: 'hunter2', secret: 'shh', token: 't', refresh_token: 'r' }))
      .toEqual({ password: '[redacted]', secret: '[redacted]', token: '[redacted]', refresh_token: '[redacted]' });
  });

  it('leaves non-sensitive keys alone', () => {
    expect(scrubPii({ name: 'Sarah', score: 95, mode: 'classic' }))
      .toEqual({ name: 'Sarah', score: 95, mode: 'classic' });
  });

  it('recurses into nested objects', () => {
    expect(scrubPii({
      request: {
        url: 'https://vocaband.com/api',
        headers: { Authorization: 'Bearer xxx', 'Content-Type': 'application/json' },
      },
      message: 'failed for teacher@vocaband.com',
    })).toEqual({
      request: {
        url: 'https://vocaband.com/api',
        headers: { Authorization: '[redacted]', 'Content-Type': 'application/json' },
      },
      message: 'failed for [email]',
    });
  });

  it('recurses into arrays', () => {
    expect(scrubPii(['foo@bar.com', 'plain', { Authorization: 'Bearer t' }]))
      .toEqual(['[email]', 'plain', { Authorization: '[redacted]' }]);
  });
});

describe('scrubPii — Sentry event shape', () => {
  it('handles a realistic Sentry exception payload', () => {
    const event = {
      message: 'Save failed for teacher@school.edu',
      request: {
        url: 'https://vocaband.com/api/save?token=secret-token-here',
        headers: {
          Authorization: 'Bearer eyJhbGciOi.def.ghi',
          'User-Agent': 'Mozilla/5.0',
        },
      },
      breadcrumbs: [
        { category: 'http', data: { url: 'https://x.supabase.co?apikey=sb_publishable_AAA' } },
      ],
    };
    const scrubbed = scrubPii(event) as typeof event;
    expect(scrubbed.message).toBe('Save failed for [email]');
    expect(scrubbed.request.headers.Authorization).toBe('[redacted]');
    expect(scrubbed.request.headers['User-Agent']).toBe('Mozilla/5.0');
    expect(scrubbed.breadcrumbs[0].data.url).toContain('[supabase-key]');
  });
});
