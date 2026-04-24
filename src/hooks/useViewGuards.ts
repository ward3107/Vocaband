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
 *   render the infinite "Loading Quick Play session…" spinner.  If
 *   the URL still has `?session=CODE`, strip it so refresh doesn't
 *   re-trigger the stale state; send the user home so they can
 *   re-scan the QR.
 */
import { useEffect } from 'react';
import type { AppUser, AssignmentData } from '../core/supabase';
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
    } else if (user.role === 'teacher') {
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
    } else if (user?.role === 'teacher') {
      setView('teacher-dashboard');
    } else {
      setView('public-landing');
    }
  }, [view, activeAssignment, user, setView]);

  // ─── Guard 3: quick-play-student without a live session ───────────
  useEffect(() => {
    if (view !== 'quick-play-student' || quickPlayActiveSession || loading) return;
    const code = new URLSearchParams(window.location.search).get('session');
    if (!code) {
      setView('public-landing');
      return;
    }
    // URL still has ?session= but our state doesn't — stale history entry.
    // Clear the param and send home; the user can re-scan to rejoin.
    window.history.replaceState({}, '', window.location.pathname);
    setView('public-landing');
  }, [view, quickPlayActiveSession, loading, setView]);
}
