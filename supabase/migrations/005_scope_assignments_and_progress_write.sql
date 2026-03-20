-- =============================================================================
-- Migration 005: Scope assignment writes to owning teacher & progress inserts to enrolled class
-- =============================================================================
--
-- Problem 1 (assignments):
--   INSERT / UPDATE / DELETE policies only check is_teacher(), allowing any
--   teacher to modify assignments in ANY class — not just their own.
--
-- Problem 2 (progress):
--   INSERT policy only checks student_uid = auth.uid(), allowing a student
--   to insert progress records for classes they don't belong to.
--
-- Fix 1: Restrict assignment writes to the teacher who owns the class.
-- Fix 2: Restrict progress inserts to the student's enrolled class_code.
-- =============================================================================

-- ·· assignments — INSERT ··
DROP POLICY IF EXISTS "assignments_insert" ON public.assignments;

CREATE POLICY "assignments_insert" ON public.assignments
  FOR INSERT WITH CHECK (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

-- ·· assignments — UPDATE ··
DROP POLICY IF EXISTS "assignments_update" ON public.assignments;

CREATE POLICY "assignments_update" ON public.assignments
  FOR UPDATE USING (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

-- ·· assignments — DELETE ··
DROP POLICY IF EXISTS "assignments_delete" ON public.assignments;

CREATE POLICY "assignments_delete" ON public.assignments
  FOR DELETE USING (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

-- ·· progress — INSERT ··
DROP POLICY IF EXISTS "progress_insert" ON public.progress;

CREATE POLICY "progress_insert" ON public.progress
  FOR INSERT WITH CHECK (
    auth.uid()::text = student_uid
    AND class_code = (
      SELECT class_code FROM public.users WHERE uid = auth.uid()::text
    )
  );
