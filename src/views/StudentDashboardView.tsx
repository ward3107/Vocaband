import StudentOnboarding from "../components/StudentOnboarding";
import FloatingButtons from "../components/FloatingButtons";
import StudentTopBar from "../components/dashboard/StudentTopBar";
import StudentStatsRow from "../components/dashboard/StudentStatsRow";
import DailyGoalBanner from "../components/dashboard/DailyGoalBanner";
import BadgesStrip from "../components/dashboard/BadgesStrip";
import LeaderboardTeaser from "../components/dashboard/LeaderboardTeaser";
import PetCompanion from "../components/dashboard/PetCompanion";
import RetentionStrip from "../components/dashboard/RetentionStrip";
import ActiveBoostersStrip from "../components/dashboard/ActiveBoostersStrip";
import RewardInboxCard from "../components/dashboard/RewardInboxCard";
import StudentAssignmentsList from "../components/dashboard/StudentAssignmentsList";
import DailyPracticeRow from "../components/dashboard/DailyPracticeRow";
import StudentWelcomeCard from "../components/dashboard/StudentWelcomeCard";
import { useCompetitionsForClass } from "../hooks/useCompetitions";
import DailyMissionsCard from "../components/dashboard/DailyMissionsCard";
import { useDailyMissions } from "../hooks/useDailyMissions";
import { useDueReviews } from "../hooks/useDueReviews";
import ArcadeHubLayout from "../components/arcade/ArcadeHubLayout";
import ArcadeStatsBar from "../components/arcade/ArcadeStatsBar";
import TrophyRoadStrip from "../components/arcade/TrophyRoadStrip";
import EvolutionCore from "../components/arcade/EvolutionCore";
import CharacterStage from "../components/arcade/CharacterStage";
import OrbitalHub, { type OrbitItem } from "../components/arcade/OrbitalHub";
import { getXpTitle, type PetRewardKind, type PetMilestone } from "../constants/game";
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
  studentAssignments, studentProgress, studentDataLoading,
  showStudentOnboarding, setShowStudentOnboarding,
  consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
  setView,
  setActiveAssignment, setAssignmentWords, setShowModeSelection,
  retention, onGrantXp, onClaimBadgeXp, onGrantReward, onApplyServerRewards, boosters,
  evolutionPending,
  onStartReview,
  onStartClassMinute,
  onStartIdioms,
  onRequestLogout,
}: StudentDashboardViewProps) {
  // Classroom competitions wrapping any of this student's assignments.
  // Cheap query (one row per assignment that has competition mode on);
  // realtime-pushed via `useCompetitionsForClass`.  Keyed by
  // assignmentId so the cards can do an O(1) lookup.
  const { competitions } = useCompetitionsForClass(user.classCode);
  const competitionsByAssignment = new Map(
    competitions.map((c) => [c.assignmentId, c] as const),
  );

  // Same picker the assignments list uses internally — re-derived here so
  // the orbital Play circle launches the single most-relevant target on
  // tap. Null when nothing is eligible, in which case Play renders disabled.
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

  // Shared pet-milestone claim — used by both the EvolutionCore status
  // panel and the floating PetCompanion. Grants the reward, then records
  // the claim so it won't re-surface.
  const handleClaimMilestone = (milestone: PetMilestone | null) => {
    if (!milestone) return;
    if (milestone.reward.kind === "xp" && typeof milestone.reward.value === "number") {
      onGrantXp(milestone.reward.value, `${milestone.emoji} ${milestone.stage} evolved! ${milestone.reward.label}`);
    } else {
      onGrantReward(milestone.reward.kind, milestone.reward.value);
    }
    retention.claimPetMilestone(milestone);
  };

  // Orbit circles route to a destination view, launch Play, or smooth-
  // scroll to the matching content card rendered below the ring. The
  // content lives below so each circle has a real surface to land on —
  // the ring is the launcher, the cards are the detail.
  const scrollToId = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const orbitItems: OrbitItem[] = [
    { key: "play", onClick: () => { void launchNextAssignment?.(); }, disabled: !launchNextAssignment },
    { key: "tasks", onClick: () => scrollToId("dash-assignments"), badge: studentAssignments.length || undefined },
    { key: "shop", onClick: () => setView("shop") },
    { key: "leaderboard", onClick: () => setView("global-leaderboard") },
  ];
  if (onStartReview || onStartClassMinute || onStartIdioms) {
    orbitItems.push({ key: "practice", onClick: () => scrollToId("dash-practice"), badge: dueReviews.dueCount || undefined });
  }
  if (user?.role === "student" && !user?.isGuest) {
    orbitItems.push({ key: "missions", onClick: () => scrollToId("dash-missions") });
  }
  orbitItems.push({ key: "boosters", onClick: () => scrollToId("dash-boosters") });
  if (badges.length > 0) {
    orbitItems.push({ key: "badges", onClick: () => scrollToId("dash-badges") });
  }

  // ── DASHBOARD RENDER ──────────────────────────────────────────────
  // Circular hub: the pet-evolution core sits at the centre of the
  // orbital ring; the student's destinations orbit it as tappable
  // circles. The legacy stacked cards live below as the content surfaces
  // the ring scrolls to. Live for every student (no feature flag).
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
        trophyRoad={<TrophyRoadStrip xp={xp} />}
        character={
          <OrbitalHub
            items={orbitItems}
            center={
              <CharacterStage
                currentStage={retention.currentPetStage}
                nextStage={retention.nextPetStage}
                xp={xp}
                evolutionPending={evolutionPending}
                hasClaimable={!!retention.claimablePetMilestone}
                displayName={user.displayName}
              />
            }
          />
        }
      >
        {classNotFoundBanner}
        <StudentTopBar onRequestLogout={onRequestLogout} />
        {/* Teacher rewards land here FIRST so the student sees the
            celebration before anything else. Hides itself when empty. */}
        <RewardInboxCard
          userUid={user.uid}
          onServerRewardsArrived={({ xpToAdd, badgesToAppend }) => {
            onApplyServerRewards({ xpToAdd, badgesToAppend });
          }}
        />
        {!studentDataLoading && studentAssignments.length === 0 && (
          <StudentWelcomeCard displayName={user.displayName} />
        )}
        {/* Pet status — progress / mood / claimable reward / 8-stage
            ladder. The pet itself is drawn in the orbital centre, so we
            hide EvolutionCore's own copy (hidePet) to avoid two pets. */}
        <EvolutionCore
          currentStage={retention.currentPetStage}
          nextStage={retention.nextPetStage}
          xp={xp}
          evolutionPending={evolutionPending}
          claimableMilestone={retention.claimablePetMilestone}
          onClaim={handleClaimMilestone}
          displayName={user.displayName}
          hidePet
        />
        <div id="dash-practice">
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
        </div>
        <RetentionStrip retention={retention} onGrantXp={onGrantXp} />
        <DailyGoalBanner studentProgress={studentProgress} onPlay={launchNextAssignment} />
        {(user?.role === 'student' && !user?.isGuest) && (
          <div id="dash-missions">
            <DailyMissionsCard
              missions={dailyMissions.missions}
              isLoading={dailyMissions.isLoading}
            />
          </div>
        )}
        <div id="dash-assignments">
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
        </div>
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
        <div id="dash-boosters">
          <ActiveBoostersStrip {...boosters} />
        </div>
        {/* Hidden for day-one students with no badges yet — otherwise the
            strip reads as a row of broken locked tiles. */}
        {badges.length > 0 && (
          <div id="dash-badges">
            <BadgesStrip earned={badges} userUid={user.uid} onClaimBadgeXp={onClaimBadgeXp} />
          </div>
        )}
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
