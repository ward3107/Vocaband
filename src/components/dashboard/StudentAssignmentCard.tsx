import React from "react";
import { motion } from "motion/react";
import { Zap, Sparkles, Lock } from "lucide-react";
import { ALL_WORDS } from "../../data/vocabulary";
import { MAX_ASSIGNMENT_ROUNDS } from "../../constants/game";
import { resolveAssignmentPlays, computeRoundsCompleted, isAssignmentLocked } from "../../hooks/useAssignmentPlays";
import type { AppUser, AssignmentData, ProgressData } from "../../core/supabase";
import type { Word } from "../../data/vocabulary";
import type { View } from "../../core/views";

const DEFAULT_MODES = ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];

// Per-card accent palette — rotates so the dashboard feels colourful instead
// of uniform, but each card stays internally consistent.
const ACCENTS = [
  { bg: "bg-gradient-to-br from-blue-50 to-indigo-50",        ring: "stroke-blue-500",     cta: "bg-gradient-to-r from-blue-500 to-indigo-600",    strip: "from-blue-500 to-indigo-600",     text: "text-blue-700",     chip: "bg-blue-100 text-blue-700" },
  { bg: "bg-gradient-to-br from-purple-50 to-fuchsia-50",     ring: "stroke-purple-500",   cta: "bg-gradient-to-r from-purple-500 to-fuchsia-600", strip: "from-purple-500 to-fuchsia-600",  text: "text-purple-700",   chip: "bg-purple-100 text-purple-700" },
  { bg: "bg-gradient-to-br from-emerald-50 to-teal-50",       ring: "stroke-emerald-500",  cta: "bg-gradient-to-r from-emerald-500 to-teal-600",   strip: "from-emerald-500 to-teal-600",    text: "text-emerald-700",  chip: "bg-emerald-100 text-emerald-700" },
  { bg: "bg-gradient-to-br from-amber-50 to-orange-50",       ring: "stroke-amber-500",    cta: "bg-gradient-to-r from-amber-500 to-orange-600",   strip: "from-amber-500 to-orange-600",    text: "text-amber-700",    chip: "bg-amber-100 text-amber-700" },
  { bg: "bg-gradient-to-br from-rose-50 to-pink-50",          ring: "stroke-rose-500",     cta: "bg-gradient-to-r from-rose-500 to-pink-600",      strip: "from-rose-500 to-pink-600",       text: "text-rose-700",     chip: "bg-rose-100 text-rose-700" },
  { bg: "bg-gradient-to-br from-cyan-50 to-sky-50",           ring: "stroke-cyan-500",     cta: "bg-gradient-to-r from-cyan-500 to-sky-600",       strip: "from-cyan-500 to-sky-600",        text: "text-cyan-700",     chip: "bg-cyan-100 text-cyan-700" },
];

interface StudentAssignmentCardProps {
  assignment: AssignmentData;
  assignmentIdx: number;
  studentProgress: ProgressData[];
  /** Student uid — needed to read their per-assignment play counter
   * from localStorage (scoped per user so multi-student devices don't
   * clobber each other's progress). */
  userUid: string;
  setActiveAssignment: (a: AssignmentData) => void;
  setAssignmentWords: (w: Word[]) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setShowModeSelection: (show: boolean) => void;
}

// Circular progress ring — SVG so it scales cleanly + animates via stroke-dasharray.
function ProgressRing({
  percent,
  stroke,
  size = 58,
}: { percent: number; stroke: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth="6" fill="none"
          className="stroke-white/70"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth="6" strokeLinecap="round" fill="none"
          className={stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black text-stone-800 tabular-nums">{Math.round(percent)}%</span>
      </div>
    </div>
  );
}

export default function StudentAssignmentCard({
  assignment, assignmentIdx, studentProgress, userUid,
  setActiveAssignment, setAssignmentWords, setView, setShowModeSelection,
}: StudentAssignmentCardProps) {
  const allowedModes = (assignment.allowedModes || DEFAULT_MODES).filter(m => m !== "flashcards");
  const totalModes = allowedModes.length;

  const assignmentProgress = studentProgress.filter(p => p.assignmentId === assignment.id && p.mode !== "flashcards");
  const completedModes = new Set(assignmentProgress.map(p => p.mode)).size;

  const progressPercentage = Math.min(100, Math.round((completedModes / Math.max(totalModes, 1)) * 100));
  const isComplete = completedModes >= totalModes;
  const accent = ACCENTS[assignmentIdx % ACCENTS.length];

  // Anti-farm replay cap (NEW SEMANTICS): "1 round = all allowed modes
  // played once".  Student can complete MAX_ASSIGNMENT_ROUNDS (3)
  // rounds, so the total allowed plays = 3 × totalModes.  After the
  // 3rd full round the assignment locks and stops granting XP.
  // Count is DB-backed via progress.play_count (migration 20260425),
  // with localStorage as an optimistic cache for immediate UI updates.
  const totalPlays = resolveAssignmentPlays(userUid, assignment.id, studentProgress);
  const maxPlays = MAX_ASSIGNMENT_ROUNDS * Math.max(totalModes, 1);
  const roundsCompleted = computeRoundsCompleted(totalPlays, totalModes);
  const isLocked = isAssignmentLocked(totalPlays, totalModes);
  const playsLeft = Math.max(0, maxPlays - totalPlays);
  // Current round the student is on (1-indexed, capped at the max).
  const currentRound = Math.min(MAX_ASSIGNMENT_ROUNDS, roundsCompleted + 1);

  // Rough XP reward — totalModes * 15 XP per mode played (matches what the
  // game loop already awards).  Displayed as an incentive chip.
  const xpReward = totalModes * 15;

  const handleStart = () => {
    if (isLocked) return;
    const filteredWords = assignment.words || ALL_WORDS.filter(w => assignment.wordIds.includes(w.id));
    setActiveAssignment(assignment);
    setAssignmentWords(filteredWords);
    React.startTransition(() => {
      setView("game");
      setShowModeSelection(true);
    });
    // Jump the viewport to the top so the student lands on the mode
    // selection hero card, not halfway down the new view. Without this,
    // students who scrolled the dashboard to find their assignment
    // ended up on a blank patch of the mode selector and had to scroll
    // up to see "Choose Your Mode".
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    }
  };

  return (
    <motion.div
      onClick={handleStart}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleStart(); }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: assignmentIdx * 0.06 }}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`${isLocked ? 'bg-stone-100 grayscale-[0.5]' : accent.bg} p-4 sm:p-5 rounded-3xl border border-white/80 shadow-sm ${isLocked ? 'cursor-not-allowed opacity-75' : 'hover:shadow-md cursor-pointer active:scale-[0.99]'} transition-all relative overflow-hidden`}
    >
      {/* Colored left strip */}
      <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${isLocked ? 'from-stone-400 to-stone-500' : accent.strip}`} />

      {/* LOCKED banner — takes priority over MASTERED */}
      {isLocked && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -8 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.4 }}
          className="absolute top-2 right-2 bg-gradient-to-r from-stone-700 to-stone-900 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1"
        >
          <Lock size={10} />
          MAXED
        </motion.div>
      )}

      {/* MASTERED banner + sparkle */}
      {!isLocked && isComplete && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: -8 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.4 }}
          className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1"
        >
          <Sparkles size={10} className="fill-white" />
          MASTERED
        </motion.div>
      )}

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Progress ring */}
        <ProgressRing percent={progressPercentage} stroke={accent.ring} />

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight truncate">
            {assignment.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-wide">
              {assignment.wordIds.length} words
            </span>
            {assignment.deadline && (
              <>
                <span className="text-stone-300">·</span>
                <span className="text-[10px] sm:text-xs font-bold text-stone-500">
                  Due {new Date(assignment.deadline).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {!isLocked && (
              <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${accent.chip}`}>
                <Zap size={11} className="fill-current" />
                +{xpReward} XP
              </span>
            )}
            <span className="text-[10px] sm:text-xs font-bold text-stone-500">
              {completedModes}/{totalModes} modes
            </span>
            {/* Rounds counter — colour turns amber as the cap approaches. */}
            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${
              isLocked ? 'bg-stone-200 text-stone-600' :
              playsLeft <= totalModes ? 'bg-rose-100 text-rose-700' :
              playsLeft <= totalModes * 2 ? 'bg-amber-100 text-amber-700' :
              'bg-stone-100 text-stone-600'
            }`}>
              {isLocked
                ? 'Locked — all 3 rounds done'
                : `Round ${currentRound} of ${MAX_ASSIGNMENT_ROUNDS}`}
            </span>
          </div>
        </div>

        {/* CTA */}
        {!isLocked && (
          <button
            onClick={(e) => { e.stopPropagation(); handleStart(); }}
            type="button"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className={`hidden sm:inline-flex shrink-0 items-center gap-1.5 px-4 py-2.5 ${accent.cta} text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all`}
          >
            {isComplete ? "Play again" : "Start"} →
          </button>
        )}
      </div>

      {/* Mobile CTA — full-width at bottom */}
      {!isLocked && (
        <button
          onClick={(e) => { e.stopPropagation(); handleStart(); }}
          type="button"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className={`sm:hidden w-full mt-3 py-2.5 ${accent.cta} text-white rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all`}
        >
          {isComplete ? "Play again" : "Start learning"} →
        </button>
      )}
      {isLocked && (
        <div className="mt-3 text-[11px] font-bold text-stone-500 bg-white/60 border border-stone-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <Lock size={12} />
          You've completed all {MAX_ASSIGNMENT_ROUNDS} rounds of this assignment. Great practice! Check your other assignments.
        </div>
      )}
    </motion.div>
  );
}
