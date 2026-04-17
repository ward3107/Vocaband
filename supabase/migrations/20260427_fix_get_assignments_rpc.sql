-- ============================================================================
-- Fix get_assignments_for_class RPC — columns and casing bugs
--
-- Original RPC (20260330) returned columns named in camelCase
-- (e.g. `allowedModes`), which Postgres folds to lowercase (`allowedmodes`)
-- — but the client mapper reads `row.allowed_modes`, getting undefined.
-- Result: assignments loaded but allowedModes was empty, blocking every
-- game mode from appearing even though the rows were fetched.
--
-- Also missing: `words` (custom-word JSON), `sentences`, `sentence_difficulty`
-- — all used by the Sentence Builder game and by any assignment that
-- includes teacher-added custom words.
--
-- This migration replaces the RPC with the correct snake_case column
-- names AND all fields the frontend needs.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_assignments_for_class(UUID);

CREATE OR REPLACE FUNCTION public.get_assignments_for_class(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  class_id UUID,
  word_ids INTEGER[],
  words JSONB,
  allowed_modes TEXT[],
  deadline TEXT,
  sentences TEXT[],
  sentence_difficulty INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.class_id,
    a.word_ids,
    a.words,
    a.allowed_modes,
    a.deadline,
    a.sentences,
    a.sentence_difficulty,
    a.created_at
  FROM public.assignments a
  WHERE a.class_id = p_class_id
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO authenticated, anon;

COMMENT ON FUNCTION public.get_assignments_for_class IS
  'Get assignments for a class (student dashboard). Bypasses RLS via SECURITY DEFINER. Returns ALL columns the client mapper expects.';
