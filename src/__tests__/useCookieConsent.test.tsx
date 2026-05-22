/**
 * useCookieConsent.test.ts — cookie banner consent persistence + event
 * emission (audit finding C-4).
 *
 * Validates the GDPR-compliant defaults:
 *  - no consent stored ⇒ banner shows, getCookieConsent returns null
 *  - "Reject All" persists {essential:true, analytics:false, functional:false}
 *  - "Accept All" persists {essential:true, analytics:true, functional:true}
 *  - Each persistence fires a `vocaband:consent-changed` CustomEvent so
 *    deferred-init telemetry (Sentry) can wake up on opt-in.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getCookieConsent, useCookieConsent } from '../hooks/useCookieConsent';

const STORAGE_KEY = 'vocaband_cookie_consent';
const CHANGE_EVENT = 'vocaband:consent-changed';

describe('getCookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no record is stored', () => {
    expect(getCookieConsent()).toBeNull();
  });

  it('parses a valid record', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, analytics: true, functional: false }));
    expect(getCookieConsent()).toEqual({ essential: true, analytics: true, functional: false });
  });

  it('returns null on malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{');
    expect(getCookieConsent()).toBeNull();
  });

  it('returns null on a record missing required keys', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ something: 'else' }));
    expect(getCookieConsent()).toBeNull();
  });

  it('coerces missing optional keys to false (defensive defaults)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true }));
    expect(getCookieConsent()).toEqual({ essential: true, analytics: false, functional: false });
  });
});

describe('useCookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the banner when no consent is stored', () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.showCookieBanner).toBe(true);
  });

  it('hides the banner when consent IS stored', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, analytics: false, functional: false }));
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.showCookieBanner).toBe(false);
  });

  it('handleCookieAccept (no args) persists all-true and hides banner', () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => { result.current.handleCookieAccept(); });
    expect(result.current.showCookieBanner).toBe(false);
    expect(getCookieConsent()).toEqual({ essential: true, analytics: true, functional: true });
  });

  it('handleCookieReject persists only essential and hides banner', () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => { result.current.handleCookieReject(); });
    expect(result.current.showCookieBanner).toBe(false);
    expect(getCookieConsent()).toEqual({ essential: true, analytics: false, functional: false });
  });

  it('handleCookieCustomize persists the picked preferences', () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => { result.current.handleCookieCustomize({ essential: true, analytics: true, functional: false }); });
    expect(getCookieConsent()).toEqual({ essential: true, analytics: true, functional: false });
  });

  it('emits vocaband:consent-changed when accepting', () => {
    const listener = vi.fn();
    window.addEventListener(CHANGE_EVENT, listener);
    const { result } = renderHook(() => useCookieConsent());
    act(() => { result.current.handleCookieAccept(); });
    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ essential: true, analytics: true, functional: true });
    window.removeEventListener(CHANGE_EVENT, listener);
  });

  it('emits vocaband:consent-changed when rejecting', () => {
    const listener = vi.fn();
    window.addEventListener(CHANGE_EVENT, listener);
    const { result } = renderHook(() => useCookieConsent());
    act(() => { result.current.handleCookieReject(); });
    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ essential: true, analytics: false, functional: false });
    window.removeEventListener(CHANGE_EVENT, listener);
  });

  it('emits vocaband:consent-changed when customising', () => {
    const listener = vi.fn();
    window.addEventListener(CHANGE_EVENT, listener);
    const { result } = renderHook(() => useCookieConsent());
    act(() => { result.current.handleCookieCustomize({ essential: true, analytics: false, functional: true }); });
    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ essential: true, analytics: false, functional: true });
    window.removeEventListener(CHANGE_EVENT, listener);
  });

  it('ignores a React MouseEvent passed as the preferences arg (legacy quirk)', () => {
    const { result } = renderHook(() => useCookieConsent());
    const fakeEvent = { nativeEvent: {}, currentTarget: {} } as unknown as React.MouseEvent;
    act(() => { result.current.handleCookieAccept(fakeEvent); });
    // Should fall back to "Accept All" defaults rather than persisting the event object.
    expect(getCookieConsent()).toEqual({ essential: true, analytics: true, functional: true });
  });
});
