/**
 * useClassShowDeepLink — Slice 4 of the URL-routing migration.
 *
 * class-show (the teacher's "project this assignment to the class" projector)
 * normally holds a TRANSIENT `classShowAssignment`, set the moment the teacher
 * taps the assignment on their dashboard. On a fresh load / refresh of
 * `/class-show?assignmentId=<id>` that object is null, so the view would paint
 * its empty word-source picker.
 *
 * This re-hydrates it: once the teacher's assignments are loaded (auth-restore
 * already fetches them), look the id up in that ALREADY-loaded array and
 * rebuild the projector input — no extra Supabase round-trip. The `?assignmentId`
 * param is intentionally LEFT in the URL so a subsequent refresh re-hydrates
 * again (class-show is a destination the teacher stays on, unlike the one-shot
 * student deep links in useDeepLinkConsumers).
 *
 * Read-only w.r.t. history: it never pushes/replaces entries, so it can't
 * interact with useBackButtonTrap. Wiring the reverse direction (view → URL
 * on in-app navigation) belongs with the back-trap rework in Slice 5.
 */
import { useEffect } from 'react';
import { hasTeacherAccess, type AppUser, type AssignmentData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';

type ClassShowAssignment = { title: string; wordIds: number[]; customWords?: Word[] };

export interface UseClassShowDeepLinkArgs {
  view: View;
  user: AppUser | null;
  teacherAssignments: AssignmentData[];
  classShowAssignment: ClassShowAssignment | null;
  setClassShowAssignment: (a: ClassShowAssignment) => void;
}

export function useClassShowDeepLink(args: UseClassShowDeepLinkArgs): void {
  const { view, user, teacherAssignments, classShowAssignment, setClassShowAssignment } = args;

  useEffect(() => {
    // Only when sitting on class-show with nothing projected yet, as a teacher,
    // and the assignments array has arrived.
    if (view !== 'class-show' || classShowAssignment || !hasTeacherAccess(user)) return;
    if (teacherAssignments.length === 0) return;

    let id: string | null = null;
    try {
      id = new URLSearchParams(window.location.search).get('assignmentId');
    } catch {
      return; // URLSearchParams unavailable — nothing to re-hydrate from
    }
    if (!id) return;

    const a = teacherAssignments.find((x) => x.id === id);
    if (!a) return;

    setClassShowAssignment({ title: a.title, wordIds: a.wordIds, customWords: a.words });
  }, [view, user, teacherAssignments, classShowAssignment, setClassShowAssignment]);
}
