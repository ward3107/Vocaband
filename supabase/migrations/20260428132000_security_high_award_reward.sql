-- =============================================================================
-- SECURITY HIGH FIX: award_reward class-ownership + XP bounds
-- =============================================================================
--
-- AUDIT FINDING (docs/security-audit-2026-04-28.md, finding 2.3-3):
--
-- The original `award_reward` (20260425120000_teacher_rewards.sql:42-116)
-- has TWO holes:
--
-- 1. NO CLASS-OWNERSHIP CHECK
--    Line 60 verifies the caller is a teacher.  Line 67 looks up the
--    target student's display_name.  But there is no check that the
--    student belongs to a class owned by the calling teacher.  Any
--    teacher in the system can grant rewards to any student in any
--    other teacher's class.
--
-- 2. NO XP BOUNDS CHECK
--    Line 79 casts `p_reward_value` to INTEGER and adds it to the
--    student's XP with `current_xp + CAST(p_reward_value AS INTEGER)`.
--    Negative values are accepted (could nuke a victim's XP).
--    Values up to 2^31-1 are accepted (could spike to 2 billion XP
--    and break leaderboards / overflow downstream calculations).
--
-- FIX:
--
-- 1. After verifying caller is a teacher, look up the student's
--    class_code on `public.users`, look up the class in
--    `public.classes`, and confirm `classes.teacher_uid = caller`.
--    Reject otherwise.
--
-- 2. For reward_type='xp', clamp p_reward_value to [-1000, 1000] —
--    enough range for legitimate teacher rewards (a few hundred at
--    most) without enabling 2-billion-XP cheats or full XP wipes.
--
-- Backward compat: existing reward grants in the codebase pass
-- positive values in the 50-500 range; this clamp doesn't affect
-- normal usage.
-- =============================================================================

BEGIN;

-- Drop the old version (parameter list unchanged so client calls are
-- byte-for-byte compatible — only the BODY tightens).
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
  XP_MIN CONSTANT INTEGER := -1000;
  XP_MAX CONSTANT INTEGER := 1000;
BEGIN
  -- 1. Caller must be authenticated.
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- 2. Caller must be a teacher.
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = v_caller_uid AND role = 'teacher'
  ) THEN
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

  -- 4. CLASS-OWNERSHIP CHECK (was missing before).
  --    The student must belong to a class owned by the calling
  --    teacher.  This blocks cross-teacher reward grants.
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
    -- 5a. XP BOUNDS CHECK (was missing before).
    --     Clamp to [XP_MIN, XP_MAX] to prevent overflow attacks and
    --     XP-wipes via large negative values.
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
  'Teacher grants XP / badges / titles / avatars to a student.  '
  'Caller must be a teacher AND must own the class the student is in.  '
  'XP values clamped to [-1000, 1000].  XP can never go below 0.  '
  'Tightened in 20260428132000_security_high_award_reward (was missing '
  'class-ownership + bounds checks).';
