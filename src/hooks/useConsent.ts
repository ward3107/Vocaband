/**
 * useConsent — privacy-policy consent flow extracted from App.tsx.
 *
 * Two handlers:
 *   - `checkConsent(userData)` — fast-path localStorage lookup; if the
 *     user hasn't accepted the current PRIVACY_POLICY_VERSION in
 *     localStorage, falls back to the consent_log table (handles
 *     cleared storage). If neither has a record, flips `needsConsent`
 *     on so the banner shows.
 *   - `recordConsent()` — called from the consent banner's "Accept"
 *     button. Writes the current version to localStorage and appends
 *     an audit row to consent_log (best-effort; silent on DB error).
 *     Clears the banner state.
 *
 * Same behaviour as the inline App.tsx versions. Single-purpose hook,
 * tight dependency surface.
 */
import { useCallback } from "react";
import { supabase, type AppUser } from "../core/supabase";
import { trackError } from "../errorTracking";
import { PRIVACY_POLICY_VERSION } from "../config/privacy-config";

export interface UseConsentParams {
  user: AppUser | null;
  setNeedsConsent: (v: boolean) => void;
  setConsentChecked: (v: boolean) => void;
}

export function useConsent(params: UseConsentParams) {
  const { user, setNeedsConsent, setConsentChecked } = params;

  const checkConsent = useCallback((userData: AppUser) => {
    const accepted = localStorage.getItem('vocaband_consent_version');
    if (accepted === PRIVACY_POLICY_VERSION) return;

    // localStorage missing — check DB before showing the banner
    if (userData.uid) {
      supabase
        .from('consent_log')
        .select('policy_version')
        .eq('uid', userData.uid)
        .eq('action', 'accept')
        .eq('policy_version', PRIVACY_POLICY_VERSION)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            // Valid consent found in DB — restore localStorage and skip banner
            try { localStorage.setItem('vocaband_consent_version', PRIVACY_POLICY_VERSION); } catch { /* ignore */ }
          } else {
            setNeedsConsent(true);
          }
        });
    } else {
      setNeedsConsent(true);
    }
  }, [setNeedsConsent]);

  const recordConsent = useCallback(async () => {
    localStorage.setItem('vocaband_consent_version', PRIVACY_POLICY_VERSION);
    // Also persist to the consent_log DB table for compliance/audit trail
    if (user?.uid) {
      try {
        await supabase.from('consent_log').insert({
          uid: user.uid,
          policy_version: PRIVACY_POLICY_VERSION,
          terms_version: PRIVACY_POLICY_VERSION,
          action: 'accept',
        });
      } catch (error) {
        trackError('Could not persist consent to database', 'database', 'low', { uid: user?.uid });
      }
    }
    setNeedsConsent(false);
    setConsentChecked(false);
  }, [user, setNeedsConsent, setConsentChecked]);

  return { checkConsent, recordConsent };
}
