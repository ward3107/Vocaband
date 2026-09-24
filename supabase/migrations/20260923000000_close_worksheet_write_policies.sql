-- =============================================================================
-- Close the regressed open-write RLS policies on the worksheet tables.
--
-- SECURITY (pentest F2, 2026-09-23): migration 20260517112821 deliberately
-- dropped the open `WITH CHECK (true)` INSERT policies on interactive_worksheets
-- and worksheet_attempts so that ALL writes flow through the SECURITY DEFINER
-- RPCs (create_interactive_worksheet_v2 / submit_worksheet_attempt), which add
-- name-sanitisation, slug generation, per-browser fingerprint uniqueness and the
-- worksheet_mint_rate / worksheet_submit_rate rate limiters.
--
-- The later feature migrations 20260601000000 and 20260605000000 REINTRODUCED
-- those open policies (no `TO` clause -> reachable by anon with the publishable
-- key), plus an UPDATE policy keyed on the caller-controlled `fingerprint`
-- column (USING (fingerprint IS NOT NULL)) — not an ownership check. That let an
-- unauthenticated caller spam/forge worksheets and overwrite other students'
-- attempt rows (student_name / answers / score), bypassing every control the
-- RPCs enforce. Reads stayed teacher-owner-only, so this is integrity/abuse, not
-- disclosure.
--
-- This migration re-closes the write path. The SECURITY DEFINER RPCs are GRANTed
-- EXECUTE and bypass RLS, so legitimate mint/submit continue to work unchanged;
-- only DIRECT client INSERT/UPDATE against the tables is removed. The
-- service_role "full access" policies (used by the server) are left intact.
--
-- Idempotent: DROP POLICY IF EXISTS is safe to re-run and safe if a future
-- migration already removed one of these.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can create interactive worksheets"
  ON public.interactive_worksheets;

DROP POLICY IF EXISTS "Anyone can submit worksheet attempts"
  ON public.worksheet_attempts;

DROP POLICY IF EXISTS "Owner browser can update own attempt"
  ON public.worksheet_attempts;

-- After this migration the worksheet tables have the following WRITE access:
--   interactive_worksheets: service_role + SECURITY DEFINER RPCs only
--                           (owner UPDATE/DELETE policies remain: auth.uid() = teacher_uid)
--   worksheet_attempts:     service_role + SECURITY DEFINER RPCs only
-- SELECT policies are unchanged (interactive_worksheets: not-expired read;
-- worksheet_attempts: worksheet-owner read).
