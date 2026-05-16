/**
 * useCompetitions — classroom-competition data hooks.
 *
 * Two pieces here, both intentionally cheap:
 *
 *   • useCompetitionsForClass(classCode)
 *       Loads every competition (live + ended) for the given class so
 *       both the teacher dashboard and the student dashboard can
 *       overlay a "🏆 Competition" badge on assignment cards.  Refreshes
 *       on the Realtime publication of `public.competitions` with a
 *       60-second poll fallback.
 *
 *   • useCompetitionLeaderboard(competitionId)
 *       Loads the ranked standings via the SECURITY DEFINER RPC
 *       `competition_leaderboard`.  Repaints on Realtime progress-row
 *       inserts/updates that belong to the same assignment (the
 *       publication is already enabled — see
 *       20260517_enable_realtime_for_dashboard_tables.sql).
 *
 * Neither hook writes to the DB — see useTeacherActions for create / end.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  supabase,
  mapCompetition,
  mapCompetitionLeaderboardEntry,
  type CompetitionData,
  type CompetitionLeaderboardEntry,
} from '../core/supabase';

// Long fallback poll — Realtime is the primary signal; this only covers
// the case where the channel is unhealthy (offline, dropped, etc).
const FALLBACK_POLL_MS = 60_000;

// ---------------------------------------------------------------------------
// useCompetitionsForClass
// ---------------------------------------------------------------------------

export function useCompetitionsForClass(classCode: string | null | undefined) {
  const [competitions, setCompetitions] = useState<CompetitionData[]>([]);
  const [loading, setLoading] = useState(false);
  const classCodeRef = useRef(classCode);
  classCodeRef.current = classCode;

  const refresh = useCallback(async () => {
    const code = classCodeRef.current;
    if (!code) {
      setCompetitions([]);
      return;
    }
    // Best-effort close: flips any overdue competitions to 'ended' so
    // the badge accurately reflects state without a cron job.
    await supabase.rpc('auto_end_due_competitions').then(() => undefined, () => undefined);

    const { data: classRows } = await supabase
      .from('classes').select('id').eq('code', code).limit(1);
    const classId = classRows?.[0]?.id;
    if (!classId) {
      setCompetitions([]);
      return;
    }
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (error) return;
    setCompetitions((data ?? []).map(mapCompetition));
  }, []);

  useEffect(() => {
    if (!classCode) {
      setCompetitions([]);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let fallbackPollId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    (async () => {
      const { data: classRows } = await supabase
        .from('classes').select('id').eq('code', classCode).limit(1);
      const classId = classRows?.[0]?.id;
      if (!classId || cancelled) return;

      channel = supabase
        .channel(`competitions-${classId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'competitions', filter: `class_id=eq.${classId}` },
          () => { if (!document.hidden) refresh(); },
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            if (fallbackPollId) { clearInterval(fallbackPollId); fallbackPollId = null; }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (!fallbackPollId) {
              fallbackPollId = setInterval(
                () => { if (!document.hidden) refresh(); },
                FALLBACK_POLL_MS,
              );
            }
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (fallbackPollId) clearInterval(fallbackPollId);
    };
  }, [classCode, refresh]);

  return { competitions, loading, refresh };
}

// ---------------------------------------------------------------------------
// useCompetitionsForClassIds — teacher-side variant
// ---------------------------------------------------------------------------
// Loads competitions across all of the teacher's classes in one query so
// the dashboard can render a per-assignment badge without making N calls.
// Stable on the .sort()ed comma-joined id key — passing a freshly built
// array each render won't retrigger.

export function useCompetitionsForClassIds(classIds: string[]) {
  const [competitions, setCompetitions] = useState<CompetitionData[]>([]);
  const key = [...classIds].sort().join(',');
  const keyRef = useRef(key);
  keyRef.current = key;

  const refresh = useCallback(async () => {
    const ids = keyRef.current.split(',').filter(Boolean);
    if (ids.length === 0) {
      setCompetitions([]);
      return;
    }
    await supabase.rpc('auto_end_due_competitions').then(() => undefined, () => undefined);
    const { data } = await supabase
      .from('competitions')
      .select('*')
      .in('class_id', ids)
      .order('created_at', { ascending: false });
    setCompetitions((data ?? []).map(mapCompetition));
  }, []);

  useEffect(() => {
    if (!key) {
      setCompetitions([]);
      return;
    }
    refresh();

    // Single broad channel; RLS narrows to this teacher's classes
    // server-side, and the in-memory filter mirrors that.
    const channel = supabase
      .channel(`competitions-teacher-${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competitions' },
        () => { if (!document.hidden) refresh(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [key, refresh]);

  return { competitions, refresh };
}

// ---------------------------------------------------------------------------
// useCompetitionLeaderboard
// ---------------------------------------------------------------------------

export function useCompetitionLeaderboard(competitionId: string | null | undefined) {
  const [entries, setEntries] = useState<CompetitionLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(competitionId);
  idRef.current = competitionId;

  const refresh = useCallback(async () => {
    const id = idRef.current;
    if (!id) {
      setEntries([]);
      return;
    }
    const { data, error: rpcError } = await supabase.rpc('competition_leaderboard', {
      p_competition_id: id,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setError(null);
    setEntries((data ?? []).map(mapCompetitionLeaderboardEntry));
  }, []);

  useEffect(() => {
    if (!competitionId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let fallbackPollId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    (async () => {
      // Resolve the assignment_id once so we can subscribe to the
      // relevant progress changes only (rather than every progress row
      // school-wide).
      const { data: rows } = await supabase
        .from('competitions').select('assignment_id').eq('id', competitionId).limit(1);
      const assignmentId = rows?.[0]?.assignment_id;
      if (!assignmentId || cancelled) return;

      channel = supabase
        .channel(`competition-leaderboard-${competitionId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'progress', filter: `assignment_id=eq.${assignmentId}` },
          () => { if (!document.hidden) refresh(); },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'competitions', filter: `id=eq.${competitionId}` },
          () => { if (!document.hidden) refresh(); },
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            if (fallbackPollId) { clearInterval(fallbackPollId); fallbackPollId = null; }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (!fallbackPollId) {
              fallbackPollId = setInterval(
                () => { if (!document.hidden) refresh(); },
                FALLBACK_POLL_MS,
              );
            }
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (fallbackPollId) clearInterval(fallbackPollId);
    };
  }, [competitionId, refresh]);

  return { entries, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// createCompetition / endCompetition — fire-and-forget helpers
// ---------------------------------------------------------------------------

export async function createCompetition(params: {
  assignmentId: string;
  classId: string;
  closesAt: string;
}): Promise<CompetitionData | null> {
  const { data, error } = await supabase
    .from('competitions')
    .insert({
      assignment_id: params.assignmentId,
      class_id: params.classId,
      closes_at: params.closesAt,
    })
    .select('*')
    .single();
  if (error) {
    // Most common failure: UNIQUE violation when a competition already
    // exists for this assignment.  Caller may want to surface a friendly
    // toast; we just return null and let them decide.
    console.warn('[createCompetition] failed:', error.message);
    return null;
  }
  return mapCompetition(data);
}

export async function endCompetition(competitionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('competitions')
    .update({ status: 'ended' })
    .eq('id', competitionId);
  return !error;
}
