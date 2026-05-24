import type { AssignmentData, ProgressData } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";
import { ALL_GAME_MODES } from "../../constants/game";

const DEFAULT_MODES = ALL_GAME_MODES;

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

/**
 * Sum mode-completions across all assignments so the bar reflects
 * partial progress.  Old behaviour only filled the bar when an entire
 * assignment was done across all 8 non-flashcard modes — students
 * who'd played 1–2 modes saw a flat 0% even after real work, which
 * looked broken on the dashboard.
 */
function partialModeProgress(
  studentAssignments: AssignmentData[],
  studentProgress: ProgressData[],
): { donePct: number } {
  let totalSlots = 0;
  let doneSlots = 0;
  for (const a of studentAssignments) {
    const allowed = (a.allowedModes || DEFAULT_MODES).filter(m => m !== "flashcards");
    totalSlots += allowed.length;
    const completedModes = new Set(
      studentProgress
        .filter(p => p.assignmentId === a.id && p.mode !== "flashcards")
        .map(p => p.mode),
    );
    for (const m of allowed) {
      if (completedModes.has(m)) doneSlots += 1;
    }
  }
  if (totalSlots === 0) return { donePct: 0 };
  return { donePct: (doneSlots / totalSlots) * 100 };
}

export default function StudentOverallProgress({ studentAssignments, studentProgress }: StudentOverallProgressProps) {
  const { language } = useLanguage();
  const t = studentDashboardT[language];
  if (studentAssignments.length === 0) return null;

  const completed = countCompletedAssignments(studentAssignments, studentProgress);
  const total = studentAssignments.length;
  const { donePct } = partialModeProgress(studentAssignments, studentProgress);

  // Repainted with the v1 card chrome — hairline indigo border + soft
  // drop-shadow (same recipe as MgmtCard / EnglishDashboardLayout) so
  // the student dashboard cards read as the same family as the
  // teacher surfaces.  Progress fill swapped from solid blue to the
  // brand gradient via a CSS-only fill (the native <progress> element
  // can't accept a gradient on its ::-webkit-progress-value pseudo,
  // so we render the fill as a positioned div inside a track).
  const fillPct = toProgressValue(donePct);
  return (
    <div
      className="rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8 bg-white border border-indigo-500/[0.10]"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)",
      }}
    >
      <h3 className="mb-3 sm:mb-2 text-[15px] font-extrabold tracking-[-0.005em] text-[#1F1147]">
        {t.overallProgress}
      </h3>
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className="relative flex-1 h-3 sm:h-3.5 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={fillPct}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ background: "rgba(99,102,241,0.10)" }}
        >
          <div
            className="absolute inset-y-0 start-0 rounded-full transition-[width] duration-500"
            style={{
              width: `${fillPct}%`,
              background:
                "linear-gradient(110deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)",
              boxShadow: "0 0 12px rgba(139,92,246,0.45)",
            }}
          />
        </div>
        <span className="font-mono font-extrabold tabular-nums text-sm text-[#4A3B7A]">
          {completed} / {total}
        </span>
      </div>
    </div>
  );
}
