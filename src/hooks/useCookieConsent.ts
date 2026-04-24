/**
 * useCookieConsent — owns the cookie banner's open-state + accept
 * handlers, extracted from App.tsx.
 *
 * Returns:
 *   - `showCookieBanner` — true until the user has stored a consent
 *     record in localStorage. Rendered by the CookieBanner overlay.
 *   - `handleCookieAccept(preferences?)` — "Accept all" or preferences
 *     passed from the Customize dialog. Persists to localStorage under
 *     `vocaband_cookie_consent` and hides the banner.
 *   - `handleCookieCustomize(preferences)` — thin alias that routes
 *     through handleCookieAccept with the picked preferences.
 *
 * Behaviour is identical to the inline App.tsx versions. The quirky
 * React-event guard (hides a bug where a click event used to be
 * accidentally passed as the preferences arg) is preserved verbatim.
 */
import { useCallback, useState } from "react";
import type { CookiePreferences } from "../components/CookieBanner";

export function useCookieConsent() {
  const [showCookieBanner, setShowCookieBanner] = useState(() => {
    try {
      const hasConsented = localStorage.getItem("vocaband_cookie_consent");
      return !hasConsented;
    } catch {
      // Private mode / disabled storage — show the banner; user can
      // dismiss it but we won't be able to persist across reloads.
      return true;
    }
  });

  const handleCookieAccept = useCallback((eventOrPreferences?: CookiePreferences | React.MouseEvent) => {
    // Ignore React events — they were accidentally passed before the fix
    const preferences = eventOrPreferences && typeof eventOrPreferences === 'object' && 'nativeEvent' in eventOrPreferences
      ? undefined
      : eventOrPreferences as CookiePreferences | undefined;

    try {
      const consentData = preferences
        ? JSON.stringify(preferences)
        : JSON.stringify({ essential: true, analytics: true, functional: true });
      localStorage.setItem("vocaband_cookie_consent", consentData);
    } catch (e) {
      console.error('[Cookie Banner] Failed to save consent:', e);
    }
    setShowCookieBanner(false);
  }, []);

  const handleCookieCustomize = useCallback((preferences: CookiePreferences) => {
    handleCookieAccept(preferences);
  }, [handleCookieAccept]);

  return { showCookieBanner, handleCookieAccept, handleCookieCustomize };
}
