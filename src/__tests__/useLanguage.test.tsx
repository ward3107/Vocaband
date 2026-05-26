import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLanguage, LANGUAGE_KEY } from '../hooks/useLanguage';

// Resolution rules for the initial UI language (getInitialLanguage):
//   1. ?lang=en|he|ar deep link wins (Google hreflang / SEO).
//   2. A saved HE/AR preference is auto-applied ONLY when a supabase
//      session is persisted (logged-in user keeps their choice).
//   3. Otherwise English — the public landing page is English-first, so a
//      logged-out visitor never inherits a previously saved HE/AR choice.
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

  it('ignores a saved Hebrew choice for a logged-out visitor (English landing)', () => {
    localStorage.setItem(LANGUAGE_KEY, 'he');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');
  });

  it('keeps a saved Hebrew choice when a session is persisted (logged-in)', () => {
    localStorage.setItem(LANGUAGE_KEY, 'he');
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('he');
  });

  it('honors a ?lang=he deep link for a logged-out visitor (SEO)', () => {
    setSearch('?lang=he');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('he');
  });

  it('lets ?lang=ar override a saved Hebrew choice', () => {
    localStorage.setItem(LANGUAGE_KEY, 'he');
    setSearch('?lang=ar');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('ar');
  });
});
