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
import DailyMissionsCard from "../components/dashboard/DailyMissionsCard";
import { useDailyMissions } from "../hooks/useDailyMissions";
import PetEvolutionCard from "../components/dashboard/PetEvolutionCard";
import { usePetEvolution } from "../hooks/usePetEvolution";
import ReviewQueueCard from "../components/dashboard/ReviewQueueCard";
import ClassMinuteCard from "../components/dashboard/ClassMinuteCard";
import { useDueReviews } from "../hooks/useDueReviews";
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
  /** Optional handler for the spaced-repetition Review mode entry
   *  point.  When provided, the dashboard renders a ReviewQueueCard
   *  with a "Start review" button that calls this; absent, the
   *  card hides itself.  Routes the student straight into the
   *  Review game without going through the mode picker. */
  onStartReview?: () => void;
  /** Optional handler for the Class Minute daily-drill entry point.
   *  Mirrors `onStartReview` — when provided, the dashboard renders a
   *  ClassMinuteCard above the review card; absent, the card hides.
   *  Loads SRS-due words first then fills from assignment, sets
   *  gameMode='class-minute', and routes to the game view. */
  onStartClassMinute?: () => void;
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
  /** Structure-progression state from `useStructure(user.uid)`.  Optional
   *  so the legacy dashboard branch (the one production ships when
   *  VITE_STRUCTURE_UX is unset) doesn't need a stub.  Without this prop
   *  declaration the bundle was free-referencing a `structure` identifier
   *  inside the gated block — a ReferenceError waited dormant until any
   *  build flipped the flag (or any minifier/compiler choice ran the
   *  branch eagerly).  Threading it through the props makes the
   *  dependency explicit.  See `useStructure.ts`. */
  structure?: StructureState;
  /** Slot keys that just unlocked — pulsed on the structure detail
   *  modal so the student sees what they earned.  Same dormant-bug
   *  story as `structure` above; declaring the prop here closes the
   *  free-reference. */
  celebrateStructureKeys?: string[];
}

// Feature flag — set VITE_STRUCTURE_UX=true to enable the Phase 1
// structure-progression dashboard. Default false so the existing
// legacy dashboard is what production ships until we're ready.
const STRUCTURE_UX_ENABLED = import.meta.env.VITE_STRUCTURE_UX === 'true';

// Temporarily hidden — the daily-drill ritual hasn't been validated
// with real teachers yet, so the dashboard tile is suppressed on both
// the legacy and STRUCTURE_UX render paths.  Keeping the prop, the
// onStartClassMinute callback, the `?play=class-minute` deep-link
// bootstrap, the GameMode entry, and the teacher's "Send Class
// Minute" share link untouched — flipping this flag back to true
// re-enables the student-facing entry point in one line, and any
// pre-shared teacher links keep working in the meantime.
const SHOW_CLASS_MINUTE_CARD = false;

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
  structure,
  celebrateStructureKeys = [],
  onStartReview,
  onStartClassMinute,
}: StudentDashboardViewProps) {
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];

  // Controls the fullscreen detail modal for the student's structure
  // (garden / city / rocket / castle).  Declared here at the top of
  // the component — NOT inside the STRUCTURE_UX branch — so hook
  // order stays stable regardless of whether the flag is on or the
  // structure prop is provided.
  const [showStructureDetail, setShowStructureDetail] = useState(false);

  // Daily missions — three rotating tasks per user-local calendar day.
  // Hook only fires for authenticated students; guests + Quick-Play
  // shouldn't see the card (no schema-bound XP loop).
  const dailyMissions = useDailyMissions({
    enabled: Boolean(user?.role === 'student' && !user?.isGuest),
  });

  // Activity-driven pet — grows with distinct days played, decays
  // after a 3-day grace period.  Same gating as missions.
  const petEvolution = usePetEvolution({
    enabled: Boolean(user?.role === 'student' && !user?.isGuest),
  });

  // Spaced repetition — surfaces today's due-for-review words.  Hook
  // only activates when a parent supplied an onStartReview callback
  // (so the card can route into the Review mode); without that the
  // hook stays idle.
  const dueReviews = useDueReviews({
    enabled: Boolean(user?.role === 'student' && !user?.isGuest && onStartReview),
  });

  // Class Minute — daily 60-second drill.  Derived purely from
  // `studentProgress` so the dashboard already has the data it
  // needs (no extra round-trip).  `doneToday` flips the card to the
  // emerald "see you tomorrow" state; `classMinuteStreak` counts
  // consecutive days back from today with at least one class-minute
  // completion — gap of one day breaks the streak.
  const { classMinuteDoneToday, classMinuteStreak } = (() => {
    const todayKey = new Intl.DateTimeFormat('sv-SE').format(new Date());
    const daysWithPlay = new Set<string>();
    for (const row of studentProgress) {
      if (row.mode !== 'class-minute') continue;
      const dayKey = new Intl.DateTimeFormat('sv-SE').format(new Date(row.completedAt));
      daysWithPlay.add(dayKey);
    }
    const doneToday = daysWithPlay.has(todayKey);
    // Walk back day-by-day from today until we hit a gap.  If the
    // student hasn't played today yet, the streak still counts
    // yesterday-and-earlier consecutive days — they're "carrying" a
    // streak that today's session would extend.
    let streak = 0;
    const cursor = new Date();
    if (!doneToday) cursor.setDate(cursor.getDate() - 1);
    while (true) {
      const key = new Intl.DateTimeFormat('sv-SE').format(cursor);
      if (daysWithPlay.has(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return { classMinuteDoneToday: doneToday, classMinuteStreak: streak };
  })();

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
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {classNotFoundBanner}
          <RewardInboxCard
            userUid={user.uid}
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

          {/* ── Activity pet — grows with distinct days played, decays
              past a 3-day grace period.  Sits above the structure +
              shop pair so the student lands on the streak prompt
              before exploring deeper widgets.  Real students only. */}
          {(user?.role === 'student' && !user?.isGuest) && (
            <PetEvolutionCard
              state={petEvolution.state}
              isLoading={petEvolution.isLoading}
            />
          )}

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

          {/* ── Class Minute — daily 60-second drill ──────────────
              Habit-forming daily ritual.  Currently hidden behind
              SHOW_CLASS_MINUTE_CARD pending real-teacher validation;
              code path stays intact for an easy re-enable.  See the
              flag declaration above this component for context. */}
          {SHOW_CLASS_MINUTE_CARD && onStartClassMinute && (
            <div className="mb-4">
              <ClassMinuteCard
                doneToday={classMinuteDoneToday}
                streak={classMinuteStreak}
                isLoading={studentDataLoading}
                onStart={onStartClassMinute}
              />
            </div>
          )}

          {/* ── Spaced Repetition queue card ──────────────────────
              Surfaces today's due-for-review words and routes the
              student straight into the Review mode (bypasses the
              mode picker).  Only renders when the parent supplied
              an onStartReview callback (gated to authenticated
              real students above). */}
          {onStartReview && (
            <div className="mb-4">
              <ReviewQueueCard
                dueCount={dueReviews.dueCount}
                isLoading={dueReviews.isLoading}
                onStart={onStartReview}
              />
            </div>
          )}

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

          {/* ── Daily missions — three rotating mission types that
              refresh once per user-local calendar day.  Renders only
              for authenticated students (the hook is gated above). */}
          {(user?.role === 'student' && !user?.isGuest) && (
            <DailyMissionsCard
              missions={dailyMissions.missions}
              isLoading={dailyMissions.isLoading}
            />
          )}

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

          {/* Mock Bagrut exams entry — only renders the inline tile;
              the listing + take-test view live in VocabagrutShell. */}
          <button
            type="button"
            onClick={() => setView("vocabagrut")}
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              backgroundColor: 'var(--vb-surface)',
              borderColor: 'var(--vb-border)',
            }}
            className="group relative w-full rounded-2xl p-4 text-left border shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                <span className="text-white text-lg font-black">B</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 style={{ color: 'var(--vb-text-primary)' }} className="text-sm font-bold leading-tight mb-0.5">
                  Mock Bagrut exams
                </h3>
                <p style={{ color: 'var(--vb-text-secondary)' }} className="text-xs leading-snug">
                  Practice the real Bagrut paper format
                </p>
              </div>
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--vb-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
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
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {classNotFoundBanner}
        <StudentTopBar />
        {/* Teacher rewards land here FIRST so the student sees the
            celebration before anything else on the dashboard. Hides
            itself when the inbox is empty. */}
        <RewardInboxCard
          userUid={user.uid}
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
        {/* ── Class Minute — daily 60-second drill ──────────────
            Habit-forming daily ritual.  Same card the STRUCTURE_UX
            branch renders; this duplicate lives here because the
            legacy branch is the production-default render path
            (STRUCTURE_UX is feature-flagged off).  When the flag
            flips on for everyone, drop one of the two. */}
        {SHOW_CLASS_MINUTE_CARD && onStartClassMinute && (
          <ClassMinuteCard
            doneToday={classMinuteDoneToday}
            streak={classMinuteStreak}
            isLoading={studentDataLoading}
            onStart={onStartClassMinute}
          />
        )}
        <DailyGoalBanner studentProgress={studentProgress} />
        <LeaderboardTeaser
          classCode={user.classCode}
          currentStudentUid={user.uid}
          currentXp={xp}
          setView={setView}
        />
        {/* Hide the strip for day-one students with no badges yet —
            otherwise they see a row of locked tiles that reads as
            "broken" instead of "you haven't earned any yet".  Mirrors
            the modern-dashboard guard at line 224. */}
        {badges.length > 0 && <BadgesStrip earned={badges} />}
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
