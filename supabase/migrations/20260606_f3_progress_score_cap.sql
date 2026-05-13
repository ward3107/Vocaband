-- =============================================================================
-- F3 — cap progress.score against client inflation
-- =============================================================================
--
-- AUDIT FINDING (pen-test 2026-05-12, F3 — third companion to F1/F2):
--
-- progress.score is client-trusted in two places today:
--
--   1. save_student_progress RPC takes p_score INT verbatim — no bounds.
--      A logged-in student can replay the RPC with p_score = 999_999_999
--      and the upsert lands; the GREATEST(old, new) preserves the
--      inflated value across subsequent honest plays.
--
--   2. progress_update RLS WITH CHECK only enforces monotonic increase
--      (`score >= existing`), no upper bound.  Direct REST UPDATE with
--      score = 99999 is accepted today.
--
-- Blast radius: leaderboard / gradebook show inflated scores.  No data
-- leak, no cross-tenant impact — same fairness-at-scale concern as F2
-- but for the per-assignment score column rather than the per-user XP.
--
-- FIX:
--
-- 1. save_student_progress: clamp p_score to [0, 1000] server-side.
--    1000 matches the existing CHECK constraint `progress_score_check`
--    on the table (`score BETWEEN 0 AND 1000`), so the clamp and the
--    column constraint agree.  Real production max is ~180 (classic),
--    so 1000 is ~5× the legitimate ceiling — tight enough to reject
--    the 999,999-inflation attack, loose enough that nothing
--    legitimate is rejected.
--
-- 2. progress_insert + progress_update RLS WITH CHECK both add
--    `score BETWEEN 0 AND 1000`.  Direct REST writes from
--    authenticated clients can no longer bypass the RPC cap.
-- =============================================================================

BEGIN;

-- ─── 1. Patch save_student_progress to clamp p_score ────────────────
-- Function signature unchanged so all existing callers (useGameFinish,
-- useGameState, App.tsx VocaHebrew path, server.ts QP TEACHER_END
-- persist, save_student_progress_batch wrapper) continue working
-- byte-for-byte.

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
  SCORE_MIN CONSTANT integer := 0;
  SCORE_MAX CONSTANT integer := 1000;  -- matches table CHECK (progress_score_check)
BEGIN
  v_caller_uid := auth.uid()::text;

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_class_code <> 'QUICK_PLAY' AND p_student_uid <> v_caller_uid THEN
    RAISE EXCEPTION 'Cannot write progress for another student' USING ERRCODE = '42501';
  END IF;

  -- F3: clamp p_score to a sane range.  Negative scores are forced
  -- to 0; absurd inflation attempts (999_999_999) are forced down
  -- to 1000, which is the existing column CHECK (progress_score_check).
  -- Keeps the RPC clamp, the policies, and the constraint all in
  -- lockstep.
  v_clamped_score := GREATEST(SCORE_MIN, LEAST(SCORE_MAX, p_score));

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
$function$;

COMMENT ON FUNCTION public.save_student_progress IS
  'Atomic upsert into progress + append to word_attempts.  Authenticated '
  'callers only; caller scope-checked against p_student_uid (with QUICK_PLAY '
  'exemption for guests).  F3 (20260606): p_score clamped to [0, 1000] '
  '(matches table CHECK progress_score_check) so a kid replaying the RPC '
  'cannot inflate the leaderboard.';


-- ─── 2. Tighten progress_insert RLS WITH CHECK ───────────────────────
-- The SECURITY DEFINER RPC above bypasses RLS, so this only constrains
-- direct REST INSERTs (currently used by QP guest client-save and the
-- save-queue retry fallback in saveQueue.ts).  Score range matches the
-- RPC clamp.

DROP POLICY IF EXISTS progress_insert ON public.progress;

CREATE POLICY progress_insert ON public.progress
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (((SELECT auth.uid()))::text = student_uid)
    AND (class_code = (SELECT u.class_code FROM public.users u WHERE u.uid = ((SELECT auth.uid()))::text))
    AND (score IS NULL OR (score >= 0 AND score <= 1000))
  );

COMMENT ON POLICY progress_insert ON public.progress IS
  'Authenticated client may INSERT only their own row in their own class, '
  'with score within [0, 1000] (matches table CHECK progress_score_check).  '
  'F3 (20260606) added the score-range check; the RPC path is unaffected '
  'because it runs SECURITY DEFINER and bypasses RLS.';


-- ─── 3. Tighten progress_update RLS WITH CHECK ───────────────────────
-- Existing rule was "score >= existing" (monotonic).  Add a hard upper
-- bound so a direct UPDATE can't inflate.

DROP POLICY IF EXISTS progress_update ON public.progress;

CREATE POLICY progress_update ON public.progress
  AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()))::text = student_uid)
  WITH CHECK (
    (((SELECT auth.uid()))::text = student_uid)
    AND score >= (SELECT p2.score FROM public.progress p2 WHERE p2.id = progress.id)
    AND score <= 1000
  );

COMMENT ON POLICY progress_update ON public.progress IS
  'Owner-only direct UPDATE.  Score must increase (monotonic, anti-rollback) '
  'and stay within the legitimate cap.  F3 (20260606) added the upper bound; '
  'no client code does direct UPDATE on progress today so this is mostly '
  'defence-in-depth for future regressions.';

COMMIT;

-- =============================================================================
-- Verification queries (run manually after applying this migration):
--
-- 1. RPC clamp:
--    -- Call as authenticated student with p_score = 999_999.  Read the
--    -- resulting row; score should be 100_000.
--
-- 2. Direct UPDATE attack (run as authenticated session — see F2 pen-test
--    notes for how to simulate):
--    UPDATE public.progress SET score = 999999 WHERE id = '<own-row>';
--    -- Expect: 0 rows updated (RLS WITH CHECK rejects).
--
-- 3. Direct INSERT attack:
--    INSERT INTO public.progress (..., score) VALUES (..., 999999);
--    -- Expect: 0 rows inserted (RLS WITH CHECK rejects).
--
-- ROLLBACK plan:
--   - Restore the pre-F3 save_student_progress body (no clamp).
--   - Drop the score range checks from progress_insert + progress_update.
--   The previous version of each is in git history under
--   20260507203402_security_high_save_progress_auth.sql for the RPC
--   and schema.sql for the policies.
-- =============================================================================
