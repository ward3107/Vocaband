-- =============================================================================
-- FIX: award_reward should treat admins as teacher-capable
-- =============================================================================
--
-- BUG: award_reward (last redefined in
-- 20260428132000_security_high_award_reward.sql) gates the caller with a
-- LITERAL `role = 'teacher'` check.  Every other teacher-gated path in the
-- app treats `admin` as teacher-capable:
--
--   * is_teacher() returns true for role IN ('teacher','admin')
--     (20260515093836_is_teacher_includes_admin.sql)
--   * the client's isTeacherLike (src/core/supabase.ts) routes admins to
--     the teacher dashboard, where the reward modal lives.
--
-- So an admin / developer account can OPEN the "Send XP Boost" modal but
-- the RPC rejects the call with 42501 'Only teachers can award rewards'.
-- This RPC simply slipped through the 2026-05-15 "admins are teachers"
-- unification.
--
-- FIX: swap the inline role check for the canonical is_teacher() helper so
-- this path agrees with every other teacher-capable gate in one place.
--
-- Everything else is byte-for-byte identical to 20260428132000:
--   * class-ownership check (classes.teacher_uid = caller) — UNCHANGED, so
--     an admin can still only reward students in classes THEY own.
--   * XP clamp to [-1000, 1000] and floor-at-0 — UNCHANGED.
--   * teacher_rewards audit insert — UNCHANGED.
--   * parameter list (text, text, text, text) — UNCHANGED, so client calls
--     remain byte-for-byte compatible.
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
  XP_MIN CONSTANT INTEGER := -1000;
  XP_MAX CONSTANT INTEGER := 1000;
BEGIN
  -- 1. Caller must be authenticated.
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- 2. Caller must be teacher-capable.  is_teacher() covers both
  --    role='teacher' and role='admin' (the developer account), matching
  --    every other teacher-gated path in the app.
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
  'Teacher (or admin) grants XP / badges / titles / avatars to a student.  '
  'Caller must be teacher-capable (is_teacher() — role teacher OR admin) AND '
  'must own the class the student is in.  XP values clamped to [-1000, 1000].  '
  'XP can never go below 0.  Role check unified onto is_teacher() in '
  '20260721000000_award_reward_admin_is_teacher (admins were wrongly rejected '
  'by the literal role=teacher check from 20260428132000).';
