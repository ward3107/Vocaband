/**
 * useApplyStudentTheme.test.tsx — drives the `data-theme-dark` flag that
 * lights up the index.css dark remap for STUDENT shop themes.
 *
 * Guards the rules that keep the student hook from fighting the teacher
 * theme system and the a11y toggle:
 *  - explicit dark theme  ⇒ sets data-theme-dark="true"
 *  - explicit light theme ⇒ never sets the flag (a stray "false" would
 *    disable the a11y toggle, which is gated on :not([data-theme-dark]))
 *  - 'default' (Auto)     ⇒ follows the device prefers-color-scheme, live
 *  - null (teacher/signed-out) ⇒ no-op; never clobbers a teacher's flag
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApplyStudentTheme } from '../hooks/useApplyStudentTheme';

const root = document.documentElement;
const flag = () => root.dataset.themeDark;

// Minimal matchMedia mock with a controllable `matches` + change listeners.
function mockMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    // test helper to flip the OS preference at runtime
    _set(next: boolean) {
      (mql as { matches: boolean }).matches = next;
      listeners.forEach(cb => cb());
    },
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return mql;
}

describe('useApplyStudentTheme', () => {
  beforeEach(() => {
    delete root.dataset.themeDark;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete root.dataset.themeDark;
  });

  it('sets the flag for an explicit dark theme', () => {
    renderHook(() => useApplyStudentTheme('galaxy'));
    expect(flag()).toBe('true');
  });

  it('never sets the flag for an explicit light theme', () => {
    renderHook(() => useApplyStudentTheme('ocean'));
    expect(flag()).toBeUndefined();
  });

  it('clears its own flag when switching dark → light', () => {
    const { rerender } = renderHook(({ id }) => useApplyStudentTheme(id), {
      initialProps: { id: 'neon' },
    });
    expect(flag()).toBe('true');
    rerender({ id: 'sunset' });
    expect(flag()).toBeUndefined();
  });

  it('follows the device preference for the default (Auto) theme', () => {
    mockMatchMedia(true);
    renderHook(() => useApplyStudentTheme('default'));
    expect(flag()).toBe('true');
  });

  it('stays light for default when the device prefers light', () => {
    mockMatchMedia(false);
    renderHook(() => useApplyStudentTheme('default'));
    expect(flag()).toBeUndefined();
  });

  it('reacts live when the OS preference flips', () => {
    const mql = mockMatchMedia(false);
    renderHook(() => useApplyStudentTheme('default'));
    expect(flag()).toBeUndefined();
    mql._set(true);
    expect(flag()).toBe('true');
  });

  it('is a no-op for null (teacher / signed-out) and never clobbers an existing flag', () => {
    root.dataset.themeDark = 'true'; // pretend a teacher palette set it
    renderHook(() => useApplyStudentTheme(null));
    expect(flag()).toBe('true');
  });
});
