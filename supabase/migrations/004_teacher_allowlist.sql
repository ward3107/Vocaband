-- =============================================================================
-- Migration 004: Teacher Allowlist
-- Replace email-domain restriction with a per-email allowlist.
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

-- Table to hold pre-approved teacher email addresses.
-- Only admins (via the Supabase dashboard) can add/remove entries.
CREATE TABLE IF NOT EXISTS public.teacher_allowlist (
  email TEXT PRIMARY KEY CHECK (char_length(email) > 0)
);

ALTER TABLE public.teacher_allowlist ENABLE ROW LEVEL SECURITY;
-- No SELECT / INSERT / UPDATE / DELETE policies — all client access is denied.
-- The table is managed exclusively through the Supabase dashboard SQL editor.

-- SECURITY DEFINER function so the auth flow can check membership
-- without the client being able to enumerate the full list.
CREATE OR REPLACE FUNCTION public.is_teacher_allowed(check_email TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_allowlist
    WHERE email = lower(check_email)
  );
$$;

-- Helper function to get current user's email from auth
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT auth.jwt()->>'email';
$$;

-- Create is_teacher() function for RLS policies
-- Single-parameter version for direct calls
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

-- Zero-parameter overload for RLS policies
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.is_teacher(public.get_my_email());
END;
$$;

-- Create is_admin() function for RLS policies
-- Checks if the current user's role is 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text
    AND role = 'admin'
  );
$$;
