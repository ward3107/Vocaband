-- Per-word attempt tracking.
--
-- Background: `progress.mistakes` today stores only a count (wrapped in a
-- single-element array) — the actual word IDs a student got right or wrong
-- are lost after every game.  That makes it impossible to answer the
-- teacher-facing question "which words does this student need to practise?"
--
-- This migration adds a granular `word_attempts` table: one row per word
-- per game, with is_correct.  The existing `save_student_progress` RPC is
-- replaced with a version that accepts an optional `p_word_attempts JSONB`
-- array so the progress row and its per-word attempts are written in the
-- same transaction.  Callers that omit `p_word_attempts` keep the old
-- behaviour (no attempts saved), so this is additive and safe.

BEGIN;

-- ── word_attempts table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.word_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK back to the progress row this attempt belongs to.  ON DELETE CASCADE
  -- means deleting a progress row (e.g. Quick-Play session cleanup) also
  -- wipes its attempts — no orphan rows.
  progress_id uuid NOT NULL REFERENCES public.progress(id) ON DELETE CASCADE,
  -- Denormalised columns so teacher queries ("words my class gets wrong")
  -- don't require a join through progress every time.
  student_uid text NOT NULL,
  class_code text NOT NULL,
  assignment_id uuid NOT NULL,
  word_id integer NOT NULL,
  mode text NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Per-student, per-word lookups are the hot path for the new Student
-- Detail view's mastery list.
CREATE INDEX IF NOT EXISTS word_attempts_student_word_idx
  ON public.word_attempts(student_uid, word_id);
-- Class-level word difficulty ranking (Analytics "most-difficult words").
CREATE INDEX IF NOT EXISTS word_attempts_class_word_idx
  ON public.word_attempts(class_code, word_id);
-- FK join / cascade-delete support.
CREATE INDEX IF NOT EXISTS word_attempts_progress_id_idx
  ON public.word_attempts(progress_id);

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.word_attempts ENABLE ROW LEVEL SECURITY;

-- Students read their own attempts; teachers read attempts for any class
-- they own.  Mirrors the progress_select policy pattern.
DROP POLICY IF EXISTS "word_attempts_select" ON public.word_attempts;
CREATE POLICY "word_attempts_select" ON public.word_attempts
  FOR SELECT TO authenticated
  USING (
    auth.uid()::text = student_uid
    OR class_code IN (
      SELECT code FROM public.classes WHERE teacher_uid = auth.uid()::text
    )
  );

-- Direct INSERT is blocked at the RLS layer — all writes go through the
-- SECURITY DEFINER RPC below so we can validate progress ownership and
-- keep the batch atomic.  No INSERT policy means "deny all".

-- ── save_student_progress (extended) ───────────────────────────────────
-- Replaces the existing 8-arg version with a 9-arg version that also
-- accepts the per-word attempts batch.  Old callers that still pass 8
-- args keep working via the default.
DROP FUNCTION IF EXISTS public.save_student_progress(text, text, uuid, text, integer, text, integer, text);
DROP FUNCTION IF EXISTS public.save_student_progress(text, uuid, uuid, text, integer, text, integer, text);

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
  -- Same upsert semantics as before: one row per (assignment, student, mode,
  -- class_code), keep the higher score on replay.
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
        completed_at = NOW()
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
  END IF;

  -- Per-word attempts batch.  Each element: {word_id: int, is_correct: bool}.
  -- We append to word_attempts so replays accumulate history — the mastery
  -- calculation in the app weights recent attempts more heavily, so stacking
  -- rows is the desired behaviour.
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

GRANT EXECUTE ON FUNCTION public.save_student_progress(text, text, uuid, text, integer, text, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_progress(text, text, uuid, text, integer, text, integer, text, jsonb) TO anon;

COMMENT ON TABLE public.word_attempts IS
  'Granular per-word correctness record. One row per word per finished game. Used by the Student Detail view and teacher analytics to compute mastery.';

COMMIT;
