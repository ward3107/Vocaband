/**
 * useQuickPlayRealtime — Supabase Realtime plumbing for the Quick Play
 * live teacher monitor + legacy (v1) student session/kick watchers.
 *
 * Extracted from App.tsx (~155 lines) so the orchestrator doesn't own
 * two postgres_changes subscriptions + the aggregation helper.
 *
 * Two effects:
 *
 *  1. Teacher monitor — subscribes to `progress` INSERTs for the active
 *     session, hydrates the joined-students leaderboard via
 *     `aggregateProgress`, and manages a polling fallback that only
 *     runs while Realtime is NOT delivering events.  Visibility change
 *     listener re-fetches when the tab comes back into focus.
 *
 *  2. Student session/kick watcher — legacy v1 only (skipped when
 *     VITE_QUICKPLAY_V2 is enabled).  One channel with two listeners:
 *     session UPDATE to detect teacher-end, and progress DELETE to
 *     detect student-kick.  v2 replaces this path with the native
 *     SESSION_ENDED / KICKED socket events in useQuickPlaySocket.
 *
 * The `aggregateProgress` helper is now a pure top-level function — it
 * was wrapped in useCallback inside the component solely because it was
 * used as an effect dep, which meant a new reference on every render
 * anyway.  Moving it to module scope avoids the unnecessary churn.
 */
import { useEffect } from 'react';
import { supabase } from '../core/supabase';
import type { AppUser, AssignmentData } from '../core/supabase';
import type { View } from '../core/views';

export interface QpJoinedStudent {
  name: string;
  score: number;
  avatar: string;
  lastSeen: string;
  mode: string;
  studentUid: string;
}

export type QpRealtimeStatus = 'connecting' | 'live' | 'polling';

interface QpActiveSession {
  id: string;
  sessionCode: string;
}

interface ProgressRow {
  student_name: string;
  student_uid: string;
  score: number;
  avatar?: string;
  completed_at: string;
  mode: string;
}

/**
 * Collapse raw `progress` rows into one entry per student, summing best
 * scores per mode and merging same-name entries that came from rotated
 * sessions (different uid, same kid).  Pure — safe to call repeatedly.
 */
export function aggregateProgress(progressData: ProgressRow[]): QpJoinedStudent[] {
  type Entry = {
    name: string;
    score: number;
    avatar: string;
    lastSeen: string;
    mode: string;
    studentUid: string;
    modes: Map<string, number>;
  };
  const studentMap = new Map<string, Entry>();

  progressData.forEach(p => {
    // Group by student_uid to avoid merging different students with same name.
    const key = p.student_uid || p.student_name;
    const existing = studentMap.get(key);

    if (!existing) {
      const modes = new Map<string, number>();
      if (p.mode !== 'joined') modes.set(p.mode, Number(p.score));
      studentMap.set(key, {
        name: p.student_name,
        score: p.mode === 'joined' ? 0 : Number(p.score),
        avatar: p.avatar || '🦊',
        lastSeen: p.completed_at,
        mode: p.mode,
        studentUid: p.student_uid,
        modes,
      });
    } else {
      if (new Date(p.completed_at) > new Date(existing.lastSeen)) {
        existing.lastSeen = p.completed_at;
        existing.mode = p.mode;
        if (p.avatar) existing.avatar = p.avatar;
      }
      // Track best score per mode, then sum for cumulative total.
      if (p.mode !== 'joined') {
        const prev = existing.modes.get(p.mode) || 0;
        if (Number(p.score) > prev) existing.modes.set(p.mode, Number(p.score));
      }
      let total = 0;
      existing.modes.forEach(v => { total += v; });
      existing.score = total;
    }
  });

  // Post-pass: merge entries that share the same student_name but have
  // different uids (same student, rotated session). Newer wins on
  // metadata; per-mode scores are max-merged.
  const byName = new Map<string, Entry>();
  for (const entry of studentMap.values()) {
    const dup = byName.get(entry.name);
    if (!dup) {
      byName.set(entry.name, entry);
    } else {
      const newer = new Date(entry.lastSeen) > new Date(dup.lastSeen) ? entry : dup;
      const older = newer === entry ? dup : entry;
      const mergedModes = new Map(older.modes);
      newer.modes.forEach((v, mode) => {
        const prev = mergedModes.get(mode) || 0;
        if (v > prev) mergedModes.set(mode, v);
      });
      let total = 0;
      mergedModes.forEach(v => { total += v; });
      byName.set(entry.name, { ...newer, modes: mergedModes, score: total });
    }
  }

  return Array.from(byName.values())
    .sort((a, b) => b.score - a.score)
    // Strip the internal `modes` map before returning — public shape
    // doesn't expose it.
    .map(({ modes: _modes, ...rest }) => rest);
}

export interface UseQuickPlayRealtimeParams {
  view: View;
  user: AppUser | null;
  quickPlayActiveSession: QpActiveSession | null;
  quickPlayV2: boolean;
  setQuickPlayJoinedStudents: React.Dispatch<React.SetStateAction<QpJoinedStudent[]>>;
  setQuickPlayRealtimeStatus: React.Dispatch<React.SetStateAction<QpRealtimeStatus>>;
  setQuickPlaySessionEnded: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickPlayKicked: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveAssignment: (a: AssignmentData | null) => void;
}

export function useQuickPlayRealtime(params: UseQuickPlayRealtimeParams): void {
  const {
    view,
    user,
    quickPlayActiveSession,
    quickPlayV2,
    setQuickPlayJoinedStudents,
    setQuickPlayRealtimeStatus,
    setQuickPlaySessionEnded,
    setQuickPlayKicked,
    setActiveAssignment,
  } = params;

  // ─── Teacher monitor: progress-table Realtime + polling fallback ───
  useEffect(() => {
    if (view !== 'quick-play-teacher-monitor' || !quickPlayActiveSession?.id) return;

    const sessionId = quickPlayActiveSession.id;

    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('progress')
        .select('student_name, student_uid, score, avatar, completed_at, mode')
        .eq('assignment_id', sessionId)
        .order('completed_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[Quick Play Monitor] Error fetching progress:', error);
        return;
      }
      if (data) {
        setQuickPlayJoinedStudents(aggregateProgress(data as ProgressRow[]));
      }
    };

    // Only fetch when the tab is visible — no point updating a hidden UI.
    if (!document.hidden) {
      fetchProgress();
    }

    // Can't safely merge `payload.new` into already-aggregated state —
    // aggregateProgress reads raw column names, so aggregated fields
    // come back undefined and produce a phantom "no-name, 0 pts"
    // entry on the podium. Re-fetching on each INSERT is cheap at
    // classroom scale and keeps the dedup logic in one place.
    setQuickPlayRealtimeStatus('connecting');

    // Adaptive polling — only runs while Realtime isn't delivering.
    // SUBSCRIBED stops the poll; CHANNEL_ERROR/TIMED_OUT/CLOSED resumes
    // it as a safety net.
    let pollId: ReturnType<typeof setInterval> | null = null;
    const startPoll = () => {
      if (pollId) return;
      pollId = setInterval(() => {
        if (!document.hidden) fetchProgress();
      }, 5_000);
    };
    const stopPoll = () => {
      if (pollId) { clearInterval(pollId); pollId = null; }
    };
    // Start polling immediately — we're in 'connecting' until the
    // subscribe callback confirms SUBSCRIBED. No gap where the teacher
    // is unprotected.
    startPoll();

    const channel = supabase
      .channel(`qp-progress-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'progress',
          filter: `assignment_id=eq.${sessionId}`,
        },
        () => {
          if (document.hidden) return;
          fetchProgress();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setQuickPlayRealtimeStatus('live');
          stopPoll();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setQuickPlayRealtimeStatus('polling');
          startPoll();
        }
      });

    const handleVisibilityChange = () => {
      if (!document.hidden && view === 'quick-play-teacher-monitor') {
        fetchProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPoll();
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, quickPlayActiveSession?.id]);

  // ─── Student session/kick watcher (legacy v1 only) ─────────────────
  useEffect(() => {
    if (!user?.isGuest || !quickPlayActiveSession?.sessionCode) return;
    // v2 routes session-end + kick over the /quick-play socket.io
    // namespace. Subscribing to the progress-table DELETE stream here
    // under v2 was the root cause of the "everyone else joining kicks
    // the two who logged in" bug — any DELETE event (including the
    // teacher's own kick cleanup) was treated as "you were kicked".
    // Under v2 we skip this subscription entirely; v2-native KICKED
    // and SESSION_ENDED events are handled via useQuickPlaySocket in
    // QuickPlayStudentView.
    if (quickPlayV2) return;

    const sessionCode = quickPlayActiveSession.sessionCode;
    const sessionId = quickPlayActiveSession.id;
    const uid = user.uid;

    const channel = supabase
      .channel(`qp-student-${sessionCode}-${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quick_play_sessions',
          filter: `session_code=eq.${sessionCode}`,
        },
        (payload) => {
          if (payload.new && !(payload.new as { is_active?: boolean }).is_active) {
            setQuickPlaySessionEnded(true);
            setActiveAssignment(null);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'progress',
          filter: `assignment_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.old && (payload.old as { student_uid?: string }).student_uid === uid) {
            setQuickPlayKicked(true);
            setActiveAssignment(null);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isGuest, user?.uid, quickPlayActiveSession?.sessionCode, quickPlayActiveSession?.id, quickPlayV2]);
}
