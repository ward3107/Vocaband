/**
 * useCookieConsent — owns the cookie banner's open-state + accept /
 * reject / customise handlers, extracted from App.tsx.
 *
 * Returns:
 *   - `showCookieBanner` — true until the user has stored a consent
 *     record in localStorage. Rendered by the CookieBanner overlay.
 *   - `handleCookieAccept(preferences?)` — "Accept all" or preferences
 *     passed from the Customize dialog. Persists to localStorage under
 *     `vocaband_cookie_consent`, fires `vocaband:consent-changed`, and
 *     hides the banner.
 *   - `handleCookieReject()` — explicit "Reject all" path that only
 *     allows essential cookies. Required for GDPR (EDPB Guidelines
 *     03/2022: rejecting must be as easy as accepting).
 *   - `handleCookieCustomize(preferences)` — thin alias that routes
 *     through handleCookieAccept with the picked preferences.
 *
 * The `vocaband:consent-changed` CustomEvent is the signal that lets
 * deferred-init telemetry (Sentry, Web Analytics) wake up the moment
 * the user opts in — without forcing a page reload.
 */
import { useCallback, useState } from "react";
import type { CookiePreferences } from "../components/CookieBanner";

const STORAGE_KEY = "vocaband_cookie_consent";
const CHANGE_EVENT = "vocaband:consent-changed";

/**
 * Read the current consent record from localStorage. Returns null if
 * the user has not made a choice yet, or an object with the three
 * category flags if they have.  Safe to call before React mounts —
 * `main.tsx` uses this to decide whether to defer-load Sentry.
 */
export function getCookieConsent(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Defensive shape check — old format compatibility.
    if (typeof parsed?.essential !== "boolean") return null;
    return {
      essential: true,
      analytics: !!parsed.analytics,
      functional: !!parsed.functional,
    };
  } catch {
    return null;
  }
}

function persistAndNotify(preferences: CookiePreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (e) {
    console.error("[Cookie Banner] Failed to save consent:", e);
  }
  // Fire a CustomEvent so deferred-init modules (Sentry) can wake up
  // immediately on opt-in without forcing a page reload.  Wrapped in
  // try/catch because some environments (older Safari, jsdom in
  // tests) don't expose CustomEvent on `window`.
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preferences }));
  } catch { /* not critical */ }
}

export function useCookieConsent() {
  const [showCookieBanner, setShowCookieBanner] = useState(() => getCookieConsent() === null);

  const handleCookieAccept = useCallback((eventOrPreferences?: CookiePreferences | React.MouseEvent) => {
    // Ignore React events — they were accidentally passed before the fix.
    const preferences = eventOrPreferences && typeof eventOrPreferences === "object" && "nativeEvent" in eventOrPreferences
      ? undefined
      : eventOrPreferences as CookiePreferences | undefined;

    const resolved: CookiePreferences = preferences ?? { essential: true, analytics: true, functional: true };
    persistAndNotify(resolved);
    setShowCookieBanner(false);
  }, []);

  const handleCookieReject = useCallback(() => {
    persistAndNotify({ essential: true, analytics: false, functional: false });
    setShowCookieBanner(false);
  }, []);

  const handleCookieCustomize = useCallback((preferences: CookiePreferences) => {
    handleCookieAccept(preferences);
  }, [handleCookieAccept]);

  return { showCookieBanner, handleCookieAccept, handleCookieReject, handleCookieCustomize };
}
