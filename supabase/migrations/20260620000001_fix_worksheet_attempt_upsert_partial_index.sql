-- ============================================
-- Restore the partial-index predicate in submit_worksheet_attempt
-- ============================================
-- Outage on 2026-05-19: students completing worksheets saw
-- "Couldn't reach your teacher's dashboard" and no rows landed in
-- public.worksheet_attempts. Teacher dashboards showed zero scores.
--
-- Root cause: the unique index on (slug, fingerprint) is partial —
--   CREATE UNIQUE INDEX uniq_worksheet_attempt_per_browser
--     ON public.worksheet_attempts(slug, fingerprint)
--     WHERE fingerprint IS NOT NULL;
-- Postgres can only use a partial unique index for ON CONFLICT
-- inference if the same WHERE predicate appears in the inference
-- clause. The original migration shipped without that predicate and
-- threw `42P10 there is no unique or exclusion constraint matching
-- the ON CONFLICT specification` on every submission.
--
-- A DB-only fix migration (20260513135957 fix_worksheet_attempt_upsert)
-- patched this back in May, but it was never committed to the repo.
-- When 20260616000001_worksheet_rate_limits.sql later DROP+CREATEd the
-- function from the repo's source, the fix regressed silently — no
-- attempts could land for three days until the next student tried.
--
-- This migration restores the predicate. The function body is otherwise
-- identical to the latest committed version (rate limits + name
-- validation from ...0001 / ...0003).

DROP FUNCTION IF EXISTS public.submit_worksheet_attempt(TEXT, TEXT, JSONB, INT, INT, INT, TEXT);

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
  v_id              UUID;
  v_name            TEXT;
  recent_per_fp     INT;
  recent_per_slug   INT;
  MAX_NAME_LEN      CONSTANT INT := 40;
  PER_FP_PER_HOUR   CONSTANT INT := 20;
  PER_SLUG_PER_HOUR CONSTANT INT := 200;
BEGIN
  IF p_student_name IS NULL THEN
    RAISE EXCEPTION 'student_name is required' USING ERRCODE = '22023';
  END IF;

  v_name := regexp_replace(p_student_name, '[[:cntrl:]]', '', 'g');
  v_name := trim(regexp_replace(v_name, '\s+', ' ', 'g'));

  IF length(v_name) = 0 THEN
    RAISE EXCEPTION 'student_name cannot be empty' USING ERRCODE = '22023';
  END IF;
  IF length(v_name) > MAX_NAME_LEN THEN
    RAISE EXCEPTION 'student_name too long (max % chars)', MAX_NAME_LEN
      USING ERRCODE = '22001';
  END IF;
  IF v_name !~ '[[:alpha:]]' AND v_name !~ '[֐-׿؀-ۿЀ-ӿ]' THEN
    RAISE EXCEPTION 'student_name must include at least one letter'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.interactive_worksheets
    WHERE slug = p_slug AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'worksheet not found or expired' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.worksheet_submit_rate
  WHERE called_at < NOW() - INTERVAL '2 hours';

  SELECT COUNT(*) INTO recent_per_slug
  FROM   public.worksheet_submit_rate
  WHERE  slug = p_slug
    AND  called_at > NOW() - INTERVAL '1 hour';

  IF recent_per_slug >= PER_SLUG_PER_HOUR THEN
    RAISE EXCEPTION 'Too many submissions on this worksheet — try again later'
      USING ERRCODE = '42P08';
  END IF;

  IF p_fingerprint IS NOT NULL AND length(p_fingerprint) > 0 THEN
    SELECT COUNT(*) INTO recent_per_fp
    FROM   public.worksheet_submit_rate
    WHERE  slug = p_slug
      AND  fingerprint = p_fingerprint
      AND  called_at > NOW() - INTERVAL '1 hour';

    IF recent_per_fp >= PER_FP_PER_HOUR THEN
      RAISE EXCEPTION 'Too many attempts from this device — try again later'
        USING ERRCODE = '42P08';
    END IF;
  END IF;

  INSERT INTO public.worksheet_submit_rate (slug, fingerprint)
  VALUES (p_slug, NULLIF(p_fingerprint, ''));

  IF p_fingerprint IS NOT NULL AND length(p_fingerprint) > 0 THEN
    INSERT INTO public.worksheet_attempts (
      slug, student_name, answers, score, total, duration_ms, fingerprint, completed_at
    ) VALUES (
      p_slug, v_name, COALESCE(p_answers, '[]'::jsonb),
      GREATEST(0, p_score), GREATEST(0, p_total), p_duration_ms, p_fingerprint, NOW()
    )
    -- The WHERE predicate is required to match the partial unique index
    -- `uniq_worksheet_attempt_per_browser`. Without it, Postgres can't
    -- infer an arbiter index and raises 42P10.
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
      p_slug, v_name, COALESCE(p_answers, '[]'::jsonb),
      GREATEST(0, p_score), GREATEST(0, p_total), p_duration_ms, NOW()
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_worksheet_attempt(TEXT, TEXT, JSONB, INT, INT, INT, TEXT)
  TO anon, authenticated;

COMMENT ON FUNCTION public.submit_worksheet_attempt IS
  'Records an attempt with name validation and rate limits (20/hour per device, 200/hour per slug). The ON CONFLICT clause names the partial-index predicate to satisfy arbiter inference.';
