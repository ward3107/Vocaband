/**
 * Student auth / Quick Play join routes — pending-approval, account
 * login, quick-play-student join, plus privacy-settings.  All four
 * are bundled here so App.tsx doesn't carry their prop-forwarding.
 */
import { lazy, type ReactNode } from 'react';
import type React from 'react';
import { LazyWrapper } from '../components/SuspenseWrapper';
import PendingApprovalScreen from '../components/PendingApprovalScreen';
import { createGuestUser } from '../utils/createGuestUser';
import type { AppUser, AssignmentData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';

const StudentAccountLoginView = lazy(() => import('./StudentAccountLoginView'));
const QuickPlayStudentView = lazy(() => import('./QuickPlayStudentView'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Anyish = any;

export interface StudentAuthRoutesDeps {
  view: View;
  user: AppUser | null;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  cookieBannerOverlay: ReactNode;

  // Pending approval
  pendingApprovalInfo: { name: string; classCode: string; profileId?: string } | null;
  setPendingApprovalInfo: React.Dispatch<
    React.SetStateAction<{ name: string; classCode: string; profileId?: string } | null>
  >;
  handleLoginAsStudent: Anyish;

  // Student account login.  OAuth / Microsoft / OTP state props were
  // removed in the 2026-05-18 privacy review — students authenticate
  // only via class code + roster-issued PIN now.
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  studentLoginClassCode: string;
  setStudentLoginClassCode: React.Dispatch<React.SetStateAction<string>>;

  // Quick Play student join
  quickPlayActiveSession: {
    id: string;
    sessionCode: string;
    wordIds: number[];
    words: Word[];
    allowedModes?: string[];
    aiSentences?: string[];
  } | null;
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
  quickPlayStudentName: string;
  setQuickPlayStudentName: React.Dispatch<React.SetStateAction<string>>;
  quickPlayAvatar: string;
  setQuickPlayAvatar: React.Dispatch<React.SetStateAction<string>>;
  setAssignmentWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setActiveAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setFeedback: React.Dispatch<React.SetStateAction<'correct' | 'wrong' | 'show-answer' | null>>;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
  setMistakes: React.Dispatch<React.SetStateAction<number[]>>;
  setShowModeSelection: React.Dispatch<React.SetStateAction<boolean>>;
  cleanupSessionData: () => void;

}

export function renderStudentAuthRoute(deps: StudentAuthRoutesDeps): ReactNode {
  const {
    view, user, setView, setUser, showToast,
    cookieBannerOverlay,
    pendingApprovalInfo, setPendingApprovalInfo, handleLoginAsStudent,
    error,
    studentLoginClassCode, setStudentLoginClassCode,
    quickPlayActiveSession, setQuickPlayActiveSession,
    quickPlayStudentName, setQuickPlayStudentName,
    quickPlayAvatar, setQuickPlayAvatar,
    setAssignmentWords, setActiveAssignment, setCurrentIndex,
    setScore, setFeedback, setIsFinished, setMistakes, setShowModeSelection,
    cleanupSessionData,
  } = deps;

  if (view === 'student-pending-approval' && pendingApprovalInfo) {
    return (
      <PendingApprovalScreen
        pendingApprovalInfo={pendingApprovalInfo}
        setPendingApprovalInfo={setPendingApprovalInfo}
        handleLoginAsStudent={handleLoginAsStudent}
        setView={setView}
        showToast={showToast}
      />
    );
  }

  if (view === 'student-account-login') {
    return (
      <LazyWrapper loadingMessage="Loading login...">
        <StudentAccountLoginView
          setView={setView}
          error={error}
          studentLoginClassCode={studentLoginClassCode}
          setStudentLoginClassCode={setStudentLoginClassCode}
          cookieBannerOverlay={cookieBannerOverlay}
        />
      </LazyWrapper>
    );
  }

  if (view === 'quick-play-student') {
    return (
      <LazyWrapper loadingMessage="Loading quick play...">
        <QuickPlayStudentView
          quickPlayActiveSession={quickPlayActiveSession}
          setQuickPlayActiveSession={setQuickPlayActiveSession}
          quickPlayStudentName={quickPlayStudentName}
          setQuickPlayStudentName={setQuickPlayStudentName}
          quickPlayAvatar={quickPlayAvatar}
          setQuickPlayAvatar={setQuickPlayAvatar}
          setView={setView}
          setUser={setUser}
          setAssignmentWords={setAssignmentWords}
          setActiveAssignment={setActiveAssignment}
          setCurrentIndex={setCurrentIndex}
          setScore={setScore}
          setFeedback={setFeedback}
          setIsFinished={setIsFinished}
          setMistakes={setMistakes}
          setShowModeSelection={setShowModeSelection}
          createGuestUser={createGuestUser}
          cleanupSessionData={cleanupSessionData}
          showToast={showToast}
          userIsActiveGuest={!!user?.isGuest}
        />
      </LazyWrapper>
    );
  }

  return null;
}
