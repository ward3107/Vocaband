import type React from 'react';
import { useState } from 'react';
import { ArrowRight, BookOpen, Brain, Check, Edit3, Layers, PenTool, Repeat, Shuffle, Volume2, X, Zap } from 'lucide-react';
import type { GameMode, PetMilestone } from '../constants/game';
import { MAX_ASSIGNMENT_ROUNDS } from '../constants/game';
import type { AssignmentData, ProgressData } from '../core/supabase';
import { computeRoundsCompleted, sumPlayCountFromProgress } from '../hooks/useAssignmentPlays';
import { useLanguage } from '../hooks/useLanguage';
import type { Language } from '../hooks/useLanguage';
import { gameModesT, type GameModeId } from '../locales/student/game-modes';
import { adventureT } from '../locales/student/adventure';
import { primeAudio } from '../utils/primeAudio';
import AdventureWorldMap, { type AdventureMode } from '../components/arcade/AdventureWorldMap';
import type { IslandState } from '../components/arcade/ModeIsland';
import PetCompanion from '../components/dashboard/PetCompanion';
import StudentLangButton from '../components/StudentLangButton';

const ROUND: Record<Language, string> = { en: 'Round', he: 'סבב', ar: 'جولة' };

interface GameModeSelectionViewProps {
  activeAssignment: AssignmentData | null;
  studentProgress: ProgressData[];
  isQuickPlayGuest: boolean;
  quickPlayCompletedModes: Set<string>;
  setGameMode: (mode: GameMode) => void;
  setShowModeSelection: (v: boolean) => void;
  setShowModeIntro: (v: boolean) => void;
  /** GameRoutes primes iOS audio and syncs the translation target before direct launch. */
  onLaunchMode?: (mode: GameMode) => void;
  handleExitGame: () => void;
  petDisplayName: string;
  petXp: number;
  petCurrentStage: PetMilestone;
  petNextStage: PetMilestone | null;
  petClaimableMilestone: PetMilestone | null;
  onClaimPetMilestone: (milestone: PetMilestone) => void;
  onEditName?: () => void;
}

const MODE_META: Array<{ id: GameModeId; icon: React.ReactNode }> = [
  { id: 'flashcards', icon: <Layers size={20} /> },
  { id: 'classic', icon: <BookOpen size={20} /> },
  { id: 'fill-blank', icon: <Edit3 size={20} /> },
  { id: 'matching', icon: <Zap size={20} /> },
  { id: 'true-false', icon: <Check size={20} /> },
  { id: 'listening', icon: <Volume2 size={20} /> },
  { id: 'memory-flip', icon: <Brain size={20} /> },
  { id: 'letter-sounds', icon: <span className="text-sm font-black">Aa</span> },
  { id: 'reverse', icon: <Repeat size={20} /> },
  { id: 'spelling', icon: <PenTool size={20} /> },
  { id: 'scramble', icon: <Shuffle size={20} /> },
  { id: 'sentence-builder', icon: <span className="text-sm font-black">Aa</span> },
  { id: 'speed-round', icon: <Zap size={20} /> },
];

export default function GameModeSelectionView({
  activeAssignment, studentProgress, isQuickPlayGuest, quickPlayCompletedModes,
  setGameMode, setShowModeSelection, setShowModeIntro, onLaunchMode, handleExitGame,
  petDisplayName, petXp, petCurrentStage, petNextStage, petClaimableMilestone, onClaimPetMilestone,
  onEditName,
}: GameModeSelectionViewProps) {
  const { language, dir } = useLanguage();
  const t = gameModesT[language] ?? gameModesT.en;
  const a = adventureT[language] ?? adventureT.en;
  const [petOpen, setPetOpen] = useState(false);

  const allowedModes = activeAssignment?.allowedModes ?? MODE_META.map(mode => mode.id);
  const available = MODE_META.filter(mode => allowedModes.includes(mode.id));
  const practiceModes = available.filter(mode => mode.id !== 'flashcards');
  const rowsFor = (id: string) => studentProgress.filter(row => row.assignmentId === activeAssignment?.id && row.mode === id);
  const isCompleted = (id: string) => rowsFor(id).length > 0 || (isQuickPlayGuest && quickPlayCompletedModes.has(id));
  const isLocked = (id: string) => isQuickPlayGuest && quickPlayCompletedModes.has(id);
  const bestScore = (id: string) => {
    const rows = rowsFor(id);
    return rows.length ? Math.max(0, ...rows.map(row => row.score ?? 0)) : null;
  };
  const masteryStars = (id: string) => {
    const best = bestScore(id);
    return best == null ? 0 : best >= 90 ? 3 : best >= 60 ? 2 : 1;
  };

  let recommendedId: GameModeId | undefined = available.find(mode => !isLocked(mode.id) && !isCompleted(mode.id))?.id;
  if (!recommendedId) {
    recommendedId = [...practiceModes].filter(mode => !isLocked(mode.id))
      .sort((left, right) => masteryStars(left.id) - masteryStars(right.id))[0]?.id;
  }

  const modes: AdventureMode[] = available.map(mode => {
    const state: IslandState = isLocked(mode.id) ? 'locked'
      : mode.id === recommendedId ? 'next'
      : isCompleted(mode.id) ? 'done' : 'todo';
    return {
      id: mode.id,
      name: t.modes[mode.id].name,
      description: t.modes[mode.id].tooltip[0],
      icon: mode.icon,
      state,
      mastery: masteryStars(mode.id),
    };
  });

  const completedCount = available.filter(mode => isCompleted(mode.id)).length;
  const totalPlays = activeAssignment ? sumPlayCountFromProgress(studentProgress, activeAssignment.id) : 0;
  const currentRound = Math.min(MAX_ASSIGNMENT_ROUNDS, computeRoundsCompleted(totalPlays, practiceModes.length) + 1);
  const recommended = modes.find(mode => mode.id === recommendedId);

  const launch = (id: GameMode) => {
    if (onLaunchMode) {
      onLaunchMode(id);
      return;
    }
    // Standalone renderers and tests use the same single-tap path.
    primeAudio();
    setGameMode(id);
    setShowModeSelection(false);
    setShowModeIntro(false);
  };

  return (
    <div dir={dir} className="min-h-screen bg-[#081B32] pb-[calc(env(safe-area-inset-bottom)+2rem)] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081B32]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:px-6">
          <button type="button" onClick={handleExitGame} aria-label={t.closeAria} title={t.closeAria}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 outline-none focus-visible:ring-4 focus-visible:ring-amber-300">
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-['Fredoka',sans-serif] text-base font-bold sm:text-xl">{a.heading}</p>
            {activeAssignment?.title && <p className="truncate text-xs text-sky-100/75">{activeAssignment.title}</p>}
          </div>
          {isQuickPlayGuest && onEditName && <button type="button" onClick={onEditName} aria-label={t.editName} title={t.editName}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 focus-visible:ring-4 focus-visible:ring-amber-300 sm:w-auto sm:gap-2 sm:px-3">
            <Edit3 size={17} /><span className="hidden text-sm font-bold sm:inline">{t.editName}</span>
          </button>}
          <StudentLangButton className="shrink-0" tone="onDark" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-3 pt-4 sm:space-y-7 sm:px-6 sm:pt-7">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-amber-200/20 bg-[radial-gradient(circle_at_92%_0%,#29496A_0%,#112D4D_45%,#0C233D_100%)] p-5 shadow-[0_28px_65px_-35px_rgba(0,0,0,.9)] sm:p-7">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="max-w-xl">
              <h1 className="font-['Fredoka',sans-serif] text-3xl font-bold leading-tight sm:text-4xl">{a.heading}</h1>
              <p className="mt-1 text-sm leading-relaxed text-sky-100/80 sm:text-base">{a.subtitle}</p>
            </div>
            <button type="button" onClick={() => setPetOpen(true)} aria-label={a.companionProgress(petDisplayName)}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-amber-200/70 bg-[#244462] text-4xl shadow-[0_0_32px_rgba(251,191,36,.18)] outline-none focus-visible:ring-4 focus-visible:ring-amber-200 sm:h-20 sm:w-20">
              <span aria-hidden>{petCurrentStage.emoji}</span>
            </button>
          </div>
          <div className="relative z-10 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-sky-100/90">
            <span>{a.modeCount(completedCount, available.length)}</span>
            {activeAssignment && <span>{ROUND[language]} {currentRound}/{MAX_ASSIGNMENT_ROUNDS}</span>}
          </div>
          <div role="progressbar" aria-label={a.modeCount(completedCount, available.length)} aria-valuemin={0} aria-valuemax={available.length} aria-valuenow={completedCount}
            className="relative z-10 mt-2 h-2 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-cyan-300 transition-[width] duration-500" style={{ width: `${available.length ? completedCount / available.length * 100 : 0}%` }} />
          </div>
          {recommended ? <button type="button" onClick={() => launch(recommended.id)}
            className="relative z-10 mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD875] px-5 py-3 text-sm font-extrabold text-[#142A40] shadow-[0_8px_30px_rgba(251,191,36,.25)] outline-none transition-transform focus-visible:ring-4 focus-visible:ring-white motion-safe:hover:-translate-y-0.5 sm:w-auto sm:text-base">
            {a.playNext}: {recommended.name}<ArrowRight size={19} aria-hidden />
          </button> : <p className="mt-5 text-sm font-semibold text-amber-100">{available.length ? a.allPlayed : a.noModes}</p>}
        </section>

        <AdventureWorldMap modes={modes} onPlay={launch} petEmoji={petCurrentStage.emoji} />
      </main>

      <PetCompanion open={petOpen} onClose={() => setPetOpen(false)} xp={petXp} displayName={petDisplayName}
        currentStage={petCurrentStage} nextStage={petNextStage} claimableMilestone={petClaimableMilestone}
        onClaim={milestone => { onClaimPetMilestone(milestone); setPetOpen(false); }} />
    </div>
  );
}
