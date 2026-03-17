-- Migration 001: Prevent role escalation
-- Problem: users_update policy only checked that role was a valid value,
--          allowing any student to promote themselves to 'teacher'.
-- Fix: Users may only keep their existing role; only admins can change roles.

DROP POLICY IF EXISTS "users_update" ON public.users;

CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (auth.uid()::text = uid OR public.is_admin())
  WITH CHECK (
    -- Admins can assign any valid role
    public.is_admin()
    OR
    -- Everyone else must keep their existing role (no self-promotion)
    role = (SELECT u.role FROM public.users u WHERE u.uid = auth.uid()::text)
  );
