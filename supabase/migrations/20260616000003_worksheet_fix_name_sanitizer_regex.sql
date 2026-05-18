-- Migration 20260616000001 shipped a typo in the name sanitiser regex:
-- `[ -]` (space or literal hyphen) instead of `[[:cntrl:]]`. That made
-- it through code review and is now live in prod, with two consequences:
--
--   * legitimate names with hyphens or spaces get mangled
--     ("Mary-Jane Cohen" stored as "MaryJaneCohen")
--   * control characters are no longer stripped, defeating the original
--     intent and breaking the client/server validator alignment that
--     the client (InteractiveWorksheetView.tsx) relies on
--
-- This migration redefines submit_worksheet_attempt with the correct
-- regex. Function body is otherwise identical to migration ...000001.

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
  'Records an attempt with name validation and rate limits (20/hour per device, 200/hour per slug).';
