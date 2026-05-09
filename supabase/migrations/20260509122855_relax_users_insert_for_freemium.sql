-- =============================================================================
-- Fix: relax users_insert policy to support freemium teacher signups
-- =============================================================================
-- Problem: users_insert policy gated role='teacher' inserts on
-- is_teacher_allowed(email), which checks the legacy teacher_allowlist
-- table.  Freemium OAuth signups (Google + Microsoft) completed the
-- OAuth handshake fine but failed at the post-callback users.upsert
-- with 42501 (RLS rejection).  Subsequent class creation then failed
-- with 23503 (FK violation -- teacher_uid not present in users).
-- Symptom reported 2026-05-09 from a Microsoft sign-in test, immediately
-- after the App.tsx fix that broadened the OAuth onboarding branch to
-- accept provider='azure'.
--
-- Solution: drop the allowlist gate from the INSERT policy.  The user
-- can still only insert their own row (auth.uid() = uid) with a
-- non-admin role.  This matches the public freemium pricing page --
-- anyone authenticated via OAuth can self-declare as a teacher.  The
-- companion fix at the SELECT/USING layer was migration
-- 20260509_fix_is_teacher_check_users_role.sql (applied earlier the
-- same day).
--
-- Risk delta: a malicious authenticated user could insert role='teacher'.
-- All teacher RLS policies are scoped to teacher_uid, so they can only
-- see their own (empty) classes -- no cross-tenant data exposure.
-- This is the same trust boundary as the freemium signup itself.
-- =============================================================================

DROP POLICY IF EXISTS users_insert ON public.users;

CREATE POLICY users_insert ON public.users
  FOR INSERT
  WITH CHECK (
    (auth.uid())::text = uid
    AND role IN ('teacher', 'student')
  );

COMMENT ON POLICY users_insert ON public.users IS
  'Authenticated users can insert their own row with role=teacher or student. The legacy is_teacher_allowed() gate was dropped 2026-05-09 to support freemium signups -- teacher RLS scoping by teacher_uid handles tenant isolation.';
