/**
 * useBackButtonTrap — the mobile History-API trap that keeps the back
 * button inside the app.
 *
 * Goal: mobile back button walks between in-app pages, but NEVER
 * logs out and NEVER exits the app.  The user's dashboard (teacher
 * or student) is the "floor" — pressing back at the dashboard is a
 * no-op; pressing back TWICE there confirms exit.
 *
 * How it works:
 *   1. Every view change pushes a history entry (so back walks back).
 *   2. Login transitions REPLACE the landing entry (so back can't
 *      reach the login screen while logged in).
 *   3. On popstate we check: is the destination safe?  If not (a
 *      login/auth view, or no state at all), block it and re-push
 *      the current view to keep the history stack alive.
 *   4. PAD_COUNT padding entries are pushed on login so the browser
 *      never runs out of history and exits the tab/PWA.
 *
 * Why padding: on Android Chrome the edge-swipe gesture can pop
 * faster than popstate can re-trap, so a single padding entry is
 * not enough — the user escapes into external URLs (Google OAuth,
 * Supabase callback) or stale pre-login entries.  Ten pads plus
 * aggressive re-trapping pins the user at the dashboard floor.
 *
 * Why the explicit `beginExitFlow` output: when the caller wants
 * the exit to really happen (user tapped Leave in the confirm
 * modal), they need to suppress the re-trap for ~500 ms while the
 * app clears auth.  The function wraps the ref + timer + modal
 * close + history reset so the caller just has to do signOut.
 */
import { useCallback, useEffect, useRef } from 'react';
import { supabase, hasTeacherAccess, type AppUser } from '../core/supabase';
import type { View } from '../core/views';

// Views that a logged-in user should never land on via back button.
// If popstate would navigate to one of these, we block it.
const AUTH_VIEWS = new Set<string>([
  'landing', 'public-landing', 'student-account-login',
  'student-pending-approval', 'oauth-class-code', 'oauth-callback',
]);

// Views safe to land on when there is NO authenticated user. Used to
// reject popstate back-navigation into a pre-logout private view (e.g.
// game-active, teacher-dashboard) — window.location.replace('/') on
// logout swaps only the current history entry, leaving the previous
// dashboard / game-active entries reachable via the back button.
// Without this guard a teacher pressing back from the landing page
// would get dropped into the last quiz they were previewing.
const PUBLIC_VIEWS = new Set<string>([
  'landing', 'public-landing', 'public-terms', 'public-privacy',
  'public-security', 'public-free-resources', 'public-interactive-worksheet',
  'public-status', 'accessibility-statement', 'teacher-login',
  'student-account-login', 'student-pending-approval',
  'oauth-class-code', 'oauth-callback',
]);

// Number of padding entries pushed beneath the dashboard.
const PAD_COUNT = 10;

// Window (ms) during which popstate is not re-trapped after an
// explicit leave intent is signaled.  Gives SIGNED_OUT a tick to
// propagate before the guard releases.
const EXIT_INTENT_WINDOW_MS = 500;

export interface UseBackButtonTrapParams {
  view: View;
  setView: React.Dispatch<React.SetStateAction<View>>;
  user: AppUser | null;
  showExitConfirmModal: boolean;
  setShowExitConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  /** Shared with the auth restore flow; when true, popstate treats
   *  the user as "present" and re-traps to avoid escaping during
   *  the ~500 ms restore window after a fresh mount. */
  restoreInProgressRef: React.MutableRefObject<boolean>;
}

export interface UseBackButtonTrapApi {
  /**
   * Suppress the popstate re-trap for ~500 ms and reset history to
   * the public-landing entry.  The caller is responsible for
   * clearing auth (the hook stays agnostic of the auth client).
   * Closes the exit-confirm modal if it was open.
   */
  beginExitFlow: () => void;
}

export function useBackButtonTrap(
  params: UseBackButtonTrapParams,
): UseBackButtonTrapApi {
  const {
    view,
    setView,
    user,
    showExitConfirmModal,
    setShowExitConfirmModal,
    restoreInProgressRef,
  } = params;

  // ─── Internal refs ─────────────────────────────────────────────────
  const isPopStateNavRef = useRef(false);
  const exitIntentRef = useRef(false);
  const exitModalOpenRef = useRef(false);
  const viewRef = useRef(view);
  const userRef = useRef(user);

  // Mirror reactive inputs into refs so the popstate handler (attached
  // once with [] deps) always sees the latest values without a
  // closure re-attach.
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => {
    exitModalOpenRef.current = showExitConfirmModal;
  }, [showExitConfirmModal]);

  // The "home" view for each role — back button cannot go past this.
  const getHomeView = (): string =>
    hasTeacherAccess(userRef.current) ? 'teacher-dashboard' : 'student-dashboard';

  // Push a full dashboard trap: refill the pad buffer, then push the
  // dashboard on top.  Called on login transitions and whenever a pad
  // entry is popped so the buffer is always replenished.
  const pushDashboardTrap = useCallback(() => {
    const v = viewRef.current;
    window.history.replaceState({ view: v, _pad: true }, '');
    for (let i = 1; i < PAD_COUNT; i++) {
      window.history.pushState({ view: v, _pad: true }, '');
    }
    window.history.pushState({ view: v }, '');
  }, []);

  // ─── First mount: seed the history stack with the real view ───────
  useEffect(() => {
    window.history.replaceState({ view }, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── On view change: push a history entry ─────────────────────────
  useEffect(() => {
    if (isPopStateNavRef.current) {
      isPopStateNavRef.current = false;
      return;
    }
    const isDashboard = view === 'teacher-dashboard' || view === 'student-dashboard';
    const currentStateView = (window.history.state as { view?: string } | null)?.view ?? '';
    const comingFromAuth = AUTH_VIEWS.has(currentStateView);

    // Login transition: replace the landing/auth entry with a pad
    // buffer, then push the dashboard on top.
    if (userRef.current && isDashboard && comingFromAuth) {
      pushDashboardTrap();
      return;
    }

    // Normal in-app navigation — single pushState so the back button
    // walks naturally between pages (dashboard ← wizard, etc.).
    window.history.pushState({ view }, '');
  }, [view, pushDashboardTrap]);

  // ─── The popstate handler — attached once on mount ────────────────
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { view?: string; _pad?: boolean } | null;
      const prevView = state?.view;
      const isPad = state?._pad === true;
      const currentUser = userRef.current;
      const currentView = viewRef.current;

      // Guard 0: the user tapped "Leave" — let the browser actually
      // navigate out.  Do not re-trap.
      if (exitIntentRef.current) return;

      // Guard 1: auth is still being restored.  Treat as "user
      // present" and re-push so the back button doesn't accidentally
      // escape during the ~500 ms restore window after a fresh mount.
      if (restoreInProgressRef.current) {
        window.history.pushState({ view: currentView }, '');
        return;
      }

      const home = currentUser ? getHomeView() : null;
      const atDashboardFloor = !!currentUser && currentView === home;

      // CASE A: at dashboard floor, ANY back press re-traps and shows
      //         the exit confirmation.  We never navigate away from
      //         the dashboard via popstate — it's an absolute floor.
      //
      //         Double-back behaviour differs by role:
      //         - Teachers / guests: second back while modal open =
      //           "yes, really leave" → signOut + public landing.
      //         - Students: second back is treated as "Stay" — the
      //           modal closes, no signout.  Real exit requires
      //           tapping the explicit "Switch class" link in the
      //           friendly soft-landing modal.  Kids 9–14 frequently
      //           mash back; auto-signout on the second tap throws
      //           them out of their session even though the modal
      //           was supposed to be the safety net.
      const isStudent = currentUser?.role === 'student';
      if (atDashboardFloor) {
        if (exitModalOpenRef.current) {
          if (isStudent) {
            setShowExitConfirmModal(false);
            pushDashboardTrap();
            return;
          }
          setShowExitConfirmModal(false);
          exitIntentRef.current = true;
          supabase.auth.signOut().catch(() => {});
          try { window.history.replaceState({ view: 'public-landing' }, ''); } catch {}
          setTimeout(() => { exitIntentRef.current = false; }, EXIT_INTENT_WINDOW_MS);
          return;
        }
        pushDashboardTrap();
        setShowExitConfirmModal(true);
        return;
      }

      // CASE B: logged-in user NOT at dashboard, but back would go to
      //         a login/auth view — block it (re-push current view).
      if (currentUser && (!prevView || AUTH_VIEWS.has(prevView))) {
        window.history.pushState({ view: currentView }, '');
        return;
      }

      // CASE C: normal in-app back navigation between real views
      //         (e.g., create-assignment → teacher-dashboard).
      if (prevView && !isPad) {
        // After logout the hard reload only replaces the current
        // history entry; pre-logout dashboard / game-active entries
        // remain reachable via back. Block any back-press that would
        // restore a private view when there's no user.
        if (!currentUser && !PUBLIC_VIEWS.has(prevView)) {
          window.history.pushState({ view: currentView }, '');
          return;
        }
        isPopStateNavRef.current = true;
        setView(prevView as View);
        return;
      }

      // CASE D: defensive block (no state, or pad below a non-dashboard
      //         view — shouldn't happen, but re-push to stay safe).
      window.history.pushState({ view: currentView }, '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Public exit-intent trigger ───────────────────────────────────
  const beginExitFlow = useCallback(() => {
    setShowExitConfirmModal(false);
    exitIntentRef.current = true;
    try { window.history.replaceState({ view: 'public-landing' }, ''); } catch {}
    setTimeout(() => { exitIntentRef.current = false; }, EXIT_INTENT_WINDOW_MS);
  }, [setShowExitConfirmModal]);

  return { beginExitFlow };
}
