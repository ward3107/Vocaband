-- ============================================
-- Fix Supabase Advisor Warnings
-- Applied directly to production DB via Supabase MCP
-- ============================================

-- ===== SECURITY: Fix mutable search_path on functions =====

-- Fix sync_student_xp_to_users
CREATE OR REPLACE FUNCTION public.sync_student_xp_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.auth_uid IS NOT NULL THEN
    UPDATE public.users
    SET xp = COALESCE(NEW.xp, 0)
    WHERE uid = NEW.auth_uid::text;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop old 2-param overload of create_quick_play_session
DROP FUNCTION IF EXISTS public.create_quick_play_session(integer[], text[]);

-- Recreate with search_path set
CREATE OR REPLACE FUNCTION public.create_quick_play_session(
  p_word_ids integer[] DEFAULT NULL::integer[],
  p_custom_words jsonb DEFAULT NULL::jsonb,
  p_allowed_modes text[] DEFAULT '{classic,listening,spelling,matching,true-false,flashcards,scramble,reverse,letter-sounds,sentence-builder}'::text[]
)
RETURNS public.quick_play_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_code TEXT;
  v_session public.quick_play_sessions;
BEGIN
  v_session_code := public.generate_session_code();
  INSERT INTO public.quick_play_sessions (
    session_code, teacher_uid, word_ids, custom_words, allowed_modes, is_active
  ) VALUES (
    v_session_code, auth.uid()::text,
    COALESCE(p_word_ids, ARRAY[]::INTEGER[]),
    p_custom_words, p_allowed_modes, true
  )
  RETURNING * INTO v_session;
  RETURN v_session;
END;
$$;

-- ===== PERFORMANCE: Fix RLS policies (wrap auth.uid() in SELECT) =====

DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users FOR INSERT
  WITH CHECK (
    (((SELECT auth.uid()))::text = uid)
    AND (((role = 'teacher') AND is_teacher_allowed(get_my_email())) OR (role = 'student'))
  );

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users FOR UPDATE
  USING ((((SELECT auth.uid()))::text = uid) OR is_admin())
  WITH CHECK (is_admin() OR check_user_update_allowed(((SELECT auth.uid()))::text, role, class_code));

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT
  USING (
    ((((SELECT auth.uid()))::text = uid) OR is_admin())
    AND (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) IS FALSE)
  );

DROP POLICY IF EXISTS "Teachers can create sessions" ON public.quick_play_sessions;
CREATE POLICY "Teachers can create sessions" ON public.quick_play_sessions FOR INSERT
  WITH CHECK (
    (((SELECT auth.uid()))::text = teacher_uid)
    AND (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) IS FALSE)
  );

DROP POLICY IF EXISTS "Teachers can update own sessions" ON public.quick_play_sessions;
CREATE POLICY "Teachers can update own sessions" ON public.quick_play_sessions FOR UPDATE
  USING (
    (((SELECT auth.uid()))::text = teacher_uid)
    AND (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) IS FALSE)
  )
  WITH CHECK (
    (((SELECT auth.uid()))::text = teacher_uid)
    AND (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) IS FALSE)
  );

-- Simplify teacher_profiles deny policies (no auth check needed for false)
DROP POLICY IF EXISTS "Teachers can be read by authenticated users" ON public.teacher_profiles;
CREATE POLICY "Teachers can be read by authenticated users" ON public.teacher_profiles FOR SELECT
  USING (COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) IS FALSE);

DROP POLICY IF EXISTS "Teachers cannot be deleted via API" ON public.teacher_profiles;
CREATE POLICY "Teachers cannot be deleted via API" ON public.teacher_profiles FOR DELETE USING (false);

DROP POLICY IF EXISTS "Teachers cannot be inserted via API" ON public.teacher_profiles;
CREATE POLICY "Teachers cannot be inserted via API" ON public.teacher_profiles FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Teachers cannot be updated via API" ON public.teacher_profiles;
CREATE POLICY "Teachers cannot be updated via API" ON public.teacher_profiles FOR UPDATE USING (false);

-- ===== PERFORMANCE: Drop duplicate indexes =====
DROP INDEX IF EXISTS public.idx_assignments_class_id;
DROP INDEX IF EXISTS public.idx_progress_class_date;
