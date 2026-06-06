/**
 * The student-dashboard view branch — StudentDashboardView with its
 * full prop bag (retention, boosters, reward grant handlers).
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import { primeAudio } from '../utils/primeAudio';
import {
  grantRetentionXp,
  applyServerRewards,
  claimBadgeXp,
  grantNonXpReward,
} from '../handlers/retentionGrants';
import { pickNextAssignment } from '../utils/pickNextAssignment';
import { resolveAssignmentWords } from '../utils/resolveAssignmentWords';
import type { AppUser, AssignmentData, ProgressData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';

const StudentDashboardView = lazyWithRetry(() => import('./StudentDashboardView'));
const StudentHubSubView = lazyWithRetry(() => import('./StudentHubSubView'));

/** Maps the four student-hub views to the section the page renders. */
const HUB_SECTION_BY_VIEW = {
  'student-practice': 'practice',
  'student-daily': 'daily',
} as const;

export type StudentHubView = keyof typeof HUB_SECTION_BY_VIEW;

/** True when `view` is one of the dedicated student-hub sub-pages. */
export function isStudentHubView(view: View): view is StudentHubView {
  return view in HUB_SECTION_BY_VIEW;
}

// Generic typing for the retention / boosters / structure props —
// the StudentDashboardView types these tightly, but we don't need
// to re-declare them here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Anyish = any;

export interface StudentDashboardSectionDeps {
  user: AppUser;
  xp: number;
  coins: number;
  streak: number;
  badges: string[];
  setXp: React.Dispatch<React.SetStateAction<number>>;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  setBadges: React.Dispatch<React.SetStateAction<string[]>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;

  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;

  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
  studentDataLoading: boolean;

  showStudentOnboarding: boolean;
  setShowStudentOnboarding: React.Dispatch<React.SetStateAction<boolean>>;

  consentModal: ReactNode;
  exitConfirmModal: ReactNode;
  classSwitchModal: ReactNode;
  classNotFoundBanner: ReactNode;

  setView: React.Dispatch<React.SetStateAction<View>>;
  setActiveAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  setAssignmentWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setShowModeSelection: React.Dispatch<React.SetStateAction<boolean>>;
  setGameMode: React.Dispatch<React.SetStateAction<Anyish>>;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;

  startClassMinute: () => void | Promise<void>;
  retention: Anyish;
  boosters: Anyish;

  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  renameStudentDisplayName: Anyish;

  /** True on the render where the student just crossed a tier (same
   *  signal as LevelUpModal) — drives the pet transformation animation. */
  evolutionPending: boolean;

  /** Opens the friendly student soft-landing exit modal — same one
   *  the hardware back button uses — when the student taps the top-
   *  bar logout button.  Wired by App.tsx to setShowExitConfirmModal. */
  onRequestLogout: () => void;
}

export function StudentDashboardSection(deps: StudentDashboardSectionDeps): ReactNode {
  const {
    user, xp, coins, streak, badges, setXp, setCoins, setBadges, setUser,
    copiedCode, setCopiedCode,
    studentAssignments, studentProgress, studentDataLoading,
    showStudentOnboarding, setShowStudentOnboarding,
    consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
    setView, setActiveAssignment, setAssignmentWords, setShowModeSelection,
    setGameMode, setIsFinished,
    startClassMinute, retention, boosters,
    showToast, renameStudentDisplayName,
    evolutionPending,
    onRequestLogout,
  } = deps;

  return (
    <LazyWrapper loadingMessage="Loading dashboard...">
      <StudentDashboardView
        user={user}
        xp={xp}
        coins={coins}
        setCoins={setCoins}
        streak={streak}
        badges={badges}
        copiedCode={copiedCode}
        setCopiedCode={setCopiedCode}
        studentAssignments={studentAssignments}
        studentProgress={studentProgress}
        studentDataLoading={studentDataLoading}
        showStudentOnboarding={showStudentOnboarding}
        setShowStudentOnboarding={setShowStudentOnboarding}
        consentModal={consentModal}
        exitConfirmModal={exitConfirmModal}
        classSwitchModal={classSwitchModal}
        classNotFoundBanner={classNotFoundBanner}
        setView={setView}
        setActiveAssignment={setActiveAssignment}
        setAssignmentWords={setAssignmentWords}
        setShowModeSelection={setShowModeSelection}
        onStartReview={() => {
          // Spaced repetition entry — bypasses the mode picker, so this
          // tap is the only user-gesture before ReviewGame auto-speaks.
          // Prime iOS audio here (no intro screen / Let's Go to catch it).
          primeAudio();
          // ReviewGame self-fetches its queue + the ALL_WORDS distractor
          // pool, so we don't need to seed gameWords or activeAssignment.
          setGameMode('review');
          setIsFinished(false);
          setShowModeSelection(false);
          setView('game');
        }}
        onStartClassMinute={startClassMinute}
        onStartIdioms={() => {
          // Idiom entry — bypasses the mode picker, so prime iOS audio
          // on this tap (no Let's Go screen downstream to catch it).
          primeAudio();
          // IdiomGame self-fetches its question pool from
          // src/data/idioms.ts, so we don't need to seed gameWords.
          setGameMode('idiom');
          setIsFinished(false);
          setShowModeSelection(false);
          setView('game');
        }}
        retention={retention}
        boosters={{
          isXpBoosterActive: boosters.isXpBoosterActive,
          isFocusModeActive: boosters.isFocusModeActive,
          isWeekendWarriorActive: boosters.isWeekendWarriorActive,
          streakFreezes: boosters.streakFreezes,
          luckyCharms: boosters.luckyCharms,
        }}
        onGrantXp={(amount, reason) => grantRetentionXp(amount, reason, { user, setXp, showToast })}
        onClaimBadgeXp={(badgeId, xp, reason) => claimBadgeXp(badgeId, xp, reason, { setXp, showToast })}
        evolutionPending={evolutionPending}
        onApplyServerRewards={({ xpToAdd, badgesToAppend }) =>
          applyServerRewards(xpToAdd, badgesToAppend, { setXp, setBadges })
        }
        onGrantReward={(kind, value) => grantNonXpReward(kind, value, { user, setUser })}
        onRenameDisplayName={renameStudentDisplayName}
        onRequestLogout={onRequestLogout}
      />
    </LazyWrapper>
  );
}

/**
 * The student-hub sub-page branch — Practice / Missions / Boosters /
 * Badges, each on its own screen.  Reuses the same practice/idiom entry
 * handlers and the badge-XP claim path as the dashboard so behaviour is
 * identical to the old inline cards; only the surface changed.
 */
export function StudentHubSection(
  deps: StudentDashboardSectionDeps & { view: StudentHubView },
): ReactNode {
  const {
    view, user, badges, setXp, showToast,
    studentAssignments, studentProgress, studentDataLoading,
    setView, setActiveAssignment, setAssignmentWords, setShowModeSelection,
    setGameMode, setIsFinished,
    startClassMinute, boosters, retention,
  } = deps;

  // Rewards page's Daily Goal "play now" — launches the single most-
  // relevant assignment, same picker the dashboard's Play circle uses.
  const nextPick = pickNextAssignment(studentAssignments, studentProgress, user.uid);
  const onPlay = nextPick
    ? async () => {
        const words = await resolveAssignmentWords(nextPick.assignment);
        setActiveAssignment(nextPick.assignment);
        setAssignmentWords(words);
        setView('game');
        setShowModeSelection(true);
      }
    : undefined;

  return (
    <LazyWrapper loadingMessage="Loading...">
      <StudentHubSubView
        section={HUB_SECTION_BY_VIEW[view]}
        user={user}
        onBack={() => setView('student-dashboard')}
        studentProgress={studentProgress}
        studentDataLoading={studentDataLoading}
        retention={retention}
        onGrantXp={(amount, reason) => grantRetentionXp(amount, reason, { user, setXp, showToast })}
        onPlay={onPlay}
        onStartReview={() => {
          // Same spaced-repetition entry as the dashboard — bypasses the
          // mode picker, so prime iOS audio on this tap.
          primeAudio();
          setGameMode('review');
          setIsFinished(false);
          setShowModeSelection(false);
          setView('game');
        }}
        onStartClassMinute={startClassMinute}
        onStartIdioms={() => {
          primeAudio();
          setGameMode('idiom');
          setIsFinished(false);
          setShowModeSelection(false);
          setView('game');
        }}
        boosters={{
          isXpBoosterActive: boosters.isXpBoosterActive,
          isFocusModeActive: boosters.isFocusModeActive,
          isWeekendWarriorActive: boosters.isWeekendWarriorActive,
          streakFreezes: boosters.streakFreezes,
          luckyCharms: boosters.luckyCharms,
        }}
        badges={badges}
        onClaimBadgeXp={(badgeId, xp, reason) => claimBadgeXp(badgeId, xp, reason, { setXp, showToast })}
      />
    </LazyWrapper>
  );
}
