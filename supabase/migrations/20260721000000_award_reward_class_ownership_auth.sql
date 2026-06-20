-- =============================================================================
-- FIX: award_reward authorizes by CLASS OWNERSHIP, not the strict role label
-- =============================================================================
--
-- BUG (reported from production):
--   Teachers got HTTP 403 `42501 "Only teachers can award rewards"` when
--   giving a reward, even for a student in a class they own.
--
-- ROOT CAUSE:
--   award_reward (20260428132000_security_high_award_reward) gated step 2 on
--   `EXISTS (SELECT 1 FROM users WHERE uid = caller AND role = 'teacher')`.
--   But Vocaband identifies teachers via the EMAIL ALLOWLIST
--   (is_teacher(get_my_email()) — see 004_teacher_allowlist), and an
--   allowlisted teacher's `users.role` is not always literally 'teacher'.
--   Such a teacher can create classes and manage students (those paths gate
--   on the allowlist), yet award_reward's stricter role-label check rejected
--   them. The two notions of "teacher" had drifted apart.
--
-- FIX:
--   Drop the redundant global role-label check. The REAL authorization is the
--   per-student class-ownership check (step 4, kept verbatim):
--     the student must be in a class whose `teacher_uid` = the caller.
--   Only teachers can own classes, so "caller owns this student's class"
--   already proves the caller is that student's teacher — a stricter, more
--   precise gate than a global role label. Authentication (step 1), XP bounds,
--   and the audit insert are all unchanged.
--
-- This does NOT weaken security: a student/guest owns no classes, so the
-- ownership check still blocks them; cross-teacher grants are still blocked.
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

  -- 2. Look up the student row + their class_code.
  SELECT display_name, class_code
    INTO v_student_name, v_student_class
  FROM public.users
  WHERE uid = p_student_uid;

  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = '42704';
  END IF;

  -- 3. AUTHORIZATION = CLASS OWNERSHIP.
  --    The student must belong to a class owned by the caller. Only
  --    teachers can own classes, so this both proves the caller is a
  --    teacher AND that this specific student is theirs. (Replaces the
  --    old strict `users.role = 'teacher'` check that misfired for
  --    allowlist-based teachers — see migration header.)
  IF NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.code = v_student_class
      AND c.teacher_uid = v_caller_uid
  ) THEN
    RAISE EXCEPTION
      'Not authorized to reward this student (not in your class)'
      USING ERRCODE = '42501';
  END IF;

  -- 4. Apply the reward by type.
  IF p_reward_type = 'xp' THEN
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
    v_new_xp := GREATEST(0, v_current_xp + v_xp_delta);  -- floor at 0
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

  -- 5. Audit log.
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
  'Teacher grants XP / badges / titles / avatars to a student. Authorization '
  'is class ownership (caller must own the class the student is in) — which '
  'also proves teacher status, since only teachers own classes. XP clamped to '
  '[-1000, 1000], floored at 0. Fixed in 20260721000000 (the old strict '
  'users.role = ''teacher'' check rejected allowlist-based teachers).';
