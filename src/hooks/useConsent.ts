/**
 * useConsent — privacy-policy consent + per-login reminder flow.
 *
 * Two handlers:
 *   - `checkConsent(userData)` — fast-path localStorage lookup.  Sets
 *     `needsConsent` true and `mode` to:
 *       * 'consent'   when the user hasn't accepted PRIVACY_POLICY_VERSION
 *                     (legal gate — requires an "I agree" tick).  Falls
 *                     back to the consent_log table if localStorage was
 *                     cleared so legitimate prior acceptances aren't
 *                     re-prompted.
 *       * 'reminder'  when the user has accepted the current version but
 *                     hasn't dismissed the per-login summary.  No "I
 *                     agree" tick required — purely informational.
 *
 *   - `recordConsent()` — called by the modal's primary action.  When
 *     mode is 'consent', writes the version to localStorage + consent_log.
 *     When `dontShowAgain` is true, also writes the reminder-dismissal
 *     flag.  Clears `needsConsent` either way.
 *
 *   - `reopenReminder()` — called from Privacy Settings View.  Clears
 *     the reminder-dismissal flag and re-triggers the modal so the
 *     user can see the privacy summary on demand.
 */
import { useCallback } from "react";
import { supabase, type AppUser } from "../core/supabase";
import { trackError } from "../errorTracking";
import { PRIVACY_POLICY_VERSION, CLIENT_STORAGE_KEYS } from "../config/privacy-config";

export type ConsentMode = 'consent' | 'reminder';

export interface UseConsentParams {
  user: AppUser | null;
  setNeedsConsent: (v: boolean) => void;
  setConsentChecked: (v: boolean) => void;
  setConsentMode: (m: ConsentMode) => void;
  setDontShowAgain: (v: boolean) => void;
}

const REMINDER_KEY = CLIENT_STORAGE_KEYS.privacyReminderDismissed;

export function useConsent(params: UseConsentParams) {
  const { user, setNeedsConsent, setConsentChecked, setConsentMode, setDontShowAgain } = params;

  const checkConsent = useCallback((userData: AppUser) => {
    const accepted = localStorage.getItem('vocaband_consent_version');

    if (accepted !== PRIVACY_POLICY_VERSION) {
      // localStorage missing or stale — check DB before showing the
      // legal-consent gate so a returning user with cleared storage
      // doesn't get re-prompted unnecessarily.
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
              try { localStorage.setItem('vocaband_consent_version', PRIVACY_POLICY_VERSION); } catch { /* ignore */ }
              // Consent is fine — but maybe the per-login reminder still applies.
              maybeShowReminder();
            } else {
              setConsentMode('consent');
              setNeedsConsent(true);
            }
          });
      } else {
        setConsentMode('consent');
        setNeedsConsent(true);
      }
      return;
    }

    // Legal consent already on file — decide whether to surface the
    // per-login reminder.
    maybeShowReminder();

    function maybeShowReminder() {
      const dismissed = localStorage.getItem(REMINDER_KEY);
      if (dismissed === '1') return;
      setConsentMode('reminder');
      setDontShowAgain(false);
      setNeedsConsent(true);
    }
  }, [setNeedsConsent, setConsentMode, setDontShowAgain]);

  const recordConsent = useCallback(async (opts?: { mode: ConsentMode; dontShowAgain: boolean }) => {
    const mode: ConsentMode = opts?.mode ?? 'consent';
    const dontShowAgain = !!opts?.dontShowAgain;

    if (mode === 'consent') {
      localStorage.setItem('vocaband_consent_version', PRIVACY_POLICY_VERSION);
      if (user?.uid) {
        try {
          await supabase.from('consent_log').insert({
            uid: user.uid,
            policy_version: PRIVACY_POLICY_VERSION,
            terms_version: PRIVACY_POLICY_VERSION,
            action: 'accept',
          });
        } catch {
          trackError('Could not persist consent to database', 'database', 'low', { uid: user?.uid });
        }
      }
    }

    if (dontShowAgain) {
      try { localStorage.setItem(REMINDER_KEY, '1'); } catch { /* ignore */ }
    }

    setNeedsConsent(false);
    setConsentChecked(false);
    setDontShowAgain(false);
  }, [user, setNeedsConsent, setConsentChecked, setDontShowAgain]);

  const reopenReminder = useCallback(() => {
    try { localStorage.removeItem(REMINDER_KEY); } catch { /* ignore */ }
    setConsentMode('reminder');
    setDontShowAgain(false);
    setNeedsConsent(true);
  }, [setConsentMode, setDontShowAgain, setNeedsConsent]);

  return { checkConsent, recordConsent, reopenReminder };
}
