-- ============================================================================
-- Medium-risk security hardening
--
-- 1. get_assignments_for_class:
--    Previously any authenticated user could pass any class_id and read
--    its assignments (info leak).  Now the caller must either be the
--    class's teacher or a student enrolled in that class.
--
-- 2. class_lookup_by_code:
--    Removes the `anon` grant (unauthenticated brute-force vector) and
--    adds a per-caller rate limit using a lightweight in-memory table.
--    OAuth / class-switch flows always call this post-auth, so requiring
--    auth does not regress any real user flow.
--
-- 3. award_reward:
--    XP was unbounded — a compromised teacher account could grant
--    millions of XP in one call.  Cap per-call XP at 10 000 and reject
--    negative / non-numeric values explicitly.
-- ============================================================================

-- ── 1. get_assignments_for_class: scope to class members ────────────────────
DROP FUNCTION IF EXISTS public.get_assignments_for_class(UUID);

CREATE OR REPLACE FUNCTION public.get_assignments_for_class(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  class_id UUID,
  word_ids INTEGER[],
  words JSONB,
  allowed_modes TEXT[],
  deadline TEXT,
  sentences TEXT[],
  sentence_difficulty INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_uid   TEXT := auth.uid()::text;
  caller_role  TEXT;
  caller_class TEXT;
  target_code  TEXT;
  is_teacher   BOOLEAN;
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT u.role, u.class_code INTO caller_role, caller_class
  FROM public.users u WHERE u.uid = caller_uid;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '42501';
  END IF;

  -- Teacher path: must own the class.
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_uid = caller_uid
  ) INTO is_teacher;

  IF NOT is_teacher THEN
    -- Student path: must be enrolled in the class.
    SELECT c.code INTO target_code FROM public.classes c WHERE c.id = p_class_id;

    IF target_code IS NULL OR caller_class IS NULL OR caller_class <> target_code THEN
      RAISE EXCEPTION 'Access denied: caller is not a member of this class'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.class_id,
    a.word_ids,
    a.words,
    a.allowed_modes,
    a.deadline,
    a.sentences,
    a.sentence_difficulty,
    a.created_at
  FROM public.assignments a
  WHERE a.class_id = p_class_id
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) FROM anon;

COMMENT ON FUNCTION public.get_assignments_for_class IS
  'Assignments for a class. SECURITY DEFINER with explicit membership check — caller must be the class teacher or an enrolled student.';

-- ── 2. class_lookup_by_code: auth-only + per-uid rate limit ─────────────────
-- Lightweight rate-limit ledger.  One row per lookup call, cleaned up by
-- the RPC as it runs (no cron / pg_net required).
CREATE TABLE IF NOT EXISTS public.class_lookup_rate (
  caller_uid TEXT NOT NULL,
  called_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_class_lookup_rate_caller_time
  ON public.class_lookup_rate (caller_uid, called_at DESC);

ALTER TABLE public.class_lookup_rate ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER RPC touches the table, so the
-- ledger is effectively private to the function.

DROP FUNCTION IF EXISTS public.class_lookup_by_code(text);

CREATE OR REPLACE FUNCTION public.class_lookup_by_code(p_code text)
RETURNS TABLE (code text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_uid      TEXT := auth.uid()::text;
  recent_calls    INTEGER;
  LIMIT_PER_MINUTE CONSTANT INTEGER := 30;
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Housekeeping: delete rows older than 5 minutes so the ledger stays tiny.
  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  -- Per-uid window check: block obvious scripted brute-force.
  SELECT COUNT(*) INTO recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = class_lookup_by_code.caller_uid
    AND called_at > now() - INTERVAL '1 minute';

  IF recent_calls >= LIMIT_PER_MINUTE THEN
    RAISE EXCEPTION 'Rate limit exceeded for class lookup' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (caller_uid);

  RETURN QUERY
  SELECT c.code, c.name
  FROM public.classes c
  WHERE c.code = upper(trim(p_code))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.class_lookup_by_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.class_lookup_by_code(text) FROM anon;

COMMENT ON FUNCTION public.class_lookup_by_code IS
  'Looks up {code, name} for a class code. Auth required + per-caller rate limit (30/min) to deter brute-force.';

-- ── 3. award_reward: cap XP + sanitise inputs ───────────────────────────────
-- Re-create the function with an explicit XP cap.  Everything else in the
-- function body is identical to 20260425_teacher_rewards.sql.
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
  teacher_uid   TEXT := auth.uid()::text;
  student_name  TEXT;
  current_xp    INTEGER;
  new_xp        INTEGER;
  xp_amount     INTEGER;
  -- Cap a single award at 10 000 XP.  Legitimate teacher rewards in the
  -- app UI max out at 500 XP; 10 000 still feels generous while blocking
  -- a compromised account from granting millions in one call.
  MAX_XP_PER_CALL CONSTANT INTEGER := 10000;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = teacher_uid AND role = 'teacher') THEN
    RAISE EXCEPTION 'Only teachers can award rewards' USING ERRCODE = '42501';
  END IF;

  SELECT display_name INTO student_name FROM public.users WHERE uid = p_student_uid;
  IF student_name IS NULL THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = '42704';
  END IF;

  IF p_reward_type = 'xp' THEN
    -- Reject non-integer or negative values explicitly.
    BEGIN
      xp_amount := CAST(p_reward_value AS INTEGER);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'XP value must be an integer, got %', p_reward_value
        USING ERRCODE = '22023';
    END;

    IF xp_amount <= 0 THEN
      RAISE EXCEPTION 'XP value must be positive, got %', xp_amount
        USING ERRCODE = '22023';
    END IF;

    IF xp_amount > MAX_XP_PER_CALL THEN
      RAISE EXCEPTION 'XP value % exceeds per-call cap of %', xp_amount, MAX_XP_PER_CALL
        USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(xp, 0) INTO current_xp FROM public.users WHERE uid = p_student_uid;
    new_xp := current_xp + xp_amount;
    UPDATE public.users SET xp = new_xp WHERE uid = p_student_uid;

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

  INSERT INTO public.teacher_rewards (
    teacher_uid, student_uid, student_name, reward_type, reward_value, reason
  ) VALUES (
    teacher_uid, p_student_uid, student_name, p_reward_type, p_reward_value, p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'student_name', student_name,
    'reward_type', p_reward_type,
    'reward_value', p_reward_value
  );
END;
$$;
