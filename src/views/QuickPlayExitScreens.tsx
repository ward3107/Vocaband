/**
 * The two Quick Play "exit" screens — Kicked and SessionEnded — plus
 * their shared exit-to-landing path.  Returned as JSX | null from a
 * single helper so App.tsx doesn't carry two near-identical view
 * branches plus the shared cleanup helper.
 */
import { Suspense, type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { supabase, type AppUser, type AssignmentData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';

const QuickPlayKickedScreen = lazyWithRetry(() => import('../components/QuickPlayKickedScreen'));
const QuickPlaySessionEndScreen = lazyWithRetry(() => import('../components/QuickPlaySessionEndScreen'));

export interface RenderQpExitScreensDeps {
  quickPlayKicked: boolean;
  quickPlaySessionEnded: boolean;
  quickPlayActiveSession: { id: string } | null;
  user: AppUser | null;
  quickPlayStudentName: string;
  score: number;

  cleanupSessionData: () => void;
  setQuickPlayKicked: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickPlaySessionEnded: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickPlayActiveSession: React.Dispatch<
    React.SetStateAction<{
      id: string;
      sessionCode: string;
      wordIds: number[];
      words: Word[];
      allowedModes?: string[];
      aiSentences?: string[];
    } | null>
  >;
  setActiveAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setQuickPlayStudentName: React.Dispatch<React.SetStateAction<string>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

export function renderQuickPlayExitScreens(deps: RenderQpExitScreensDeps): ReactNode {
  const {
    quickPlayKicked, quickPlaySessionEnded, quickPlayActiveSession,
    user, quickPlayStudentName, score,
    cleanupSessionData,
    setQuickPlayKicked, setQuickPlaySessionEnded, setQuickPlayActiveSession,
    setActiveAssignment, setUser, setQuickPlayStudentName, setView,
  } = deps;

  // Single source of truth for Quick Play guest cleanup.  Used by
  // exitQuickPlayToLanding and the rejoin path — previously each one
  // hand-rolled its own `localStorage.removeItem` call plus partial
  // state resets, which drifted out of sync (the rejoin path also
  // signed out the anonymous auth user; exit-to-landing didn't).
  // Consolidating prevents the two callers from drifting again.
  const clearQuickPlayGuest = () => {
    cleanupSessionData();
    try { localStorage.removeItem('vocaband_qp_guest'); } catch { /* ignore */ }
  };

  // Shared "exit to public landing" cleanup — wipe QP session state,
  // sign out the guest identity, route home.  Callers still own the
  // screen-specific flag reset (setQuickPlayKicked / -Ended).
  const exitQuickPlayToLanding = () => {
    clearQuickPlayGuest();
    setQuickPlayActiveSession(null);
    setActiveAssignment(null);
    setUser(null);
    setView('public-landing');
  };

  if (quickPlayKicked) {
    return (
      <Suspense fallback={null}>
        <QuickPlayKickedScreen
          onGoHome={() => { setQuickPlayKicked(false); exitQuickPlayToLanding(); }}
          // Only offer rejoin when we still have the session context.  The
          // rejoin path clears the guest identity (localStorage + anon auth
          // sign-out) so the student picks up a fresh uid.
          onRejoin={
            quickPlayActiveSession
              ? () => {
                  clearQuickPlayGuest();
                  supabase.auth.signOut().catch(() => { /* best-effort */ });
                  setQuickPlayKicked(false);
                  setActiveAssignment(null);
                  setUser(null);
                  setQuickPlayStudentName('');
                  setView('quick-play-student');
                }
              : undefined
          }
        />
      </Suspense>
    );
  }

  if (quickPlaySessionEnded) {
    return (
      <Suspense fallback={null}>
        <QuickPlaySessionEndScreen
          studentName={user?.displayName || quickPlayStudentName || 'Player'}
          finalScore={score || 0}
          sessionId={quickPlayActiveSession?.id}
          studentUid={user?.uid}
          onGoHome={() => { setQuickPlaySessionEnded(false); exitQuickPlayToLanding(); }}
        />
      </Suspense>
    );
  }

  return null;
}
