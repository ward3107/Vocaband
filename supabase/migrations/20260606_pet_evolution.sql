-- Pet Evolution — activity-driven companion that grows with daily play.
--
-- Distinct from the existing PET_MILESTONES system in
-- src/constants/game.ts, which is XP-based (the pet evolves as the
-- student crosses cumulative XP thresholds, one-way).  This feature
-- is ACTIVITY-DRIVEN: the pet ages with the count of distinct days
-- the student played, and DECAYS if they go inactive.  Both pets can
-- coexist on the dashboard — the XP pet rewards long-term grind, the
-- activity pet rewards consistency.
--
-- Stages (computed client-side from pet_active_days):
--   0-1   active days  → 🥚 Egg
--   2-3                → 🐣 Baby
--   4-7                → 🐥 Child
--   8-14               → 🐤 Teen
--   15+                → 🐔 Adult
--
-- Decay rules (applied lazily by record_pet_activity):
--   - 0-1 days since last play  → +1 active day, no penalty
--   - 2-3 days off              → +1 active day still (3-day grace)
--   - 4+ days off               → -(days_off - 3) active days BEFORE
--                                 the +1, so a 4-day absence is net 0,
--                                 a 7-day absence is net -3, etc.
--   active_days never goes below 0.
--
-- Storage: two columns on users — kept on the existing row instead of
-- a new pets table because it's strictly per-user state with a 1:1
-- relationship.  Adding a join would be premature.

BEGIN;

-- ── Columns ──────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pet_active_days INT NOT NULL DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pet_last_active_date DATE;

COMMENT ON COLUMN public.users.pet_active_days IS
  'Activity-driven pet age (count of distinct days the student played, with decay applied for inactivity beyond a 3-day grace period). Drives the pet stage on the student dashboard.';

COMMENT ON COLUMN public.users.pet_last_active_date IS
  'User-LOCAL date of the last play (computed in users.timezone). Used by record_pet_activity to detect day rollovers + apply decay.';

-- ── record_pet_activity(p_today_local) ───────────────────────────────
-- Called after each game finish.  Idempotent within a day — calling
-- twice on the same local date is a no-op (the second call sees
-- last_active_date == today and short-circuits).
--
-- SECURITY DEFINER so we can update users.pet_active_days /
-- pet_last_active_date even though the row's RLS may not allow direct
-- updates by the student.  Body still gates on auth.uid().
CREATE OR REPLACE FUNCTION public.record_pet_activity(p_today_local DATE)
RETURNS TABLE (active_days INT, last_active_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_last DATE;
  v_active INT;
  v_days_off INT;
  v_decay INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(pet_active_days, 0), pet_last_active_date
    INTO v_active, v_last
    FROM public.users
   WHERE uid = v_uid
   FOR UPDATE;

  IF NOT FOUND THEN
    -- User row missing — defensive, shouldn't happen for an auth'd
    -- caller.  Bail out without touching anything.
    RETURN;
  END IF;

  -- Same-day call: no-op.  Pet only ages once per local day.
  IF v_last IS NOT NULL AND v_last = p_today_local THEN
    RETURN QUERY SELECT v_active, v_last;
    RETURN;
  END IF;

  -- First-ever play: pet age = 1, no decay logic.
  IF v_last IS NULL THEN
    UPDATE public.users
       SET pet_active_days = 1,
           pet_last_active_date = p_today_local
     WHERE uid = v_uid;
    RETURN QUERY SELECT 1::INT, p_today_local;
    RETURN;
  END IF;

  -- Compute decay for any inactivity beyond the 3-day grace period.
  v_days_off := GREATEST(0, (p_today_local - v_last) - 1);  -- "1 day off" = the gap, e.g. yesterday=1
  IF v_days_off > 3 THEN
    v_decay := v_days_off - 3;
    v_active := GREATEST(0, v_active - v_decay);
  END IF;

  -- Then count today's play as a +1 active day.
  v_active := v_active + 1;

  UPDATE public.users
     SET pet_active_days = v_active,
         pet_last_active_date = p_today_local
   WHERE uid = v_uid;

  RETURN QUERY SELECT v_active, p_today_local;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_pet_activity(DATE) TO authenticated;

-- ── get_pet_state() ──────────────────────────────────────────────────
-- Lightweight read so the dashboard hook doesn't need a SELECT
-- privilege on users.pet_*.  Returns the same fields record_pet_activity
-- writes, plus the days_since_last_active counter the UI uses to pick
-- the mood emoji (happy / neutral / sad).
CREATE OR REPLACE FUNCTION public.get_pet_state(p_today_local DATE)
RETURNS TABLE (active_days INT, last_active_date DATE, days_since_last_active INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_active INT;
  v_last DATE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(pet_active_days, 0), pet_last_active_date
    INTO v_active, v_last
    FROM public.users
   WHERE uid = v_uid;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_active,
    v_last,
    CASE WHEN v_last IS NULL THEN 0 ELSE (p_today_local - v_last)::INT END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pet_state(DATE) TO authenticated;

COMMIT;
