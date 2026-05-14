-- =============================================================================
-- Developer + admin Pro bypass in is_pro_or_trialing()
-- =============================================================================
--
-- BACKGROUND:
--
-- The `is_pro_or_trialing()` SQL function (added in
-- 20260509_enforce_pro_gates_server_side.sql) gates the Free-tier
-- caps -- max 1 class per teacher, max 30 approved students per
-- class.  The original definition only honoured `plan` and
-- `trial_ends_at`, so an admin / developer whose row sat at
-- plan='free' with an expired (or never-set) trial got hit by the
-- Free caps even though admins are supposed to have unrestricted
-- access for support, demo, and pen-testing duties.
--
-- The matching client gate in src/core/plan.ts had the same flaw:
-- `getEffectivePlan` returned 'free' for any non-teacher role, so
-- admins always saw "trial ended" on the dashboard regardless of
-- their actual plan.  That client bug is fixed in this branch too.
--
-- FIX:
--
-- Extend `is_pro_or_trialing()` to also return TRUE when the caller
-- is an admin OR when their email is in the hardcoded developer
-- allowlist (DEV_EMAILS in src/core/dev-allowlist.ts).  The dev
-- email check is belt-and-suspenders: if the admin role is ever
-- accidentally flipped or wiped, the developer keeps full access
-- without needing a service-role DB poke to extend the trial.
--
-- Keep the allowlist in sync with src/core/dev-allowlist.ts.
-- Comparison is case-insensitive (LOWER on both sides).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_pro_or_trialing()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text
      AND (
        plan IN ('pro', 'school')
        OR (trial_ends_at IS NOT NULL AND trial_ends_at > now())
        OR role = 'admin'
        OR LOWER(email) IN ('wasya92@gmail.com')
      )
  );
$$;

COMMENT ON FUNCTION public.is_pro_or_trialing() IS
  'Returns TRUE when the current auth.uid is on a paid plan (pro/school), '
  'still inside their 30-day trial, has the admin role, or is in the '
  'hardcoded developer email allowlist.  Used by RLS to gate Free-tier '
  'limits server-side.  Keep the email list in sync with '
  'src/core/dev-allowlist.ts.';
