-- =============================================================================
-- Scope "Service role full access" policies from public → service_role
-- =============================================================================
--
-- Background: four tables have "Service role full access" policies that
-- target role `public` (visible to every role) but gate their effect with
-- USING (auth.role() = 'service_role'). The auth.role() check IS correct
-- security-wise, but PostgreSQL still evaluates the policy for every
-- authenticated and anon caller — and worse, it multiplies against every
-- OTHER policy on the same table, creating one row of work per
-- (role × cmd × policy) combination.
--
-- The Supabase performance advisor reports 80 of 117 perf lints stem from
-- this single shape (multiple_permissive_policies). Re-creating each
-- policy with `TO service_role` makes the planner skip it entirely for
-- non-service-role callers.
--
-- Behaviour is identical for end users:
--   - service_role: still gets full ALL access (USING true / WITH CHECK true
--     — the auth.role() check is now redundant since the policy is already
--     role-scoped, so we drop it)
--   - all other roles: unchanged (the policy never matched them anyway
--     because of the auth.role() check)
--
-- Tables touched:
--   - interactive_worksheets
--   - quick_play_sessions
--   - student_profiles
--   - worksheet_attempts
--
-- Closes P1 #6 from the May 2026 DB audit. Expected to clear ~80 entries
-- from `get_advisors(type='performance')`.
-- =============================================================================

-- ── interactive_worksheets ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access on interactive worksheets"
  ON public.interactive_worksheets;
CREATE POLICY "Service role full access on interactive worksheets"
  ON public.interactive_worksheets
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── quick_play_sessions ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access"
  ON public.quick_play_sessions;
CREATE POLICY "Service role full access"
  ON public.quick_play_sessions
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── student_profiles ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access"
  ON public.student_profiles;
CREATE POLICY "Service role full access"
  ON public.student_profiles
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── worksheet_attempts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access on worksheet attempts"
  ON public.worksheet_attempts;
CREATE POLICY "Service role full access on worksheet attempts"
  ON public.worksheet_attempts
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
