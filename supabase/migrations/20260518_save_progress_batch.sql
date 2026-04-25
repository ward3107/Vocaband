-- =============================================================================
-- save_student_progress_batch — one RPC, N progress rows
-- =============================================================================
--
-- Background: in a busy classroom the student-game-finish path calls
-- `save_student_progress` once per game.  30 students × 10 plays =
-- 300 RPC round-trips per lesson, each with its own JWT verify +
-- RLS evaluation + bookkeeping.  Cumulative across a school day this
-- was the second biggest contributor to DB request volume after the
-- (already-fixed) dashboard polling.
--
-- Solution: a thin batch wrapper that takes a JSONB array of save
-- payloads and runs the existing single-row upsert for each, all
-- within ONE transaction.  No behaviour change per-row — every
-- conflict resolves the same way as the single-row RPC.  Just
-- amortises the overhead.
--
-- Schema of each batch element (matches save_student_progress args):
--   {
--     "student_name":  string,
--     "student_uid":   string,
--     "assignment_id": uuid (string),
--     "class_code":    string,
--     "score":         integer,
--     "mode":          string,
--     "mistakes":      integer[]  (defaults to [])
--     "avatar":        string     (defaults to '🦊')
--     "word_attempts": jsonb      (defaults to NULL)
--   }
--
-- Returns: jsonb array of { progress_id, student_uid, mode } rows so
-- the client can match results back to its in-memory queue.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_student_progress_batch(
  p_batch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_result    jsonb := '[]'::jsonb;
  v_elem      jsonb;
  v_progress_id uuid;
BEGIN
  IF p_batch IS NULL OR jsonb_typeof(p_batch) <> 'array' THEN
    RAISE EXCEPTION 'p_batch must be a JSONB array' USING ERRCODE = '22023';
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_batch) LOOP
    -- Delegate to the existing single-row RPC so the upsert
    -- semantics, the trigger, and the word_attempts append behave
    -- identically to non-batched saves.
    v_progress_id := public.save_student_progress(
      (v_elem->>'student_name')::text,
      (v_elem->>'student_uid')::text,
      (v_elem->>'assignment_id')::uuid,
      (v_elem->>'class_code')::text,
      (v_elem->>'score')::integer,
      (v_elem->>'mode')::text,
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_elem->'mistakes'))::integer[],
        '{}'::integer[]
      ),
      COALESCE(v_elem->>'avatar', '🦊'),
      v_elem->'word_attempts'
    );

    v_result := v_result || jsonb_build_object(
      'progress_id', v_progress_id,
      'student_uid', v_elem->>'student_uid',
      'mode', v_elem->>'mode'
    );
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_progress_batch(jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_progress_batch(jsonb)
  TO anon;

COMMENT ON FUNCTION public.save_student_progress_batch IS
  'Batched wrapper around save_student_progress. Takes a JSONB array '
  'of save payloads; runs each through the single-row upsert in one '
  'transaction. Amortises round-trip cost in busy classrooms (e.g. '
  '30 students × 10 plays/lesson = 1 RPC call instead of 300).';
