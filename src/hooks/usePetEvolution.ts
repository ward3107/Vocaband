/**
 * usePetEvolution — fetches the activity-driven pet's current state
 * and exposes a recordActivity() hook for the game-finish flow.
 *
 * Distinct from useRetention's PET_MILESTONES system:
 *   - PET_MILESTONES is XP-based, one-way evolution
 *   - This hook is ACTIVITY-driven (distinct days played) with decay
 *
 * Server: see supabase/migrations/20260606_pet_evolution.sql
 *   - get_pet_state(p_today_local) — read
 *   - record_pet_activity(p_today_local) — write (called from saveScore)
 *
 * Stage thresholds and mood mapping are pure functions exposed here so
 * the dashboard card can render the same arc without a server round-trip.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../core/supabase';

export type PetStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult';
export type PetMood = 'happy' | 'neutral' | 'sad' | 'very-sad';

export interface PetEvolutionState {
  activeDays: number;
  lastActiveDate: string | null;
  daysSinceLastActive: number;
}

export const PET_STAGES: ReadonlyArray<{ stage: PetStage; emoji: string; minDays: number; nextThreshold: number }> = [
  // nextThreshold is the active_days value at which the pet evolves
  // to the NEXT stage (used for the "X / Y" label + progress bar).
  // Adult has Infinity since there's nothing past it.
  { stage: 'egg',   emoji: '🥚',  minDays: 0,  nextThreshold: 2 },
  { stage: 'baby',  emoji: '🐣',  minDays: 2,  nextThreshold: 4 },
  { stage: 'child', emoji: '🐥',  minDays: 4,  nextThreshold: 8 },
  { stage: 'teen',  emoji: '🐤',  minDays: 8,  nextThreshold: 15 },
  { stage: 'adult', emoji: '🐔',  minDays: 15, nextThreshold: Infinity },
];

export function petStageFor(activeDays: number): typeof PET_STAGES[number] {
  // Walk backwards so the highest-eligible stage wins.
  for (let i = PET_STAGES.length - 1; i >= 0; i--) {
    if (activeDays >= PET_STAGES[i].minDays) return PET_STAGES[i];
  }
  return PET_STAGES[0];
}

export function petMoodFor(daysSinceLastActive: number): PetMood {
  if (daysSinceLastActive <= 0) return 'happy';
  if (daysSinceLastActive === 1) return 'happy';
  if (daysSinceLastActive === 2) return 'neutral';
  if (daysSinceLastActive === 3) return 'sad';
  return 'very-sad';
}

interface UsePetEvolutionOptions {
  enabled: boolean;
}

interface UsePetEvolutionApi {
  state: PetEvolutionState | null;
  isLoading: boolean;
  /** Manually re-fetch.  The hook auto-refetches on mount and on a
   *  5-minute interval; this is mainly for explicit "refresh" UI. */
  refresh: () => Promise<void>;
}

/** YYYY-MM-DD in the device's local timezone. */
function todayLocalDateString(): string {
  return new Intl.DateTimeFormat('sv-SE').format(new Date());
}

export function usePetEvolution({ enabled }: UsePetEvolutionOptions): UsePetEvolutionApi {
  const [state, setState] = useState<PetEvolutionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedDateRef = useRef<string | null>(null);
  // Track "have we ever populated state?" via a ref so it's not in the
  // useCallback deps — putting `state` (an object) in deps caused the
  // callback ref to rebuild after every successful fetch, which made
  // the init useEffect re-fire and call fetchState() again (an extra
  // bailed-out call per mount).  Multiplied by render churn this
  // contributed to a 2026-05-04 request-storm audit.
  const hasStateRef = useRef(false);

  const fetchState = useCallback(async (force = false) => {
    if (!enabled) return;
    const date = todayLocalDateString();
    if (!force && fetchedDateRef.current === date && hasStateRef.current) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pet_state', {
        p_today_local: date,
      });
      if (error) throw error;
      const row = (data as Array<{ active_days: number; last_active_date: string | null; days_since_last_active: number }>)?.[0];
      if (row) {
        setState({
          activeDays: row.active_days ?? 0,
          lastActiveDate: row.last_active_date ?? null,
          daysSinceLastActive: row.days_since_last_active ?? 0,
        });
      } else {
        setState({ activeDays: 0, lastActiveDate: null, daysSinceLastActive: 0 });
      }
      hasStateRef.current = true;
      fetchedDateRef.current = date;
    } catch (err) {
      console.error('[pet-evolution] fetch failed:', err);
      // Keep last-known state so the card doesn't blank out.
    } finally {
      setIsLoading(false);
    }
  }, [enabled]); // STABLE — hasStateRef is a ref, not a dep.

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void fetchState();
  }, [enabled, fetchState]);

  // Refetch on a 5-minute cadence so the mood updates as the day
  // progresses without the student needing to refresh.
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      void fetchState();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [enabled, fetchState]);

  return { state, isLoading, refresh: () => fetchState(true) };
}
