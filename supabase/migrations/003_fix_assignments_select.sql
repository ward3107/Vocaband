-- Migration 003: Restrict assignments SELECT to enrolled class
-- Problem: Any authenticated user could enumerate ALL assignments from ALL classes.
-- Fix: Students see assignments for their enrolled class only; teachers see their own classes only.
-- Prerequisite: App login flow must upsert the users row BEFORE fetching assignments
--               so that the class_code subquery below resolves correctly.

DROP POLICY IF EXISTS "assignments_select" ON public.assignments;

CREATE POLICY "assignments_select" ON public.assignments
  FOR SELECT TO authenticated USING (
    class_id IN (
      SELECT id FROM public.classes
      WHERE teacher_uid = auth.uid()::text
         OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
    )
    OR public.is_admin()
  );
