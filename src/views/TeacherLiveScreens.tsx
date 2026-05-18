/**
 * Live Challenge + Quick Play teacher-monitor view branches.  Both
 * share a demo-friendly error fallback (a Live Challenge crash mid-
 * pitch is the worst possible moment — generic "Failed to load"
 * reads as a hard failure to a watching principal) so the gradient
 * "Reconnecting…" panel + Return-to-Dashboard button is the same
 * for both.
 */
import { lazy, type ReactNode } from 'react';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import type { AppUser, ClassData } from '../core/supabase';
import type { LeaderboardEntry } from '../core/types';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';
import type { QpRealtimeStatus } from '../hooks/useQuickPlayRealtime';

const LiveChallengeView = lazy(() => import('./LiveChallengeView'));
const QuickPlayTeacherMonitorView = lazy(() => import('./QuickPlayTeacherMonitorView'));
const HebrewComingSoonView = lazy(() => import('./HebrewComingSoonView'));

function reconnectingFallback(
  bodyText: string,
  onReturn: () => void,
): ReactNode {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900 px-6">
      <div className="max-w-md w-full text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
        <div className="text-5xl mb-4">⚡</div>
        <h2 className="text-2xl font-black text-white mb-3">Reconnecting…</h2>
        <p className="text-white/80 mb-6">{bodyText}</p>
        <button
          type="button"
          onClick={onReturn}
          className="w-full px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-black rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export interface RenderTeacherLiveScreensDeps {
  view: View;
  user: AppUser | null;
  selectedClass: ClassData | null;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setIsLiveChallenge: React.Dispatch<React.SetStateAction<boolean>>;
  leaderboard: Record<string, LeaderboardEntry>;
  socketConnected: boolean;

  // Quick Play monitor deps
  quickPlayActiveSession: { id: string; sessionCode: string; wordIds: number[]; words: Word[] } | null;
  quickPlayJoinedStudents: { name: string; score: number; avatar: string; lastSeen: string; mode: string; studentUid: string }[];
  setQuickPlayJoinedStudents: React.Dispatch<React.SetStateAction<{ name: string; score: number; avatar: string; lastSeen: string; mode: string; studentUid: string }[]>>;
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
  setQuickPlaySelectedWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setQuickPlaySessionCode: React.Dispatch<React.SetStateAction<string | null>>;
  setQuickPlayCustomWords: React.Dispatch<React.SetStateAction<Map<string, { hebrew: string; arabic: string }>>>;
  setQuickPlayAddingCustom: React.Dispatch<React.SetStateAction<Set<string>>>;
  setQuickPlayTranslating: React.Dispatch<React.SetStateAction<Set<string>>>;
  cleanupSessionData: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  quickPlayRealtimeStatus: QpRealtimeStatus;
}

export function renderTeacherLiveScreens(deps: RenderTeacherLiveScreensDeps): ReactNode {
  const {
    view, user, selectedClass, setView, setIsLiveChallenge,
    leaderboard, socketConnected,
    quickPlayActiveSession, quickPlayJoinedStudents, setQuickPlayJoinedStudents,
    setQuickPlayActiveSession, setQuickPlaySelectedWords, setQuickPlaySessionCode,
    setQuickPlayCustomWords, setQuickPlayAddingCustom, setQuickPlayTranslating,
    cleanupSessionData, showToast, quickPlayRealtimeStatus,
  } = deps;

  if (view === 'live-challenge' && selectedClass) {
    // VocaHebrew has no Hebrew-native Live Challenge yet — the English
    // socket session would surface English-only assignment data to the
    // Hebrew teacher's podium.
    if (selectedClass.subject === 'hebrew') {
      return (
        <LazyWrapper loadingMessage="טוען…">
          <HebrewComingSoonView
            titleHe="אתגר חי"
            descriptionHe="מצב כיתה חי עם לוח שיא בזמן אמת — בקרוב באוצר המילים העברי."
            onBack={() => { setIsLiveChallenge(false); setView('teacher-dashboard'); }}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper
        loadingMessage="Loading live challenge..."
        fallback={reconnectingFallback(
          'The challenge hit a hiccup. Students stay connected — pick the class again to resume.',
          () => { setIsLiveChallenge(false); setView('teacher-dashboard'); },
        )}
      >
        <LiveChallengeView
          selectedClass={selectedClass}
          leaderboard={leaderboard}
          socketConnected={socketConnected}
          setView={setView}
          setIsLiveChallenge={setIsLiveChallenge}
        />
      </LazyWrapper>
    );
  }

  if (view === 'quick-play-teacher-monitor') {
    if (!quickPlayActiveSession) {
      setView('quick-play-setup');
      return null;
    }
    return (
      <LazyWrapper
        loadingMessage="Loading session monitor..."
        fallback={reconnectingFallback(
          'The session monitor hit a hiccup. Your active session is safe — return to the dashboard and reopen it.',
          () => setView(user?.role === 'student' ? 'student-dashboard' : 'teacher-dashboard'),
        )}
      >
        <QuickPlayTeacherMonitorView
          quickPlayActiveSession={quickPlayActiveSession}
          quickPlayJoinedStudents={quickPlayJoinedStudents}
          setQuickPlayJoinedStudents={setQuickPlayJoinedStudents}
          setView={setView}
          setQuickPlayActiveSession={setQuickPlayActiveSession}
          setQuickPlaySelectedWords={setQuickPlaySelectedWords}
          setQuickPlaySessionCode={setQuickPlaySessionCode}
          setQuickPlayCustomWords={setQuickPlayCustomWords}
          setQuickPlayAddingCustom={setQuickPlayAddingCustom}
          setQuickPlayTranslating={setQuickPlayTranslating}
          cleanupSessionData={cleanupSessionData}
          showToast={showToast}
          realtimeStatus={quickPlayRealtimeStatus}
        />
      </LazyWrapper>
    );
  }

  return null;
}
