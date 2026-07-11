// @vitest-environment jsdom
//
// Covers the terminal-failure escalation ladder added to chunkReload — the
// counter that decides between an automatic nuclear recovery and giving up
// with a manual reset. The navigation side effects (escalateToKillSwitch /
// reloads) are intentionally NOT exercised here; jsdom can't navigate and the
// counter logic is what carries the behaviour worth pinning down.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  isChunkLoadError,
  recordTerminalChunkFailure,
  resetChunkRecovery,
} from './chunkReload';

const COUNT_KEY = 'vocaband_chunk_terminal_failures';

beforeEach(() => {
  sessionStorage.clear();
});

describe('isChunkLoadError', () => {
  it('matches the per-browser stale-bundle phrasings', () => {
    for (const msg of [
      'Failed to fetch dynamically imported module: https://x/y.js',
      'error loading dynamically imported module',
      'Loading chunk 42 failed',
      'ChunkLoadError',
      'Importing a module script failed',
      'was blocked because of a disallowed MIME type (text/html)',
    ]) {
      expect(isChunkLoadError(new Error(msg))).toBe(true);
    }
  });

  it('ignores unrelated errors and non-Error inputs', () => {
    expect(isChunkLoadError(new Error('TypeError: x is not a function'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('recordTerminalChunkFailure escalation ladder', () => {
  it('auto-recovers for the first two terminal failures, then gives up', () => {
    // Two automatic nuclear attempts...
    expect(recordTerminalChunkFailure()).toBe('recovering');
    expect(recordTerminalChunkFailure()).toBe('recovering');
    // ...then stop looping and hand off to the manual reset UI.
    expect(recordTerminalChunkFailure()).toBe('give-up');
    // Still give-up on any further failure — the cap is sticky.
    expect(recordTerminalChunkFailure()).toBe('give-up');
  });

  it('persists the attempt count across calls (survives a reload)', () => {
    recordTerminalChunkFailure();
    expect(sessionStorage.getItem(COUNT_KEY)).toBe('1');
    recordTerminalChunkFailure();
    expect(sessionStorage.getItem(COUNT_KEY)).toBe('2');
  });

  it('resetChunkRecovery clears the counter so recovery starts fresh', () => {
    recordTerminalChunkFailure();
    recordTerminalChunkFailure();
    expect(recordTerminalChunkFailure()).toBe('give-up');

    // A successful import (lazyWithRetry) calls this — the next unrelated
    // chunk error must not inherit the exhausted count.
    resetChunkRecovery();
    expect(sessionStorage.getItem(COUNT_KEY)).toBeNull();
    expect(recordTerminalChunkFailure()).toBe('recovering');
  });
});
