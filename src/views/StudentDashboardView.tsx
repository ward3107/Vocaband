import StudentOnboarding from "../components/StudentOnboarding";
import FloatingButtons from "../components/FloatingButtons";
import StudentTopBar from "../components/dashboard/StudentTopBar";
import PetCompanion from "../components/dashboard/PetCompanion";
import RewardInboxCard from "../components/dashboard/RewardInboxCard";
import StudentAssignmentsList from "../components/dashboard/StudentAssignmentsList";
import StudentGreetingCard from "../components/dashboard/StudentGreetingCard";
import { useCompetitionsForClass } from "../hooks/useCompetitions";
import { motion } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import type { Language } from "../hooks/useLanguage";
import { ARCADE_BG, ARCADE_BUTTON_TOUCH } from "../components/arcade/theme";
import ArcadeHubLayout from "../components/arcade/ArcadeHubLayout";
import EvolutionRing from "../components/arcade/EvolutionRing";
import OrbitalHub, { type OrbitItem } from "../components/arcade/OrbitalHub";
import { getXpTitle, type PetRewardKind, type PetMilestone } from "../constants/game";
import { claimPetMilestoneReward } from "../handlers/retentionGrants";
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

/** Labels for the two solo circles + the Tasks page, per language. */
const SOLO_LABELS: Record<Language, { idioms: string; speed: string }> = {
  en: { idioms: "Idioms", speed: "Speed Round" },
  he: { idioms: "ניבים", speed: "סבב מהיר" },
  ar: { idioms: "تعابير", speed: "جولة سريعة" },
  ru: { idioms: "Идиомы", speed: "Скоростной раунд" },
};
const TASKS_TITLE: Record<Language, string> = { en: "Tasks", he: "משימות", ar: "المهام", ru: "Задания" };
const BACK_LABEL: Record<Language, string> = { en: "Back", he: "חזרה", ar: "رجوع", ru: "Назад" };

/**
 * SoloCircle — a single medallion launcher styled like the orbital-ring
 * circles, but rendered OFF the ring (its own row beneath the hub) so the
 * bonus solo modes read as separate from the main destinations.
 */
function SoloCircle({
  emoji, gradient, label, onClick,
}: { emoji: string; gradient: string; label: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={label}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className={`${gradient} ${ARCADE_BUTTON_TOUCH} flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-lg ring-2 ring-white/30 sm:h-20 sm:w-20 sm:text-4xl lg:h-24 lg:w-24 lg:text-5xl`}
      >
        <span aria-hidden className="drop-shadow">{emoji}</span>
      </motion.button>
      <span className="text-[11px] font-bold leading-tight text-white/90 sm:text-sm">{label}</span>
    </div>
  );
}

export default function StudentDashboardView({
  user, xp, coins, setCoins: _setCoins, streak, badges,
  copiedCode, setCopiedCode,
  studentAssignments, studentProgress, studentDataLoading,
  showStudentOnboarding, setShowStudentOnboarding,
  consentModal, exitConfirmModal, classSwitchModal, classNotFoundBanner,
  setView,
  setActiveAssignment, setAssignmentWords, setShowModeSelection,
  retention, onGrantXp, onGrantReward, onApplyServerRewards,
  evolutionPending,
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

  const { language, dir, isRTL } = useLanguage();
  const solo = SOLO_LABELS[language] || SOLO_LABELS.en;

  // Assignments live behind the Tasks circle now — the home screen is just
  // the orbital hub. Opening Tasks reveals the assignment list as its own
  // full-screen page; it self-unmounts when an assignment launches a game.
  const [tasksOpen, setTasksOpen] = React.useState(false);

  // Lock the page behind the full-screen Tasks overlay so the dashboard
  // doesn't scroll underneath it (external-system sync — body is not React).
  React.useEffect(() => {
    if (typeof document === "undefined" || !tasksOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [tasksOpen]);

  // Pet info card — opened by tapping the central orbital pet, or auto-
  // opened the moment a milestone becomes claimable so the student never
  // misses an unlock. Keyed on the stage string (not the object) so the
  // effect fires once per new claimable, not on every render.
  const [petCardOpen, setPetCardOpen] = React.useState(false);
  const claimableStage = retention.claimablePetMilestone?.stage;
  React.useEffect(() => {
    if (claimableStage) setPetCardOpen(true);
  }, [claimableStage]);

  // Pet-milestone claim — used by the pet info card (PetCompanion).
  // Grants the reward, then records the claim so it won't re-surface.
  const handleClaimMilestone = (milestone: PetMilestone | null) => {
    if (!milestone) return;
    claimPetMilestoneReward(milestone, onGrantXp, onGrantReward, retention.claimPetMilestone);
  };

  // Orbit circles either launch Play, navigate to a dedicated view, or
  // smooth-scroll to a card still rendered on the home screen. Tasks is
  // the only remaining scroll target — Assignments stays on the home page
  // as the core loop. Practice / Missions / Boosts / Badges each open
  // their own full-screen page (StudentHubSubView).
  // Five circles, one clear hero — a handful of obvious destinations, not a
  // wall of choices:  Play · Tasks · Daily · Shop · Ranks
  // Tasks opens the assignment list as its own page; Daily folds chest/weekly
  // + missions + goal + active boosts + badges. The old Practice circle is
  // gone — its surviving modes (Idioms + Speed Round) now sit as two separate
  // circles beneath the ring. Order = clockwise from the top so Play sits
  // dead-centre at 12 o'clock.
  const orbitItems: OrbitItem[] = [
    { key: "play", onClick: () => { void launchNextAssignment?.(); }, disabled: !launchNextAssignment },
    { key: "tasks", onClick: () => setTasksOpen(true), badge: studentAssignments.length || undefined },
    { key: "shop", onClick: () => setView("shop") },
    { key: "leaderboard", onClick: () => setView("global-leaderboard") },
    { key: "daily", onClick: () => setView("student-daily") },
  ];

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
                onTap={() => setPetCardOpen((v) => !v)}
              />
            }
          />
        }
      >
        {classNotFoundBanner}
        {/* Teacher rewards land here FIRST so the student sees the
            celebration before anything else. Hides itself when empty. */}
        <RewardInboxCard
          userUid={user.uid}
          onServerRewardsArrived={({ xpToAdd, badgesToAppend }) => {
            onApplyServerRewards({ xpToAdd, badgesToAppend });
          }}
        />
        {/* Two solo bonus modes, deliberately kept OFF the orbital ring so
            they read as separate. The only thing beneath the hub — home is
            otherwise just the ring (assignments moved behind the Tasks
            circle, pet status opens by tapping the centre pet). */}
        {(onStartIdioms || onStartClassMinute) && (
          <div className="flex items-start justify-center gap-12 pt-2 sm:gap-20">
            {onStartIdioms && (
              <SoloCircle
                emoji="💬"
                gradient="bg-gradient-to-br from-sky-400 to-blue-500"
                label={solo.idioms}
                onClick={onStartIdioms}
              />
            )}
            {onStartClassMinute && (
              <SoloCircle
                emoji="⚡"
                gradient="bg-gradient-to-br from-red-400 via-orange-500 to-amber-400"
                label={solo.speed}
                onClick={onStartClassMinute}
              />
            )}
          </div>
        )}
      </ArcadeHubLayout>

      {/* Tasks page — the assignment list as its own full-screen surface,
          opened from the Tasks circle. Launching an assignment switches the
          app view (game/mode-select), which unmounts this overlay. */}
      {tasksOpen && (
        <div dir={dir} className={`fixed inset-0 z-40 overflow-y-auto ${ARCADE_BG}`}>
          <div className="relative z-10 mx-auto max-w-3xl space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)] sm:space-y-6 sm:p-6">
            <header className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <button
                type="button"
                onClick={() => setTasksOpen(false)}
                aria-label={BACK_LABEL[language] || BACK_LABEL.en}
                className={`${ARCADE_BUTTON_TOUCH} flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20`}
              >
                <span aria-hidden>{isRTL ? "→" : "←"}</span>
              </button>
              <h1 className="flex items-center gap-2 text-2xl font-black text-white">
                <span aria-hidden>📋</span>
                {TASKS_TITLE[language] || TASKS_TITLE.en}
              </h1>
            </header>
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
        </div>
      )}
      <PetCompanion
        open={petCardOpen}
        onClose={() => setPetCardOpen(false)}
        xp={xp}
        displayName={user.displayName}
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
