-- =============================================================================
-- Restore anon EXECUTE on the documented pre-auth SECURITY DEFINER RPCs.
-- =============================================================================
--
-- 20260517115649_revoke_anon_grants_on_definer_rpcs.sql lists these seven
-- functions in its docstring as "Pre-auth and share-link flows keep their
-- PUBLIC grant intact (NOT touched by this migration)" — but a probe of
-- pg_proc.proacl shows the anon EXECUTE was lost regardless, breaking:
--
--   class_roster_for_login          → pick-your-name list (401 in console)
--   get_class_by_code               → invite-link class lookup
--   get_or_create_student_profile   → student first signup
--   get_student_profile_for_login   → PIN / email recovery
--   is_teacher_allowed              → OAuth teacher allowlist check
--   submit_worksheet_attempt        → public worksheet submit
--   get_my_attempt_for_slug         → public worksheet attempt recovery
--
-- These functions are SECURITY DEFINER with their own body-level guards
-- (rate limits, class-code shape checks, etc.), so granting EXECUTE to
-- `anon` does not expose extra rows — it restores the documented
-- behaviour that the pre-auth student-login + worksheet-share flows
-- depend on.
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.class_roster_for_login(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_class_by_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_student_profile(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_profile_for_login(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_teacher_allowed(text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_worksheet_attempt(text, text, jsonb, integer, integer, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_attempt_for_slug(text, text) TO anon;
