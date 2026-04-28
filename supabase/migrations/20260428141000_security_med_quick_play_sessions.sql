-- =============================================================================
-- SECURITY MED FIX: tighten quick_play_sessions SELECT
-- =============================================================================
--
-- AUDIT FINDING (docs/security-audit-2026-04-28.md, finding 2.2-3):
--
-- The current policy on `public.quick_play_sessions`
-- (20260407_fix_quick_play_anon_read.sql:8-11) is:
--
--   CREATE POLICY "Anyone can read active sessions"
--   ON public.quick_play_sessions FOR SELECT
--   TO anon, authenticated
--   USING (is_active = true);
--
-- This lets ANY caller — including completely unauthenticated ones —
-- enumerate every active Quick Play session.  The 6-char session
-- code provides ~1B combinations of practical security against
-- targeted brute force, but a curious student could still pull a
-- list like "my teacher ran 47 QP sessions this term" without ever
-- joining a class.
--
-- BACKGROUND on why this was open:
--
-- The original hardening migration (20260339) restricted reads to
-- TO authenticated only.  That broke the QR-scan flow because at the
-- time, students scanned QR before signing in — so the request hit
-- the DB with no auth and was rejected.  The fix (20260407) reopened
-- it to anon to fix QR.
--
-- WHY IT'S SAFE TO RE-NARROW NOW:
--
-- The V2 Quick Play flow (`src/hooks/useQuickPlayUrlBootstrap.ts`)
-- signs in anonymously BEFORE the session read.  Lines 108-138 of
-- that file: getSession() returns a cached or freshly-anonymous
-- token; only after that does it run
-- `supabase.from('quick_play_sessions').select(...)`.  Anonymous
-- auth users have the `authenticated` role in Postgres (they hold
-- a real JWT), so a TO authenticated policy still admits them.
--
-- The only callers blocked by this tightening are:
--   1. Truly-unauthenticated curl requests with no JWT — these aren't
--      a legitimate QP path; they're enumeration.
--   2. signInAnonymously failures.  But if signInAnonymously fails,
--      the V2 join also fails downstream (the WS handshake checks
--      auth) — so blocking the read here just fails fast.
--
-- FIX:
--
-- Drop the open `TO anon, authenticated` policy; recreate as
-- `TO authenticated` only.  Same WHERE clause (`is_active = true`).
-- Same shape; same semantics for the V2 flow.
--
-- See CLAUDE.md §12 for the Quick Play debugging cheat sheet — if
-- this regression bites, the symptom will be students hitting
-- "session inactive" → bounce to landing immediately on QR scan.
-- The fix would be to add a brief retry after signInAnonymously.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Anyone can read active sessions" ON public.quick_play_sessions;
DROP POLICY IF EXISTS "Authenticated users can read active sessions" ON public.quick_play_sessions;
DROP POLICY IF EXISTS "qp_sessions_select" ON public.quick_play_sessions;

CREATE POLICY "qp_sessions_select" ON public.quick_play_sessions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

COMMIT;

COMMENT ON POLICY "qp_sessions_select" ON public.quick_play_sessions IS
  'Authenticated callers (including anon-auth users from QR-scan QP '
  'joins) may read active sessions.  Tightened in 20260428141000 from '
  'the original ''TO anon, authenticated'' which let enumeration via '
  'unauthenticated reads.  See docs/security-audit-2026-04-28.md '
  'finding 2.2-3.';
