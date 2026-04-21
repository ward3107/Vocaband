-- =============================================================================
-- save_student_progress: make the upsert atomic
-- =============================================================================
-- The previous version of this RPC did a check-then-act (SELECT existing
-- row, branch to INSERT or UPDATE).  Under concurrent saves for the same
-- (assignment_id, student_uid, mode, class_code) tuple — which happens when
-- a student double-taps the finish button, or network flakiness makes the
-- client retry, or two tabs in the same session both fire — two transactions
-- can both see "doesn't exist", both try to INSERT, and one of them fails
-- with a UNIQUE constraint violation on uq_progress_assignment_student_mode_class.
-- The client got a generic 500-class error and the student saw an orange
-- "Couldn't save your score" toast even though the score was in fact saved
-- (just by the other call).
--
-- Fix: replace the SELECT + branch with a single INSERT ... ON CONFLICT
-- DO UPDATE.  Postgres handles the concurrency for us; no exception can
-- leak.  Same surface semantics as before:
--   - first time:  INSERT, play_count = 1
--   - replay:      UPDATE, score = GREATEST(old, new), play_count += 1
--
-- Signature unchanged, so no client code needs to move.

BEGIN;

DROP FUNCTION IF EXISTS public.save_student_progress(
  text, text, uuid, text, integer, text, integer, text, jsonb
);

CREATE OR REPLACE FUNCTION public.save_student_progress(
  p_student_name text,
  p_student_uid text,
  p_assignment_id uuid,
  p_class_code text,
  p_score integer,
  p_mode text,
  p_mistakes integer DEFAULT 0,
  p_avatar text DEFAULT '🦊',
  p_word_attempts jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_progress_id uuid;
BEGIN
  -- Atomic upsert.  Conflict target matches the unique constraint
  -- uq_progress_assignment_student_mode_class so Postgres can route the
  -- row without ambiguity.  GREATEST(old, new) preserves the student's
  -- personal best; play_count increments on every replay.
  INSERT INTO public.progress (
    student_name, student_uid, assignment_id, class_code,
    score, mode, mistakes, avatar, completed_at, play_count
  ) VALUES (
    p_student_name, p_student_uid, p_assignment_id, p_class_code,
    p_score, p_mode, ARRAY[p_mistakes], p_avatar, NOW(), 1
  )
  ON CONFLICT ON CONSTRAINT uq_progress_assignment_student_mode_class
  DO UPDATE SET
    score        = GREATEST(public.progress.score, EXCLUDED.score),
    mistakes     = EXCLUDED.mistakes,
    avatar       = EXCLUDED.avatar,
    completed_at = EXCLUDED.completed_at,
    play_count   = public.progress.play_count + 1
  RETURNING id INTO v_progress_id;

  -- Per-word attempts batch (unchanged semantics — we append to word_attempts
  -- so replays accumulate history; the mastery calculation weights recent
  -- attempts more heavily).
  IF p_word_attempts IS NOT NULL AND jsonb_typeof(p_word_attempts) = 'array' THEN
    INSERT INTO public.word_attempts (
      progress_id, student_uid, class_code, assignment_id, word_id, mode, is_correct
    )
    SELECT
      v_progress_id,
      p_student_uid,
      p_class_code,
      p_assignment_id,
      (elem->>'word_id')::integer,
      p_mode,
      (elem->>'is_correct')::boolean
    FROM jsonb_array_elements(p_word_attempts) AS elem
    WHERE elem ? 'word_id' AND elem ? 'is_correct';
  END IF;

  RETURN v_progress_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_progress(
  text, text, uuid, text, integer, text, integer, text, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_progress(
  text, text, uuid, text, integer, text, integer, text, jsonb
) TO anon;

COMMIT;
