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
import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase, hasTeacherAccess, type AppUser } from '../core/supabase';
import type { View } from '../core/views';
import { pathForView } from '../utils/routes';
import { URL_ROUTING_PUSH } from '../utils/urlRouting';
import { modalBackStack } from '../utils/modalBackStack';

// Views that a logged-in user should never land on via back button.
// If popstate would navigate to one of these, we block it.
const AUTH_VIEWS = new Set<string>([
  'landing', 'public-landing', 'student-account-login',
  'oauth-class-code', 'oauth-callback',
]);

// Views safe to land on when there is NO authenticated user. Used to
// reject popstate back-navigation into a pre-logout private view (e.g.
// game-active, teacher-dashboard) — window.location.replace('/') on
// logout swaps only the current history entry, leaving the previous
// dashboard / game-active entries reachable via the back button.
// Without this guard a teacher pressing back from the landing page
// would get dropped into the last quiz they were previewing.
//
// ⚠️ When adding a NEW public-facing view (a marketing page, a new
// legal/help page, an auth screen), add its `View` literal here.
// Otherwise the back trap re-pushes the current entry and a
// logged-out user can't navigate to it via back.  This is the only
// place that needs to be kept in sync with src/core/views.ts.
const PUBLIC_VIEWS = new Set<string>([
  'landing', 'public-landing', 'public-terms', 'public-privacy',
  'public-security', 'public-free-resources', 'public-interactive-worksheet',
  'public-status', 'accessibility-statement', 'teacher-login',
  'student-account-login',
  'oauth-class-code', 'oauth-callback',
]);

// Views whose canonical URL carries a query param (?assignmentId=, ?classId=).
// Their own nav handler pushes the full URL (Slice 5b), so the trap leaves the
// URL alone for them rather than push a param-less path.
const PARAMETRIC_VIEWS = new Set<string>(['class-show', 'worksheet', 'create-assignment']);

// Number of padding entries pushed beneath the dashboard.  Bumped
// from 10 → 20 because Android Chrome's edge-swipe gesture can
// chain-pop entries faster than popstate fires.  Twenty pads give
// the trap enough headroom to catch even rapid swipe-mashing
// before the user escapes the SPA.
const PAD_COUNT = 20;

// Window (ms) during which popstate is not re-trapped after an
// explicit leave intent is signaled.  Gives SIGNED_OUT a tick to
// propagate before the guard releases.
const EXIT_INTENT_WINDOW_MS = 500;

// Window (ms) for the student double-back-to-exit gesture at the
// dashboard floor.  A second hardware-back within this window of the
// first quits the app; a slower second press just re-shows the hint.
// Matches the Android-standard "press back again to exit" timing so a
// kid mashing back accidentally can't trip it, but a deliberate
// double-tap exits like any other Android app.
const DOUBLE_BACK_WINDOW_MS = 2000;

export interface UseBackButtonTrapParams {
  view: View;
  setView: Dispatch<SetStateAction<View>>;
  user: AppUser | null;
  showExitConfirmModal: boolean;
  setShowExitConfirmModal: Dispatch<SetStateAction<boolean>>;
  /** Shared with the auth restore flow; when true, popstate treats
   *  the user as "present" and re-traps to avoid escaping during
   *  the ~500 ms restore window after a fresh mount. */
  restoreInProgressRef: MutableRefObject<boolean>;
  /** Shown on a student's FIRST back-press at the dashboard floor —
   *  the "press back again to exit" hint. The caller wires this to a
   *  toast so the hook stays UI-agnostic. */
  onFloorExitHint: () => void;
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
    onFloorExitHint,
  } = params;

  // ─── Internal refs ─────────────────────────────────────────────────
  const isPopStateNavRef = useRef(false);
  const exitIntentRef = useRef(false);
  const exitModalOpenRef = useRef(false);
  const viewRef = useRef(view);
  const userRef = useRef(user);
  // Timestamp of the student's last back-press at the dashboard floor,
  // for the double-back-to-exit gesture.
  const lastFloorBackRef = useRef(0);
  // Latest hint callback, mirrored so the once-attached popstate
  // handler never calls a stale closure.
  const onFloorExitHintRef = useRef(onFloorExitHint);

  // Mirror reactive inputs into refs so the popstate handler (attached
  // once with [] deps) always sees the latest values without a
  // closure re-attach.
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => {
    exitModalOpenRef.current = showExitConfirmModal;
  }, [showExitConfirmModal]);
  useEffect(() => { onFloorExitHintRef.current = onFloorExitHint; }, [onFloorExitHint]);

  // Tracks the previous `user` value across renders so we can detect
  // the user → null transition (logout) and refill the pad buffer.
  // See the logout-trap useEffect below for the why.
  const prevUserRef = useRef(user);

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
    // Dedicated login URLs (/student, /teacher) and QR / poster deep links
    // (?class=, ?session=) open straight onto a login screen with nothing
    // in the in-app history beneath them, so the hardware back button would
    // exit the app entirely. Seed a public-landing entry underneath the
    // login so back lands on the marketing page instead of leaving.
    if (view === 'student-account-login' || view === 'teacher-login') {
      window.history.replaceState({ view: 'public-landing' }, '');
      window.history.pushState({ view }, '');
    } else {
      window.history.replaceState({ view }, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── On user → null transition (logout): refill the pad buffer ────
  //
  // After the SIGNED_OUT handler replaces the current history entry
  // with public-landing, the back stack still contains everything
  // that was pushed before logout — including the cross-origin
  // Google OAuth URL that the browser navigated through during sign-in.
  // Each in-app back-press pops one entry and the popstate handler
  // re-pushes the current view, but Android Chrome's edge-swipe gesture
  // can chain-pop faster than popstate can fire — and once a cross-
  // origin entry is reached, the browser navigates to it WITHOUT a
  // popstate, dropping the user back into accounts.google.com which
  // re-auths and bounces them to the landing page.
  //
  // Pushing a fresh PAD_COUNT buffer immediately after logout gives the
  // re-trap enough headroom to outrun the edge-swipe before the user
  // can reach those pre-login entries.
  useEffect(() => {
    const hadUser = !!prevUserRef.current;
    const hasUser = !!user;
    prevUserRef.current = user;
    if (hadUser && !hasUser) {
      pushDashboardTrap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── On view change: push a history entry ─────────────────────────
  useEffect(() => {
    if (isPopStateNavRef.current) {
      isPopStateNavRef.current = false;
      return;
    }
    const currentStateView = (window.history.state as { view?: string } | null)?.view ?? '';

    // Skip the push when a navigateTo* helper (e.g. navigateToStudentLogin)
    // already pushed a coordinated state+URL entry carrying this view.
    // Without this guard we stack two identical entries — the user has
    // to press back twice to leave the page, and the intermediate
    // back-tap lands on a duplicate that the trap interprets as
    // "nowhere to go" and forwards the user out of the app entirely.
    if (currentStateView === view) {
      return;
    }

    const isDashboard = view === 'teacher-dashboard' || view === 'student-dashboard';
    const comingFromAuth = AUTH_VIEWS.has(currentStateView);

    // Login transition: replace the landing/auth entry with a pad
    // buffer, then push the dashboard on top.
    if (userRef.current && isDashboard && comingFromAuth) {
      pushDashboardTrap();
      return;
    }

    // Normal in-app navigation — single pushState so the back button
    // walks naturally between pages (dashboard ← wizard, etc.).
    //
    // Slice 5 (behind URL_ROUTING_PUSH, real-device gated): attach the view's
    // canonical path so in-app nav updates the address bar and a refresh
    // re-resolves. Views with no registry path — and the parametric sub-views
    // whose ?id= URL is pushed by their own handler — pass `undefined`, leaving
    // the URL unchanged (exactly today's behavior). The floor / pad / popstate
    // logic is deliberately untouched.
    const url = URL_ROUTING_PUSH && !PARAMETRIC_VIEWS.has(view)
      ? (pathForView(view) ?? undefined)
      : undefined;
    window.history.pushState({ view }, '', url);
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

      // Modal-first: if a ModalShell modal is open, back closes the
      // topmost one instead of navigating (native-app behavior). We
      // consumed one history entry getting here, so re-push to keep the
      // stack (and the dashboard-floor pad buffer) intact. Runs before
      // the floor/auth logic so back never exits or navigates while a
      // modal is up. The hand-rolled exit-confirm / consent / class-switch
      // modals don't register here, so their flows are unaffected.
      if (modalBackStack.size > 0) {
        modalBackStack.closeTop();
        window.history.pushState({ view: currentView }, '');
        return;
      }

      const home = currentUser ? getHomeView() : null;
      const atDashboardFloor = !!currentUser && currentView === home;

      // CASE A: at dashboard floor, back never navigates away — the
      //         dashboard is an absolute floor — but the exit gesture
      //         differs by role:
      //
      //         - Students (native app): Android-standard
      //           double-back-to-exit. A single back shows a "press
      //           back again to exit" hint and re-traps; a deliberate
      //           second back within DOUBLE_BACK_WINDOW_MS quits the app
      //           but KEEPS the student signed in, so reopening lands
      //           straight on their dashboard (personal-device UX — no
      //           PIN re-entry every launch). The double-tap guard means a
      //           kid mashing back accidentally can't trip it (one press
      //           only shows the hint). Logging out is now ONLY via the
      //           explicit Log out button — exiting no longer signs out.
      //           (On web/PWA exitApp is a no-op — a tab can't self-close.)
      //           If the explicit logout modal happens to be open, back
      //           just closes it (= "Stay").
      //         - Teachers / guests: unchanged exit-confirm modal. Second
      //           back while the modal is open = "yes, really leave" →
      //           signOut + public landing.
      const isStudent = currentUser?.role === 'student';
      if (atDashboardFloor) {
        if (isStudent) {
          if (exitModalOpenRef.current) {
            setShowExitConfirmModal(false);
            pushDashboardTrap();
            return;
          }
          const now = Date.now();
          if (now - lastFloorBackRef.current < DOUBLE_BACK_WINDOW_MS) {
            // Deliberate double-back: quit the app but KEEP the student
            // signed in, so reopening lands straight on their dashboard
            // (personal-device UX — no PIN re-entry every launch). On
            // web/PWA exitApp is a no-op (a tab can't self-close), so
            // nothing happens there — which is fine: we explicitly do NOT
            // log out on exit anymore.
            exitIntentRef.current = true;
            CapacitorApp.exitApp().catch(() => { /* web/PWA — no native shell */ });
            return;
          }
          lastFloorBackRef.current = now;
          pushDashboardTrap();
          onFloorExitHintRef.current();
          return;
        }
        if (exitModalOpenRef.current) {
          setShowExitConfirmModal(false);
          exitIntentRef.current = true;
          supabase.auth.signOut().catch(() => {});
          try { window.history.replaceState({ view: 'public-landing' }, ''); } catch { /* best-effort */ }
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

  // ─── Native (Capacitor) hardware back button ──────────────────────
  //
  // The popstate handler above only fires for in-app History API
  // navigation. Inside the native store shell the Android hardware
  // back button does NOT emit popstate — Capacitor delivers it via the
  // App plugin's 'backButton' event, and with no listener registered
  // its default handler EXITS the app on every press. Bridge the event
  // to history.back() so each native back-press flows through the same
  // trap above (walk back / re-trap floor / exit-confirm) and never
  // quits the app. On the web build the listener simply never fires.
  useEffect(() => {
    let remove: (() => void) | undefined;
    CapacitorApp.addListener('backButton', () => {
      window.history.back();
    })
      .then((handle) => { remove = () => handle.remove(); })
      .catch(() => { /* plugin unavailable (web) — popstate covers it */ });
    return () => { remove?.(); };
  }, []);

  // ─── Public exit-intent trigger ───────────────────────────────────
  const beginExitFlow = useCallback(() => {
    setShowExitConfirmModal(false);
    exitIntentRef.current = true;
    try { window.history.replaceState({ view: 'public-landing' }, ''); } catch { /* best-effort */ }
    setTimeout(() => { exitIntentRef.current = false; }, EXIT_INTENT_WINDOW_MS);
  }, [setShowExitConfirmModal]);

  return { beginExitFlow };
}
