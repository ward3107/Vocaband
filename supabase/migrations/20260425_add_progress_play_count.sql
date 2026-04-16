-- =============================================================================
-- Add play_count to progress + sync via save_student_progress RPC
-- =============================================================================
-- The progress table upserts a single row per (assignment, mode, student,
-- class) so the score column only ever holds the student's BEST score for
-- that mode.  That was fine when we only cared about "did they pass this
-- mode?" but it meant we couldn't count how many TIMES a student replayed
-- a mode — which is exactly what the anti-farm "3 rounds per assignment"
-- cap needs.
--
-- This migration adds a `play_count` column (default 1 for existing rows)
-- and updates the save_student_progress RPC to increment it on every
-- subsequent save.  The dashboard can then read the authoritative play
-- total across devices by summing play_count for all mode rows in an
-- assignment — no more relying on per-device localStorage.

BEGIN;

-- ── Column ─────────────────────────────────────────────────────────────
ALTER TABLE public.progress
  ADD COLUMN IF NOT EXISTS play_count integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.progress.play_count IS
  'Cumulative number of times this student has completed this mode on '
  'this assignment.  Incremented server-side on every save — source of '
  'truth for the 3-rounds-per-assignment anti-farm cap.';

-- Back-fill: existing rows get play_count = 1 via the DEFAULT clause,
-- so already-correct for any row that was just created once.  Rows that
-- were upserted multiple times before this migration undercount by
-- (n - 1), which is acceptable — the worst case is a student effectively
-- gets a few extra plays once, then the count goes live from there.

-- ── save_student_progress: bump play_count on every save ───────────────
-- Match the current 9-arg signature so existing callers keep working.
-- New behaviour: on UPDATE path, play_count += 1.  On INSERT path,
-- play_count defaults to 1 via the column default.
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
  v_existing_id uuid;
  v_progress_id uuid;
BEGIN
  SELECT id INTO v_existing_id
  FROM public.progress
  WHERE assignment_id = p_assignment_id
    AND student_uid = p_student_uid
    AND mode = p_mode
    AND class_code = p_class_code
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.progress
    SET score = GREATEST(score, p_score),
        mistakes = ARRAY[p_mistakes],
        avatar = p_avatar,
        completed_at = NOW(),
        play_count = play_count + 1           -- NEW
    WHERE id = v_existing_id;
    v_progress_id := v_existing_id;
  ELSE
    INSERT INTO public.progress (
      student_name, student_uid, assignment_id, class_code,
      score, mode, mistakes, avatar, completed_at
    ) VALUES (
      p_student_name, p_student_uid, p_assignment_id, p_class_code,
      p_score, p_mode, ARRAY[p_mistakes], p_avatar, NOW()
    )
    RETURNING id INTO v_progress_id;
    -- play_count defaults to 1 via the column DEFAULT
  END IF;

  -- Per-word attempts batch (unchanged semantics).
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
