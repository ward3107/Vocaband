/**
 * useDueReviews — fetches the count + queue of words due for spaced
 * repetition review today.
 *
 * Two distinct shapes returned:
 *   - `dueCount` — cheap count for the dashboard widget badge
 *   - `loadDueWords()` — full word objects for the Review mode game
 *     (only fetched when the student actually starts a session, so
 *     the dashboard doesn't pay for the join every render)
 *
 * Server: see supabase/migrations/20260607_spaced_repetition.sql
 *   - count_due_reviews(p_today_local) — returns INT
 *   - get_due_reviews(p_today_local, p_limit) — returns review_schedule rows
 *   - record_review_result(p_word_id, p_is_correct) — called per answer
 *   - schedule_review_words(p_word_ids) — called by saveScore on miss
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../core/supabase';

export interface ReviewScheduleRow {
  student_uid: string;
  word_id: number;
  next_review_date: string;
  interval_step: number;
  consecutive_correct: number;
  total_reviews: number;
  total_correct: number;
  last_reviewed_at: string | null;
  created_at: string;
}

interface UseDueReviewsOptions {
  enabled: boolean;
}

interface UseDueReviewsApi {
  /** How many words are due for review today.  0 means the card hides
   *  itself (or shows a "nothing to review" state). */
  dueCount: number;
  /** True while the count fetch is in flight.  Card shows a skeleton. */
  isLoading: boolean;
  /** Manually refresh — called after the student finishes a review
   *  session so the badge updates without a remount. */
  refresh: () => Promise<void>;
  /** Lazy fetch of the actual queue of due word ids — triggered when
   *  the student taps "Start review" so the dashboard doesn't fetch
   *  the heavy list on every render. */
  loadDueWords: (limit?: number) => Promise<ReviewScheduleRow[]>;
}

function todayLocalDateString(): string {
  return new Intl.DateTimeFormat('sv-SE').format(new Date());
}

export function useDueReviews({ enabled }: UseDueReviewsOptions): UseDueReviewsApi {
  const [dueCount, setDueCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  const fetchCount = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('count_due_reviews', {
        p_today_local: todayLocalDateString(),
      });
      if (error) throw error;
      setDueCount(typeof data === 'number' ? data : 0);
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error('[srs] count_due_reviews failed:', err);
      // Keep last-known count rather than dropping to 0 on a transient
      // error — that would noisily flicker the badge.
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void fetchCount();
  }, [enabled, fetchCount]);

  // Refresh hourly — students reviewing in the morning shouldn't see
  // the same count after lunch if they completed some.
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      void fetchCount();
    }, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [enabled, fetchCount]);

  const loadDueWords = useCallback(async (limit = 15) => {
    if (!enabled) return [];
    try {
      const { data, error } = await supabase.rpc('get_due_reviews', {
        p_today_local: todayLocalDateString(),
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as ReviewScheduleRow[];
    } catch (err) {
      console.error('[srs] get_due_reviews failed:', err);
      return [];
    }
  }, [enabled]);

  return { dueCount, isLoading, refresh: fetchCount, loadDueWords };
}
