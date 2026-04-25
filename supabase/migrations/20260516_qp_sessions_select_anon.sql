-- =============================================================================
-- quick_play_sessions SELECT — restore the anon read path
-- =============================================================================
-- Audit triggered by "students try to join then bounce to landing".
-- Cause: the current `qp_sessions_select` policy lists role
-- `authenticated` only.  When the QR-scan landing page hits
-- supabase.from('quick_play_sessions').select(...) BEFORE any auth
-- session exists, the anon role can't see the row, the bootstrap reads
-- `error || !data`, and routes the student to public-landing.
--
-- An older migration (20260407_fix_quick_play_anon_read) put a policy
-- in place that explicitly granted SELECT to anon for active sessions.
-- A later security-hardening pass dropped it without re-adding the
-- anon role to the replacement.  Restore the anon read here.
--
-- Same USING clause as the current policy (active OR own session) so
-- this is purely a role-list expansion — no new visibility for non-
-- active sessions, no new visibility into other teachers' sessions.
-- =============================================================================

DROP POLICY IF EXISTS "qp_sessions_select" ON public.quick_play_sessions;

CREATE POLICY "qp_sessions_select"
ON public.quick_play_sessions
FOR SELECT
TO anon, authenticated
USING (
  (is_active = true)
  OR ((SELECT auth.uid())::text = teacher_uid)
);

COMMENT ON POLICY "qp_sessions_select" ON public.quick_play_sessions IS
  'Allows anon + authenticated to read active sessions (so QR-scan join works without prior auth) plus a teacher reading their own (active or not) for the dashboard.';
