-- =============================================================================
-- SECURITY MED FIX: tighten teacher_profiles SELECT (no email enumeration)
-- =============================================================================
--
-- AUDIT FINDING (docs/security-audit-2026-04-28.md, finding 2.2-2):
--
-- The original policy on `public.teacher_profiles`
-- (20260403_oauth_student_auth.sql:27-32) is:
--
--   CREATE POLICY "Teachers can be read by authenticated users"
--     ON public.teacher_profiles FOR SELECT TO authenticated USING (true);
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
-- - SELECT: only the teacher viewing THEIR OWN row (matched by email
--   from the JWT — teacher_profiles has NO auth_uid column, the link
--   to identity is `email`), or admins for support.
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

-- Drop EVERY known SELECT policy name on the table.  The original
-- migration named it "Teachers can be read by authenticated users",
-- but earlier ad-hoc edits in some envs may have left
-- "Allow authenticated select" or our own "teacher_profiles_select".
-- Be permissive on drop, strict on create.
DROP POLICY IF EXISTS "Teachers can be read by authenticated users" ON public.teacher_profiles;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.teacher_profiles;
DROP POLICY IF EXISTS "teacher_profiles_select"   ON public.teacher_profiles;

-- New scoped SELECT.  teacher_profiles.email is the identity key — the
-- caller's email comes from the verified JWT claims.  We lower() both
-- sides to match the casing convention used by teacher_allowlist
-- inserts (see CLAUDE.md §14).
CREATE POLICY "teacher_profiles_select" ON public.teacher_profiles
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
    OR public.is_admin()
  );

COMMIT;

COMMENT ON POLICY "teacher_profiles_select" ON public.teacher_profiles IS
  'Teacher reads only their own row (email match against JWT claim), or '
  'admins for support.  Tightened in 20260428133000 from the original '
  'USING(true) which let any authenticated user (including students) '
  'enumerate every teacher email + school_name.  See '
  'docs/security-audit-2026-04-28.md finding 2.2-2.';
