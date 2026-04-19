-- Fix get_assignments_for_class returning 400.
--
-- Root cause: on this database, public.assignments.sentence_difficulty
-- is SMALLINT (discovered via information_schema.columns). The RPC
-- from 20260428 declares it as INTEGER in the RETURNS TABLE, and
-- PL/pgSQL strictly requires the SELECT's column types to match the
-- declared return types exactly — SMALLINT ≠ INTEGER even though
-- there's a safe upward cast. Postgres raises
--   ERROR: structure of query does not match function result type
-- PostgREST surfaces that as HTTP 400 with a message body; from the
-- browser Network tab all you see is the bare 400 line and the
-- assignments list silently fails to render.
--
-- Fix: keep the auth + membership gates from 20260428, but cast
-- a.sentence_difficulty to INTEGER in the SELECT so the result-row
-- types match the declared TABLE. Also cast word_ids for safety.

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
DECLARE
  v_caller_uid   TEXT := auth.uid()::text;
  v_caller_role  TEXT;
  v_caller_class TEXT;
  v_target_code  TEXT;
  v_is_teacher   BOOLEAN;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT u.role, u.class_code INTO v_caller_role, v_caller_class
  FROM public.users u WHERE u.uid = v_caller_uid;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '42501';
  END IF;

  -- Teacher path: must own the class.
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_uid = v_caller_uid
  ) INTO v_is_teacher;

  IF NOT v_is_teacher THEN
    -- Student path: must be enrolled in the class.
    SELECT c.code INTO v_target_code FROM public.classes c WHERE c.id = p_class_id;

    IF v_target_code IS NULL OR v_caller_class IS NULL OR v_caller_class <> v_target_code THEN
      RAISE EXCEPTION 'Access denied: caller is not a member of this class'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.class_id,
    a.word_ids::INTEGER[],                 -- keep INTEGER[] even if schema drifts
    a.words,
    a.allowed_modes,
    a.deadline,
    a.sentences,
    a.sentence_difficulty::INTEGER,        -- SMALLINT on prod; cast up to INTEGER
    a.created_at
  FROM public.assignments a
  WHERE a.class_id = p_class_id
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) FROM anon;

COMMENT ON FUNCTION public.get_assignments_for_class IS
  'Get assignments for a class. Validates caller is the class teacher or an enrolled student. Explicit ::INTEGER casts defend against SMALLINT/INTEGER schema drift on sentence_difficulty + word_ids.';
