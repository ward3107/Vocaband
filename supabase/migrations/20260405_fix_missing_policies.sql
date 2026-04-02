-- =============================================================================
-- Fix Missing Assignment RLS Policies
-- =============================================================================
-- Migration 005 was applied but the INSERT/UPDATE/DELETE policies
-- were not actually created. This migration creates them.

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
