-- =============================================================================
-- F4 — cross-check progress.score against word_attempts on the server
-- =============================================================================
--
-- AUDIT FINDING (pen-test 2026-05-12, F4 — follow-up to F3):
--
-- F3 clamped p_score to [0, 1000].  That blocks 4-orders-of-magnitude
-- inflation (999_999 → 1000) but a kid can still:
--   - Call save_student_progress with p_score=1000 + p_word_attempts=[]
--   - Or lie in word_attempts.is_correct (say all 10 words right when
--     they got 0) and submit p_score=1000.
--
-- The fundamental problem: the server has no canonical "correct
-- answer" record to validate is_correct against (the right answer
-- depends on the game mode + the student's input, both client-only).
-- So perfect F4 validation isn't possible without re-deriving every
-- mode's scoring formula server-side — that's a sprint, not a quick
-- fix.
--
-- WHAT THIS MIGRATION DOES (achievable F4):
--
-- Cross-check the client-supplied p_score against the client-supplied
-- p_word_attempts.  Inconsistent inputs reveal the cheat:
--
--   correct_count = number of word_attempts with is_correct=true
--   reasonable_max = correct_count * 30 + 100   -- 30pt/word + 100pt bonus headroom
--
--   if p_score > reasonable_max, clamp p_score down to reasonable_max
--
-- The 30/word + 100 bonus numbers are derived from the actual
-- production scoring formula:
--   - 10 words × 10 base points = 100 (most modes)
--   - Streak bonus, first-completion bonus, perfect-score bonus,
--     booster multiplier headroom: ~80 combined.  Round up to 100.
--   - Per-word cap of 30 gives 3× headroom against future scoring
--     formula changes without breaking legitimate plays.
--
-- Effect on the cheating ceiling:
--   - Before: kid could fake 1000 with empty word_attempts (F3 cap).
--   - After:  kid faking word_attempts=[] gets clamped to 100.  Kid
--             faking all-10-correct gets clamped to 400.  Order-of-
--             magnitude tightening on the inflation surface.
--
-- Modes that don't submit word_attempts (some legacy paths, Quick
-- Play teacher-end persist with p_word_attempts=NULL) skip the
-- cross-check entirely and only get the F3 [0, 1000] cap — no
-- regression for them.
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
  SCORE_MIN      CONSTANT integer := 0;
  SCORE_MAX      CONSTANT integer := 1000;    -- F3: matches table CHECK
  PTS_PER_CORRECT CONSTANT integer := 30;     -- F4: 3× headroom over real 10pt/word
  BONUS_HEADROOM  CONSTANT integer := 100;    -- F4: streak/perfect/booster bonuses
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

  -- F4: cross-check against word_attempts when present.  Skipped for
  -- legacy / QP TEACHER_END paths that don't submit word_attempts —
  -- those still get the F3 absolute cap above.
  IF p_word_attempts IS NOT NULL AND jsonb_typeof(p_word_attempts) = 'array' THEN
    SELECT COUNT(*)::integer
      INTO v_correct_count
      FROM jsonb_array_elements(p_word_attempts) AS elem
     WHERE (elem->>'is_correct')::boolean = true;

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
  'Atomic upsert into progress + append to word_attempts.  Authenticated '
  'callers only; caller scope-checked against p_student_uid (with QUICK_PLAY '
  'exemption for guests).  F3 (20260606): p_score clamped to [0, 1000].  '
  'F4 (20260607): when p_word_attempts is supplied, p_score is ALSO clamped '
  'to (correct_count × 30 + 100) — a kid who lies about word_attempts to '
  'inflate their score is also caught when score is inconsistent with the '
  'attempts they claim.';

COMMIT;

-- =============================================================================
-- Verification (after applying):
--
-- 1. word_attempts=[]: score=1000 should clamp to 100.
-- 2. word_attempts=[5 correct, 5 wrong]: score=1000 should clamp to 250.
-- 3. word_attempts=[10 correct]: score=1000 should clamp to 400.
-- 4. word_attempts=NULL: score=1000 lands as-is (F3 cap only).
-- 5. word_attempts=[5 correct, 5 wrong], score=150: lands as 150 (legit).
--
-- ROLLBACK:
--   Re-run 20260606's CREATE OR REPLACE FUNCTION (the F3-only version
--   without the v_correct_count / v_attempts_max logic).
-- =============================================================================
