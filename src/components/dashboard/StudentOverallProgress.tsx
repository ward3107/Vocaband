import type { AssignmentData, ProgressData } from "../../core/supabase";

const DEFAULT_MODES = ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"];

const toProgressValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Count how many assignments the student has completed (all modes done, excluding flashcards).
 */
function countCompletedAssignments(
  studentAssignments: AssignmentData[],
  studentProgress: ProgressData[],
): number {
  return studentAssignments.filter(a => {
    const allowedModes = (a.allowedModes || DEFAULT_MODES).filter(m => m !== "flashcards");
    const completedModes = new Set(
      studentProgress.filter(p => p.assignmentId === a.id && p.mode !== "flashcards").map(p => p.mode),
    ).size;
    return completedModes >= allowedModes.length;
  }).length;
}

interface StudentOverallProgressProps {
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
}

export default function StudentOverallProgress({ studentAssignments, studentProgress }: StudentOverallProgressProps) {
  if (studentAssignments.length === 0) return null;

  const completed = countCompletedAssignments(studentAssignments, studentProgress);
  const total = studentAssignments.length;
  const pct = (completed / total) * 100;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-sm mb-6 sm:mb-8">
      <h3 className="text-lg sm:text-lg font-bold text-stone-800 mb-3 sm:mb-2">Overall Progress</h3>
      <div className="flex items-center gap-3 sm:gap-4">
        <progress
          className="flex-1 h-5 sm:h-4 [&::-webkit-progress-bar]:bg-stone-100 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600 rounded-full overflow-hidden"
          max={100}
          value={toProgressValue(pct)}
        />
        <span className="font-bold text-stone-500 text-sm sm:text-sm">
          {completed} / {total}
        </span>
      </div>
    </div>
  );
}
