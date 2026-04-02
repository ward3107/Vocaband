-- =============================================================================
-- Fix: Add is_teacher() overload for RLS policies
-- =============================================================================
-- Problem: RLS policies call public.is_teacher() without parameters,
-- but the function definition requires an email parameter.
-- Solution: Add a zero-parameter overload that checks the current authenticated user.
-- =============================================================================

-- Create or replace single-parameter version (for direct calls)
CREATE OR REPLACE FUNCTION public.is_teacher(p_user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.teacher_allowlist
    WHERE email = p_user_email
  );
END;
$$;

-- Create or replace zero-parameter overload for RLS policies
-- Uses get_my_email() to get current user's email
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.is_teacher(public.get_my_email());
END;
$$;

COMMENT ON FUNCTION public.is_teacher() IS
  'Check if the currently authenticated user is a pre-approved teacher. Zero-parameter overload for RLS policies.';

COMMENT ON FUNCTION public.is_teacher(TEXT) IS
  'Check if a specific email belongs to a pre-approved teacher. Single-parameter version for direct calls.';
