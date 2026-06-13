/**
 * Collects the small side-effect useEffects that were scattered
 * through App.tsx's render-prep section.  None are independently large
 * enough to warrant their own hook, but as a group they were costing
 * App.tsx ~70 lines.
 *
 * Effects bundled here:
 *   1. userRef sync (keeps a ref pointing at the latest user)
 *   2. Sentry user pipe (set/clear scope user on sign-in/out)
 *   3. Feedback-timeout cleanup on unmount
 *   4. Legacy "students" → "gradebook" view redirect
 *   5. Round-finish motivational audio + final-score emit (live challenge)
 *   6. First-time "welcome to assignment creation" popup gate
 *   7. currentView ref + window event dispatch on view change
 *   8. lastUserRoleRef sync (auth listener closes over a stale user
 *      otherwise — see SIGNED_OUT branch in useAuthRestore)
 *   9. Save-queue depth → "Saved locally"/"All synced" toasts
 *  10. Quick Play guest audio preload at session join time
 *  11. isFlipped reset on word advance (matching-card flip back)
 *  12. Adaptive next-word audio preload during regular game play
 *  13. Teacher-login chunk prefetch on idle (instant logout for staff)
 */
import { useEffect } from 'react';
import type React from 'react';
import { setSentryUser, clearSentryUser } from '../core/sentry';
import { subscribeQueueDepth } from '../core/saveQueue';
import { SOCKET_EVENTS } from '../core/types';
import type { Socket } from 'socket.io-client';
import type { AppUser } from '../core/supabase';
import type { View } from '../core/views';
import type { Word } from '../data/vocabulary';

export interface UseAppMiscEffectsDeps {
  // Identity / view
  user: AppUser | null;
  view: View;
  userRef: React.MutableRefObject<AppUser | null>;
  currentViewRef: React.MutableRefObject<View>;
  lastUserRoleRef: React.MutableRefObject<AppUser['role'] | null>;

  // Feedback timeout for cleanup
  feedbackTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;

  // Round-finish
  isFinished: boolean;
  score: number;
  socket: Socket | null;
  playMotivational: () => void;

  // First-time assignment welcome popup
  setShowAssignmentWelcome: React.Dispatch<React.SetStateAction<boolean>>;

  // Legacy 'students' view redirect
  setView: React.Dispatch<React.SetStateAction<View>>;
  fetchScores: () => void;

  // Save-queue toasts
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  appToasts: { savedLocally: string; allSynced: string };
  queueDepthRef: React.MutableRefObject<number>;

  // QP guest audio preload
  quickPlayActiveSession: { id: string; words: Word[] } | null;
  preloadMany: (ids: number[]) => void;

  // Adaptive next-word preload during game play
  gameWords: Word[];

  // Word-flip reset
  currentWord: Word | undefined;
  currentIndex: number;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useAppMiscEffects(deps: UseAppMiscEffectsDeps): void {
  const {
    user, view, userRef, currentViewRef, lastUserRoleRef,
    feedbackTimeoutRef,
    isFinished, score, socket, playMotivational,
    setShowAssignmentWelcome,
    setView, fetchScores,
    showToast, appToasts, queueDepthRef,
    quickPlayActiveSession, preloadMany,
    gameWords,
    currentWord, currentIndex, setIsFlipped,
  } = deps;

  // 1. userRef sync
  useEffect(() => { userRef.current = user; }, [user, userRef]);

  // 2. Sentry user pipe
  useEffect(() => {
    if (user?.uid) {
      setSentryUser({ uid: user.uid, role: user.role ?? undefined, email: user.email ?? undefined });
    } else {
      clearSentryUser();
    }
  }, [user?.uid, user?.role, user?.email]);

  // 3. Feedback-timeout cleanup on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4. Legacy "students" view redirect
  useEffect(() => {
    if (view === 'students') {
      setView('gradebook');
      fetchScores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // 5. Round-finish motivational + final-score emit
  useEffect(() => {
    if (isFinished && user?.displayName && view === 'game') {
      setTimeout(() => playMotivational(), 500);
      if (socket && user?.classCode) {
        setTimeout(() => {
          socket.emit(SOCKET_EVENTS.UPDATE_SCORE, { classCode: user.classCode, uid: user.uid, score });
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  // 6. First-time welcome popup gate
  useEffect(() => {
    if (view === 'create-assignment') {
      try {
        if (!localStorage.getItem('vocaband_welcome_seen')) {
          setShowAssignmentWelcome(true);
        }
      } catch {
        setShowAssignmentWelcome(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // 7. currentView ref + window event dispatch
  useEffect(() => {
    currentViewRef.current = view;
    window.dispatchEvent(new CustomEvent('vocaband-view-change', { detail: view }));
  }, [view, currentViewRef]);

  // 8. lastUserRoleRef sync
  useEffect(() => {
    if (user?.role) lastUserRoleRef.current = user.role;
  }, [user, lastUserRoleRef]);

  // 9. Save-queue depth toasts
  useEffect(() => {
    const unsubscribe = subscribeQueueDepth((depth) => {
      const prev = queueDepthRef.current;
      queueDepthRef.current = depth;
      if (depth > prev && typeof navigator !== 'undefined' && navigator.onLine === false) {
        showToast(appToasts.savedLocally, 'info');
      } else if (depth === 0 && prev > 0) {
        showToast(appToasts.allSynced, 'success');
      }
    });
    return unsubscribe;
  }, [showToast, appToasts, queueDepthRef]);

  // 10. QP guest audio preload
  useEffect(() => {
    if (!user?.isGuest) return;
    if (!quickPlayActiveSession?.words?.length) return;
    const ids = quickPlayActiveSession.words.map((w) => w.id).filter((id) => id > 0);
    if (ids.length === 0) return;
    preloadMany(ids);
  }, [user?.isGuest, quickPlayActiveSession?.id, preloadMany, quickPlayActiveSession?.words]);

  // 11. isFlipped reset on word advance
  useEffect(() => {
    if (currentWord) setIsFlipped(false);
  }, [currentIndex, currentWord, setIsFlipped]);

  // 12. Adaptive next-word audio preload during game play.  The QP-guest
  // path (#10) preloads the whole session up-front, but logged-in students
  // running through a regular assignment list never had any look-ahead —
  // each tap on the speaker icon paid a 50-200 ms cold-fetch.  Once the
  // index advances we eagerly fetch the next two upcoming MP3s so the
  // student's next speak() is instant.
  useEffect(() => {
    if (view !== 'game' || !gameWords?.length) return;
    const nextIds = [
      gameWords[currentIndex + 1]?.id,
      gameWords[currentIndex + 2]?.id,
    ].filter((id): id is number => typeof id === 'number' && id > 0);
    if (nextIds.length) preloadMany(nextIds);
  }, [view, currentIndex, gameWords, preloadMany]);

  // 13. Warm the teacher-login chunk on idle for signed-in staff.  On
  // logout, teachers/admins/managers route to the small teacher-login card
  // (see the SIGNED_OUT branch in useAuthRestore); prefetching it here while
  // they work means that swap is instant instead of paying a cold dynamic
  // import on slow school Wi-Fi.  Vite dedups this with PublicViews'
  // lazyWithRetry mount, so it's the same chunk.
  useEffect(() => {
    const role = user?.role;
    if (role !== 'teacher' && role !== 'admin' && role !== 'manager') return;
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const warm = () => { void import('../views/TeacherLoginView'); };
    if (typeof ric === 'function') ric(warm, { timeout: 3000 });
    else window.setTimeout(warm, 1500);
  }, [user?.role]);
}
