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
import DropOfTheWeekCard from "../components/dashboard/DropOfTheWeekCard";
import RewardInboxCard from "../components/dashboard/RewardInboxCard";
import StudentOverallProgress from "../components/dashboard/StudentOverallProgress";
import StudentAssignmentsList from "../components/dashboard/StudentAssignmentsList";
import { StructureHero } from "../components/structure/StructureHero";
import { StructureKindPicker } from "../components/structure/StructureKindPicker";
import { TodayStrip } from "../components/structure/TodayStrip";
import { ShoppingBag } from "lucide-react";
import { THEMES, getXpTitle, type PetRewardKind } from "../constants/game";
import type { AppUser, AssignmentData, ProgressData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View, ShopTab } from "../core/views";
import type { RetentionState } from "../hooks/useRetention";
import type { StructureState } from "../hooks/useStructure";

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
  /**
   * Called by RewardInboxCard when a new teacher reward is polled in
   * while the student is already on the dashboard.  The award_reward
   * RPC has already written the reward to the DB — this callback just
   * syncs the dashboard's in-memory xp/badges to match.  Implementation
   * must NOT write to the users table (that'd double-count).
   */
  onApplyServerRewards: (summary: { xpToAdd: number; badgesToAppend: string[] }) => void;
  /** Active booster snapshot for the dashboard chip strip. */
  boosters: {
    isXpBoosterActive: boolean;
    isFocusModeActive: boolean;
    isWeekendWarriorActive: boolean;
    streakFreezes: number;
    luckyCharms: number;
  };
  /**
   * Structure progression state (Phase 1 of the "build something
   * meaningful" system).  When `structure` is provided AND the
   * VITE_STRUCTURE_UX feature flag is enabled, the dashboard renders
   * the StructureHero + TodayStrip + StudentAssignmentsList trio
   * INSTEAD of the legacy 14-widget pile.  When flag is off, the
   * prop is ignored and the old layout renders unchanged.
   */
  structure?: StructureState;
  /** Keys of parts newly unlocked this render — for the bounce pop. */
  celebrateStructureKeys?: string[];
}

// Feature flag — set VITE_STRUCTURE_UX=true to enable the Phase 1
// structure-progression dashboard. Default false so the existing
// legacy dashboard is what production ships until we're ready.
const STRUCTURE_UX_ENABLED = import.meta.env.VITE_STRUCTURE_UX === 'true';

export default function StudentDashboardView({
  user, xp, streak, badges,
  copiedCode, setCopiedCode,
  studentAssignments, studentProgress, studentDataLoading,
  showStudentOnboarding, setShowStudentOnboarding,
  consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
  setView, setShopTab,
  setActiveAssignment, setAssignmentWords, setShowModeSelection,
  retention, onGrantXp, onGrantReward, onApplyServerRewards, boosters,
  structure, celebrateStructureKeys,
}: StudentDashboardViewProps) {
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];

  // The default theme now uses a soft gradient instead of flat stone-100 —
  // sets a warmer tone for the vibrant greeting hero that follows. Other
  // themes still pick their own bg from THEMES.
  const isDefault = (user?.activeTheme ?? 'default') === 'default';
  const bgClass = isDefault
    ? 'bg-gradient-to-b from-violet-50 via-stone-50 to-white'
    : activeThemeConfig.colors.bg;

  // ── STRUCTURE UX (Phase 1 — feature-flagged) ──────────────────────
  // Simpler composition: StructureKindPicker (first-run) + TodayStrip
  // + StructureHero + StudentAssignmentsList. No widget soup.
  if (STRUCTURE_UX_ENABLED && structure) {
    const showPicker = structure.kind === null;
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
        <StructureKindPicker
          open={showPicker}
          onPick={(k) => structure.chooseKind(k)}
        />
        <div className="max-w-4xl mx-auto">
          {classNotFoundBanner}
          <RewardInboxCard
            onServerRewardsArrived={({ xpToAdd, badgesToAppend }) => {
              onApplyServerRewards({ xpToAdd, badgesToAppend });
            }}
          />
          <TodayStrip
            user={user}
            xp={xp}
            streak={streak}
            studentAssignments={studentAssignments}
            studentProgress={studentProgress}
            onPlayNextAssignment={(a) => {
              setActiveAssignment(a);
              setAssignmentWords(a.words ?? []);
              setShowModeSelection(true);
              setView('game');
            }}
            onPractice={() => {
              // No assignments left — send the student to the shop for
              // now; a dedicated "free practice" view is Phase 3.
              setShopTab('hub');
              setView('shop');
            }}
          />
          {structure.kind && (
            <StructureHero
              kind={structure.kind}
              slots={structure.slots}
              nextLocked={structure.nextLocked}
              celebrateKeys={celebrateStructureKeys}
              masteryProgress={structure.masteryProgress}
            />
          )}

          {/* Shop access — visible button so students keep one-tap access
              to avatars, eggs, power-ups, boosters, cosmetics.  Previously
              buried on the old GreetingCard; brought forward in the
              Structure UX layout so the shop isn't orphaned. */}
          <button
            type="button"
            onClick={() => { setShopTab("hub"); setView("shop"); }}
            style={{ touchAction: 'manipulation' }}
            className="w-full mb-4 flex items-center justify-between gap-3 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 text-white rounded-3xl px-5 py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ShoppingBag size={22} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-widest opacity-80">Shop</p>
                <p className="text-base font-black">Eggs · Power-ups · Avatars</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1 text-xs font-bold">
              {xp.toLocaleString()} XP
            </span>
          </button>

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

        {/* Pet companion — keeps the egg/fox/dragon progression visible.
            Lives as a floating bubble on the right so it doesn't compete
            with the structure hero.  Clicking it opens the evolution +
            claim-reward card (grants XP / cosmetics on milestone). */}
        <PetCompanion
          xp={xp}
          displayName={user.displayName}
          currentStage={retention.currentPetStage}
          nextStage={retention.nextPetStage}
          claimableMilestone={retention.claimablePetMilestone}
          onClaim={(milestone) => {
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

  // ── LEGACY DASHBOARD (default until flag flips in Phase 4) ────────
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
        {/* Teacher rewards land here FIRST so the student sees the
            celebration before anything else on the dashboard. Hides
            itself when the inbox is empty. */}
        <RewardInboxCard
          onServerRewardsArrived={({ xpToAdd, badgesToAppend }) => {
            // RPC already wrote to the DB — just mirror locally so the
            // dashboard reflects it without a page refresh.  Never writes
            // back to Supabase.
            onApplyServerRewards({ xpToAdd, badgesToAppend });
          }}
        />
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
        {/* Weekly rotating shop drop — identical card to the one at the
            top of the Shop view, so students see the offer from the
            dashboard and can click straight through to the right tab. */}
        <DropOfTheWeekCard
          onShopOpen={(tab) => {
            setShopTab(tab);
            setView("shop");
          }}
        />
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
