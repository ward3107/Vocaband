-- Fix infinite recursion in users RLS policies (error 42P17)
--
-- Root cause: The UPDATE policy's WITH CHECK clause does
--   SELECT FROM public.users (to check role/class_code didn't change)
-- which triggers the SELECT policy, which may trigger further checks,
-- creating infinite recursion.
--
-- Fix: Use a SECURITY DEFINER helper function that bypasses RLS
-- to check if role/class_code changed, avoiding the recursive SELECT.

-- Helper: check if a user is trying to change their role or class_code
-- Runs as function owner (bypasses RLS) to avoid recursion
CREATE OR REPLACE FUNCTION public.check_user_update_allowed(
  p_uid TEXT,
  p_new_role TEXT,
  p_new_class_code TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = p_uid
      AND role = p_new_role
      AND (class_code IS NULL OR class_code = p_new_class_code)
  );
$$;

-- Fix INSERT policy: remove is_admin() (new users can't be admin yet)
DROP POLICY IF EXISTS "users_insert" ON public.users;

CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid()::text = uid
    AND (
      (role = 'teacher' AND public.is_teacher_allowed(public.get_my_email()))
      OR role = 'student'
    )
  );

-- Fix UPDATE policy: use SECURITY DEFINER helper instead of inline subquery
DROP POLICY IF EXISTS "users_update" ON public.users;

CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (
    auth.uid()::text = uid OR public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
    OR public.check_user_update_allowed(auth.uid()::text, role, class_code)
  );
