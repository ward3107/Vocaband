-- =============================================================================
-- SECURITY MED FIX: tighten teacher_profiles SELECT (no email enumeration)
-- =============================================================================
--
-- AUDIT FINDING (docs/security-audit-2026-04-28.md, finding 2.2-2):
--
-- The original policy on `public.teacher_profiles`
-- (20260403_oauth_student_auth.sql:32) is:
--
--   CREATE POLICY ... FOR SELECT TO authenticated USING (true);
--
-- Any authenticated user — INCLUDING students — can run a Supabase
-- REST query and get back every teacher's email + school_name.  The
-- table is currently empty in production (no app code populates it
-- today) so the live impact is zero, but if a future migration ever
-- backfills teacher_profiles from `users` the privacy hole opens
-- immediately.  Defense-in-depth: tighten the policy NOW so future
-- backfills are safe by default.
--
-- FIX:
--
-- - SELECT: only the teacher viewing THEIR OWN row (matched by
--   auth_uid), or admins for support.
-- - INSERT / UPDATE / DELETE: keep the existing deny-all (the
--   original migration set them to `WITH CHECK (false)` and
--   `USING (false)` which is correct).
--
-- Backward compat: the table is empty today, so there's no legitimate
-- read path that breaks.  When teacher_profiles eventually gets
-- populated, teachers will read their own row and admins will read
-- everyone — the same shape as `users` SELECT policy.
-- =============================================================================

BEGIN;

-- Drop the wide-open SELECT.  Match the policy name from the original
-- migration.
DROP POLICY IF EXISTS "Allow authenticated select" ON public.teacher_profiles;
DROP POLICY IF EXISTS "teacher_profiles_select"   ON public.teacher_profiles;

-- New scoped SELECT.
CREATE POLICY "teacher_profiles_select" ON public.teacher_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth_uid = auth.uid()::text
    OR public.is_admin()
  );

COMMIT;

COMMENT ON POLICY "teacher_profiles_select" ON public.teacher_profiles IS
  'Teacher reads only their own row (auth_uid match), or admins for '
  'support.  Tightened in 20260428133000 from the original USING(true) '
  'which let any authenticated user (including students) enumerate '
  'every teacher email + school_name.  See docs/security-audit-2026-04-28.md '
  'finding 2.2-2.';
