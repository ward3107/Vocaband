-- Migration 002: Restrict progress SELECT to own data / teacher's class
-- Problem: Any authenticated user could read ALL student scores from ALL classes (PII leak).
-- Fix: Students see only their own rows; teachers see only rows belonging to their classes.

DROP POLICY IF EXISTS "progress_select" ON public.progress;

CREATE POLICY "progress_select" ON public.progress
  FOR SELECT TO authenticated USING (
    auth.uid()::text = student_uid
    OR class_code IN (
      SELECT code FROM public.classes WHERE teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  );
