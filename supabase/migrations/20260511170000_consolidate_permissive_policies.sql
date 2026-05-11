-- Scaling pass — 2026-05-11 (chunk B)
-- Consolidate duplicate PERMISSIVE policies on (table, role, action) combos.
-- Multiple permissive policies are OR'd together by Postgres, so two policies
-- = two evaluations per row. Combining them into one policy with OR'd logic
-- preserves the exact same access rules and halves the policy evaluation
-- overhead on hot SELECT/UPDATE paths.
--
-- Already applied to production 2026-05-11 via Supabase MCP. This file
-- exists so the migration history matches prod state.

BEGIN;

-- ─── classes SELECT (authenticated) ─────────────────────────────
-- "Teachers can view own classes" is a strict subset of classes_select.
-- Drop the older one; classes_select already covers the teacher_uid case
-- plus students-by-class-code and admin.
DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;

-- ─── progress SELECT (authenticated) ────────────────────────────
-- Combine progress_select (student own + class teacher + admin) with
-- quick_play_progress_select (teacher of QP session).
DROP POLICY IF EXISTS progress_select ON public.progress;
DROP POLICY IF EXISTS quick_play_progress_select ON public.progress;

CREATE POLICY progress_select ON public.progress AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((SELECT auth.uid())::text = student_uid)
    OR (class_code IN (SELECT c.code FROM classes c WHERE c.teacher_uid = (SELECT auth.uid())::text))
    OR (
      class_code = 'QUICK_PLAY'
      AND assignment_id IN (SELECT s.id FROM quick_play_sessions s WHERE s.teacher_uid = (SELECT auth.uid())::text)
    )
    OR is_admin()
  );

-- ─── student_profiles INSERT (public) ───────────────────────────
DROP POLICY IF EXISTS "Students can insert own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Teachers can insert student profiles" ON public.student_profiles;

CREATE POLICY student_profiles_insert ON public.student_profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (status = 'pending_approval' AND unique_id = (lower(class_code) || lower(TRIM(BOTH FROM display_name))))
    OR (status = 'pending_approval' AND EXISTS (
      SELECT 1 FROM classes
      WHERE classes.code = student_profiles.class_code
        AND classes.teacher_uid = (SELECT auth.uid())::text
    ))
  );

-- ─── student_profiles SELECT (public) ───────────────────────────
DROP POLICY IF EXISTS "Students can read own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Teachers can read class profiles" ON public.student_profiles;

CREATE POLICY student_profiles_select ON public.student_profiles AS PERMISSIVE FOR SELECT TO public
  USING (
    ((SELECT auth.uid()) = auth_uid)
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.code = student_profiles.class_code
        AND classes.teacher_uid = (SELECT auth.uid())::text
    )
  );

-- ─── student_profiles UPDATE (public) ───────────────────────────
-- Combined USING: row belongs to student OR class belongs to teacher
-- Combined WITH CHECK: student keeps ownership OR teacher is doing a
--   strict "approve" action (status=approved, approved_at=now, approved_by=self)
DROP POLICY IF EXISTS "Students can update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Teachers can approve class students" ON public.student_profiles;

CREATE POLICY student_profiles_update ON public.student_profiles AS PERMISSIVE FOR UPDATE TO public
  USING (
    ((SELECT auth.uid()) = auth_uid)
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.code = student_profiles.class_code
        AND classes.teacher_uid = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    ((SELECT auth.uid()) = auth_uid)
    OR (status = 'approved' AND approved_at = now() AND approved_by = (SELECT auth.uid()))
  );

-- ─── teacher_rewards SELECT (public) ────────────────────────────
DROP POLICY IF EXISTS "Students can view own rewards" ON public.teacher_rewards;
DROP POLICY IF EXISTS "Teachers can view their own rewards" ON public.teacher_rewards;

CREATE POLICY teacher_rewards_select ON public.teacher_rewards AS PERMISSIVE FOR SELECT TO public
  USING (
    ((SELECT auth.uid())::text = student_uid)
    OR ((SELECT auth.uid())::text = teacher_uid)
  );

COMMIT;
