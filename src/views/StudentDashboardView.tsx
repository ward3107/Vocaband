import StudentOnboarding from "../components/StudentOnboarding";
import FloatingButtons from "../components/FloatingButtons";
import StudentTopBar from "../components/dashboard/StudentTopBar";
import StudentGreetingCard from "../components/dashboard/StudentGreetingCard";
import StudentStatsRow from "../components/dashboard/StudentStatsRow";
import DailyGoalBanner from "../components/dashboard/DailyGoalBanner";
import BadgesStrip from "../components/dashboard/BadgesStrip";
import LeaderboardTeaser from "../components/dashboard/LeaderboardTeaser";
import PetCompanion from "../components/dashboard/PetCompanion";
import RetentionStrip from "../components/dashboard/RetentionStrip";
import ActiveBoostersStrip from "../components/dashboard/ActiveBoostersStrip";
import StudentOverallProgress from "../components/dashboard/StudentOverallProgress";
import StudentAssignmentsList from "../components/dashboard/StudentAssignmentsList";
import { THEMES, getXpTitle, type PetRewardKind } from "../constants/game";
import type { AppUser, AssignmentData, ProgressData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View, ShopTab } from "../core/views";
import type { RetentionState } from "../hooks/useRetention";

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
  classSwitchModal: React.ReactNode;
  classNotFoundBanner?: React.ReactNode;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setShopTab: React.Dispatch<React.SetStateAction<ShopTab>>;
  setActiveAssignment: (a: AssignmentData) => void;
  setAssignmentWords: (w: Word[]) => void;
  setShowModeSelection: (show: boolean) => void;
  retention: RetentionState;
  onGrantXp: (amount: number, reason: string) => void;
  onGrantReward: (kind: PetRewardKind, value: number | string) => void;
  /** Active booster snapshot for the dashboard chip strip. */
  boosters: {
    isXpBoosterActive: boolean;
    isFocusModeActive: boolean;
    isWeekendWarriorActive: boolean;
    streakFreezes: number;
    luckyCharms: number;
  };
}

export default function StudentDashboardView({
  user, xp, streak, badges,
  copiedCode, setCopiedCode,
  studentAssignments, studentProgress, studentDataLoading,
  showStudentOnboarding, setShowStudentOnboarding,
  consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
  setView, setShopTab,
  setActiveAssignment, setAssignmentWords, setShowModeSelection,
  retention, onGrantXp, onGrantReward, boosters,
}: StudentDashboardViewProps) {
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];

  // The default theme now uses a soft gradient instead of flat stone-100 —
  // sets a warmer tone for the vibrant greeting hero that follows. Other
  // themes still pick their own bg from THEMES.
  const isDefault = (user?.activeTheme ?? 'default') === 'default';
  const bgClass = isDefault
    ? 'bg-gradient-to-b from-violet-50 via-stone-50 to-white'
    : activeThemeConfig.colors.bg;

  return (
    <div className={`min-h-screen ${bgClass} p-4 sm:p-6`}>
      {consentModal}
      {exitConfirmModal}
      {classSwitchModal}
      {showStudentOnboarding && (
        <StudentOnboarding
          userName={user.displayName}
          onComplete={() => setShowStudentOnboarding(false)}
        />
      )}
      <div className="max-w-4xl mx-auto">
        {classNotFoundBanner}
        <StudentTopBar />
        <StudentGreetingCard
          user={user}
          xp={xp}
          streak={streak}
          badges={badges}
          copiedCode={copiedCode}
          setCopiedCode={setCopiedCode}
          onShopClick={() => { setShopTab("hub"); setView("shop"); }}
        />
        <StudentStatsRow
          xp={xp}
          streak={streak}
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
        />
        <ActiveBoostersStrip {...boosters} />
        <RetentionStrip retention={retention} onGrantXp={onGrantXp} />
        <DailyGoalBanner studentProgress={studentProgress} />
        <LeaderboardTeaser
          classCode={user.classCode}
          currentStudentUid={user.uid}
          currentXp={xp}
          setView={setView}
        />
        <BadgesStrip earned={badges} />
        <StudentOverallProgress
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
        />
        <StudentAssignmentsList
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
          studentDataLoading={studentDataLoading}
          userUid={user.uid}
          setActiveAssignment={setActiveAssignment}
          setAssignmentWords={setAssignmentWords}
          setView={setView}
          setShowModeSelection={setShowModeSelection}
        />
      </div>
      <PetCompanion
        xp={xp}
        displayName={user.displayName}
        currentStage={retention.currentPetStage}
        nextStage={retention.nextPetStage}
        claimableMilestone={retention.claimablePetMilestone}
        onClaim={(milestone) => {
          // Grant the reward first so the student sees it land, then
          // record the claim so it won't re-surface.
          if (milestone.reward.kind === 'xp' && typeof milestone.reward.value === 'number') {
            onGrantXp(milestone.reward.value, `${milestone.emoji} ${milestone.stage} evolved! ${milestone.reward.label}`);
          } else {
            onGrantReward(milestone.reward.kind, milestone.reward.value);
          }
          retention.claimPetMilestone(milestone);
        }}
      />
      <FloatingButtons
        showBackToTop={false}
        shareLevel={{
          displayName: user.displayName,
          xp,
          title: getXpTitle(xp).title,
          emoji: getXpTitle(xp).emoji,
        }}
      />
    </div>
  );
}
