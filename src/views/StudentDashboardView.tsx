import StudentOnboarding from "../components/StudentOnboarding";
import FloatingButtons from "../components/FloatingButtons";
import StudentTopBar from "../components/dashboard/StudentTopBar";
import StudentGreetingCard from "../components/dashboard/StudentGreetingCard";
import StudentOverallProgress from "../components/dashboard/StudentOverallProgress";
import StudentAssignmentsList from "../components/dashboard/StudentAssignmentsList";
import { THEMES } from "../constants/game";
import type { AppUser, AssignmentData, ProgressData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View, ShopTab } from "../core/views";

interface StudentDashboardViewProps {
  user: AppUser;
  xp: number;
  streak: number;
  badges: string[];
  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
  studentDataLoading: boolean;
  showStudentOnboarding: boolean;
  setShowStudentOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
  consentModal: React.ReactNode;
  exitConfirmModal: React.ReactNode;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setShopTab: React.Dispatch<React.SetStateAction<ShopTab>>;
  setActiveAssignment: (a: AssignmentData) => void;
  setAssignmentWords: (w: Word[]) => void;
  setShowModeSelection: (show: boolean) => void;
}

export default function StudentDashboardView({
  user, xp, streak, badges,
  copiedCode, setCopiedCode,
  studentAssignments, studentProgress, studentDataLoading,
  showStudentOnboarding, setShowStudentOnboarding,
  consentModal, exitConfirmModal,
  setView, setShopTab,
  setActiveAssignment, setAssignmentWords, setShowModeSelection,
}: StudentDashboardViewProps) {
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];

  return (
    <div className={`min-h-screen ${activeThemeConfig.colors.bg} p-4 sm:p-6`}>
      {consentModal}
      {exitConfirmModal}
      {showStudentOnboarding && (
        <StudentOnboarding
          userName={user.displayName}
          onComplete={() => setShowStudentOnboarding(false)}
        />
      )}
      <div className="max-w-4xl mx-auto">
        <StudentTopBar
          onPrivacyClick={() => setView("privacy-settings")}
          onShopClick={() => { setShopTab("avatars"); setView("shop"); }}
        />
        <StudentGreetingCard
          user={user}
          xp={xp}
          streak={streak}
          badges={badges}
          copiedCode={copiedCode}
          setCopiedCode={setCopiedCode}
        />
        <StudentOverallProgress
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
        />
        <StudentAssignmentsList
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
          studentDataLoading={studentDataLoading}
          setActiveAssignment={setActiveAssignment}
          setAssignmentWords={setAssignmentWords}
          setView={setView}
          setShowModeSelection={setShowModeSelection}
        />
      </div>
      <FloatingButtons showBackToTop={true} />
    </div>
  );
}
