/**
 * useAssignmentViewDeepLink — Slice 4 of the URL-routing migration.
 *
 * The teacher's assignment-backed projector sub-views (class-show, worksheet)
 * hold a TRANSIENT object set the moment the teacher taps an assignment on
 * their dashboard. On a deep-link / refresh of e.g.
 * `/worksheet?assignmentId=<id>` that object is null, so the view paints an
 * empty word-source picker.
 *
 * This re-hydrates it: once the teacher's assignments are loaded (auth-restore
 * already fetches them), it looks the id up in that ALREADY-loaded array and
 * rebuilds the projector input — no extra Supabase round-trip. The
 * `?assignmentId` param is intentionally LEFT in the URL so a subsequent
 * refresh re-hydrates again (these are destinations the teacher stays on,
 * unlike the one-shot student deep links in useDeepLinkConsumers).
 *
 * Read-only w.r.t. history: it never pushes/replaces entries, so it can't
 * interact with useBackButtonTrap. Wiring the reverse (view → URL on in-app
 * navigation) belongs with the back-trap rework in Slice 5.
 *
 * Call once per view (class-show, worksheet).
 */
import { useEffect } from 'react';
import { hasTeacherAccess, type AppUser, type AssignmentData } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';

type ProjectorAssignment = { title: string; wordIds: number[]; customWords?: Word[] };

export interface UseAssignmentViewDeepLinkArgs {
  /** The app's current view. */
  view: View;
  /** The view this call re-hydrates (e.g. 'class-show' or 'worksheet'). */
  targetView: View;
  user: AppUser | null;
  teacherAssignments: AssignmentData[];
  /** The transient projector object — re-hydrate only when it's null. */
  current: ProjectorAssignment | null;
  set: (a: ProjectorAssignment) => void;
}

export function useAssignmentViewDeepLink(args: UseAssignmentViewDeepLinkArgs): void {
  const { view, targetView, user, teacherAssignments, current, set } = args;

  useEffect(() => {
    if (view !== targetView || current || !hasTeacherAccess(user)) return;
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

    set({ title: a.title, wordIds: a.wordIds, customWords: a.words });
  }, [view, targetView, user, teacherAssignments, current, set]);
}
