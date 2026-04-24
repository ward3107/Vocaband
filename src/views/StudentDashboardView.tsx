import StudentOnboarding from "../components/StudentOnboarding";
import { useState } from "react";
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
import PowerUpsStrip from "../components/dashboard/PowerUpsStrip";
import DropOfTheWeekCard from "../components/dashboard/DropOfTheWeekCard";
import RewardInboxCard from "../components/dashboard/RewardInboxCard";
import StudentOverallProgress from "../components/dashboard/StudentOverallProgress";
import StudentAssignmentsList from "../components/dashboard/StudentAssignmentsList";
import { StructureKindPicker } from "../components/structure/StructureKindPicker";
import { TodayStrip } from "../components/structure/TodayStrip";
import { IdentityHero } from "../components/structure/IdentityHero";
import { ShopSquare } from "../components/structure/ShopSquare";
import { StructurePreviewTile } from "../components/structure/StructurePreviewTile";
import { StructureDetailModal } from "../components/structure/StructureDetailModal";
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
  /** Inline display-name change from the greeting card. Returns the
   *  server's authoritative name on success, or an error code + msg. */
  onRenameDisplayName?: (newName: string) =>
    Promise<
      | { ok: true; displayName: string }
      | { ok: false; code: string; message: string }
    >;
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
  onRenameDisplayName,
}: StudentDashboardViewProps) {
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];

  // Controls the fullscreen detail modal for the student's structure
  // (garden / city / rocket / castle).  Declared here at the top of
  // the component — NOT inside the STRUCTURE_UX branch — so hook
  // order stays stable regardless of whether the flag is on or the
  // structure prop is provided.
  const [showStructureDetail, setShowStructureDetail] = useState(false);

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

          {/* ── IDENTITY HERO (full-width, prominent) ───────────────
              Big avatar medallion wrapped in the equipped frame's
              ring, first name, title badge, XP + streak.  Primary
              job: make "who I am + what I've equipped" instantly
              readable at the top of the screen. */}
          <IdentityHero user={user} xp={xp} streak={streak} />

          {/* ── Inventory strips ─────────────────────────────────
              What the student owns + what's active.  Previously
              rendered only on the legacy dashboard; restored here
              so purchases made in the shop actually show up on
              the main screen:
                * ActiveBoostersStrip — 2×XP / Weekend Warrior /
                  Streak Freeze count / Lucky Charm count
                * PowerUpsStrip — Skip / 50-50 / Reveal Letter
                  inventory counts (new component — these had no
                  display anywhere before this)
                * BadgesStrip — earned badges carousel
              Each strip hides itself when empty, so a brand-new
              student with no purchases sees a clean hero + garden
              without clutter. */}
          <ActiveBoostersStrip {...boosters} />
          <PowerUpsStrip powerUps={user.powerUps} />

          {/* ── Structure preview + Shop side-by-side ─────────────
              Garden / City / Rocket / Castle renders as a compact
              tappable preview on the left (opens the fullscreen
              detail modal when tapped).  Shop on the right.  Both
              stack on mobile.  Frees vertical room below for
              Today strip + Assignments. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            {structure.kind ? (
              <StructurePreviewTile
                kind={structure.kind}
                slots={structure.slots}
                onOpen={() => setShowStructureDetail(true)}
              />
            ) : (
              /* Picker hasn't fired yet — render a placeholder slot so
                 the shop tile doesn't slide across the full width. */
              <div className="rounded-3xl bg-stone-100 min-h-[200px]" aria-hidden />
            )}
            <ShopSquare xp={xp} onOpen={() => { setShopTab('hub'); setView('shop'); }} />
          </div>

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
              setShopTab('hub');
              setView('shop');
            }}
          />

          {/* ── Earned badges ──────────────────────────────────────
              Collection of achievements (auto-awarded + teacher-
              awarded).  Hides itself when the student has none,
              so day-one students don't see an empty strip. */}
          {badges.length > 0 && <BadgesStrip earned={badges} />}

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

        {/* ── Structure detail modal ─────────────────────────────
            Lifted out of the main column so the overlay sits on top
            of everything (including PetCompanion).  Only renders
            when the student taps the preview tile. */}
        {structure.kind && (
          <StructureDetailModal
            open={showStructureDetail}
            onClose={() => setShowStructureDetail(false)}
            kind={structure.kind}
            slots={structure.slots}
            nextLocked={structure.nextLocked}
            celebrateKeys={celebrateStructureKeys}
            masteryProgress={structure.masteryProgress}
          />
        )}

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
          onRenameDisplayName={onRenameDisplayName}
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
