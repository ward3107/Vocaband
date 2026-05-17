/**
 * Two deep-link consumer effects, sharing the same gating shape
 * (student role + on-dashboard + data hydrated) but consuming
 * different URL params.
 *
 *   1. ?assignment=<id>   — teacher-shared assignment link.  When the
 *      student lands on their dashboard with assignments loaded, drop
 *      them straight into the mode picker for that assignment.
 *   2. ?play=class-minute — teacher-shared daily-drill link.  Launches
 *      the SRS-seeded Class Minute round.  Extra gate: ALL_WORDS must
 *      be loaded (the SRS row hydration needs the vocabulary chunk),
 *      and we wait for any in-flight class-switch decision to resolve
 *      first so the round launches under the right class context.
 *
 * Pending ids are consumed once + the URL param is stripped so a
 * refresh or back-nav doesn't re-trigger the auto-open after the
 * student left the target view.
 */
import { useEffect } from 'react';
import type React from 'react';
import { stripUrlParam } from '../utils/url';
import type { AppUser, AssignmentData } from '../core/supabase';
import type { View } from '../core/views';
import type { Word } from '../data/vocabulary';

export interface UseDeepLinkConsumersArgs {
  user: AppUser | null;
  view: View;
  pendingAssignmentId: string | null;
  pendingPlayMode: string | null;
  studentAssignments: AssignmentData[];
  allWordsCount: number;
  pendingClassSwitch: unknown;
  startClassMinute: () => Promise<void> | void;
  setActiveAssignment: React.Dispatch<React.SetStateAction<AssignmentData | null>>;
  setAssignmentWords: React.Dispatch<React.SetStateAction<Word[]>>;
  setShowModeSelection: React.Dispatch<React.SetStateAction<boolean>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setPendingAssignmentId: React.Dispatch<React.SetStateAction<string | null>>;
  setPendingPlayMode: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useDeepLinkConsumers(args: UseDeepLinkConsumersArgs): void {
  const {
    user, view,
    pendingAssignmentId, pendingPlayMode,
    studentAssignments, allWordsCount, pendingClassSwitch,
    startClassMinute,
    setActiveAssignment, setAssignmentWords, setShowModeSelection, setView,
    setPendingAssignmentId, setPendingPlayMode,
  } = args;

  // ?assignment=<id> consumer
  useEffect(() => {
    if (!pendingAssignmentId) return;
    if (user?.role !== 'student') return;
    if (view !== 'student-dashboard') return;
    if (studentAssignments.length === 0) return;
    const match = studentAssignments.find((a) => a.id === pendingAssignmentId);
    if (!match) return;
    setActiveAssignment(match);
    setAssignmentWords(match.words ?? []);
    setShowModeSelection(true);
    setView('game');
    setPendingAssignmentId(null);
    stripUrlParam('assignment');
  }, [
    pendingAssignmentId, user?.role, view, studentAssignments,
    setActiveAssignment, setAssignmentWords, setShowModeSelection, setView,
    setPendingAssignmentId,
  ]);

  // ?play=class-minute consumer
  useEffect(() => {
    if (pendingPlayMode !== 'class-minute') return;
    if (user?.role !== 'student') return;
    if (view !== 'student-dashboard') return;
    if (allWordsCount === 0) return;
    if (pendingClassSwitch) return;
    setPendingPlayMode(null);
    stripUrlParam('play');
    void startClassMinute();
  }, [
    pendingPlayMode, user?.role, view, allWordsCount, pendingClassSwitch,
    startClassMinute, setPendingPlayMode,
  ]);
}
