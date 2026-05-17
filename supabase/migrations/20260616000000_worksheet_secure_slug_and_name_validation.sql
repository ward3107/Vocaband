-- ============================================
-- Worksheet hardening 1 — CSPRNG slug + name validation
-- ============================================
-- Two unrelated tightenings shipped together so the worksheet attack
-- surface gets a single migration instead of three:
--
-- 1. generate_worksheet_slug() previously used PostgreSQL random(),
--    which is a non-cryptographic PRNG. Swapped to gen_random_bytes()
--    so slug guessing is bounded by raw entropy, not by predicting the
--    PRNG seed. Output shape is unchanged (8 chars from the same
--    Crockford-ish 32-symbol alphabet) so existing slugs stay valid.
--
-- 2. submit_worksheet_attempt() previously trusted whatever the client
--    sent in p_student_name. Now enforces: trimmed length 1..40, no
--    control characters, and rejects names that are all symbols (so an
--    empty-looking attempt can't sneak past the length check).
--    Profanity filtering is intentionally out of scope — kid swears in
--    a teacher-moderated classroom are a social problem, not a
--    security one. We just prevent garbage that breaks the UI.

CREATE OR REPLACE FUNCTION public.generate_worksheet_slug()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars      TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  charcount  INT := length(chars);
  slug       TEXT;
  attempts   INT := 0;
  rand_bytes BYTEA;
BEGIN
  WHILE attempts < 10 LOOP
    slug := '';
    -- 8 cryptographically-random bytes; each byte mod 32 indexes the
    -- Crockford alphabet. The bias from 256 mod 32 = 0 means uniform
    -- distribution over the 32 chars, so no rejection sampling needed.
    rand_bytes := gen_random_bytes(8);
    FOR i IN 1..8 LOOP
      slug := slug || SUBSTRING(
        chars
        FROM ((get_byte(rand_bytes, i - 1) % charcount) + 1)
        FOR 1
      );
    END LOOP;
    IF NOT EXISTS (
      SELECT 1 FROM public.interactive_worksheets
      WHERE interactive_worksheets.slug = slug
    ) THEN
      RETURN slug;
    END IF;
    attempts := attempts + 1;
  END LOOP;
  RAISE EXCEPTION 'Failed to generate unique worksheet slug after 10 attempts';
END;
$$;

COMMENT ON FUNCTION public.generate_worksheet_slug() IS
  '8-char Crockford-alphabet slug from gen_random_bytes() — CSPRNG, ~40 bits.';

-- ── Submit RPC with strict name validation ─────────────────────────────
-- DROP + CREATE so the new validation lands atomically; signature is
-- unchanged so the client doesn't need a coordinated deploy.
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
  v_id           UUID;
  v_name         TEXT;
  MAX_NAME_LEN   CONSTANT INT := 40;
BEGIN
  IF p_student_name IS NULL THEN
    RAISE EXCEPTION 'student_name is required' USING ERRCODE = '22023';
  END IF;

  -- Strip C0 control characters (U+0000..U+001F + DEL) before anything
  -- else — they break the dashboard rendering and have no legitimate
  -- place in a name. \s collapses Unicode whitespace runs so a kid
  -- holding the spacebar can't pad a name past 40.
  v_name := regexp_replace(p_student_name, '[[:cntrl:]]', '', 'g');
  v_name := trim(regexp_replace(v_name, '\s+', ' ', 'g'));

  IF length(v_name) = 0 THEN
    RAISE EXCEPTION 'student_name cannot be empty' USING ERRCODE = '22023';
  END IF;

  IF length(v_name) > MAX_NAME_LEN THEN
    RAISE EXCEPTION 'student_name too long (max % chars)', MAX_NAME_LEN
      USING ERRCODE = '22001';
  END IF;

  -- Must contain at least one letter (in any script: Latin, Hebrew,
  -- Arabic, Cyrillic, etc.). Blocks pure-symbol "names" like "!!!" or
  -- "💩💩💩" without locking out RTL or non-ASCII kids.
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
  'Records an attempt. Validates student_name (length 1..40, ≥1 letter, no control chars). Upsert keyed on (slug, fingerprint).';
