-- =============================================================================
-- save_student_progress: take `p_mistakes` as the actual array of missed
-- word ids instead of a count, then store it directly into
-- public.progress.mistakes.
-- =============================================================================
--
-- Background: an earlier iteration changed the RPC signature so
-- `p_mistakes` was `integer` (the count of mistakes) and the body wrote
-- `mistakes = ARRAY[p_mistakes]`.  That stamped the count value as a
-- ONE-element int array — `[3]` for "3 mistakes this play" — into the
-- column that consumers (Analytics most-missed-words, ClassPatterns,
-- StudentStatsRow, TodayActionList) all read as the array of missed
-- word ids.  Effect: every assignment-mode play silently corrupted the
-- "what words is the class struggling with?" report by treating the
-- mistake-count value as a real word id (e.g. wordId 3, 4, 5 …).
--
-- Quick Play's save path was unaffected — it writes raw INSERTs with the
-- correct array shape, so the bug only showed up for assignment plays.
--
-- Fix: change the RPC signature to `p_mistakes integer[] DEFAULT '{}'`,
-- store it directly, and update both client paths (useGameFinish + the
-- save-queue retry) to pass the actual array.
--
-- Backward compat: old broken rows stay untouched.  The next play of
-- the same (assignment_id, student_uid, mode, class_code) tuple will
-- overwrite `mistakes` via the existing ON CONFLICT path
-- (mistakes = EXCLUDED.mistakes), so the bad data ages out
-- naturally as students replay.
-- =============================================================================

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
  p_mistakes integer[] DEFAULT '{}'::integer[],
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
  -- personal best; play_count increments on every replay.  `mistakes`
  -- is stored as an int[] of missed word ids — Analytics reads this
  -- as `mistakes.forEach(wordId => …)` so the array contents must be
  -- real ids, not a count.
  INSERT INTO public.progress (
    student_name, student_uid, assignment_id, class_code,
    score, mode, mistakes, avatar, completed_at, play_count
  ) VALUES (
    p_student_name, p_student_uid, p_assignment_id, p_class_code,
    p_score, p_mode, COALESCE(p_mistakes, '{}'::integer[]), p_avatar, NOW(), 1
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
  text, text, uuid, text, integer, text, integer[], text, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_progress(
  text, text, uuid, text, integer, text, integer[], text, jsonb
) TO anon;

COMMIT;
