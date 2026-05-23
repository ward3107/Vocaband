-- =============================================================================
-- C7 — Force all `progress` INSERTs through save_student_progress RPC
-- =============================================================================
--
-- Closes the remaining half of C7 from PRODUCTION-READINESS-AUDIT-2026-05-21.
--
-- Context:
--   * F3 (migration 20260606) added a [0, 1000] score range check to
--     `progress_insert` WITH CHECK — closed the simplest leaderboard-
--     inflation attack (score = 999_999_999 via direct REST INSERT).
--   * But: a student could still INSERT a single row with score = 1000
--     for ANY assignment in their class.  The monotonic-update guard on
--     `progress_update` only fires for UPDATEs, not INSERTs, so the
--     "start from zero" pattern bypassed it.
--   * `save_student_progress` (SECURITY DEFINER) already validates
--     ownership + clamps score atomically + handles QUICK_PLAY exempt
--     guests.  It's the canonical write path; the direct-INSERT REST
--     fallback was the gap.
--
-- This migration: REVOKE INSERT on public.progress from `authenticated`
-- and `anon` so the only client-side write path becomes the RPC.  Same
-- pattern adopted for save_student_progress_batch (see the audit's
-- own recommendation).
--
-- Companion React work (must deploy BEFORE this migration applies):
--   * src/hooks/useGameState.ts — Quick Play save route now calls
--     supabase.rpc("save_student_progress", …) instead of
--     supabase.from("progress").insert(…).
--   * src/hooks/useSaveQueueResilience.ts — localStorage retry path now
--     calls the same RPC instead of a direct INSERT.
--
-- Surviving write paths (all explicit, all reviewed):
--   * save_student_progress      — SECURITY DEFINER, runs as function
--                                  owner; GRANT bypasses the table
--                                  REVOKE.  Caller scope-checked
--                                  inside the function body.
--   * save_student_progress_batch — same pattern, same exemption.
--   * server.ts (TEACHER_END persist) — uses supabaseAdmin which is
--                                       the service_role client; service
--                                       role keeps all privileges by
--                                       default.
--
-- Defence in depth: the existing progress_insert RLS policy stays in
-- place.  With INSERT revoked at the GRANT level, the policy becomes
-- effectively dead code — but leaving it preserves the protection if a
-- future migration accidentally re-GRANTs INSERT.

BEGIN;

REVOKE INSERT ON public.progress FROM authenticated;
REVOKE INSERT ON public.progress FROM anon;

-- Record the policy intent on the table for future-you.
COMMENT ON TABLE public.progress IS
  'Student progress rows. Client-side INSERT is REVOKEd (C7, 2026-05-22) — '
  'all writes go through save_student_progress / save_student_progress_batch '
  '(SECURITY DEFINER RPCs).  Service-role writes (server.ts) bypass the '
  'revoke as expected.  Existing progress_insert RLS policy stays in place '
  'as defence in depth if a future migration accidentally re-GRANTs INSERT.';

COMMIT;

-- =============================================================================
-- Verification queries (run manually after applying this migration):
--
-- 1. Authenticated direct INSERT must fail:
--      INSERT INTO public.progress (student_name, student_uid, assignment_id,
--                                   class_code, score, mode, completed_at)
--      VALUES ('test', auth.uid()::text, '<some-assignment-id>',
--              '<my-class>', 100, 'classic', NOW());
--      -- Expect: ERROR: permission denied for table progress
--
-- 2. Same INSERT via the RPC must succeed:
--      SELECT save_student_progress(
--        p_student_name      => 'test',
--        p_student_uid       => auth.uid()::text,
--        p_assignment_id     => '<some-assignment-id>',
--        p_class_code        => '<my-class>',
--        p_score             => 100,
--        p_mode              => 'classic'
--      );
--      -- Expect: returns a uuid; row visible via SELECT * FROM progress.
--
-- 3. Service-role direct INSERT still works (sanity check that REVOKE
--    didn't catch the wrong role):
--      -- Connect as service_role; the same INSERT as #1 should succeed.
--
-- ROLLBACK plan (if a write path was missed and saves start failing in
-- prod):
--      BEGIN;
--      GRANT INSERT ON public.progress TO authenticated;
--      GRANT INSERT ON public.progress TO anon;
--      COMMIT;
--   F3's WITH CHECK on progress_insert is still in place, so rollback
--   leaves us at the pre-C7 (but post-F3) posture: score capped at
--   1000 but inflatable to 1000 on any assignment.
-- =============================================================================
