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
import { THEMES, getXpTitle, type PetRewardKind } from "../constants/game";
import type { AppUser, AssignmentData, ProgressData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import type { RetentionState } from "../hooks/useRetention";
import { ALL_WORDS } from "../data/vocabulary";
import { pickNextAssignment } from "../utils/pickNextAssignment";
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
  retention, onGrantXp, onGrantReward, onApplyServerRewards, boosters,
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
    ? () => {
        const filteredWords =
          nextPick.assignment.words ||
          ALL_WORDS.filter((w) => nextPick.assignment.wordIds.includes(w.id));
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

  // ── DASHBOARD RENDER ──────────────────────────────────────────────
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
        {/* ── Dreidel Blitz join — visible to students with a class.
            Tap to join the teacher's live blitz session.  The session
            may not exist yet; the join view shows a "waiting…" state
            until DREIDEL_STATE arrives. */}
        {user.classCode && !user.isGuest && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setView('dreidel-student')}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className="w-full rounded-2xl p-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-300/40 hover:shadow-xl active:scale-[0.99] transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl shrink-0">
                🎲
              </div>
              <div className="flex-1 min-w-0 text-start">
                <p className="font-black text-base">Join Dreidel Blitz</p>
                <p className="text-xs text-white/85 mt-0.5">Live letter race — fastest word wins</p>
              </div>
              <span className="text-2xl shrink-0">→</span>
            </button>
          </div>
        )}
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
        {badges.length > 0 && <BadgesStrip earned={badges} />}
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
