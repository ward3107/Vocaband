/**
 * The student-dashboard view branch — StudentDashboardView with its
 * full prop bag (retention, boosters, reward grant handlers).
 */
import { type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import {
  grantRetentionXp,
  applyServerRewards,
  grantNonXpReward,
} from '../handlers/retentionGrants';
import type { AppUser, AssignmentData, ProgressData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';

const StudentDashboardView = lazyWithRetry(() => import('./StudentDashboardView'));

// Generic typing for the retention / boosters / structure props —
// the StudentDashboardView types these tightly, but we don't need
// to re-declare them here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Anyish = any;

export interface StudentDashboardSectionDeps {
  user: AppUser;
  xp: number;
  streak: number;
  badges: string[];
  setXp: React.Dispatch<React.SetStateAction<number>>;
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
  structure: Anyish;
  celebrateStructureKeys: Anyish;
}

export function StudentDashboardSection(deps: StudentDashboardSectionDeps): ReactNode {
  const {
    user, xp, streak, badges, setXp, setBadges, setUser,
    copiedCode, setCopiedCode,
    studentAssignments, studentProgress, studentDataLoading,
    showStudentOnboarding, setShowStudentOnboarding,
    consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
    setView, setActiveAssignment, setAssignmentWords, setShowModeSelection,
    setGameMode, setIsFinished,
    startClassMinute, retention, boosters,
    showToast, renameStudentDisplayName, structure, celebrateStructureKeys,
  } = deps;

  return (
    <LazyWrapper loadingMessage="Loading dashboard...">
      <StudentDashboardView
        user={user}
        xp={xp}
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
          // Spaced repetition entry — bypasses the mode picker.
          // ReviewGame self-fetches its queue + the ALL_WORDS distractor
          // pool, so we don't need to seed gameWords or activeAssignment.
          setGameMode('review');
          setIsFinished(false);
          setShowModeSelection(false);
          setView('game');
        }}
        onStartClassMinute={startClassMinute}
        onStartIdioms={() => {
          // Idiom entry — bypasses the mode picker.  IdiomGame self-
          // fetches its question pool from src/data/idioms.ts, so we
          // don't need to seed gameWords or activeAssignment.
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
        onApplyServerRewards={({ xpToAdd, badgesToAppend }) =>
          applyServerRewards(xpToAdd, badgesToAppend, { setXp, setBadges })
        }
        onGrantReward={(kind, value) => grantNonXpReward(kind, value, { user, setUser })}
        onRenameDisplayName={renameStudentDisplayName}
        structure={structure}
        celebrateStructureKeys={celebrateStructureKeys}
      />
    </LazyWrapper>
  );
}
