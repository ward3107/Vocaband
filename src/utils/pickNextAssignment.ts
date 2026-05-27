import { ALL_GAME_MODES } from "../constants/game";
import { resolveAssignmentPlays, isAssignmentLocked } from "../hooks/useAssignmentPlays";
import type { AssignmentData, ProgressData } from "../core/supabase";

export type NextAssignmentState = "continue" | "start" | "replay";

export interface NextAssignmentPick {
  assignment: AssignmentData;
  percent: number;
  state: NextAssignmentState;
}

// Picks the single most-relevant assignment to surface as the "do this
// now" target.  Priority: in-progress (highest %) → unstarted → mastered
// but still replayable.  Locked assignments (3 rounds completed) are
// skipped — the student has nothing to gain by replaying them.
// Returns null when nothing is eligible.
export function pickNextAssignment(
  assignments: AssignmentData[],
  progress: ProgressData[],
  userUid: string,
): NextAssignmentPick | null {
  if (assignments.length === 0) return null;

  const scored = assignments
    .map((a) => {
      const allowedModes = (a.allowedModes || ALL_GAME_MODES).filter(
        (m) => m !== "flashcards",
      );
      const totalModes = Math.max(allowedModes.length, 1);
      const completedModes = new Set(
        progress
          .filter((p) => p.assignmentId === a.id && p.mode !== "flashcards")
          .map((p) => p.mode),
      ).size;
      const totalPlays = resolveAssignmentPlays(userUid, a.id, progress);
      const locked = isAssignmentLocked(totalPlays, totalModes);
      const percent = Math.min(
        100,
        Math.round((completedModes / totalModes) * 100),
      );
      return { assignment: a, percent, locked };
    })
    .filter((s) => !s.locked);

  const inProgress = scored
    .filter((s) => s.percent > 0 && s.percent < 100)
    .sort((x, y) => y.percent - x.percent);
  if (inProgress.length > 0) {
    return { assignment: inProgress[0].assignment, percent: inProgress[0].percent, state: "continue" };
  }

  const unstarted = scored.find((s) => s.percent === 0);
  if (unstarted) {
    return { assignment: unstarted.assignment, percent: 0, state: "start" };
  }

  const mastered = scored.find((s) => s.percent === 100);
  if (mastered) {
    return { assignment: mastered.assignment, percent: 100, state: "replay" };
  }

  return null;
}
