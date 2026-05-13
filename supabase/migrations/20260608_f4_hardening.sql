-- =============================================================================
-- F4 hardening — close two Codex P1 review flags on 20260607
-- =============================================================================
--
-- Flag 1: v_correct_count was unbounded COUNT(*) over the JSONB array.
-- With 34+ "is_correct=true" elements, v_attempts_max reaches 1120,
-- exceeding the F3 cap of 1000 — so F4's tighter ceiling effectively
-- evaporated for oversized payloads.  A kid replaying with a 40-
-- element fake array could still inflate to 1000.
--
-- Flag 2: v_correct_count counted any element where is_correct parses
-- to true, regardless of whether the element also had a word_id.  The
-- later word_attempts INSERT requires BOTH fields, so a kid could
-- pad the clamp with `{"is_correct": true}` objects (no word_id) to
-- raise attempts_max without leaving any audit rows behind.
--
-- Fix:
--   1. Require `elem ? 'word_id' AND elem ? 'is_correct'` in the
--      count's WHERE clause — matches the persist path exactly so
--      every element that bumps the cap also lands a word_attempts
--      row (which the teacher will see in mastery analytics).
--   2. Hard-cap v_correct_count at 50 — well above any realistic per-
--      save game (10 words classic, ~30 in long QP sessions) but
--      below the threshold where F4 degenerates into F3.  Any save
--      that legitimately needs more than 50 correct in one call is
--      almost certainly the QP TEACHER_END path, which already passes
--      p_word_attempts=NULL and so skips F4 entirely.
--
-- Effect on the cheating ceiling for high-count payloads:
--   Before:  50 "correct" elements (with or without word_id) → 1000
--   After:   50 "correct" with word_id    → 1600 raw → clamped to F3 = 1000
--            50 "correct" without word_id → 100 (only the BONUS_HEADROOM)
--            100+ correct                 → cap at 50 → same as above
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.save_student_progress(
  p_student_name text,
  p_student_uid text,
  p_assignment_id uuid,
  p_class_code text,
  p_score integer,
  p_mode text,
  p_mistakes integer[] DEFAULT '{}'::integer[],
  p_avatar text DEFAULT '🦊'::text,
  p_word_attempts jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_caller_uid    text;
  v_progress_id   uuid;
  v_clamped_score integer;
  v_correct_count integer;
  v_attempts_max  integer;
  SCORE_MIN       CONSTANT integer := 0;
  SCORE_MAX       CONSTANT integer := 1000;
  PTS_PER_CORRECT CONSTANT integer := 30;
  BONUS_HEADROOM  CONSTANT integer := 100;
  CORRECT_COUNT_CAP CONSTANT integer := 50;  -- F4 hardening (Codex flag 1)
BEGIN
  v_caller_uid := auth.uid()::text;
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_class_code <> 'QUICK_PLAY' AND p_student_uid <> v_caller_uid THEN
    RAISE EXCEPTION 'Cannot write progress for another student' USING ERRCODE = '42501';
  END IF;

  -- F3: clamp to the absolute cap.
  v_clamped_score := GREATEST(SCORE_MIN, LEAST(SCORE_MAX, p_score));

  -- F4: cross-check against word_attempts when present.
  IF p_word_attempts IS NOT NULL AND jsonb_typeof(p_word_attempts) = 'array' THEN
    -- Codex flag 2: require BOTH word_id AND is_correct keys — same
    -- predicate the persist INSERT uses below — so every element that
    -- bumps the cap also leaves a word_attempts row.
    SELECT COUNT(*)::integer
      INTO v_correct_count
      FROM jsonb_array_elements(p_word_attempts) AS elem
     WHERE elem ? 'word_id'
       AND elem ? 'is_correct'
       AND (elem->>'is_correct')::boolean = true;

    -- Codex flag 1: hard-cap the count at the realistic per-save
    -- ceiling.  Anything beyond is either a bug or an inflation
    -- attempt; treat both as 50.
    IF v_correct_count > CORRECT_COUNT_CAP THEN
      v_correct_count := CORRECT_COUNT_CAP;
    END IF;

    v_attempts_max := (v_correct_count * PTS_PER_CORRECT) + BONUS_HEADROOM;
    IF v_clamped_score > v_attempts_max THEN
      v_clamped_score := v_attempts_max;
    END IF;
  END IF;

  INSERT INTO public.progress (
    student_name, student_uid, assignment_id, class_code,
    score, mode, mistakes, avatar, completed_at, play_count
  ) VALUES (
    p_student_name, p_student_uid, p_assignment_id, p_class_code,
    v_clamped_score, p_mode, COALESCE(p_mistakes, '{}'::integer[]), p_avatar, NOW(), 1
  )
  ON CONFLICT ON CONSTRAINT uq_progress_assignment_student_mode_class
  DO UPDATE SET
    score        = GREATEST(public.progress.score, EXCLUDED.score),
    mistakes     = EXCLUDED.mistakes,
    avatar       = EXCLUDED.avatar,
    completed_at = EXCLUDED.completed_at,
    play_count   = public.progress.play_count + 1
  RETURNING id INTO v_progress_id;

  IF p_word_attempts IS NOT NULL AND jsonb_typeof(p_word_attempts) = 'array' THEN
    INSERT INTO public.word_attempts (
      progress_id, student_uid, class_code, assignment_id, word_id, mode, is_correct
    )
    SELECT
      v_progress_id, p_student_uid, p_class_code, p_assignment_id,
      (elem->>'word_id')::integer, p_mode, (elem->>'is_correct')::boolean
    FROM jsonb_array_elements(p_word_attempts) AS elem
    WHERE elem ? 'word_id' AND elem ? 'is_correct';
  END IF;

  RETURN v_progress_id;
END;
$function$;

COMMENT ON FUNCTION public.save_student_progress IS
  'F4 hardened: p_score cross-checked against p_word_attempts (count '
  'restricted to entries with word_id AND is_correct=true, capped at 50). '
  'F3 absolute cap [0, 1000] applied first.';

COMMIT;
