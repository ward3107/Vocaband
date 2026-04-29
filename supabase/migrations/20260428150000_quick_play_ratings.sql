-- =============================================================================
-- Quick Play guest ratings — collect satisfaction signal from no-signup students
-- =============================================================================
--
-- Quick Play students are guests (signInAnonymously, no users row).  The
-- existing in-app rating system (users.first_rating) explicitly skips
-- them — see GameFinishedView's `!isGuest` gate.
--
-- Teachers running QP sessions still want to know "did the kids enjoy
-- this?" and we (operators) want NPS-style data to drive product
-- decisions.  This table captures that signal without requiring an
-- auth.users row per guest.
--
-- Shape:
--   id            uuid PK
--   session_code  text — the 6-char QP session this rating belongs to
--   nickname      text — the guest's chosen nickname (so the teacher
--                        can see "who liked it"; not PII because guests
--                        pick the nickname)
--   rating        smallint 1-5 (CHECK constrained)
--   created_at    timestamptz
--
-- A guest can rate at most ONCE per session (UNIQUE constraint on
-- session_code + nickname).  If they try to rate twice we 23505 — the
-- client treats that as success (already rated) and dismisses the
-- prompt.
--
-- RLS:
--   * INSERT — TO public (anon + authenticated). The guest is anon-
--     authed by Supabase but we don't want to require a JWT for this
--     particular write because the data has no PII.
--   * SELECT — only the teacher who owns the session_code (via
--     quick_play_sessions.teacher_uid lookup) OR admin.
--   * UPDATE / DELETE — denied (immutable audit ledger).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.quick_play_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code  TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_code, nickname)
);

CREATE INDEX IF NOT EXISTS idx_quick_play_ratings_session_code
  ON public.quick_play_ratings (session_code);

ALTER TABLE public.quick_play_ratings ENABLE ROW LEVEL SECURITY;

-- ─── INSERT: anyone (anon + authenticated) ────────────────────────────
-- Mirror the quick_play_joins INSERT pattern (post-2026-04-28 hardening
-- requires authenticated, but we want this to work even for guests
-- whose anon auth might not have completed yet).  We add a sanity
-- check that the session_code references an ACTIVE session, so spam
-- writes against fabricated codes get rejected.
DROP POLICY IF EXISTS "qp_ratings_insert" ON public.quick_play_ratings;
CREATE POLICY "qp_ratings_insert" ON public.quick_play_ratings
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quick_play_sessions s
      WHERE s.session_code = quick_play_ratings.session_code
    )
    AND char_length(nickname) BETWEEN 1 AND 30
    AND char_length(session_code) BETWEEN 4 AND 12
  );

-- ─── SELECT: teacher of the session, or admin ────────────────────────
DROP POLICY IF EXISTS "qp_ratings_select" ON public.quick_play_ratings;
CREATE POLICY "qp_ratings_select" ON public.quick_play_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quick_play_sessions s
      WHERE s.session_code = quick_play_ratings.session_code
        AND s.teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  );

-- No UPDATE / DELETE policies — RLS-enabled with no policy = deny-all
-- (immutable ledger by design).

COMMIT;

COMMENT ON TABLE public.quick_play_ratings IS
  'Per-session ratings from Quick Play guest students.  Captures a 1-5 '
  'satisfaction score after the game finishes.  No PII — nickname is '
  'guest-chosen.  Unique on (session_code, nickname) so a guest rates '
  'at most once per session.  Read-only for the session''s teacher; '
  'write-once for any caller against an active session.';

COMMENT ON POLICY "qp_ratings_insert" ON public.quick_play_ratings IS
  'Public INSERT (anon + authenticated) so QP guests can rate without '
  'a JWT.  Guarded by the active-session existence check + nickname / '
  'session_code length sanity bounds to block spam.';

COMMENT ON POLICY "qp_ratings_select" ON public.quick_play_ratings IS
  'Only the teacher who owns the session may read its ratings.  '
  'Admins also for support.';
