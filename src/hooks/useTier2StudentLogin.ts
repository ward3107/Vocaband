import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { View } from "../core/views";
import {
  supabase,
  type AppUser,
  type AssignmentData,
  type ProgressData,
} from "../core/supabase";
import { studentLoginViaServer } from "../api/studentLogin";

/**
 * Tier-2 fast student login.
 *
 * Extracted verbatim from App.tsx to keep the orchestrator lean and to give
 * this auth-sensitive flow a single, testable home. The logic — server-side
 * bootstrap, guarded setSession, direct dashboard hydration, and fallback to
 * the normal restore on any failure — is unchanged; only its location moved.
 */
export function useTier2StudentLogin(deps: {
  manualLoginInProgressRef: MutableRefObject<boolean>;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
  checkConsent: (userData: AppUser) => void;
  setStudentAssignments: Dispatch<SetStateAction<AssignmentData[]>>;
  setStudentProgress: Dispatch<SetStateAction<ProgressData[]>>;
  setBadges: Dispatch<SetStateAction<string[]>>;
  setXp: Dispatch<SetStateAction<number>>;
  setCoins: Dispatch<SetStateAction<number>>;
  setStreak: Dispatch<SetStateAction<number>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setView: Dispatch<SetStateAction<View>>;
}) {
  const {
    manualLoginInProgressRef,
    setUser,
    checkConsent,
    setStudentAssignments,
    setStudentProgress,
    setBadges,
    setXp,
    setCoins,
    setStreak,
    setLoading,
    setView,
  } = deps;

  return useCallback(
    async (email: string, pin: string): Promise<'ok' | 'invalid' | 'fallback'> => {
      // User-local YYYY-MM-DD — drives the bootstrap's daily-missions / pet rollover.
      const localDate = new Intl.DateTimeFormat('sv-SE').format(new Date());
      // Suppress the onAuthStateChange restore that setSession() will fire —
      // we hydrate directly from the server's bootstrap payload instead, so
      // we don't pay the very client-side hops this endpoint exists to remove.
      manualLoginInProgressRef.current = true;
      try {
        const result = await studentLoginViaServer({ email, pin, localDate });
        if (result.kind === 'invalid') return 'invalid';
        if (result.kind === 'unavailable') return 'fallback';
        // Need a usable student dashboard payload to safely skip the client
        // restore. If the server's bootstrap failed (null/non-ok/non-student),
        // fall back to the direct path (which runs the normal restore) rather
        // than landing the student on an empty dashboard.
        const boot = result.bootstrap;
        if (!boot || boot.status !== 'ok' || !boot.user || boot.user.role !== 'student') {
          return 'fallback';
        }
        const { error: setErr } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
        if (setErr) return 'fallback';
        // Hydrate exactly what restoreSession's student branch would have set.
        setUser(boot.user);
        checkConsent(boot.user);
        setStudentAssignments(boot.assignments);
        setStudentProgress(boot.progress);
        setBadges(boot.user.badges || []);
        setXp(boot.user.xp ?? 0);
        setCoins(boot.user.coins ?? 0);
        setStreak(boot.user.streak ?? 0);
        setLoading(false);
        setView('student-dashboard');
        return 'ok';
      } catch {
        return 'fallback';
      } finally {
        // Release the guard on the next tick so the SIGNED_IN event already
        // queued by setSession() is skipped, while future events (token
        // refresh, sign-out) are handled normally.
        setTimeout(() => { manualLoginInProgressRef.current = false; }, 0);
      }
    },
    [manualLoginInProgressRef, setUser, checkConsent, setStudentAssignments,
     setStudentProgress, setBadges, setXp, setCoins, setStreak, setLoading, setView],
  );
}
