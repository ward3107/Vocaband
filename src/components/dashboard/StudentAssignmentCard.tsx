import React from "react";
import { ALL_WORDS } from "../../data/vocabulary";
import type { AssignmentData, ProgressData } from "../../core/supabase";
import type { Word } from "../../data/vocabulary";
import type { View } from "../../core/views";

const DEFAULT_MODES = ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];

const toProgressValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const ACCENT_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-100", hoverBorder: "hover:border-blue-300", bar: "[&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600", btn: "bg-blue-700 hover:bg-blue-800", strip: "bg-blue-500" },
  { bg: "bg-purple-50", border: "border-purple-100", hoverBorder: "hover:border-purple-300", bar: "[&::-webkit-progress-value]:bg-purple-600 [&::-moz-progress-bar]:bg-purple-600", btn: "bg-purple-700 hover:bg-purple-800", strip: "bg-purple-500" },
  { bg: "bg-emerald-50", border: "border-emerald-100", hoverBorder: "hover:border-emerald-300", bar: "[&::-webkit-progress-value]:bg-emerald-600 [&::-moz-progress-bar]:bg-emerald-600", btn: "bg-emerald-700 hover:bg-emerald-800", strip: "bg-emerald-500" },
  { bg: "bg-amber-50", border: "border-amber-100", hoverBorder: "hover:border-amber-300", bar: "[&::-webkit-progress-value]:bg-amber-600 [&::-moz-progress-bar]:bg-amber-600", btn: "bg-amber-700 hover:bg-amber-800", strip: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-100", hoverBorder: "hover:border-rose-300", bar: "[&::-webkit-progress-value]:bg-rose-600 [&::-moz-progress-bar]:bg-rose-600", btn: "bg-rose-700 hover:bg-rose-800", strip: "bg-rose-500" },
  { bg: "bg-cyan-50", border: "border-cyan-100", hoverBorder: "hover:border-cyan-300", bar: "[&::-webkit-progress-value]:bg-cyan-600 [&::-moz-progress-bar]:bg-cyan-600", btn: "bg-cyan-700 hover:bg-cyan-800", strip: "bg-cyan-500" },
];

interface StudentAssignmentCardProps {
  assignment: AssignmentData;
  assignmentIdx: number;
  studentProgress: ProgressData[];
  setActiveAssignment: (a: AssignmentData) => void;
  setAssignmentWords: (w: Word[]) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setShowModeSelection: (show: boolean) => void;
}

export default function StudentAssignmentCard({
  assignment, assignmentIdx, studentProgress,
  setActiveAssignment, setAssignmentWords, setView, setShowModeSelection,
}: StudentAssignmentCardProps) {
  const allowedModes = (assignment.allowedModes || DEFAULT_MODES).filter(m => m !== "flashcards");
  const totalModes = allowedModes.length;

  const completedModes = new Set(
    studentProgress
      .filter(p => p.assignmentId === assignment.id && p.mode !== "flashcards")
      .map(p => p.mode),
  ).size;

  const progressPercentage = Math.min(100, Math.round((completedModes / Math.max(totalModes, 1)) * 100));
  const isComplete = completedModes >= totalModes;
  const accent = ACCENT_COLORS[assignmentIdx % ACCENT_COLORS.length];

  const handleStart = () => {
    const filteredWords = assignment.words || ALL_WORDS.filter(w => assignment.wordIds.includes(w.id));
    setActiveAssignment(assignment);
    setAssignmentWords(filteredWords);
    React.startTransition(() => {
      setView("game");
      setShowModeSelection(true);
    });
  };

  return (
    <div className={`${accent.bg} p-5 sm:p-6 rounded-3xl border-2 ${accent.border} ${accent.hoverBorder} transition-colors relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${accent.strip} rounded-l-3xl`} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div className="flex-1">
          <h3 className="text-xl sm:text-xl font-bold text-stone-800">{assignment.title}</h3>
          <p className="text-stone-500 text-base sm:text-sm font-medium mt-2 sm:mt-1">
            {assignment.wordIds.length} Vocabulary Words
            {assignment.deadline && ` • Due: ${new Date(assignment.deadline).toLocaleDateString()}`}
          </p>
        </div>
        <button
          onClick={handleStart}
          onTouchStart={() => { /* hint to mobile browsers that this is tappable — matches the answer-button touch fix */ }}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className={`w-full sm:w-auto px-6 py-4 sm:py-3 ${accent.btn} text-white rounded-xl font-bold transition-colors whitespace-nowrap text-base sm:text-sm`}
        >
          {isComplete ? "Play Again" : "Start Learning"}
        </button>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm sm:text-xs font-bold mb-3 sm:mb-2">
          <span className="text-stone-500 uppercase tracking-widest">Progress</span>
          <span className={isComplete ? "text-blue-700" : "text-stone-500"}>
            {completedModes} / {totalModes} Modes ({progressPercentage}%)
          </span>
        </div>
        <progress
          className={`h-4 sm:h-3 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-stone-200 ${accent.bar}`}
          max={100}
          value={toProgressValue(progressPercentage)}
        />
      </div>
    </div>
  );
}
