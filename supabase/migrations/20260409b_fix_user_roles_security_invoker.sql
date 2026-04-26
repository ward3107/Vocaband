-- Fix: Change user_roles view from SECURITY DEFINER to SECURITY INVOKER.
-- SECURITY DEFINER bypasses RLS and runs with the view creator's permissions,
-- which is a security risk flagged by Supabase's linter.
-- SECURITY INVOKER respects the querying user's RLS policies.

CREATE OR REPLACE VIEW public.user_roles
WITH (security_invoker = true)
AS
SELECT
  auth.uid() as user_id,
  auth.email() as email,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.teacher_profiles
      WHERE email = auth.email()
      AND status = 'active'
    ) THEN 'teacher'
    WHEN EXISTS (
      SELECT 1 FROM public.student_profiles
      WHERE email = auth.email()
    ) THEN 'student'
    ELSE 'new_user'
  END as role;
