-- =============================================================================
-- Fix: is_teacher() should check public.users.role, not teacher_allowlist
-- =============================================================================
-- Problem: New freemium teachers (who signed up via the public "Get
--   Started Free" / "Sign in" flow) get a public.users row with
--   role='teacher' and a 30-day Pro trial, but are NOT on the legacy
--   teacher_allowlist (which dates from the invite-only soft launch).
--
-- The current is_teacher() — installed by migration 20260404 — checks
-- the allowlist, so RLS policies on classes / assignments / progress
-- reject these freemium teachers.  They can sign in successfully but
-- get an RLS error when trying to create a class.  Reported 2026-05-09
-- after a freemium teacher hit the dead-end.
--
-- Solution: Restore the original schema.sql logic — is_teacher()
-- should check public.users.role = 'teacher'.  The allowlist still
-- acts as a gate at the right layer (signup-time in App.tsx, where the
-- user's role is decided), so the security model is unchanged for
-- non-freemium teachers.  But freemium teachers — whose role was
-- correctly set by App.tsx based on their stamped intended_role —
-- now correctly pass the per-RLS-call check.
--
-- The single-argument is_teacher(p_user_email TEXT) is intentionally
-- left untouched: it answers a different semantic question ("is THIS
-- email on the allowlist?") used by the signup-time check in App.tsx
-- (see App.tsx:1667 — supabase.rpc('is_teacher_allowed', ...)).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text
      AND role = 'teacher'
  );
$$;

COMMENT ON FUNCTION public.is_teacher() IS
  'Returns TRUE when the currently-authenticated user has role=teacher in public.users. Used by RLS policies on classes / assignments / progress. The allowlist gate runs earlier, at signup time in App.tsx — see migration 20260509 for context.';
