-- =============================================================================
-- Finalize remaining May 2026 audit items (P1 functions + P2 perf)
-- =============================================================================
--
-- 1. list_students_in_class       — require is_teacher() AND class ownership
-- 2. create_quick_play_session    — require is_teacher()
-- 3. student_profiles SELECT      — consolidate two permissive policies into one
--
-- Skipped (false-positive / cost > benefit):
--   - cron.job / cron.job_run_details policies: predicate is
--     `username = CURRENT_USER`. All jobs run as `postgres`; for any
--     PostgREST caller CURRENT_USER is `authenticated` or `anon`, so the
--     policy returns zero rows. No actual data exposure.
--   - 19 "unused" indexes (8–16 KB each, ~250 KB total): some are dormant
--     by design (idx_users_trial_ends_at fires nightly,
--     idx_student_sign_in_rate_caller_at is brand new). Drop cost > benefit.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. list_students_in_class(p_class_code)
-- ---------------------------------------------------------------------------
-- BEFORE: any authenticated user could list display_name + xp + avatar +
-- auth_uid + status for every approved student in any class.
-- AFTER: require is_teacher() AND the class must be owned by the caller
-- (admins bypass the ownership check).

CREATE OR REPLACE FUNCTION public.list_students_in_class(p_class_code text)
RETURNS TABLE(id uuid, auth_uid uuid, display_name text, xp integer, avatar text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Teacher role required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.code = p_class_code
      AND c.teacher_uid = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'Class not found or not owned by current user' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT sp.id, sp.auth_uid, sp.display_name, sp.xp, sp.avatar, sp.status
  FROM public.student_profiles sp
  WHERE sp.class_code = p_class_code
    AND sp.status = 'approved'
  ORDER BY sp.display_name ASC;
END;
$function$;


-- ---------------------------------------------------------------------------
-- 2. create_quick_play_session(...)
-- ---------------------------------------------------------------------------
-- BEFORE: any authenticated user (including students) could create a
-- Quick Play session with themselves as teacher_uid.
-- AFTER: require is_teacher().

CREATE OR REPLACE FUNCTION public.create_quick_play_session(
  p_word_ids      integer[] DEFAULT NULL::integer[],
  p_custom_words  jsonb     DEFAULT NULL::jsonb,
  p_allowed_modes text[]    DEFAULT '{classic,listening,spelling,matching,true-false,flashcards,scramble,reverse,letter-sounds,sentence-builder}'::text[],
  p_subject       text      DEFAULT 'english'::text
)
RETURNS quick_play_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_session_code TEXT;
  v_session      public.quick_play_sessions;
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Teacher role required' USING ERRCODE = '42501';
  END IF;

  IF p_subject NOT IN ('english', 'hebrew') THEN
    RAISE EXCEPTION 'Invalid subject: %. Expected ''english'' or ''hebrew''.', p_subject;
  END IF;

  v_session_code := public.generate_session_code();

  INSERT INTO public.quick_play_sessions (
    session_code, teacher_uid, word_ids, custom_words, allowed_modes, subject, is_active
  ) VALUES (
    v_session_code, auth.uid()::text,
    COALESCE(p_word_ids, ARRAY[]::INTEGER[]),
    p_custom_words, p_allowed_modes, p_subject, true
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$function$;


-- ---------------------------------------------------------------------------
-- 3. Consolidate duplicate SELECT policies on student_profiles
-- ---------------------------------------------------------------------------
-- BEFORE:
--   "student_profiles_select" (PUBLIC role): auth_uid OR teacher-of-class
--   "Users can read own profile by email" (authenticated): email match
--   Both are permissive SELECT → Postgres evaluates both on every read.
-- AFTER:
--   Single permissive policy with all three branches OR'd together.
--   Anon callers still excluded by the is_anonymous IS FALSE guard.

ALTER POLICY student_profiles_select ON public.student_profiles
USING (
  (
    ((SELECT auth.uid()) = auth_uid)
    OR (email = (SELECT auth.email()))
    OR EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.code = student_profiles.class_code
        AND classes.teacher_uid = ((SELECT auth.uid()))::text
    )
  )
  AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
);

DROP POLICY IF EXISTS "Users can read own profile by email" ON public.student_profiles;
