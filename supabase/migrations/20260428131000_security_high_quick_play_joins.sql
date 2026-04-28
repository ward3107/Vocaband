-- =============================================================================
-- SECURITY HIGH FIX: tighten quick_play_joins RLS
-- =============================================================================
--
-- AUDIT FINDING (docs/security-audit-2026-04-28.md, finding 2.2-1):
--
-- The original policies on `public.quick_play_joins`
-- (20260329_quick_play_joins.sql:20-23) are wide open:
--
--   CREATE POLICY "Allow insert" ... FOR INSERT TO public WITH CHECK (true);
--   CREATE POLICY "Allow select" ... FOR SELECT TO public USING (true);
--
-- `TO public` covers BOTH `anon` and `authenticated` roles.  Anyone
-- with the project's publishable key (or even no auth at all) can:
--
--   - Read every (session_code, student_name) pair ever recorded —
--     student PII tied to school class identifiers.
--   - Insert arbitrary join rows, polluting teachers' live podiums.
--
-- FIX:
--
-- - SELECT: restrict to the teacher who owns the session.  Looks up
--   classes via session_code → quick_play_sessions.teacher_uid.
-- - INSERT: require an authenticated session (no anon).  The
--   session_code must reference an active quick_play_sessions row
--   so spam can't accumulate against expired sessions.
-- - UPDATE / DELETE: deny by default (no policies).
--
-- Backward compat:
--   - The QP V2 socket path uses in-memory state on the Fly server,
--     not this table — the table is a legacy ledger.  Tightening
--     reads doesn't break the live podium.
--   - QP guests are anonymous-auth users (signInAnonymously), so
--     they ARE authenticated.  The new INSERT policy lets them
--     write rows for active sessions.
-- =============================================================================

BEGIN;

-- Drop the wide-open policies.
DROP POLICY IF EXISTS "Allow insert" ON public.quick_play_joins;
DROP POLICY IF EXISTS "Allow select" ON public.quick_play_joins;

-- ─── SELECT: teacher of the session, or admin ────────────────────────
--
-- The QP join row is paired to a session_code.  The session row in
-- quick_play_sessions carries the teacher_uid that owns it.  Only
-- that teacher (or an admin, for support) may read the joins.
CREATE POLICY "qp_joins_select" ON public.quick_play_joins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quick_play_sessions s
      WHERE s.session_code = quick_play_joins.session_code
        AND s.teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  );

-- ─── INSERT: authenticated callers writing into an ACTIVE session ────
--
-- The session_code must point to a quick_play_sessions row with
-- is_active=true.  This blocks two abuse patterns:
--   1. Spam writes against ended/expired sessions
--   2. Writes against entirely fabricated session codes
CREATE POLICY "qp_joins_insert" ON public.quick_play_joins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quick_play_sessions s
      WHERE s.session_code = quick_play_joins.session_code
        AND s.is_active = true
    )
  );

-- No UPDATE / DELETE policies — RLS-enabled table with no policy for
-- those operations means deny-all (the safe default for a write-once
-- audit ledger).

COMMIT;

COMMENT ON POLICY "qp_joins_select" ON public.quick_play_joins IS
  'Only the teacher who owns the session (via quick_play_sessions.teacher_uid) '
  'may read its join rows.  Tightened in 20260428131000 from the original '
  'USING(true) which let any authenticated or anon user enumerate student '
  'names.';

COMMENT ON POLICY "qp_joins_insert" ON public.quick_play_joins IS
  'Authenticated callers may insert join rows only for active sessions.  '
  'Tightened in 20260428131000 from the original WITH CHECK(true) which '
  'allowed unbounded writes including against closed / fabricated sessions.';
