import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useLanguage, LANGUAGE_KEY } from '../hooks/useLanguage';

// Resolution rule for the initial UI language (getInitialLanguage):
//   ALWAYS English. The browser/device language, any previously saved
//   choice, and the ?lang= deep-link param are all deliberately ignored.
//   Hebrew/Arabic are reachable only via the in-app toggle, and that
//   choice is session-only — a full reload initializes the module in English.
//   A newly mounted component inside the current session keeps that choice.
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
    vi.restoreAllMocks();
    const reset = renderHook(() => useLanguage());
    act(() => reset.result.current.setLanguage('en'));
    cleanup();
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

  it('keeps an explicit language choice when the next login step mounts', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage('he'));
    expect(result.current.language).toBe('he');

    // A new PIN card is an SPA mount, not a browser reload. It must use
    // the same language as the class-entry instructions around it.
    const { result: remount } = renderHook(() => useLanguage());
    expect(remount.current.language).toBe('he');
  });
  it('lets students select a readable language even when device storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage('ar'));
    expect(result.current.language).toBe('ar');
    expect(result.current.dir).toBe('rtl');
  });
});
