-- Migration 007: Restrict self-registration to student role only
-- Problem: users_insert policy allowed any authenticated user to insert a row
--          with any role, so an anonymous user could self-register as 'teacher'.
-- Fix: Only admins can insert non-student roles. Regular users can only
--      insert themselves as 'student'.

-- Helper: get the current user's email from auth.users.
-- Must be SECURITY DEFINER because RLS policies run as the authenticated role
-- which does NOT have SELECT on auth.users.
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "users_insert" ON public.users;

CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid()::text = uid
    AND (
      -- Admins can create any role
      public.is_admin()
      -- Teachers can create their own profile (via Google OAuth allowlist flow)
      OR (role = 'teacher' AND public.is_teacher_allowed(public.get_my_email()))
      -- Everyone else can only register as a student
      OR role = 'student'
    )
  );
