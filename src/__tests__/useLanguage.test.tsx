import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLanguage, LANGUAGE_KEY } from '../hooks/useLanguage';

// Resolution rule for the initial UI language (getInitialLanguage):
//   ALWAYS English. The browser/device language, any previously saved
//   choice, and the ?lang= deep-link param are all deliberately ignored.
//   Hebrew/Arabic are reachable only via the in-app toggle, and that
//   choice is session-only — a reload/re-mount returns to English.
const SESSION_KEY = 'sb-testproject-auth-token';

function setSearch(search: string) {
  window.history.replaceState({}, '', search ? `/${search}` : '/');
}

describe('useLanguage — initial language resolution', () => {
  beforeEach(() => {
    localStorage.clear();
    setSearch('');
  });

  afterEach(() => {
    localStorage.clear();
    setSearch('');
  });

  it('defaults to English for a brand-new visitor', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');
  });

  it('ignores a saved Hebrew choice (logged-out)', () => {
    localStorage.setItem(LANGUAGE_KEY, 'he');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');
  });

  it('ignores a saved Hebrew choice even when a session is persisted (logged-in)', () => {
    localStorage.setItem(LANGUAGE_KEY, 'he');
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');
  });

  it('ignores a ?lang=he deep link', () => {
    setSearch('?lang=he');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');
  });

  it('lets an explicit in-app toggle change the language for the session', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');

    act(() => result.current.setLanguage('he'));

    expect(result.current.language).toBe('he');
    expect(result.current.isRTL).toBe(true);
    expect(result.current.dir).toBe('rtl');
  });

  it('resets to English on a reload/re-mount, even after a toggle', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage('he'));
    expect(result.current.language).toBe('he');

    // A fresh mount simulates a page reload — the saved 'he' is not read
    // back, so the language snaps to English again.
    const { result: remount } = renderHook(() => useLanguage());
    expect(remount.current.language).toBe('en');
  });
});
