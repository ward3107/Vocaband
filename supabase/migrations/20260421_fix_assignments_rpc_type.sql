-- Fix RPC type mismatch: sentence_difficulty INTEGER → SMALLINT
--
-- Problem: The get_assignments_for_class RPC was declared with
-- sentence_difficulty INTEGER, but the assignments table column is
-- SMALLINT. PostgreSQL refuses to cast implicitly across the type
-- boundary, so the RPC silently returned 0 or 1 rows instead of all
-- matching assignments. Students saw missing assignments and
-- pronunciations not matching words (both caused by the RPC fallback
-- hitting RLS issues for anonymous users).
--
-- This migration recreates the function with the correct SMALLINT
-- return type and adds SET search_path for security best practice.
--
-- NOTE: If the RPC was already patched manually via the Supabase SQL
-- Editor, this migration is a no-op (CREATE OR REPLACE is idempotent
-- when the signature matches).

-- DROP first so we can change the return type.  Postgres refuses to
-- alter a function's return type via CREATE OR REPLACE; the only
-- supported path for a "type change" is DROP + recreate.  Without
-- this, fresh installs (Frankfurt migration) hit:
--   ERROR: cannot change return type of existing function (42P13)
-- Idempotent on Tokyo because the function is then re-created with
-- the exact same body in the next statement.
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
  sentence_difficulty SMALLINT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
  BEGIN
    RETURN QUERY
    SELECT
      a.id, a.title, a.class_id, a.word_ids, a.words,
      a.allowed_modes, a.deadline, a.sentences,
      a.sentence_difficulty, a.created_at
    FROM public.assignments a
    WHERE a.class_id = p_class_id
    ORDER BY a.created_at DESC;
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO anon;

COMMENT ON FUNCTION public.get_assignments_for_class IS
  'Get assignments for a class (student dashboard). SECURITY DEFINER bypasses RLS so anonymous/student users can read assignments.';
