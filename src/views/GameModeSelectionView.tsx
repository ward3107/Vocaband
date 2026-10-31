import type React from "react";
import { useState } from "react";
import {
  BookOpen, Volume2, PenTool, Zap, Layers, Shuffle, Repeat, X, Brain, Edit3, Check,
} from "lucide-react";
import type { GameMode, PetMilestone } from "../constants/game";
import { MAX_ASSIGNMENT_ROUNDS } from "../constants/game";
import type { AssignmentData, ProgressData } from "../core/supabase";
import { DIFFICULTY_META, getModeDifficulty } from "../components/setup/types";
import { computeRoundsCompleted, sumPlayCountFromProgress } from "../hooks/useAssignmentPlays";
import { useLanguage } from "../hooks/useLanguage";
import type { Language } from "../hooks/useLanguage";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { gameModesT, type GameModeId } from "../locales/student/game-modes";
import { ARCADE_BUTTON_TOUCH } from "../components/arcade/theme";
import type { MapIsland } from "../components/arcade/IslandMap";
import IslandDetailSheet, { type IslandSheetMode } from "../components/arcade/IslandDetailSheet";
import type { IslandState } from "../components/arcade/ModeIsland";
import EvolutionRing from "../components/arcade/EvolutionRing";
import PetCompanion from "../components/dashboard/PetCompanion";
import StudentLangButton from "../components/StudentLangButton";
import ModeActivityCard from "../components/arcade/ModeActivityCard";
import ModeQuestHero from "../components/arcade/ModeQuestHero";
import { modeJourneyT } from "../locales/student/mode-journey";

const MODE_GRADIENTS: Record<string, string> = {
  cyan: "from-cyan-400 to-blue-500", emerald: "from-emerald-400 to-teal-500",
  lime: "from-lime-400 to-green-500", blue: "from-blue-400 to-indigo-500",
  purple: "from-purple-400 to-violet-600", amber: "from-amber-400 to-orange-500",
  pink: "from-pink-400 to-rose-500", rose: "from-rose-400 to-pink-600",
  indigo: "from-indigo-400 to-violet-600", fuchsia: "from-fuchsia-400 to-purple-600",
  violet: "from-violet-400 to-purple-600", teal: "from-teal-400 to-cyan-500",
  red: "from-red-400 to-rose-600",
};

const QUEST_STRINGS: Record<Language, { modesDone: string; round: string }> = {
  en: { modesDone: "modes", round: "Round" },
  he: { modesDone: "מצבים", round: "סבב" },
  ar: { modesDone: "أوضاع", round: "جولة" },
};

const MODE_STATE = {
  en: { done: "completed", next: "recommended next", todo: "to play", locked: "locked" },
  he: { done: "הושלם", next: "הבא המומלץ", todo: "לשחק", locked: "נעול" },
  ar: { done: "مكتمل", next: "التالي المقترح", todo: "للعب", locked: "مقفل" },
} satisfies Record<Language, Record<IslandState, string>>;

interface GameModeSelectionViewProps {
  activeAssignment: AssignmentData | null;
  studentProgress: ProgressData[];
  isQuickPlayGuest: boolean;
  quickPlayCompletedModes: Set<string>;
  setGameMode: (mode: GameMode) => void;
  setShowModeSelection: (v: boolean) => void;
  setShowModeIntro: (v: boolean) => void;
  handleExitGame: () => void;
  petDisplayName: string;
  petXp: number;
  petCurrentStage: PetMilestone;
  petNextStage: PetMilestone | null;
  petClaimableMilestone: PetMilestone | null;
  onClaimPetMilestone: (milestone: PetMilestone) => void;
  /** A10 — Quick Play only: return to the join screen to fix a name typo,
   *  keeping avatar + language. Undefined for logged-in students. */
  onEditName?: () => void;
}

export default function GameModeSelectionView({
  activeAssignment, studentProgress, isQuickPlayGuest, quickPlayCompletedModes,
  setGameMode, setShowModeSelection, setShowModeIntro, handleExitGame,
  petDisplayName, petXp, petCurrentStage, petNextStage, petClaimableMilestone, onClaimPetMilestone,
  onEditName,
}: GameModeSelectionViewProps) {
  const { language, dir } = useLanguage();
  const reduced = useReducedMotion();
  const t = gameModesT[language] ?? gameModesT.en;
  const qs = QUEST_STRINGS[language] ?? QUEST_STRINGS.en;
  const journey = modeJourneyT[language];

  const modesMeta: Array<{ id: GameMode; color: string; icon: React.ReactNode; isLearnMode?: boolean }> = [
    { id: "flashcards", color: "cyan", icon: <Layers size={44} />, isLearnMode: true },
    { id: "classic", color: "emerald", icon: <BookOpen size={44} /> },
    { id: "fill-blank", color: "lime", icon: <Edit3 size={44} /> },
    { id: "listening", color: "blue", icon: <Volume2 size={44} /> },
    { id: "spelling", color: "purple", icon: <PenTool size={44} /> },
    { id: "matching", color: "amber", icon: <Zap size={44} /> },
    { id: "memory-flip", color: "pink", icon: <Brain size={44} /> },
    { id: "true-false", color: "rose", icon: <Check size={44} /> },
    { id: "scramble", color: "indigo", icon: <Shuffle size={44} /> },
    { id: "reverse", color: "fuchsia", icon: <Repeat size={44} /> },
    { id: "letter-sounds", color: "violet", icon: <span className="text-4xl">🔡</span> },
    { id: "sentence-builder", color: "teal", icon: <span className="text-4xl">🧩</span> },
    { id: "speed-round", color: "red", icon: <span className="text-4xl">⚡</span> },
  ];

  const modes = modesMeta.map((m) => ({
    ...m,
    name: t.modes[m.id as GameModeId].name,
    desc: t.modes[m.id as GameModeId].desc,
  }));

  const allowedModes = activeAssignment?.allowedModes || modes.map((m) => m.id);
  const filteredModes = modes.filter((m) => allowedModes.includes(m.id));
  const learnMode = modes.find((m) => m.isLearnMode && allowedModes.includes(m.id));
  const practiceModes = filteredModes.filter((m) => !m.isLearnMode);

  const rowsFor = (id: string) =>
    studentProgress.filter((p) => p.assignmentId === activeAssignment?.id && p.mode === id);
  const isCompleted = (id: string) => rowsFor(id).length > 0 || (isQuickPlayGuest && quickPlayCompletedModes.has(id));
  const isLocked = (id: string) => isQuickPlayGuest && quickPlayCompletedModes.has(id);
  const bestScore = (id: string) => {
    const rows = rowsFor(id);
    return rows.length ? Math.max(0, ...rows.map((r) => r.score ?? 0)) : null;
  };
  const masteryStars = (id: string) => {
    const best = bestScore(id);
    if (best == null) return 0;
    return best >= 90 ? 3 : best >= 60 ? 2 : 1;
  };

  const stops = [learnMode, ...practiceModes].filter(Boolean) as typeof modes;

  let recommendedId: GameMode | undefined = stops.find((m) => !isLocked(m.id) && !isCompleted(m.id))?.id;
  if (!recommendedId) {
    const playable = practiceModes.filter((m) => !isLocked(m.id));
    recommendedId = [...playable].sort((a, b) => masteryStars(a.id) - masteryStars(b.id))[0]?.id;
  }
  const recommendedIndex = Math.max(0, stops.findIndex((m) => m.id === recommendedId));

  const totalModes = practiceModes.length;
  const completedCount = practiceModes.filter((m) => isCompleted(m.id)).length;
  const totalPlays = activeAssignment ? sumPlayCountFromProgress(studentProgress, activeAssignment.id) : 0;
  const currentRound = Math.min(MAX_ASSIGNMENT_ROUNDS, computeRoundsCompleted(totalPlays, totalModes) + 1);
  const showRoundPill = Boolean(activeAssignment) && totalModes > 0;

  const islands: MapIsland[] = stops.map((m, i) => {
    const state: IslandState = isLocked(m.id)
      ? "locked"
      : i === recommendedIndex
        ? "next"
        : isCompleted(m.id)
          ? "done"
          : "todo";
    return {
      id: m.id, name: m.name, emoji: m.icon,
      gradient: MODE_GRADIENTS[m.color] ?? "from-violet-400 to-fuchsia-500",
      state, mastery: masteryStars(m.id),
    };
  });

  const launch = (id: GameMode) => {
    setGameMode(id);
    setShowModeSelection(false);
    setShowModeIntro(true);
  };

  const [sheetIndex, setSheetIndex] = useState<number | null>(null);
  const [petOpen, setPetOpen] = useState(false);

  const sheetMode: IslandSheetMode | null =
    sheetIndex != null && stops[sheetIndex]
      ? (() => {
          const m = stops[sheetIndex];
          const diff = DIFFICULTY_META[getModeDifficulty(m.id)];
          return {
            name: m.name, desc: m.desc, emoji: m.icon,
            gradient: MODE_GRADIENTS[m.color] ?? "from-violet-400 to-fuchsia-500",
            difficultyStars: diff.stars, difficultyLabel: diff.label,
            best: bestScore(m.id),
          };
        })()
      : null;

  return (
    <div dir={dir} className="vb-page relative">
      <header className="vb-header sticky top-0 z-30">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button" onClick={handleExitGame} aria-label={t.closeAria} title={t.closeAria}
          className="vb-icon-button"
        >
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 text-sm font-extrabold leading-snug text-[var(--vb-text-primary)] sm:text-lg">{t.chooseYourMode}</h1>
          {activeAssignment?.title && (
            <p className="truncate text-xs font-semibold text-[color:var(--ios-label-secondary)]">{activeAssignment.title}</p>
          )}
        </div>
        {isQuickPlayGuest && onEditName && (
          <button
            type="button"
            onClick={onEditName}
            title={t.editName}
            aria-label={t.editName}
            className={`${ARCADE_BUTTON_TOUCH} flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--ios-fill-tertiary)] sm:w-auto sm:px-3 text-[color:var(--ios-label)]`}
          >
            <Edit3 size={16} />
            <span className="hidden text-xs font-bold sm:inline">{t.editName}</span>
          </button>
        )}
        <StudentLangButton className="shrink-0" />
        </div>
      </header>

      <div className="vb-content space-y-5 py-4 pb-20 sm:space-y-6 sm:py-6">
        <ModeQuestHero
          completed={completedCount}
          total={totalModes}
          countLabel={completedCount + "/" + totalModes + " " + qs.modesDone}
          roundLabel={showRoundPill ? qs.round + " " + currentRound + "/" + MAX_ASSIGNMENT_ROUNDS : undefined}
          companion={<EvolutionRing currentStage={petCurrentStage} nextStage={petNextStage} xp={petXp}
            evolutionPending={false} hasClaimable={!!petClaimableMilestone} onTap={() => setPetOpen(true)} />}
          petName={petDisplayName}
          petXp={petXp}
          onOpenCompanion={() => setPetOpen(true)}
        />
        <section aria-label={journey.activities}>
          <h2 className="mb-3 text-sm font-extrabold text-[var(--vb-text-primary)] sm:text-base">{journey.activities}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {islands.map((island, i) => (
              <ModeActivityCard key={island.id} name={island.name} description={stops[i].desc}
                icon={island.emoji} gradient={island.gradient} state={island.state}
                stateLabel={MODE_STATE[language][island.state]} mastery={island.mastery}
                onSelect={() => setSheetIndex(i)} />
            ))}
          </div>
        </section>
      </div>

      <IslandDetailSheet
        open={sheetIndex != null}
        mode={sheetMode}
        onClose={() => setSheetIndex(null)}
        onPlay={() => {
          if (sheetIndex != null && stops[sheetIndex]) launch(stops[sheetIndex].id);
        }}
        reduced={reduced}
      />

      <PetCompanion
        open={petOpen}
        onClose={() => setPetOpen(false)}
        xp={petXp}
        displayName={petDisplayName}
        currentStage={petCurrentStage}
        nextStage={petNextStage}
        claimableMilestone={petClaimableMilestone}
        onClaim={(m) => { onClaimPetMilestone(m); setPetOpen(false); }}
      />
    </div>
  );
}
