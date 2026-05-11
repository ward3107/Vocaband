-- VocaHebrew Phase 2 — subject flag on quick_play_sessions.
--
-- Mirrors the column added to `classes` and `assignments` in
-- 20260507204614_voca_subject_flags.sql, applied to quick_play_sessions
-- so the student-side join flow can disambiguate Hebrew lemma ids from
-- English Word ids (they collide — both ID spaces start at 1).
--
-- Without this column, a Hebrew Quick Play session round-trips through
-- the same `word_ids INTEGER[]` array as English, and useQuickPlayUrlBootstrap
-- looks them up in ALL_WORDS — silently matching unrelated English rows.
--
-- Defaults to 'english' so every existing session row (and the
-- create_quick_play_session RPC's pre-Hebrew callers) keeps working
-- with zero backfill.
--
-- See docs/open-issues.md (VocaHebrew Phase 2) for the rollout plan
-- this migration unblocks.

BEGIN;

-- 1. quick_play_sessions.subject — disambiguates which corpus the
--    word_ids array references. CHECK constraint kept narrow
--    ('english' | 'hebrew') — extend it via a follow-up when each new
--    Voca's quick-play flow ships.
ALTER TABLE public.quick_play_sessions
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'english';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quick_play_sessions_subject_check'
  ) THEN
    ALTER TABLE public.quick_play_sessions
      ADD CONSTRAINT quick_play_sessions_subject_check
      CHECK (subject IN ('english', 'hebrew'));
  END IF;
END $$;

-- 2. Recreate create_quick_play_session with an optional p_subject
--    parameter. Defaults to 'english' so every existing call site
--    (App.tsx's English path, the resume-bootstrap retry, server.ts
--    fallback paths) keeps working unchanged.
--
--    Drop both possible prior signatures so the new function replaces
--    them cleanly. If a caller is still on the old signature when this
--    runs, the next deploy of the client will pick up the new param.
DROP FUNCTION IF EXISTS public.create_quick_play_session(integer[]);
DROP FUNCTION IF EXISTS public.create_quick_play_session(integer[], text[]);
DROP FUNCTION IF EXISTS public.create_quick_play_session(integer[], jsonb, text[]);

CREATE OR REPLACE FUNCTION public.create_quick_play_session(
  p_word_ids integer[] DEFAULT NULL::integer[],
  p_custom_words jsonb DEFAULT NULL::jsonb,
  p_allowed_modes text[] DEFAULT '{classic,listening,spelling,matching,true-false,flashcards,scramble,reverse,letter-sounds,sentence-builder}'::text[],
  p_subject text DEFAULT 'english'
)
RETURNS public.quick_play_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_code TEXT;
  v_session public.quick_play_sessions;
BEGIN
  -- Defensive: validate subject at the RPC layer too, not just the
  -- table CHECK. A bad value would otherwise produce an opaque CHECK
  -- violation; this gives a clearer error.
  IF p_subject NOT IN ('english', 'hebrew') THEN
    RAISE EXCEPTION 'Invalid subject: %. Expected ''english'' or ''hebrew''.', p_subject;
  END IF;

  v_session_code := public.generate_session_code();

  INSERT INTO public.quick_play_sessions (
    session_code, teacher_uid, word_ids, custom_words, allowed_modes, subject, is_active
  ) VALUES (
    v_session_code, auth.uid()::text,
    COALESCE(p_word_ids, ARRAY[]::INTEGER[]),
    p_custom_words, p_allowed_modes, p_subject, true
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

COMMENT ON COLUMN public.quick_play_sessions.subject IS
  'Which Voca this Quick Play session belongs to. Defaults to ''english''. Hebrew sessions store HEBREW_LEMMAS ids in word_ids; English sessions store ALL_WORDS ids. Required because the two id spaces overlap.';

COMMENT ON FUNCTION public.create_quick_play_session IS
  'Create new quick play session with selected words and return session details. Subject defaults to english to keep existing call sites working.';

COMMIT;
