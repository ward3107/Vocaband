import type React from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Volume2,
  PenTool,
  Zap,
  Check,
  Layers,
  Shuffle,
  Repeat,
  X,
  Lock,
  Star,
  Edit3,
  Brain,
  ChevronRight,
  Play,
} from "lucide-react";
import type { GameMode } from "../constants/game";
import { MAX_ASSIGNMENT_ROUNDS } from "../constants/game";
import type { AssignmentData, ProgressData } from "../core/supabase";
import { DIFFICULTY_META, getModeDifficulty } from "../components/setup/types";
import { computeRoundsCompleted, sumPlayCountFromProgress } from "../hooks/useAssignmentPlays";
import { useLanguage } from "../hooks/useLanguage";
import type { Language } from "../hooks/useLanguage";
import { gameModesT, type GameModeId } from "../locales/student/game-modes";
import { ARCADE_BG, ARCADE_BUTTON_TOUCH } from "../components/arcade/theme";

// Tiny gold mastery dots — N filled out of 3, earned by score. Kept small
// and only shown on completed list rows so they read as a quiet reward,
// not clutter.
function MasteryDots({ filled }: { filled: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Mastery ${filled} of 3`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} size={9} strokeWidth={2} className={i < filled ? "text-amber-300" : "text-white/20"} fill={i < filled ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

// Per-mode medallion gradient, keyed by the mode's colour token.
const MODE_GRADIENTS: Record<string, string> = {
  cyan: "from-cyan-400 to-blue-500",
  emerald: "from-emerald-400 to-teal-500",
  lime: "from-lime-400 to-green-500",
  blue: "from-blue-400 to-indigo-500",
  purple: "from-purple-400 to-violet-600",
  amber: "from-amber-400 to-orange-500",
  pink: "from-pink-400 to-rose-500",
  rose: "from-rose-400 to-pink-600",
  indigo: "from-indigo-400 to-violet-600",
  fuchsia: "from-fuchsia-400 to-purple-600",
  violet: "from-violet-400 to-purple-600",
  teal: "from-teal-400 to-cyan-500",
  red: "from-red-400 to-rose-600",
};

const QUEST_STRINGS: Record<Language, {
  playNext: string; start: string; round: string; modesDone: string; allModes: string;
}> = {
  en: { playNext: "Play next", start: "Start here", round: "Round", modesDone: "modes", allModes: "All modes" },
  he: { playNext: "שחק עכשיו", start: "התחל כאן", round: "סבב", modesDone: "מצבים", allModes: "כל המצבים" },
  ar: { playNext: "العب الآن", start: "ابدأ هنا", round: "جولة", modesDone: "أوضاع", allModes: "كل الأوضاع" },
  ru: { playNext: "Играть", start: "Начни здесь", round: "Раунд", modesDone: "режимов", allModes: "Все режимы" },
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
}

export default function GameModeSelectionView({
  activeAssignment,
  studentProgress,
  isQuickPlayGuest,
  quickPlayCompletedModes,
  setGameMode,
  setShowModeSelection,
  setShowModeIntro,
  handleExitGame,
}: GameModeSelectionViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = gameModesT[language] ?? gameModesT.en;
  const qs = QUEST_STRINGS[language] ?? QUEST_STRINGS.en;

  const modesMeta: Array<{ id: GameMode; color: string; icon: React.ReactNode; isLearnMode?: boolean }> = [
    { id: "flashcards",        color: "cyan",    icon: <Layers size={24} />,        isLearnMode: true },
    { id: "classic",           color: "emerald", icon: <BookOpen size={22} /> },
    { id: "fill-blank",        color: "lime",    icon: <Edit3 size={22} /> },
    { id: "listening",         color: "blue",    icon: <Volume2 size={22} /> },
    { id: "spelling",          color: "purple",  icon: <PenTool size={22} /> },
    { id: "matching",          color: "amber",   icon: <Zap size={22} /> },
    { id: "memory-flip",       color: "pink",    icon: <Brain size={22} /> },
    { id: "true-false",        color: "rose",    icon: <Check size={22} /> },
    { id: "scramble",          color: "indigo",  icon: <Shuffle size={22} /> },
    { id: "reverse",           color: "fuchsia", icon: <Repeat size={22} /> },
    { id: "letter-sounds",     color: "violet",  icon: <span className="text-xl">🔡</span> },
    { id: "sentence-builder",  color: "teal",    icon: <span className="text-xl">🧩</span> },
    { id: "speed-round",       color: "red",     icon: <span className="text-xl">⚡</span> },
  ];

  const modes = modesMeta.map((m) => ({
    ...m,
    name: t.modes[m.id as GameModeId].name,
    desc: t.modes[m.id as GameModeId].desc,
  }));

  const allowedModes = activeAssignment?.allowedModes || modes.map((m) => m.id);
  const filteredModes = modes.filter((m) => allowedModes.includes(m.id));
  const learnMode = modes.find((m) => m.isLearnMode);
  const practiceModes = filteredModes.filter((m) => !m.isLearnMode);

  // --- Per-mode state ---
  const rowsFor = (id: string) =>
    studentProgress.filter((p) => p.assignmentId === activeAssignment?.id && p.mode === id);
  const isCompleted = (id: string) => rowsFor(id).length > 0;
  const isLocked = (id: string) => isQuickPlayGuest && quickPlayCompletedModes.has(id);
  const masteryStars = (id: string) => {
    if (!isCompleted(id)) return 0;
    const best = Math.max(0, ...rowsFor(id).map((r) => r.score ?? 0));
    return best >= 90 ? 3 : best >= 60 ? 2 : 1;
  };

  // Ordered list: Flashcards (start) first, then practice modes.
  const stops = [learnMode, ...practiceModes].filter(Boolean) as typeof modes;

  // Recommended-next: first playable, not-yet-completed stop; else the
  // weakest-mastery one (replaying for the next round).
  let recommendedId: GameMode | undefined = stops.find((m) => !isLocked(m.id) && !isCompleted(m.id))?.id;
  if (!recommendedId) {
    const playable = practiceModes.filter((m) => !isLocked(m.id));
    recommendedId = [...playable].sort((a, b) => masteryStars(a.id) - masteryStars(b.id))[0]?.id;
  }
  const hero = stops.find((m) => m.id === recommendedId) ?? stops[0];

  // The quiet list = everything except the hero, ordered to-do → done →
  // locked so what's left to play floats to the top.
  const rank = (m: typeof modes[number]) => (isLocked(m.id) ? 2 : isCompleted(m.id) ? 1 : 0);
  const listModes = stops.filter((m) => m.id !== hero?.id).sort((a, b) => rank(a) - rank(b));

  // --- Round / progress pill ---
  const totalModes = practiceModes.length;
  const completedCount = practiceModes.filter((m) => isCompleted(m.id)).length;
  const totalPlays = activeAssignment ? sumPlayCountFromProgress(studentProgress, activeAssignment.id) : 0;
  const currentRound = Math.min(MAX_ASSIGNMENT_ROUNDS, computeRoundsCompleted(totalPlays, totalModes) + 1);
  const showRoundPill = Boolean(activeAssignment) && totalModes > 0;

  const launch = (id: GameMode) => {
    setGameMode(id);
    setShowModeSelection(false);
    setShowModeIntro(true);
  };

  const heroGrad = hero ? MODE_GRADIENTS[hero.color] ?? "from-violet-400 to-fuchsia-500" : "";
  const heroDiff = hero ? DIFFICULTY_META[getModeDifficulty(hero.id)] : null;

  return (
    <div dir={dir} className={`min-h-screen ${ARCADE_BG} relative overflow-hidden`}>
      {/* Starfield — matches the hub so launching a game feels continuous. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: [
            "radial-gradient(circle at 15% 12%, rgba(255,255,255,0.6) 0 1px, transparent 2px)",
            "radial-gradient(circle at 78% 22%, rgba(255,255,255,0.5) 0 1px, transparent 2px)",
            "radial-gradient(circle at 42% 58%, rgba(255,255,255,0.45) 0 1px, transparent 2px)",
            "radial-gradient(circle at 88% 75%, rgba(255,255,255,0.5) 0 1px, transparent 2px)",
            "radial-gradient(circle at 25% 90%, rgba(255,255,255,0.55) 0 1px, transparent 2px)",
          ].join(","),
        }}
      />

      <div className="relative z-10 mx-auto max-w-xl space-y-5 p-4 pb-16 sm:p-6">
        {/* Header — close + title + round pill. */}
        <header className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={handleExitGame}
            aria-label={t.closeAria}
            title={t.closeAria}
            className={`${ARCADE_BUTTON_TOUCH} flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20`}
          >
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black text-white sm:text-2xl">{t.chooseYourMode}</h1>
            {activeAssignment?.title && (
              <p className="truncate text-xs font-semibold text-white/60">{activeAssignment.title}</p>
            )}
          </div>
          {showRoundPill && (
            <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-center text-[11px] font-bold text-cyan-100 ring-1 ring-white/20 backdrop-blur-md">
              {completedCount}/{totalModes} {qs.modesDone}
              <span className="block text-[10px] text-white/60">{qs.round} {currentRound}/{MAX_ASSIGNMENT_ROUNDS}</span>
            </span>
          )}
        </header>

        {/* Next-up hero — the single clear thing to play. */}
        {hero && (
          <motion.button
            type="button"
            onClick={() => launch(hero.id)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            whileTap={{ scale: 0.98 }}
            className={`${ARCADE_BUTTON_TOUCH} relative w-full overflow-hidden rounded-3xl bg-gradient-to-br ${heroGrad} p-5 text-start text-white shadow-xl ring-2 ring-white/30`}
            dir={dir}
          >
            <div aria-hidden className="pointer-events-none absolute -top-10 -end-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className={`relative flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm sm:h-20 sm:w-20">
                <span className="scale-125">{hero.icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
                  {hero.isLearnMode ? qs.start : qs.playNext}
                </span>
                <p className="mt-1 text-2xl font-black leading-tight">{hero.name}</p>
                <p className="text-sm font-semibold text-white/85 leading-snug line-clamp-2">{hero.desc}</p>
              </div>
            </div>
            <div className={`relative mt-4 flex items-center justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              {heroDiff && (
                <span className="text-xs font-bold text-white/85">{"★".repeat(heroDiff.stars)} {heroDiff.label}</span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-black text-stone-900 shadow">
                <Play size={15} className="fill-stone-900" /> {qs.playNext}
              </span>
            </div>
          </motion.button>
        )}

        {/* Quiet list — everything else, icon + name + state only. */}
        {listModes.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-cyan-200">{qs.allModes}</h2>
            <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
              {listModes.map((mode, i) => {
                const completed = isCompleted(mode.id);
                const locked = isLocked(mode.id);
                const grad = MODE_GRADIENTS[mode.color] ?? "from-violet-400 to-fuchsia-500";
                return (
                  <motion.button
                    key={mode.id}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && launch(mode.id)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.03 * i }}
                    whileTap={locked ? undefined : { scale: 0.99 }}
                    className={`${ARCADE_BUTTON_TOUCH} flex w-full items-center gap-3 px-3 py-2.5 text-start transition hover:bg-white/5 ${
                      i > 0 ? "border-t border-white/10" : ""
                    } ${locked ? "opacity-40" : ""}`}
                    dir={dir}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow ${completed ? "opacity-80" : ""}`}>
                      {mode.icon}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-sm font-bold ${completed ? "text-white/70" : "text-white"}`}>
                      {mode.name}
                    </span>
                    {completed ? (
                      <span className={`flex shrink-0 items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <MasteryDots filled={masteryStars(mode.id)} />
                        <Check size={16} className="text-emerald-400" strokeWidth={3} />
                      </span>
                    ) : locked ? (
                      <Lock size={15} className="shrink-0 text-white/50" />
                    ) : (
                      <ChevronRight size={18} className={`shrink-0 text-white/40 ${isRTL ? "rotate-180" : ""}`} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
