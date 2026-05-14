/**
 * useViewGuards — redirect effects that recover the app from orphaned
 * or broken view states.  All three follow the same shape: "if `view`
 * lands somewhere that needs data we don't have, send the user to a
 * safe view instead of showing a blank/stuck screen."
 *
 * Guard 1: orphaned `landing` — logged-out users go to student login,
 *   logged-in users to their role-specific dashboard.  Happens when
 *   another flow leaves `view` at 'landing' after auth has already
 *   resolved.
 *
 * Guard 2: `game` without `activeAssignment` — popstate can restore
 *   `view='game'` after the assignment was cleared (student finished,
 *   or backed out).  Without the guard the render path returns a
 *   white screen.  Redirect is role-aware.
 *
 * Guard 3: `quick-play-student` without an active session — would
 *   render the infinite "Loading Quick Play session…" spinner.  Only
 *   fires when the URL has NO `?session=` param (orphan view from
 *   popstate / cleared state).  If `?session=CODE` is still in the
 *   URL the bootstrap hook (`useQuickPlayUrlBootstrap`) is either
 *   in-flight or about to fire — and OWNS the failure path (it
 *   strips the URL + redirects on its own when the lookup fails).
 *   Racing the bootstrap from here used to bump fresh QR-scan
 *   students straight to public-landing on a cold load: anon-auth
 *   `INITIAL_SESSION` fires with null, App sets `loading=false`,
 *   this guard saw `view='quick-play-student' && !session && !loading`
 *   and redirected before the bootstrap's anon-auth + RLS-protected
 *   `quick_play_sessions` SELECT had a chance to land state.
 */
import { useEffect } from 'react';
import { hasTeacherAccess, type AppUser, type AssignmentData } from '../core/supabase';
import type { View } from '../core/views';

export interface UseViewGuardsParams {
  view: View;
  setView: React.Dispatch<React.SetStateAction<View>>;
  user: AppUser | null;
  loading: boolean;
  activeAssignment: AssignmentData | null;
  quickPlayActiveSession: { id: string; sessionCode: string } | null;
}

export function useViewGuards(params: UseViewGuardsParams): void {
  const {
    view, setView,
    user, loading,
    activeAssignment, quickPlayActiveSession,
  } = params;

  // ─── Guard 1: orphaned "landing" view ──────────────────────────────
  useEffect(() => {
    if (view !== 'landing' || loading) return;
    if (!user) {
      setView('student-account-login');
    } else if (hasTeacherAccess(user)) {
      setView('teacher-dashboard');
    } else {
      setView('student-dashboard');
    }
  }, [view, user, loading, setView]);

  // ─── Guard 2: `game` view needs an active assignment ──────────────
  useEffect(() => {
    if (view !== 'game' || activeAssignment) return;
    if (user?.isGuest) {
      setView('quick-play-student');
    } else if (user?.role === 'student') {
      setView('student-dashboard');
    } else if (hasTeacherAccess(user)) {
      setView('teacher-dashboard');
    } else {
      setView('public-landing');
    }
  }, [view, activeAssignment, user, setView]);

  // ─── Guard 3: quick-play-student without a live session ───────────
  useEffect(() => {
    if (view !== 'quick-play-student' || quickPlayActiveSession || loading) return;
    const code = new URLSearchParams(window.location.search).get('session');
    // URL still has ?session=CODE — the bootstrap hook is loading the
    // session (or about to). Bail and let it own the success/failure
    // path (on failure it strips the URL + redirects). Without this
    // bail, fresh QR-scan students were bumped to public-landing
    // BEFORE the bootstrap finished its anon-auth + RLS-protected
    // SELECT — see hook docstring for the full race description.
    if (code) return;
    // No URL param and no active session — orphan view from popstate
    // or a state clear. Send the user somewhere they can act.
    setView('public-landing');
  }, [view, quickPlayActiveSession, loading, setView]);
}
