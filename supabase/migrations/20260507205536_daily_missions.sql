-- Daily Missions — three rotating mission types per user-local calendar day.
--
-- Background: motivational structure that drives daily-return for the
-- student app.  Each day, every student gets three missions:
--   - master_words: answer 5 distinct words correctly      → +50 XP
--   - play_modes:   play 3 different game modes today      → +100 XP
--   - beat_record:  beat any prior all-time max for a mode → +200 XP
--
-- Reset boundary is the user's local calendar date (not UTC) — this
-- migration adds users.timezone so each student's "today" is computed
-- in their stored zone.  Frontend captures the IANA zone via
-- `Intl.DateTimeFormat().resolvedOptions().timeZone` on first sign-in
-- and writes it back, then passes the per-user local date to the RPCs
-- so the (user_uid, mission_date, mission_type) primary key never
-- drifts across devices in different timezones.
--
-- XP rewards are FIXED bonuses paid once per mission completion (read
-- xp_reward column from the row, not multiplied by progress) — same
-- contract the doc-PR locked.  Backend grant logic and the celebration
-- animation both pull from xp_reward so they can never desync.
--
-- Out of scope for v1 (deferred): all-missions bonus, push notifications,
-- per-grade-level mission targets, streak bonuses for consecutive days.
-- See docs/SELECTED-FEATURES-PLAN.md.

BEGIN;

-- ── 1. users.timezone ─────────────────────────────────────────────────
-- IANA timezone identifier (e.g. 'Asia/Jerusalem', 'Europe/Berlin').
-- Default 'UTC' so existing rows are valid; frontend overwrites with
-- the device's resolved zone on first dashboard mount, persisted so
-- the student stays consistent across devices.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

COMMENT ON COLUMN public.users.timezone IS
  'IANA timezone id used to compute the user-local mission_date for daily_missions. Captured client-side via Intl.DateTimeFormat().resolvedOptions().timeZone.';

-- ── 2. daily_missions table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_missions (
  user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  mission_date DATE NOT NULL,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('master_words', 'play_modes', 'beat_record')),
  target INT NOT NULL CHECK (target > 0),
  progress INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  xp_reward INT NOT NULL CHECK (xp_reward >= 0),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_uid, mission_date, mission_type)
);

COMMENT ON TABLE public.daily_missions IS
  'One row per (student, local-date, mission_type). Created lazily by get_or_create_daily_missions. mission_date is the USER-LOCAL date, not UTC.';

-- Quick lookups for "today's missions for student X" and stats queries.
CREATE INDEX IF NOT EXISTS daily_missions_user_date_idx
  ON public.daily_missions (user_uid, mission_date);

-- ── 3. RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

-- Students see + write only their own missions.  Mirrors the same
-- pattern used by the progress table.
DROP POLICY IF EXISTS daily_missions_select ON public.daily_missions;
CREATE POLICY daily_missions_select ON public.daily_missions
  FOR SELECT USING (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS daily_missions_insert ON public.daily_missions;
CREATE POLICY daily_missions_insert ON public.daily_missions
  FOR INSERT WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS daily_missions_update ON public.daily_missions;
CREATE POLICY daily_missions_update ON public.daily_missions
  FOR UPDATE USING (auth.uid()::text = user_uid)
  WITH CHECK (auth.uid()::text = user_uid);

-- ── 4. Mission catalogue helper ──────────────────────────────────────
-- Targets + rewards for each mission type. Centralised so the RPCs and
-- the get-or-create can stay in sync. Hard-coded for v1; per-grade
-- tuning is a future migration.
CREATE OR REPLACE FUNCTION public._daily_mission_target(p_type TEXT)
RETURNS INT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'master_words' THEN 5
    WHEN 'play_modes'   THEN 3
    WHEN 'beat_record'  THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public._daily_mission_reward(p_type TEXT)
RETURNS INT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'master_words' THEN 50
    WHEN 'play_modes'   THEN 100
    WHEN 'beat_record'  THEN 200
    ELSE 0
  END;
$$;

-- ── 5. get_or_create_daily_missions(p_mission_date) ──────────────────
-- Returns the calling user's three missions for the given date,
-- creating them with default targets + rewards if they don't exist
-- yet. Idempotent — calling twice is safe. SECURITY DEFINER so the
-- INSERT uses the function owner's privileges (we still gate on
-- auth.uid() inside the body).
CREATE OR REPLACE FUNCTION public.get_or_create_daily_missions(p_mission_date DATE)
RETURNS SETOF public.daily_missions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.daily_missions (user_uid, mission_date, mission_type, target, xp_reward)
  VALUES
    (v_uid, p_mission_date, 'master_words', _daily_mission_target('master_words'), _daily_mission_reward('master_words')),
    (v_uid, p_mission_date, 'play_modes',   _daily_mission_target('play_modes'),   _daily_mission_reward('play_modes')),
    (v_uid, p_mission_date, 'beat_record',  _daily_mission_target('beat_record'),  _daily_mission_reward('beat_record'))
  ON CONFLICT DO NOTHING;

  RETURN QUERY
    SELECT * FROM public.daily_missions
    WHERE user_uid = v_uid AND mission_date = p_mission_date
    ORDER BY mission_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_daily_missions(DATE) TO authenticated;

-- ── 6. record_mission_progress(p_mission_date, p_mode, p_score) ──────
-- Called after each game finish.  Recomputes today's mission progress
-- from the source-of-truth tables (progress, word_attempts) — that's
-- defensive: any retried save or out-of-order arrival converges to
-- the right number.  Marks newly-completed missions and grants their
-- fixed XP reward to users.xp.  Returns the up-to-date mission rows
-- so the client can refresh the dashboard card without a second fetch.
CREATE OR REPLACE FUNCTION public.record_mission_progress(
  p_mission_date DATE,
  p_mode TEXT,
  p_score INT
)
RETURNS SETOF public.daily_missions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_distinct_correct INT;
  v_modes_today INT;
  v_best_other INT;
  v_xp_to_add INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure today's missions exist (idempotent).
  INSERT INTO public.daily_missions (user_uid, mission_date, mission_type, target, xp_reward)
  VALUES
    (v_uid, p_mission_date, 'master_words', _daily_mission_target('master_words'), _daily_mission_reward('master_words')),
    (v_uid, p_mission_date, 'play_modes',   _daily_mission_target('play_modes'),   _daily_mission_reward('play_modes')),
    (v_uid, p_mission_date, 'beat_record',  _daily_mission_target('beat_record'),  _daily_mission_reward('beat_record'))
  ON CONFLICT DO NOTHING;

  -- ── master_words: distinct words answered correctly today ────────
  -- We compute on the user-LOCAL date, but word_attempts.created_at is
  -- TIMESTAMPTZ.  Cast at the user's stored timezone so a 23:30 game
  -- in Tel Aviv counts toward Tuesday's mission, not Wednesday's UTC.
  SELECT COUNT(DISTINCT word_id) INTO v_distinct_correct
  FROM public.word_attempts wa
  JOIN public.users u ON u.uid = v_uid
  WHERE wa.student_uid = v_uid
    AND wa.is_correct = true
    AND (wa.created_at AT TIME ZONE u.timezone)::date = p_mission_date;

  UPDATE public.daily_missions
  SET progress = LEAST(target, v_distinct_correct),
      completed = (v_distinct_correct >= target),
      completed_at = CASE
        WHEN v_distinct_correct >= target AND completed = false THEN now()
        ELSE completed_at
      END
  WHERE user_uid = v_uid
    AND mission_date = p_mission_date
    AND mission_type = 'master_words'
    AND completed = false
  RETURNING xp_reward INTO v_xp_to_add;
  IF FOUND AND v_xp_to_add IS NOT NULL THEN
    UPDATE public.users SET xp = COALESCE(xp,0) + v_xp_to_add WHERE uid = v_uid;
  END IF;
  v_xp_to_add := 0;

  -- ── play_modes: distinct modes played today (excluding flashcards
  --     to match the existing assignment-completion convention) ──────
  SELECT COUNT(DISTINCT p.mode) INTO v_modes_today
  FROM public.progress p
  JOIN public.users u ON u.uid = v_uid
  WHERE p.student_uid = v_uid
    AND p.mode <> 'flashcards'
    AND (p.completed_at AT TIME ZONE u.timezone)::date = p_mission_date;

  UPDATE public.daily_missions
  SET progress = LEAST(target, v_modes_today),
      completed = (v_modes_today >= target),
      completed_at = CASE
        WHEN v_modes_today >= target AND completed = false THEN now()
        ELSE completed_at
      END
  WHERE user_uid = v_uid
    AND mission_date = p_mission_date
    AND mission_type = 'play_modes'
    AND completed = false
  RETURNING xp_reward INTO v_xp_to_add;
  IF FOUND AND v_xp_to_add IS NOT NULL THEN
    UPDATE public.users SET xp = COALESCE(xp,0) + v_xp_to_add WHERE uid = v_uid;
  END IF;
  v_xp_to_add := 0;

  -- ── beat_record: did this just-played score exceed any all-time
  --     score for the same mode (excluding today's plays)?  ─────────
  SELECT COALESCE(MAX(p.score), 0) INTO v_best_other
  FROM public.progress p
  JOIN public.users u ON u.uid = v_uid
  WHERE p.student_uid = v_uid
    AND p.mode = p_mode
    AND (p.completed_at AT TIME ZONE u.timezone)::date <> p_mission_date;

  IF p_score > v_best_other THEN
    UPDATE public.daily_missions
    SET progress = 1,
        completed = true,
        completed_at = CASE WHEN completed = false THEN now() ELSE completed_at END
    WHERE user_uid = v_uid
      AND mission_date = p_mission_date
      AND mission_type = 'beat_record'
      AND completed = false
    RETURNING xp_reward INTO v_xp_to_add;
    IF FOUND AND v_xp_to_add IS NOT NULL THEN
      UPDATE public.users SET xp = COALESCE(xp,0) + v_xp_to_add WHERE uid = v_uid;
    END IF;
  END IF;

  -- Return the up-to-date mission rows.
  RETURN QUERY
    SELECT * FROM public.daily_missions
    WHERE user_uid = v_uid AND mission_date = p_mission_date
    ORDER BY mission_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_mission_progress(DATE, TEXT, INT) TO authenticated;

-- ── 7. set_user_timezone(p_timezone) ─────────────────────────────────
-- Tiny helper so the frontend doesn't need an UPDATE permission on
-- public.users for the timezone field — it goes through this RPC and
-- the body validates `auth.uid()` matches the row.
CREATE OR REPLACE FUNCTION public.set_user_timezone(p_timezone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_timezone IS NULL OR length(p_timezone) = 0 OR length(p_timezone) > 64 THEN
    RAISE EXCEPTION 'Invalid timezone';
  END IF;
  UPDATE public.users SET timezone = p_timezone WHERE uid = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_timezone(TEXT) TO authenticated;

COMMIT;
