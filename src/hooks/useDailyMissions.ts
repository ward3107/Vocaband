/**
 * useDailyMissions — fetches + tracks the student's three daily missions.
 *
 * Mounting:
 *   1. Computes today's user-LOCAL date via Intl.DateTimeFormat (so a
 *      kid playing at 11pm Tel Aviv still gets Tuesday's missions, not
 *      Wednesday's UTC).
 *   2. Calls get_or_create_daily_missions(p_mission_date) — server
 *      creates the three default missions if they don't exist yet,
 *      returns the current state.
 *   3. Captures the device's IANA timezone and writes it back to
 *      users.timezone if the column hasn't been set yet (defensive —
 *      keeps the server's "today" computation honest if the student
 *      hops devices).
 *
 * After-game refresh:
 *   - The hook returns `recordPlay(mode, score)` which the game-finish
 *     hook calls right after saveScore lands. The RPC re-derives every
 *     mission's progress from progress + word_attempts, marks newly-
 *     completed missions, grants their fixed XP reward, and returns
 *     the up-to-date rows. We update local state from the response so
 *     the dashboard card reflects the new state without a refetch.
 *
 * Toasts:
 *   - When a mission flips from incomplete → complete after recordPlay,
 *     fire a toast (`🎯 Daily mission done — +50 XP`). The grant
 *     itself happens server-side via the RPC, so the toast is
 *     informational only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../core/supabase';

export type DailyMissionType = 'master_words' | 'play_modes' | 'beat_record';

export interface DailyMission {
  user_uid: string;
  mission_date: string;
  mission_type: DailyMissionType;
  target: number;
  progress: number;
  completed: boolean;
  xp_reward: number;
  completed_at: string | null;
}

interface UseDailyMissionsOptions {
  /** Whether the daily-missions feature should run at all.  Pass false
   *  for guests / quick-play / unauthenticated users — we don't want
   *  the RPC firing for anyone who can't satisfy the auth.uid() check. */
  enabled: boolean;
  /** Toast emitter for "+50 XP" celebration.  Optional — the hook
   *  works without it; the toasts are pure UX polish. */
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  /** Bumps the locally-tracked XP when the server grants mission XP.
   *  Optional — if omitted, the dashboard XP figure stays in sync via
   *  the next user-row refetch instead. */
  onXpGranted?: (xpDelta: number) => void;
}

interface UseDailyMissionsApi {
  missions: DailyMission[];
  /** True while the initial fetch is in flight. */
  isLoading: boolean;
  /** Fired after a game finish to recompute progress + grant XP. */
  recordPlay: (mode: string, score: number) => Promise<void>;
  /** Manual refresh (rare — the hook auto-refreshes on date change). */
  refresh: () => Promise<void>;
}

/** YYYY-MM-DD string in the device's local timezone. */
function todayLocalDateString(): string {
  // sv-SE format produces YYYY-MM-DD natively, which is exactly what
  // Postgres accepts for a DATE param.  Avoids Date.toISOString() which
  // is UTC-anchored and would push the boundary by up to a day.
  return new Intl.DateTimeFormat('sv-SE').format(new Date());
}

/** IANA timezone name from the device.  Falls back to UTC if the
 *  browser somehow can't resolve one. */
function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function useDailyMissions({ enabled, showToast, onXpGranted }: UseDailyMissionsOptions): UseDailyMissionsApi {
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Track the date this set of missions was fetched for so we can
  // auto-refresh when the local clock crosses midnight while the tab
  // is open.
  const fetchedDateRef = useRef<string | null>(null);
  // Keep a snapshot of completion state across recordPlay calls so we
  // can fire toasts only on the transition (not every play).
  const completedSnapshotRef = useRef<Set<DailyMissionType>>(new Set());

  const persistTimezone = useCallback(async () => {
    const tz = deviceTimezone();
    if (tz === 'UTC') return; // skip the write — UTC is the column default
    try {
      await supabase.rpc('set_user_timezone', { p_timezone: tz });
    } catch {
      // Silent — timezone sync is best-effort.  If it fails, the server
      // just keeps using whatever the column held (usually UTC), which
      // is wrong for some students but doesn't break the feature.
    }
  }, []);

  const fetchMissions = useCallback(async (force = false) => {
    if (!enabled) return;
    const date = todayLocalDateString();
    if (!force && fetchedDateRef.current === date && missions.length > 0) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_daily_missions', {
        p_mission_date: date,
      });
      if (error) throw error;
      const rows = (data ?? []) as DailyMission[];
      setMissions(rows);
      completedSnapshotRef.current = new Set(
        rows.filter(r => r.completed).map(r => r.mission_type),
      );
      fetchedDateRef.current = date;
    } catch (err) {
      console.error('[daily-missions] fetch failed:', err);
      // Keep last-known state so the card doesn't blank out on a
      // transient error.  v1 ships fault-tolerant.
    } finally {
      setIsLoading(false);
    }
  }, [enabled, missions.length]);

  // Initial fetch + write-back the device timezone.
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void persistTimezone();
    void fetchMissions();
  }, [enabled, fetchMissions, persistTimezone]);

  // Periodic check (every 5 min) so the missions reset cleanly when
  // the day rolls over while the tab is open.  Cheaper than a
  // setTimeout-to-midnight + Date.now math.
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      void fetchMissions();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [enabled, fetchMissions]);

  const recordPlay = useCallback(
    async (mode: string, score: number) => {
      if (!enabled) return;
      const date = todayLocalDateString();
      try {
        const { data, error } = await supabase.rpc('record_mission_progress', {
          p_mission_date: date,
          p_mode: mode,
          p_score: Math.max(0, Math.round(score)),
        });
        if (error) throw error;
        const rows = (data ?? []) as DailyMission[];
        if (rows.length === 0) return;

        // Compute per-mission XP deltas BEFORE replacing state so we
        // can fire one toast per newly-completed mission.
        let xpGrantedTotal = 0;
        for (const row of rows) {
          if (row.completed && !completedSnapshotRef.current.has(row.mission_type)) {
            xpGrantedTotal += row.xp_reward;
            completedSnapshotRef.current.add(row.mission_type);
            const label =
              row.mission_type === 'master_words' ? '🎯 Mastered words today!' :
              row.mission_type === 'play_modes'   ? '🎮 Played multiple modes!' :
                                                    '🏆 New personal best!';
            showToast?.(`${label} +${row.xp_reward} XP`, 'success');
          }
        }
        if (xpGrantedTotal > 0) onXpGranted?.(xpGrantedTotal);
        setMissions(rows);
      } catch (err) {
        console.error('[daily-missions] record_mission_progress failed:', err);
        // Silent — same forgiving pattern as saveScore.  The next
        // recordPlay will retry, and the dashboard card stays on the
        // last-known state.
      }
    },
    [enabled, showToast, onXpGranted],
  );

  return { missions, isLoading, recordPlay, refresh: () => fetchMissions(true) };
}
