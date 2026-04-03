-- Fix: Allow OAuth students to read their own student_profiles by email.
-- The existing SELECT policy only matches by auth_uid, but when a student
-- signs in via Google OAuth, their Supabase auth UID may differ from the
-- stored auth_uid (e.g., if they signed out and back in). The restoreSession
-- flow queries student_profiles by email to detect returning OAuth students,
-- but RLS blocks this read since auth.uid() != auth_uid.
--
-- This policy allows authenticated users to read student_profiles rows
-- that match their verified email address from the JWT.

CREATE POLICY "Users can read own profile by email"
ON public.student_profiles FOR SELECT
TO authenticated
USING (email = auth.email());
