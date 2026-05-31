/**
 * All Hebrew-side view routing in one place:
 *   - vocahebrew-dashboard (entry tile picker)
 *   - vocahebrew-niqqud / -shoresh / -synonyms / -listening (the four
 *     native-track game modes)
 *
 * Returns the matching JSX or null so callers can chain it before the
 * English/teacher view branches.  Centralises the lemmaIds / hebrewExit
 * / saveHebrewScore wiring that used to be ad-hoc consts in App.tsx.
 */
import { Suspense, type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import { getEntitledVocas, type VocaId } from '../core/subject';
import { hasTeacherAccess, type AppUser, type AssignmentData } from '../core/supabase';
import { persistHebrewScore, type HebrewMode } from '../handlers/hebrewScore';
import type { View } from '../core/views';

const VocaHebrewDashboardView = lazyWithRetry(() => import('./VocaHebrewDashboardView'));
const NiqqudModeView = lazyWithRetry(() => import('./NiqqudModeView'));
const ShoreshHuntView = lazyWithRetry(() => import('./ShoreshHuntView'));
const ListeningModeView = lazyWithRetry(() => import('./ListeningModeView'));

const HEBREW_VIEW_MAP: Record<
  string,
  {
    Component: React.LazyExoticComponent<React.ComponentType<{
      onExit: () => void;
      lemmaIds: number[] | undefined;
      onComplete: (s: number, t: number) => Promise<void> | void;
    }>>;
    label: string;
    mode: HebrewMode;
  }
> = {
  'vocahebrew-niqqud':    { Component: NiqqudModeView,    label: 'Loading Niqqud Mode...',   mode: 'niqqud' },
  'vocahebrew-shoresh':   { Component: ShoreshHuntView,   label: 'Loading Shoresh Hunt...',  mode: 'shoresh' },
  'vocahebrew-listening': { Component: ListeningModeView, label: 'Loading Listening Mode...', mode: 'listening' },
};

export interface RenderHebrewRouteDeps {
  view: View;
  user: AppUser | null;
  activeAssignment: AssignmentData | null;
  quickPlayActiveSession: { id: string } | null;
  qpCumulativeScoreRef: React.MutableRefObject<number>;
  quickPlaySocketUpdateScore: (cumulativeScore: number) => void;

  setActiveVoca: React.Dispatch<React.SetStateAction<VocaId | null>>;
  setShowModeSelection: React.Dispatch<React.SetStateAction<boolean>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
}

export function renderHebrewRoute(deps: RenderHebrewRouteDeps): ReactNode {
  const {
    view, user, activeAssignment,
    quickPlayActiveSession, qpCumulativeScoreRef,
    quickPlaySocketUpdateScore,
    setActiveVoca, setShowModeSelection, setView,
  } = deps;

  // VocaHebrew dashboard — entry point into the four native-track games.
  // Switch-Voca returns the teacher to the picker so they can flip back
  // to English without logging out.
  if (hasTeacherAccess(user) && view === 'vocahebrew-dashboard') {
    const showSwitcher = getEntitledVocas(user!).length >= 2;
    return (
      <Suspense fallback={null}>
        <LazyWrapper loadingMessage="Loading VocaHebrew...">
          <VocaHebrewDashboardView
            user={user!}
            showSwitcher={showSwitcher}
            onSwitchVoca={() => { setActiveVoca(null); setView('voca-picker'); }}
            onLaunchNiqqudMode={() => setView('vocahebrew-niqqud')}
            onLaunchShoreshHunt={() => setView('vocahebrew-shoresh')}
            onLaunchListeningMode={() => setView('vocahebrew-listening')}
          />
        </LazyWrapper>
      </Suspense>
    );
  }

  // Hebrew mode views — used by both teachers (solo-launch from the
  // VocaHebrew dashboard) and students (assignment playback).
  const inHebrewAssignment = activeAssignment?.subject === 'hebrew';
  const hebrewLemmaIds = inHebrewAssignment ? activeAssignment?.wordIds : undefined;
  const hebrewExit = () => {
    if (user?.role === 'student' && inHebrewAssignment) {
      // Re-show the mode picker so the student can pick another Hebrew
      // game on the same assignment without a full reset.
      setShowModeSelection(true);
      setView('game');
    } else {
      // Solo-launch by a Hebrew teacher returns to the unified dashboard.
      setView('teacher-dashboard');
    }
  };

  // Persist a Hebrew round's final score to the gradebook + (Quick
  // Play) push cumulative score to the live podium.
  const saveHebrewScore = (mode: HebrewMode, score: number, total: number) => {
    if (!user || !activeAssignment || !inHebrewAssignment) return Promise.resolve();
    return persistHebrewScore(mode, score, total, {
      user,
      activeAssignment,
      quickPlayActiveSession,
      qpCumulativeScoreRef,
      quickPlaySocketUpdateScore,
    });
  };

  const hebrewView = HEBREW_VIEW_MAP[view];
  if (hebrewView) {
    const { Component, label, mode } = hebrewView;
    return (
      <LazyWrapper loadingMessage={label}>
        <Component
          onExit={hebrewExit}
          lemmaIds={hebrewLemmaIds}
          onComplete={(s, t) => saveHebrewScore(mode, s, t)}
        />
      </LazyWrapper>
    );
  }

  return null;
}
