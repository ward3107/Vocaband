-- Spaced Repetition — auto-scheduled review of words a student has
-- struggled with, surfaced as a dedicated "Review" mode tile on the
-- student dashboard.
--
-- Design:
-- ─────────────────────────────────────────────────────────────────────
-- Words enter the review_schedule when a student gets them WRONG in
-- any mode (Classic / Listening / Spelling / etc).  saveScore in
-- useGameFinish bulk-inserts via schedule_review_words() at the end
-- of each round.  Each row has an `interval_step` index into a fixed
-- ladder [1, 3, 7, 14, 30] days.  When the student reviews a word:
--   - Correct → bump interval_step up one (or stay at top)
--   - Wrong   → reset interval_step to 0
-- next_review_date is recomputed from today + intervals[interval_step]
-- on every record_review_result call.
--
-- Why fixed intervals (vs. SM-2 ease_factor): for v1 we want the
-- algorithm to be predictable and easy to explain to teachers
-- ("missed words come back tomorrow, then in 3 days, then in a week").
-- A future migration can switch to SM-2 if needed without changing
-- the table shape.
--
-- mission_date / today_local conventions match the daily_missions and
-- pet_evolution migrations: each student has a stored timezone, all
-- "today" computations happen at the user-local boundary so a 11pm
-- review session in Tel Aviv counts toward Tuesday's queue, not
-- Wednesday's UTC.

BEGIN;

-- ── Table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_schedule (
  student_uid TEXT NOT NULL,
  word_id INT NOT NULL,
  next_review_date DATE NOT NULL,
  -- 0..4 → index into [1, 3, 7, 14, 30] day intervals.
  -- Beyond 4, the word is considered "long-term retained" and we
  -- keep adding 30 to next_review_date but cap interval_step at 4.
  interval_step INT NOT NULL DEFAULT 0 CHECK (interval_step >= 0 AND interval_step <= 4),
  consecutive_correct INT NOT NULL DEFAULT 0,
  total_reviews INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_uid, word_id)
);

COMMENT ON TABLE public.review_schedule IS
  'Per-student spaced-repetition queue. Words enter on miss, exit (functionally) when next_review_date is far in the future.';

-- Hot path: fetching today's due reviews for the student.
CREATE INDEX IF NOT EXISTS review_schedule_due_idx
  ON public.review_schedule (student_uid, next_review_date);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS review_schedule_select ON public.review_schedule;
CREATE POLICY review_schedule_select ON public.review_schedule
  FOR SELECT USING (auth.uid()::text = student_uid);

DROP POLICY IF EXISTS review_schedule_insert ON public.review_schedule;
CREATE POLICY review_schedule_insert ON public.review_schedule
  FOR INSERT WITH CHECK (auth.uid()::text = student_uid);

DROP POLICY IF EXISTS review_schedule_update ON public.review_schedule;
CREATE POLICY review_schedule_update ON public.review_schedule
  FOR UPDATE USING (auth.uid()::text = student_uid)
  WITH CHECK (auth.uid()::text = student_uid);

-- ── Interval helper ──────────────────────────────────────────────────
-- Fixed ladder.  Centralised so the schedule + record paths stay in
-- sync.  Returns days-from-today for a given step (0..4).
CREATE OR REPLACE FUNCTION public._review_interval_days(p_step INT)
RETURNS INT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE GREATEST(0, LEAST(4, p_step))
    WHEN 0 THEN 1
    WHEN 1 THEN 3
    WHEN 2 THEN 7
    WHEN 3 THEN 14
    WHEN 4 THEN 30
    ELSE 1
  END;
$$;

-- ── schedule_review_words(p_word_ids INT[]) ──────────────────────────
-- Called from saveScore after a round finishes, with the array of
-- word IDs the student got WRONG.  Each missed word is either
-- inserted (interval_step=0, next_review_date=tomorrow) or, if
-- already in the queue, has its interval reset to 0 — the assumption
-- is the student didn't actually retain the word so the schedule
-- shouldn't keep stretching.  Idempotent: passing the same word
-- twice in one call is a no-op on the second insertion attempt.
CREATE OR REPLACE FUNCTION public.schedule_review_words(p_word_ids INT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_tomorrow DATE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_word_ids IS NULL OR array_length(p_word_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Schedule for tomorrow in the user's local timezone.  users.timezone
  -- was added by the daily-missions migration; default 'UTC' is safe.
  SELECT (now() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::date + INTERVAL '1 day'
    INTO v_tomorrow
    FROM public.users u
   WHERE u.uid = v_uid;
  IF v_tomorrow IS NULL THEN
    v_tomorrow := (now() AT TIME ZONE 'UTC')::date + INTERVAL '1 day';
  END IF;

  INSERT INTO public.review_schedule (student_uid, word_id, next_review_date, interval_step)
  SELECT v_uid, unnest(p_word_ids), v_tomorrow, 0
  ON CONFLICT (student_uid, word_id) DO UPDATE
    SET interval_step = 0,
        next_review_date = LEAST(EXCLUDED.next_review_date, public.review_schedule.next_review_date),
        consecutive_correct = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_review_words(INT[]) TO authenticated;

-- ── get_due_reviews(p_today_local DATE, p_limit INT) ─────────────────
-- Returns up to p_limit word IDs whose next_review_date is on or
-- before the given date.  Ordered by next_review_date ASC, then by
-- consecutive_correct ASC (struggling words first).  p_limit caps
-- the result so a student with 200 due words gets a manageable
-- session instead of being stuck reviewing forever.
CREATE OR REPLACE FUNCTION public.get_due_reviews(
  p_today_local DATE,
  p_limit INT DEFAULT 15
)
RETURNS SETOF public.review_schedule
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.review_schedule
   WHERE student_uid = auth.uid()::text
     AND next_review_date <= p_today_local
   ORDER BY next_review_date ASC, consecutive_correct ASC, total_reviews DESC
   LIMIT GREATEST(1, LEAST(50, p_limit));
$$;

GRANT EXECUTE ON FUNCTION public.get_due_reviews(DATE, INT) TO authenticated;

-- ── count_due_reviews(p_today_local DATE) ────────────────────────────
-- Cheap count for the dashboard widget badge.  Separate RPC so the
-- card can render a quick "12 due" without fetching the rows.
CREATE OR REPLACE FUNCTION public.count_due_reviews(p_today_local DATE)
RETURNS INT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::INT
    FROM public.review_schedule
   WHERE student_uid = auth.uid()::text
     AND next_review_date <= p_today_local;
$$;

GRANT EXECUTE ON FUNCTION public.count_due_reviews(DATE) TO authenticated;

-- ── record_review_result(p_word_id INT, p_is_correct BOOL) ───────────
-- Called from the Review mode after each answer.  Correct → advance
-- the interval one step (capped at 4 = 30 days).  Wrong → reset to
-- step 0 (= 1 day, see _review_interval_days).
CREATE OR REPLACE FUNCTION public.record_review_result(
  p_word_id INT,
  p_is_correct BOOLEAN
)
RETURNS public.review_schedule
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_today DATE;
  v_row public.review_schedule;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (now() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::date INTO v_today
    FROM public.users u WHERE u.uid = v_uid;
  IF v_today IS NULL THEN v_today := (now() AT TIME ZONE 'UTC')::date; END IF;

  -- Defensive insert in case the word isn't in the schedule yet
  -- (shouldn't normally happen — Review mode only shows due words —
  -- but a stale client could re-submit after the queue moved on).
  INSERT INTO public.review_schedule (student_uid, word_id, next_review_date, interval_step)
  VALUES (v_uid, p_word_id, v_today, 0)
  ON CONFLICT (student_uid, word_id) DO NOTHING;

  IF p_is_correct THEN
    UPDATE public.review_schedule
    SET interval_step = LEAST(4, interval_step + 1),
        consecutive_correct = consecutive_correct + 1,
        total_reviews = total_reviews + 1,
        total_correct = total_correct + 1,
        last_reviewed_at = now(),
        next_review_date = v_today + (_review_interval_days(LEAST(4, interval_step + 1)) || ' days')::INTERVAL
    WHERE student_uid = v_uid AND word_id = p_word_id
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.review_schedule
    SET interval_step = 0,
        consecutive_correct = 0,
        total_reviews = total_reviews + 1,
        last_reviewed_at = now(),
        next_review_date = v_today + INTERVAL '1 day'
    WHERE student_uid = v_uid AND word_id = p_word_id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_review_result(INT, BOOLEAN) TO authenticated;

COMMIT;
