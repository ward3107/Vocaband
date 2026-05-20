/**
 * useQuickPlayRealtime — Supabase Realtime plumbing for the Quick Play
 * live teacher monitor.
 *
 * Subscribes to `progress` INSERTs for the active session, hydrates the
 * joined-students leaderboard via `aggregateProgress`, and manages a
 * polling fallback that only runs while Realtime is NOT delivering
 * events.  Visibility change listener re-fetches when the tab comes
 * back into focus.
 *
 * Student-side session/kick events are delivered over the /quick-play
 * socket.io namespace via useQuickPlaySocket (see QuickPlayStudentView).
 *
 * The `aggregateProgress` helper is now a pure top-level function — it
 * was wrapped in useCallback inside the component solely because it was
 * used as an effect dep, which meant a new reference on every render
 * anyway.  Moving it to module scope avoids the unnecessary churn.
 */
import { useEffect } from 'react';
import { supabase } from '../core/supabase';
import type { AppUser } from '../core/supabase';
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
  setQuickPlayJoinedStudents: React.Dispatch<React.SetStateAction<QpJoinedStudent[]>>;
  setQuickPlayRealtimeStatus: React.Dispatch<React.SetStateAction<QpRealtimeStatus>>;
}

export function useQuickPlayRealtime(params: UseQuickPlayRealtimeParams): void {
  const {
    view,
    user,
    quickPlayActiveSession,
    setQuickPlayJoinedStudents,
    setQuickPlayRealtimeStatus,
  } = params;

  // ─── Teacher monitor: progress-table Realtime + polling fallback ───
  useEffect(() => {
    // Tear down the moment auth disappears — without `user` the polled
    // SELECT against `progress` fails with 401/permission-denied (RLS
    // expects an authenticated teacher), and the channel can't auth either.
    // `setUser(null)` fires synchronously inside the SIGNED_OUT handler, so
    // this guard runs before view/session state has finished resettling.
    if (!user) return;
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
  }, [view, quickPlayActiveSession?.id, user?.uid]);

  // Student session/kick events are delivered over the /quick-play
  // socket.io namespace via useQuickPlaySocket (see QuickPlayStudentView).
  // The previous progress-table DELETE listener was removed because
  // Supabase DELETE payloads omit student_uid without REPLICA IDENTITY
  // FULL, so kick events fanned out to every student in the session.
}
