import { useState } from "react";
import type { Word } from "../data/vocabulary";

export type QuickPlayActiveSession = {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
  allowedModes?: string[];
  aiSentences?: string[];
};

export type ClassShowAssignment = {
  title: string;
  wordIds: number[];
  customWords?: Word[];
};

export type WorksheetAssignment = ClassShowAssignment & {
  className?: string | null;
};

/**
 * Teacher-side state for the Quick Play setup + the launchpad views
 * (Class Show, Worksheet). All driven by the assignment row's "launch
 * into" action; bundled so the orchestrator doesn't carry six related
 * useState calls inline.
 *
 * - `quickPlaySessionCode`: legacy v1 session-code mirror (only setter
 *   is consumed; reset on session end).
 * - `quickPlayInitialWords` / `quickPlayInitialModes`: pre-fill values
 *   for the QP setup screen when reused via the saved-task templates.
 * - `quickPlayActiveSession`: live session record once create succeeds.
 * - `classShowAssignment`: pre-fill for the Class Show projector mode.
 * - `worksheetAssignment`: pre-fill for the Worksheet generator.
 * - `activityNavOrigin`: when set to 'create-assignment', activity-tab
 *   back/exit handlers return to the New Activity wizard instead of
 *   the dashboard.
 */
export function useQuickPlaySessionState() {
  const [, setQuickPlaySessionCode] = useState<string | null>(null);
  const [quickPlayInitialWords, setQuickPlaySelectedWords] = useState<Word[]>([]);
  const [quickPlayInitialModes, setQuickPlayInitialModes] = useState<string[] | undefined>(undefined);
  const [quickPlayActiveSession, setQuickPlayActiveSession] = useState<QuickPlayActiveSession | null>(null);
  const [classShowAssignment, setClassShowAssignment] = useState<ClassShowAssignment | null>(null);
  const [worksheetAssignment, setWorksheetAssignment] = useState<WorksheetAssignment | null>(null);
  const [activityNavOrigin, setActivityNavOrigin] = useState<"create-assignment" | null>(null);

  return {
    setQuickPlaySessionCode,
    quickPlayInitialWords, setQuickPlaySelectedWords,
    quickPlayInitialModes, setQuickPlayInitialModes,
    quickPlayActiveSession, setQuickPlayActiveSession,
    classShowAssignment, setClassShowAssignment,
    worksheetAssignment, setWorksheetAssignment,
    activityNavOrigin, setActivityNavOrigin,
  };
}
