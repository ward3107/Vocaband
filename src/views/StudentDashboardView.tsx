import StudentOnboarding from "../components/StudentOnboarding";
import FloatingButtons from "../components/FloatingButtons";
import StudentTopBar from "../components/dashboard/StudentTopBar";
import PetCompanion from "../components/dashboard/PetCompanion";
import Pet3DCard from "../components/dashboard/Pet3DCard";
import RewardInboxCard from "../components/dashboard/RewardInboxCard";
import PushOptInCard from "../components/PushOptInCard";
import StudentVisibilityConsent from "../components/StudentVisibilityConsent";
import StudentAssignmentsList from "../components/dashboard/StudentAssignmentsList";
import StudentWelcomeCard from "../components/dashboard/StudentWelcomeCard";
import StudentGreetingCard from "../components/dashboard/StudentGreetingCard";
import { useCompetitionsForClass } from "../hooks/useCompetitions";
import { useDueReviews } from "../hooks/useDueReviews";
import ArcadeHubLayout from "../components/arcade/ArcadeHubLayout";
import EvolutionRing from "../components/arcade/EvolutionRing";
import OrbitalHub, { type OrbitItem } from "../components/arcade/OrbitalHub";
import { getXpTitle, PET_ACCESSORIES, type PetRewardKind, type PetMilestone } from "../constants/game";
import { claimPetMilestoneReward } from "../handlers/retentionGrants";
import { usePetAccessory } from "../hooks/usePetAccessory";
import type { AppUser, AssignmentData, ProgressData } from "../core/supabase";
import type { Word } from "../data/vocabulary";
import type { View } from "../core/views";
import type { RetentionState } from "../hooks/useRetention";
import { pickNextAssignment } from "../utils/pickNextAssignment";
import { resolveAssignmentWords } from "../utils/resolveAssignmentWords";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface StudentDashboardViewProps {
  user: AppUser;
  xp: number;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
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
  /** Coin grant for pet-milestone claims (evolutions now pay coins). */
  onGrantCoins: (amount: number, reason: string) => void;
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
  onApplyServerRewards: (summary: { xpToAdd: number; coinsToAdd: number; badgesToAppend: string[] }) => void;
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
  user, xp, coins, setCoins: _setCoins, streak, badges,
  copiedCode, setCopiedCode,
  studentAssignments, studentProgress, studentDataLoading,
  showStudentOnboarding, setShowStudentOnboarding,
  consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
  setView,
  setActiveAssignment, setAssignmentWords, setShowModeSelection,
  retention, onGrantXp, onGrantCoins, onGrantReward, onApplyServerRewards,
  evolutionPending,
  onStartReview,
  onStartClassMinute,
  onStartIdioms,
  onRenameDisplayName,
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

  // Spaced repetition — surfaces today's due-for-review words.  Hook
  // only activates when a parent supplied an onStartReview callback;
  // without that the hook stays idle.  Used here purely for the count
  // chip on the Practice orbit circle — the Practice page itself
  // re-fetches the queue when opened.
  const dueReviews = useDueReviews({
    enabled: Boolean(user?.role === 'student' && !user?.isGuest && onStartReview),
  });

  // Pet info card — opened by tapping the central orbital pet, or auto-
  // opened the moment a milestone becomes claimable so the student never
  // misses an unlock. Keyed on the stage string (not the object) so the
  // effect fires once per new claimable, not on every render.
  const [petCardOpen, setPetCardOpen] = React.useState(false);
  // Assignments now live behind the "Tasks" orbit circle as a full-screen
  // sheet, so the home page stays a clean hub (no long list scrolling
  // below the ring).
  const [tasksOpen, setTasksOpen] = React.useState(false);
  // Pet Shop accessory the student has equipped — worn on the pet here.
  const petAccessory = usePetAccessory(user.uid);
  const petAccessoryEmoji = petAccessory.equipped
    ? PET_ACCESSORIES.find(a => a.id === petAccessory.equipped)?.emoji ?? null
    : null;
  const claimableStage = retention.claimablePetMilestone?.stage;
  React.useEffect(() => {
    if (claimableStage) setPetCardOpen(true);
  }, [claimableStage]);

  // Pet-milestone claim — used by the pet info card (PetCompanion).
  // Grants the reward, then records the claim so it won't re-surface.
  const handleClaimMilestone = (milestone: PetMilestone | null) => {
    if (!milestone) return;
    claimPetMilestoneReward(milestone, onGrantXp, onGrantReward, retention.claimPetMilestone, onGrantCoins);
  };

  // Orbit circles either launch Play or open a destination. Tasks opens
  // the assignments sheet (setTasksOpen); the rest navigate to their own
  // full-screen page (StudentHubSubView) or a top-level view.
  //
  // Six circles, one clear hero. Everything secondary is grouped so kids
  // see a handful of obvious destinations, not a wall of choices:
  //   Play · Tasks · Practice · Daily · Shop · Ranks
  // Daily folds chest/weekly + missions + goal + active boosts + badges.
  // Order = clockwise from the top so Play sits dead-centre at 12 o'clock.
  const orbitItems: OrbitItem[] = [
    { key: "play", onClick: () => { void launchNextAssignment?.(); }, disabled: !launchNextAssignment },
    { key: "tasks", onClick: () => setTasksOpen(true), badge: studentAssignments.length || undefined },
    { key: "shop", onClick: () => setView("shop") },
    { key: "leaderboard", onClick: () => setView("global-leaderboard") },
    { key: "daily", onClick: () => setView("student-daily") },
  ];
  if (onStartReview || onStartClassMinute || onStartIdioms) {
    orbitItems.push({ key: "practice", onClick: () => setView("student-practice"), badge: dueReviews.dueCount || undefined });
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
      {/* First-login disclosure: the student must affirm they understand
          their teacher can see their gameplay before they can play.
          Hard-gates the dashboard until accepted; self-skips once the
          current STUDENT_VISIBILITY_VERSION is on file. */}
      <StudentVisibilityConsent studentUid={user.uid} />
      {showStudentOnboarding && (
        <StudentOnboarding
          userName={user.displayName}
          onComplete={() => setShowStudentOnboarding(false)}
        />
      )}
      <ArcadeHubLayout
        topBar={<StudentTopBar onRequestLogout={onRequestLogout} />}
        statsBar={
          <StudentGreetingCard
            user={user}
            xp={xp}
            coins={coins}
            streak={streak}
            badges={badges}
            copiedCode={copiedCode}
            setCopiedCode={setCopiedCode}
            onRenameDisplayName={onRenameDisplayName}
          />
        }
        character={
          <OrbitalHub
            items={orbitItems}
            center={
              <EvolutionRing
                currentStage={retention.currentPetStage}
                nextStage={retention.nextPetStage}
                xp={xp}
                evolutionPending={evolutionPending}
                hasClaimable={!!retention.claimablePetMilestone}
                accessoryEmoji={petAccessoryEmoji}
                onTap={() => setPetCardOpen((v) => !v)}
              />
            }
          />
        }
      >
        {classNotFoundBanner}
        {/* Opt-in nudge for push notifications. Self-hides unless the
            feature flag is on for this class and the student hasn't
            decided yet — so it's invisible until the feature is enabled. */}
        <PushOptInCard user={user} />
        {/* Teacher rewards land here FIRST so the student sees the
            celebration before anything else. Hides itself when empty. */}
        <RewardInboxCard
          userUid={user.uid}
          onServerRewardsArrived={({ xpToAdd, coinsToAdd, badgesToAppend }) => {
            onApplyServerRewards({ xpToAdd, coinsToAdd, badgesToAppend });
          }}
        />
        {/* Always-visible 3D pet — a real spinnable model so every student
            sees their pet in 3D, regardless of stage. */}
        <Pet3DCard stage={retention.currentPetStage.stage} />
        {!studentDataLoading && studentAssignments.length === 0 && (
          <StudentWelcomeCard displayName={user.displayName} />
        )}
        {/* Home is intentionally just the orbital hub + Assignments. Pet
            status opens by tapping the centre pet; XP / streak live in the
            top pill; daily rewards + goal moved to the Rewards page; ranks
            to the Ranks circle. Assignments moved off the home page into
            the Tasks sheet (below) — the orbit's "Tasks" circle opens it. */}
      </ArcadeHubLayout>

      {/* Tasks sheet — full-screen assignments list, opened from the
          "Tasks" orbit circle. Slides up over the hub; scrollable; centred
          with a max width so it reads well on phone, tablet, and desktop. */}
      <AnimatePresence>
        {tasksOpen && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-indigo-950 via-violet-950 to-fuchsia-950"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5 sm:px-6">
              <div className="mb-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setTasksOpen(false)}
                  aria-label="Close"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur transition-transform active:scale-95 hover:bg-white/15"
                >
                  <X size={22} />
                </button>
              </div>
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
          </motion.div>
        )}
      </AnimatePresence>
      <PetCompanion
        open={petCardOpen}
        onClose={() => setPetCardOpen(false)}
        xp={xp}
        displayName={user.displayName}
        currentStage={retention.currentPetStage}
        nextStage={retention.nextPetStage}
        claimableMilestone={retention.claimablePetMilestone}
        accessoryEmoji={petAccessoryEmoji}
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
