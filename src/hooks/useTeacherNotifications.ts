/**
 * useTeacherNotifications — toasts when new pending students appear in
 * the approval queue or when new score rows land for the teacher's
 * class.
 *
 * Purely passive: no network traffic of its own.  Piggybacks on the
 * polling effects elsewhere that refresh `pendingStudents` and
 * `allScores` — when a diff arrives, the hook observes the delta and
 * fires a single toast describing what changed.
 *
 * Seeded-ref pattern: first snapshot seeds the "previously seen" set
 * without notifying, so a freshly-logged-in teacher doesn't see
 * "EVERY student who existed before you logged in just joined".
 * Subsequent renders diff against the ref and only toast new IDs.
 *
 * Throttling: the polling effects run on ~10–20 s intervals, so even a
 * burst of joins or score submissions gets batched into at most one
 * notification per cycle per type.
 */
import { useEffect, useRef } from 'react';
import type { AppUser, ProgressData } from '../core/supabase';
import type { View } from '../core/views';

type ToastType = 'success' | 'error' | 'info';

interface PendingStudent {
  id: string;
  displayName: string;
  className: string;
}

export interface UseTeacherNotificationsParams {
  user: AppUser | null;
  view: View;
  pendingStudents: PendingStudent[];
  allScores: ProgressData[];
  showToast: (message: string, type?: ToastType) => void;
}

// Score notifications only fire while the teacher is on one of these
// views — during a Quick Play session or inside another modal the
// toast would just be noise; the podium updates cover those paths.
const SCORE_NOTIFIABLE_VIEWS = new Set<View>([
  'teacher-dashboard',
  'classroom',
  'analytics',
  'gradebook',
]);

export function useTeacherNotifications(params: UseTeacherNotificationsParams): void {
  const { user, view, pendingStudents, allScores, showToast } = params;

  // ─── Pending-student approval queue ────────────────────────────────
  const pendingStudentsPrevRef = useRef<Set<string>>(new Set());
  const pendingStudentsSeededRef = useRef(false);
  useEffect(() => {
    if (user?.role !== 'teacher') return;
    const currentIds = new Set(pendingStudents.map(p => p.id));
    if (!pendingStudentsSeededRef.current) {
      pendingStudentsPrevRef.current = currentIds;
      pendingStudentsSeededRef.current = true;
      return;
    }
    const newOnes = pendingStudents.filter(p => !pendingStudentsPrevRef.current.has(p.id));
    pendingStudentsPrevRef.current = currentIds;
    if (newOnes.length === 1) {
      showToast(`🔔 ${newOnes[0].displayName} wants to join ${newOnes[0].className}`, 'info');
    } else if (newOnes.length > 1) {
      showToast(`🔔 ${newOnes.length} new students waiting for approval`, 'info');
    }
  }, [pendingStudents, user?.role, showToast]);

  // ─── New score rows ────────────────────────────────────────────────
  const allScoresPrevRef = useRef<Set<string>>(new Set());
  const allScoresSeededRef = useRef(false);
  useEffect(() => {
    if (user?.role !== 'teacher') return;
    const currentIds = new Set(allScores.map(s => s.id).filter(Boolean));
    if (!allScoresSeededRef.current) {
      allScoresPrevRef.current = currentIds;
      allScoresSeededRef.current = true;
      return;
    }
    const newOnes = allScores.filter(s => s.id && !allScoresPrevRef.current.has(s.id));
    allScoresPrevRef.current = currentIds;
    if (!SCORE_NOTIFIABLE_VIEWS.has(view)) return;
    if (newOnes.length === 1) {
      const s = newOnes[0];
      if (s.studentName && s.mode && s.mode !== 'joined') {
        showToast(`✅ ${s.studentName} finished ${s.mode} — ${s.score} pts`, 'success');
      }
    } else if (newOnes.length > 1) {
      const scoring = newOnes.filter(s => s.mode && s.mode !== 'joined');
      if (scoring.length > 0) {
        showToast(`✅ ${scoring.length} new results just came in`, 'success');
      }
    }
  }, [allScores, user?.role, view, showToast]);
}
