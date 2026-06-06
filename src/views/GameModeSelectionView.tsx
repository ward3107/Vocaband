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
import { ARCADE_BG, ARCADE_BUTTON_TOUCH } from "../components/arcade/theme";
import IslandMap, { type MapIsland } from "../components/arcade/IslandMap";
import IslandDetailSheet, { type IslandSheetMode } from "../components/arcade/IslandDetailSheet";
import type { IslandState } from "../components/arcade/ModeIsland";
import PetCompanion from "../components/dashboard/PetCompanion";

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
  ru: { modesDone: "режимов", round: "Раунд" },
};

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
}

export default function GameModeSelectionView({
  activeAssignment, studentProgress, isQuickPlayGuest, quickPlayCompletedModes,
  setGameMode, setShowModeSelection, setShowModeIntro, handleExitGame,
  petDisplayName, petXp, petCurrentStage, petNextStage, petClaimableMilestone, onClaimPetMilestone,
}: GameModeSelectionViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const reduced = useReducedMotion();
  const t = gameModesT[language] ?? gameModesT.en;
  const qs = QUEST_STRINGS[language] ?? QUEST_STRINGS.en;

  const modesMeta: Array<{ id: GameMode; color: string; icon: React.ReactNode; isLearnMode?: boolean }> = [
    { id: "flashcards", color: "cyan", icon: <Layers size={22} />, isLearnMode: true },
    { id: "classic", color: "emerald", icon: <BookOpen size={20} /> },
    { id: "fill-blank", color: "lime", icon: <Edit3 size={20} /> },
    { id: "listening", color: "blue", icon: <Volume2 size={20} /> },
    { id: "spelling", color: "purple", icon: <PenTool size={20} /> },
    { id: "matching", color: "amber", icon: <Zap size={20} /> },
    { id: "memory-flip", color: "pink", icon: <Brain size={20} /> },
    { id: "true-false", color: "rose", icon: <Check size={20} /> },
    { id: "scramble", color: "indigo", icon: <Shuffle size={20} /> },
    { id: "reverse", color: "fuchsia", icon: <Repeat size={20} /> },
    { id: "letter-sounds", color: "violet", icon: <span className="text-lg">🔡</span> },
    { id: "sentence-builder", color: "teal", icon: <span className="text-lg">🧩</span> },
    { id: "speed-round", color: "red", icon: <span className="text-lg">⚡</span> },
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
  const isCompleted = (id: string) => rowsFor(id).length > 0;
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
    <div dir={dir} className={`min-h-screen ${ARCADE_BG} relative overflow-hidden`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{
        backgroundImage: [
          "radial-gradient(circle at 15% 12%, rgba(255,255,255,0.6) 0 1px, transparent 2px)",
          "radial-gradient(circle at 78% 22%, rgba(255,255,255,0.5) 0 1px, transparent 2px)",
          "radial-gradient(circle at 42% 58%, rgba(255,255,255,0.45) 0 1px, transparent 2px)",
          "radial-gradient(circle at 88% 75%, rgba(255,255,255,0.5) 0 1px, transparent 2px)",
        ].join(","),
      }} />

      <header className={`sticky top-0 z-30 flex items-center gap-3 bg-violet-950/40 px-4 py-3 backdrop-blur-md ${isRTL ? "flex-row-reverse" : ""}`}>
        <button
          type="button" onClick={handleExitGame} aria-label={t.closeAria} title={t.closeAria}
          className={`${ARCADE_BUTTON_TOUCH} flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20`}
        >
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black text-white">{t.chooseYourMode}</h1>
          {activeAssignment?.title && (
            <p className="truncate text-xs font-semibold text-white/60">{activeAssignment.title}</p>
          )}
        </div>
        {showRoundPill && (
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-center text-[11px] font-bold text-cyan-100 ring-1 ring-white/20">
            {completedCount}/{totalModes} {qs.modesDone}
            <span className="block text-[10px] text-white/60">{qs.round} {currentRound}/{MAX_ASSIGNMENT_ROUNDS}</span>
          </span>
        )}
      </header>

      <div className="relative z-10 mx-auto max-w-xl px-2 pb-20">
        <IslandMap
          assignmentId={activeAssignment?.id ?? "none"}
          islands={islands}
          recommendedIndex={recommendedIndex}
          pet={{
            currentStage: petCurrentStage,
            nextStage: petNextStage,
            xp: petXp,
            hasClaimable: !!petClaimableMilestone,
            displayName: petDisplayName,
          }}
          onTapIsland={(i) => setSheetIndex(i)}
          onTapPet={() => setPetOpen(true)}
        />
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
