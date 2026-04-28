-- =============================================================================
-- SECURITY HIGH FIX (followup): re-REVOKE anon AFTER the recreate
-- =============================================================================
--
-- 20260428130000_security_high_save_progress_auth.sql had the order:
--
--   REVOKE EXECUTE ... FROM anon;          -- (1) take it away
--   DROP FUNCTION IF EXISTS ...;           -- (2) destroys the privilege table
--   CREATE OR REPLACE FUNCTION ...;        -- (3) defaults to EXECUTE TO PUBLIC
--   GRANT EXECUTE ... TO authenticated;    -- (4) explicit teacher grant
--
-- Step 2 wipes the REVOKE from step 1, and step 3 re-grants to PUBLIC by
-- default (which includes anon).  Verified live with:
--
--   SELECT has_function_privilege(
--     'anon',
--     'public.save_student_progress(text, text, uuid, text, integer, text, integer[], text, jsonb)',
--     'EXECUTE')
--   --> true   (should be false)
--
-- Live exploit: NONE — the auth.uid() IS NULL check inside the function
-- body still rejects anon callers at runtime with 42501.  But a defence-
-- in-depth control is missing: anon shouldn't even reach the function.
--
-- FIX: REVOKE EXECUTE FROM anon (and from PUBLIC for safety) after the
-- recreate.  Idempotent — safe to re-run if needed.
-- =============================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.save_student_progress(
  text, text, uuid, text, integer, text, integer[], text, jsonb
) FROM anon, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.save_student_progress_batch(jsonb)
  FROM anon, PUBLIC;

-- Re-affirm the authenticated grant in case PUBLIC was the only path
-- and the revoke above leaves the function with no callers.
GRANT EXECUTE ON FUNCTION public.save_student_progress(
  text, text, uuid, text, integer, text, integer[], text, jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_student_progress_batch(jsonb)
  TO authenticated;

COMMIT;

-- Verification (run separately):
--
--   SELECT
--     has_function_privilege('anon', 'public.save_student_progress(text, text, uuid, text, integer, text, integer[], text, jsonb)', 'EXECUTE') AS anon_can_call_single,
--     has_function_privilege('anon', 'public.save_student_progress_batch(jsonb)', 'EXECUTE') AS anon_can_call_batch;
--   -- expect: false, false
