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
import RewardInboxCard from "../components/dashboard/RewardInboxCard";
import StudentAssignmentsList from "../components/dashboard/StudentAssignmentsList";
import NextUpCard from "../components/dashboard/NextUpCard";
import DailyPracticeRow from "../components/dashboard/DailyPracticeRow";
import StudentWelcomeCard from "../components/dashboard/StudentWelcomeCard";
import { useCompetitionsForClass } from "../hooks/useCompetitions";
import DailyMissionsCard from "../components/dashboard/DailyMissionsCard";
import { useDailyMissions } from "../hooks/useDailyMissions";
import { useDueReviews } from "../hooks/useDueReviews";
import { useFeatureFlag } from "../hooks/useFeatureFlag";
import ArcadeHubLayout from "../components/arcade/ArcadeHubLayout";
import ArcadeStatsBar from "../components/arcade/ArcadeStatsBar";
import EvolutionCore from "../components/arcade/EvolutionCore";
import { THEMES, getXpTitle, type PetRewardKind } from "../constants/game";
import type { AppUser, AssignmentData, ProgressData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import type { RetentionState } from "../hooks/useRetention";
import { pickNextAssignment } from "../utils/pickNextAssignment";
import { resolveAssignmentWords } from "../utils/resolveAssignmentWords";
import React from "react";

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
  /** Optional handler for the Idioms bonus tile.  Idioms run on a
   *  curated dataset (not the teacher's assignment words), so the
   *  mode lives on the dashboard rather than in the assignment mode
   *  picker.  Same routing pattern as onStartReview — bypasses mode
   *  selection + intro and routes straight into the game. */
  onStartIdioms?: () => void;
  retention: RetentionState;
  onGrantXp: (amount: number, reason: string) => void;
  /** Server-authoritative badge XP claim (BadgesStrip arcade tiles).
   *  Routes through claim_badge_xp so re-claims are deduped in the DB.
   *  Resolves to whether the badge was already claimed, or null on
   *  failure so the tile can revert its optimistic state. */
  onClaimBadgeXp: (badgeId: string, xp: number, reason: string) => Promise<{ alreadyClaimed: boolean } | null>;
  /** True on the render where the student crossed a tier — fires the
   *  pet's collapse → burst → reveal transformation in CharacterStage. */
  evolutionPending: boolean;
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
  /** Triggered when the student taps the top-bar logout button.  App.tsx
   *  routes this to the soft-landing exit-confirm modal so a stray tap
   *  doesn't sign them out instantly. */
  onRequestLogout?: () => void;
}

export default function StudentDashboardView({
  user, xp, streak, badges,
  copiedCode, setCopiedCode,
  studentAssignments, studentProgress, studentDataLoading,
  showStudentOnboarding, setShowStudentOnboarding,
  consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
  setView,
  setActiveAssignment, setAssignmentWords, setShowModeSelection,
  retention, onGrantXp, onClaimBadgeXp, onGrantReward, onApplyServerRewards, boosters,
  evolutionPending,
  onRenameDisplayName,
  onStartReview,
  onStartClassMinute,
  onStartIdioms,
  onRequestLogout,
}: StudentDashboardViewProps) {
  const activeThemeConfig = THEMES.find(th => th.id === (user?.activeTheme ?? 'default')) ?? THEMES[0];

  // Classroom competitions wrapping any of this student's assignments.
  // Cheap query (one row per assignment that has competition mode on);
  // realtime-pushed via `useCompetitionsForClass`.  Keyed by
  // assignmentId so the cards can do an O(1) lookup.
  const { competitions } = useCompetitionsForClass(user.classCode);
  const competitionsByAssignment = new Map(
    competitions.map((c) => [c.assignmentId, c] as const),
  );

  // Same picker NextUpCard uses internally — re-derived here so other
  // surfaces (DailyGoalBanner, etc.) can launch the same target on tap.
  // Null when nothing is eligible, in which case dependent CTAs hide.
  const nextPick = pickNextAssignment(studentAssignments, studentProgress, user.uid);
  const launchNextAssignment = nextPick
    ? async () => {
        const filteredWords = await resolveAssignmentWords(nextPick.assignment);
        setActiveAssignment(nextPick.assignment);
        setAssignmentWords(filteredWords);
        React.startTransition(() => {
          setView("game");
          setShowModeSelection(true);
        });
        if (typeof window !== "undefined") {
          requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
        }
      }
    : undefined;

  // Daily missions — three rotating tasks per user-local calendar day.
  // Hook only fires for authenticated students; guests + Quick-Play
  // shouldn't see the card (no schema-bound XP loop).
  const dailyMissions = useDailyMissions({
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

  // Feature-flagged Brawl-Stars-style hub.  Wraps the legacy dashboard
  // panels inside a vibrant ArcadeHubLayout with the EvolutionCore hero
  // (pet + XP ring + evolution ladder + integrated PLAY).  Default OFF;
  // admin enables via `arcade_hub` flag.  When the flag is on we skip
  // rendering StudentGreetingCard / NextUpCard — ArcadeStatsBar and
  // EvolutionCore supersede them.
  const arcadeHubEnabled = useFeatureFlag('arcade_hub', false);

  // ── DASHBOARD RENDER ──────────────────────────────────────────────
  if (arcadeHubEnabled) {
    // Shared pet-milestone claim — used by both the EvolutionCore hero
    // and the floating PetCompanion. Grants the reward, then records the
    // claim so it won't re-surface.
    const handleClaimMilestone = (milestone: typeof retention.claimablePetMilestone) => {
      if (!milestone) return;
      if (milestone.reward.kind === "xp" && typeof milestone.reward.value === "number") {
        onGrantXp(milestone.reward.value, `${milestone.emoji} ${milestone.stage} evolved! ${milestone.reward.label}`);
      } else {
        onGrantReward(milestone.reward.kind, milestone.reward.value);
      }
      retention.claimPetMilestone(milestone);
    };
    return (
      <>
        {consentModal}
        {exitConfirmModal}
        {classSwitchModal}
        {showStudentOnboarding && (
          <StudentOnboarding
            userName={user.displayName}
            onComplete={() => setShowStudentOnboarding(false)}
          />
        )}
        <ArcadeHubLayout
          statsBar={<ArcadeStatsBar xp={xp} streak={streak} />}
          character={
            <EvolutionCore
              currentStage={retention.currentPetStage}
              nextStage={retention.nextPetStage}
              xp={xp}
              evolutionPending={evolutionPending}
              claimableMilestone={retention.claimablePetMilestone}
              onClaim={handleClaimMilestone}
              onPlay={launchNextAssignment}
              streak={streak}
            />
          }
        >
          {classNotFoundBanner}
          <StudentTopBar onRequestLogout={onRequestLogout} />
          <RewardInboxCard
            userUid={user.uid}
            onServerRewardsArrived={({ xpToAdd, badgesToAppend }) => {
              onApplyServerRewards({ xpToAdd, badgesToAppend });
            }}
          />
          {!studentDataLoading && studentAssignments.length === 0 && (
            <StudentWelcomeCard displayName={user.displayName} />
          )}
          <DailyPracticeRow
            review={onStartReview ? {
              dueCount: dueReviews.dueCount,
              isLoading: dueReviews.isLoading,
              onStart: onStartReview,
            } : undefined}
            classMinute={onStartClassMinute ? {
              doneToday: classMinuteDoneToday,
              streak: classMinuteStreak,
              isLoading: studentDataLoading,
              onStart: onStartClassMinute,
            } : undefined}
            idioms={onStartIdioms ? { onStart: onStartIdioms } : undefined}
          />
          <RetentionStrip retention={retention} onGrantXp={onGrantXp} />
          <DailyGoalBanner studentProgress={studentProgress} onPlay={launchNextAssignment} />
          {(user?.role === 'student' && !user?.isGuest) && (
            <DailyMissionsCard
              missions={dailyMissions.missions}
              isLoading={dailyMissions.isLoading}
            />
          )}
          <StudentAssignmentsList
            studentAssignments={studentAssignments}
            studentProgress={studentProgress}
            studentDataLoading={studentDataLoading}
            userUid={user.uid}
            competitionsByAssignment={competitionsByAssignment}
            setActiveAssignment={setActiveAssignment}
            setAssignmentWords={setAssignmentWords}
            setView={setView}
            setShowModeSelection={setShowModeSelection}
          />
          <StudentStatsRow
            xp={xp}
            streak={streak}
            studentAssignments={studentAssignments}
            studentProgress={studentProgress}
          />
          <LeaderboardTeaser
            classCode={user.classCode}
            currentStudentUid={user.uid}
            currentXp={xp}
            setView={setView}
          />
          <ActiveBoostersStrip {...boosters} />
          {badges.length > 0 && <BadgesStrip earned={badges} userUid={user.uid} onClaimBadgeXp={onClaimBadgeXp} />}
        </ArcadeHubLayout>
        <PetCompanion
          xp={xp}
          displayName={user.displayName}
          streak={streak}
          currentStage={retention.currentPetStage}
          nextStage={retention.nextPetStage}
          claimableMilestone={retention.claimablePetMilestone}
          onClaim={handleClaimMilestone}
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
      </>
    );
  }

  return (
    // Extra bottom padding clears the fixed overlays (FloatingButtons at
    // bottom-28 + PetCompanion at bottom-20) plus the iOS safe area, so
    // the last card is never hidden under them.
    <div className={`min-h-screen ${bgClass} p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+10rem)]`}>
      {consentModal}
      {exitConfirmModal}
      {classSwitchModal}
      {showStudentOnboarding && (
        <StudentOnboarding
          userName={user.displayName}
          onComplete={() => setShowStudentOnboarding(false)}
        />
      )}
      {/* Tightened from max-w-4xl → max-w-3xl to match the dev preview's
          calmer width — 4xl was stretching every gradient card a touch
          past where the eye wants to land.  Card-internal eyebrows on
          NextUpCard, DailyPracticeRow, LeaderboardTeaser, etc. already
          do the section-label work the preview achieved with outer
          headings, so we don't need to add a second label layer. */}
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {classNotFoundBanner}
        <StudentTopBar onRequestLogout={onRequestLogout} />
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
          onShopClick={() => setView("shop")}
          onRenameDisplayName={onRenameDisplayName}
        />
        {/* Brand-new student welcome — only renders when the student
            has zero assignments AND we're not still loading.  Without
            this, a fresh login lands on a stack of empty-state widgets
            with one italic "no assignments yet" line buried in the
            middle of the page; this card explains the situation and
            points them at the practice tiles below. */}
        {!studentDataLoading && studentAssignments.length === 0 && (
          <StudentWelcomeCard displayName={user.displayName} />
        )}
        {/* Primary CTA — surfaces the single most-relevant assignment
            (in-progress > unstarted > replayable) directly under the
            greeting so the student always lands on a "do this now"
            action above the fold. Hides itself when nothing eligible
            (all locked or no assignments yet). */}
        <NextUpCard
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
          userUid={user.uid}
          setActiveAssignment={setActiveAssignment}
          setAssignmentWords={setAssignmentWords}
          setView={setView}
          setShowModeSelection={setShowModeSelection}
        />
        {/* ── ACTION ZONE ─────────────────────────────────────────
            Reordered so the student lands on do-this-now surfaces
            before the informational ones.  Assignments list rises
            from position #14 to here.  Stats / Leaderboard /
            Boosters / Badges drop below as "scroll to see your
            achievements" rather than competing with the actions
            for the first scroll. */}
        {/* ── Daily Practice row ────────────────────────────────
            Collapses Review · Class Minute · Idioms into one
            compact 3-up row instead of three full-width cards. */}
        <DailyPracticeRow
          review={onStartReview ? {
            dueCount: dueReviews.dueCount,
            isLoading: dueReviews.isLoading,
            onStart: onStartReview,
          } : undefined}
          classMinute={onStartClassMinute ? {
            doneToday: classMinuteDoneToday,
            streak: classMinuteStreak,
            isLoading: studentDataLoading,
            onStart: onStartClassMinute,
          } : undefined}
          idioms={onStartIdioms ? { onStart: onStartIdioms } : undefined}
        />
        <RetentionStrip retention={retention} onGrantXp={onGrantXp} />
        <DailyGoalBanner studentProgress={studentProgress} onPlay={launchNextAssignment} />
        {/* ── Daily missions — three rotating tasks per user-local
            calendar day.  Gated to real students (the hook returns
            empty for guests + non-students). */}
        {(user?.role === 'student' && !user?.isGuest) && (
          <DailyMissionsCard
            missions={dailyMissions.missions}
            isLoading={dailyMissions.isLoading}
          />
        )}
        <StudentAssignmentsList
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
          studentDataLoading={studentDataLoading}
          userUid={user.uid}
          competitionsByAssignment={competitionsByAssignment}
          setActiveAssignment={setActiveAssignment}
          setAssignmentWords={setAssignmentWords}
          setView={setView}
          setShowModeSelection={setShowModeSelection}
        />
        {/* ── INFO ZONE ──────────────────────────────────────────
            Below-the-fold achievement / status cards. */}
        <StudentStatsRow
          xp={xp}
          streak={streak}
          studentAssignments={studentAssignments}
          studentProgress={studentProgress}
        />
        <LeaderboardTeaser
          classCode={user.classCode}
          currentStudentUid={user.uid}
          currentXp={xp}
          setView={setView}
        />
        <ActiveBoostersStrip {...boosters} />
        {/* Hide the strip for day-one students with no badges yet —
            otherwise they see a row of locked tiles that reads as
            "broken" instead of "you haven't earned any yet". */}
        {badges.length > 0 && <BadgesStrip earned={badges} userUid={user.uid} onClaimBadgeXp={onClaimBadgeXp} />}
      </div>
      <PetCompanion
        xp={xp}
        displayName={user.displayName}
        streak={streak}
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
