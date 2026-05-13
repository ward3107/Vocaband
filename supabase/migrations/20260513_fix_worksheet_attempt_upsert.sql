-- ============================================
-- Fix: submit_worksheet_attempt upsert never inferred the partial index
-- ============================================
-- The original migration created a *partial* unique index:
--     CREATE UNIQUE INDEX uniq_worksheet_attempt_per_browser
--       ON public.worksheet_attempts(slug, fingerprint)
--       WHERE fingerprint IS NOT NULL;
--
-- but the RPC used `ON CONFLICT (slug, fingerprint) DO UPDATE` without
-- repeating the predicate.  Postgres refuses to use a partial index as an
-- arbiter unless the conflict_target carries the same WHERE clause, so
-- every fingerprinted submission failed with
--     42P10: there is no unique or exclusion constraint matching the
--            ON CONFLICT specification
-- which the React solver surfaced as "Couldn't reach your teacher's
-- dashboard" while the teacher saw nothing in Worksheet Results.
--
-- Fix: add `WHERE fingerprint IS NOT NULL` to the conflict_target so the
-- planner can match the partial index.  No schema/data change needed.

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
    -- The WHERE clause here matches `uniq_worksheet_attempt_per_browser`'s
    -- predicate; without it Postgres can't pick the partial index.
    ON CONFLICT (slug, fingerprint) WHERE fingerprint IS NOT NULL DO UPDATE
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
