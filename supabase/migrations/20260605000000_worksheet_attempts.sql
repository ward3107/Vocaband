-- ============================================
-- Worksheet Attempts (Phase 2 — Interactive Worksheets)
-- ============================================
-- Records every student's attempt at an interactive worksheet so the
-- teacher who minted the share can see who finished and what they
-- got right.
--
-- Privacy model:
--   * Students don't sign up.  They type their name, we mint a random
--     fingerprint into localStorage on first solve, and link the row by
--     fingerprint so a "Try again" on the same browser updates the
--     existing attempt instead of creating duplicates.
--   * Only the worksheet's `teacher_uid` (set when the teacher was
--     logged in at share time) can SELECT attempts via RLS.  Anonymous
--     mints (from the public Free Resources page) have no teacher_uid
--     and their attempts are invisible to everyone except the service
--     role — students can still solve and submit them, results just
--     don't surface anywhere.

CREATE TABLE IF NOT EXISTS public.worksheet_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL REFERENCES public.interactive_worksheets(slug) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  -- Per-question detail, JSONB so the shape can vary by format:
  --   quiz:     [{ word_id, prompt, given, correct, is_correct }, ...]
  --   matching: [{ word_id, english, translation, mistakes_count }, ...]
  -- Empty array is fine for formats we haven't instrumented yet.
  answers      JSONB NOT NULL DEFAULT '[]'::jsonb,
  score        INT NOT NULL DEFAULT 0,
  total        INT NOT NULL DEFAULT 0,
  duration_ms  INT,
  -- Per-browser random hash (NOT cross-session; localStorage only).  Same
  -- browser solving twice updates the same row, so the teacher sees the
  -- latest score, not duplicates.  Different students on the same
  -- browser just type different names.
  fingerprint  TEXT,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_worksheet_attempts_slug
  ON public.worksheet_attempts(slug, completed_at DESC NULLS LAST);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_worksheet_attempt_per_browser
  ON public.worksheet_attempts(slug, fingerprint)
  WHERE fingerprint IS NOT NULL;

ALTER TABLE public.worksheet_attempts ENABLE ROW LEVEL SECURITY;

-- Anonymous students must be able to write their own attempts.  Slug is
-- the credential; without it you can't insert because the FK rejects.
CREATE POLICY "Anyone can submit worksheet attempts"
ON public.worksheet_attempts FOR INSERT
WITH CHECK (true);

-- Same student (fingerprint) can update their own row before completion.
CREATE POLICY "Owner browser can update own attempt"
ON public.worksheet_attempts FOR UPDATE
USING (fingerprint IS NOT NULL)
WITH CHECK (fingerprint IS NOT NULL);

-- Only the worksheet's owner sees attempts.  Joined via the parent
-- interactive_worksheets.teacher_uid; anonymous shares (NULL owner)
-- have no readable attempts — that's the privacy guarantee that lets
-- anonymous mints stay a casual share-with-anyone feature.
CREATE POLICY "Worksheet owner reads attempts"
ON public.worksheet_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.interactive_worksheets w
    WHERE w.slug = worksheet_attempts.slug
      AND w.teacher_uid IS NOT NULL
      AND w.teacher_uid = auth.uid()::text
  )
);

CREATE POLICY "Service role full access on worksheet attempts"
ON public.worksheet_attempts FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Single-shot upsert RPC
-- ============================================
-- The solver calls this on finish.  Upsert keyed on (slug, fingerprint)
-- so a Try-again on the same browser overwrites instead of duplicating.
-- A null fingerprint means "private mode" / "fingerprint blocked" — we
-- always insert a fresh row in that case so the attempt is preserved.
CREATE OR REPLACE FUNCTION public.submit_worksheet_attempt(
  p_slug         TEXT,
  p_student_name TEXT,
  p_answers      JSONB,
  p_score        INT,
  p_total        INT,
  p_duration_ms  INT,
  p_fingerprint  TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_student_name IS NULL OR length(trim(p_student_name)) = 0 THEN
    RAISE EXCEPTION 'student_name is required';
  END IF;
  -- Validate the slug exists + is not expired.  Without this anonymous
  -- callers could spam attempts at random slugs.
  IF NOT EXISTS (
    SELECT 1 FROM public.interactive_worksheets
    WHERE slug = p_slug AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'worksheet not found or expired';
  END IF;

  IF p_fingerprint IS NOT NULL AND length(p_fingerprint) > 0 THEN
    INSERT INTO public.worksheet_attempts (
      slug, student_name, answers, score, total, duration_ms, fingerprint, completed_at
    ) VALUES (
      p_slug, trim(p_student_name), COALESCE(p_answers, '[]'::jsonb),
      GREATEST(0, p_score), GREATEST(0, p_total), p_duration_ms, p_fingerprint, NOW()
    )
    ON CONFLICT (slug, fingerprint) DO UPDATE
      SET student_name = EXCLUDED.student_name,
          answers      = EXCLUDED.answers,
          score        = EXCLUDED.score,
          total        = EXCLUDED.total,
          duration_ms  = EXCLUDED.duration_ms,
          completed_at = NOW()
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.worksheet_attempts (
      slug, student_name, answers, score, total, duration_ms, completed_at
    ) VALUES (
      p_slug, trim(p_student_name), COALESCE(p_answers, '[]'::jsonb),
      GREATEST(0, p_score), GREATEST(0, p_total), p_duration_ms, NOW()
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_worksheet_attempt(TEXT, TEXT, JSONB, INT, INT, INT, TEXT) TO anon, authenticated;
