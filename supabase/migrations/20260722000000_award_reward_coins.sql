-- =============================================================================
-- FEATURE: let teachers reward COINS (spend currency), not just XP
-- =============================================================================
--
-- Teachers want to hand a student "money" (the coin counter shown on the
-- student dashboard) as a reward, separate from XP/rank.  award_reward
-- previously only knew xp / badge / title / avatar, so there was no path
-- for a teacher to top up a student's coins:
--   * award_coins exists but grants to the CALLER (auth.uid()), so a
--     teacher can't use it on a student.
--   * coins is an F2-locked column (20260606000000) — only a SECURITY
--     DEFINER RPC may write it.
--
-- FIX: add a `coins` reward type to award_reward.  Because award_reward is
-- SECURITY DEFINER (runs as the function owner, not the calling teacher),
-- its UPDATE bypasses the enforce_users_locked_columns guard the same way
-- the existing `xp` branch already does.
--
-- Coin delta is clamped to [-1000, 1000] (mirrors the XP bounds) and the
-- resulting balance is floored at 0 — a teacher can correct a balance
-- down but never push it negative.
--
-- Everything else is byte-for-byte identical to
-- 20260721000000_award_reward_admin_is_teacher: same is_teacher() caller
-- gate, same class-ownership check, same xp/badge/title/avatar branches,
-- same teacher_rewards audit insert, same (text,text,text,text) signature.
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.award_reward(text, text, text, text);

CREATE OR REPLACE FUNCTION public.award_reward(
  p_student_uid TEXT,
  p_reward_type TEXT,
  p_reward_value TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid    TEXT := auth.uid()::text;
  v_student_name  TEXT;
  v_student_class TEXT;
  v_current_xp    INTEGER;
  v_xp_delta      INTEGER;
  v_new_xp        INTEGER;
  v_current_coins INTEGER;
  v_coin_delta    INTEGER;
  v_new_coins     INTEGER;
  XP_MIN   CONSTANT INTEGER := -1000;
  XP_MAX   CONSTANT INTEGER := 1000;
  COIN_MIN CONSTANT INTEGER := -1000;
  COIN_MAX CONSTANT INTEGER := 1000;
BEGIN
  -- 1. Caller must be authenticated.
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- 2. Caller must be teacher-capable (teacher OR admin).
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Only teachers can award rewards' USING ERRCODE = '42501';
  END IF;

  -- 3. Look up the student row + their class_code.
  SELECT display_name, class_code
    INTO v_student_name, v_student_class
  FROM public.users
  WHERE uid = p_student_uid;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = '42704';
  END IF;

  -- 4. CLASS-OWNERSHIP CHECK.  The student must belong to a class owned by
  --    the calling teacher.  This blocks cross-teacher reward grants.
  IF NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.code = v_student_class
      AND c.teacher_uid = v_caller_uid
  ) THEN
    RAISE EXCEPTION
      'Not authorized to reward this student (not in your class)'
      USING ERRCODE = '42501';
  END IF;

  -- 5. Apply the reward by type.
  IF p_reward_type = 'xp' THEN
    -- 5a. XP BOUNDS CHECK.  Clamp to [XP_MIN, XP_MAX] to prevent overflow
    --     attacks and XP-wipes via large negative values.
    BEGIN
      v_xp_delta := CAST(p_reward_value AS INTEGER);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid XP value: %', p_reward_value USING ERRCODE = '22023';
    END;

    IF v_xp_delta < XP_MIN OR v_xp_delta > XP_MAX THEN
      RAISE EXCEPTION 'XP value % out of range [%, %]', v_xp_delta, XP_MIN, XP_MAX
        USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(xp, 0) INTO v_current_xp FROM public.users WHERE uid = p_student_uid;
    v_new_xp := GREATEST(0, v_current_xp + v_xp_delta);  -- floor at 0 — never go negative
    UPDATE public.users SET xp = v_new_xp WHERE uid = p_student_uid;

  ELSIF p_reward_type = 'coins' THEN
    -- 5b. COIN BOUNDS CHECK.  Same shape as the XP branch: clamp the delta
    --     to [COIN_MIN, COIN_MAX] and floor the resulting balance at 0 so a
    --     teacher can correct a balance down but never push it negative.
    BEGIN
      v_coin_delta := CAST(p_reward_value AS INTEGER);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid coin value: %', p_reward_value USING ERRCODE = '22023';
    END;

    IF v_coin_delta < COIN_MIN OR v_coin_delta > COIN_MAX THEN
      RAISE EXCEPTION 'Coin value % out of range [%, %]', v_coin_delta, COIN_MIN, COIN_MAX
        USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(coins, 0) INTO v_current_coins FROM public.users WHERE uid = p_student_uid;
    v_new_coins := GREATEST(0, v_current_coins + v_coin_delta);  -- floor at 0
    UPDATE public.users SET coins = v_new_coins WHERE uid = p_student_uid;

  ELSIF p_reward_type = 'badge' THEN
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY[p_reward_value]);

  ELSIF p_reward_type = 'title' THEN
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), '🏷️ ' || p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY['🏷️ ' || p_reward_value]);

  ELSIF p_reward_type = 'avatar' THEN
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), '🎭 ' || p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY['🎭 ' || p_reward_value]);
  ELSE
    RAISE EXCEPTION 'Invalid reward_type: %', p_reward_type USING ERRCODE = '22023';
  END IF;

  -- 6. Audit log (unchanged).
  INSERT INTO public.teacher_rewards (
    teacher_uid, student_uid, student_name, reward_type, reward_value, reason
  ) VALUES (
    v_caller_uid, p_student_uid, v_student_name, p_reward_type, p_reward_value, p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'student_name', v_student_name,
    'reward_type', p_reward_type,
    'reward_value', p_reward_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_reward(text, text, text, text)
  TO authenticated;

COMMIT;

COMMENT ON FUNCTION public.award_reward IS
  'Teacher (or admin) grants XP / COINS / badges / titles / avatars to a '
  'student.  Caller must be teacher-capable (is_teacher()) AND own the class '
  'the student is in.  XP and coin deltas clamped to [-1000, 1000]; neither '
  'balance can go below 0.  Coins reward type added in '
  '20260722000000_award_reward_coins.';
