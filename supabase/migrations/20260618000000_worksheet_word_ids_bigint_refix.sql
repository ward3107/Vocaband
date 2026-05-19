-- ============================================
-- Re-apply BIGINT word_ids to create_interactive_worksheet_v2
-- ============================================
-- Migration 20260614000000 widened the function's local aggregate to
-- BIGINT[] so 13-digit custom-word IDs (paste / OCR / manual entry use
-- `-(Date.now() + i)` — easily ±1.7e12) survive the cast.
--
-- Migration 20260616000001 (rate limits) and 20260616000002
-- (minter_fingerprint) both DROP + recreated the function copying the
-- pre-20260614 body. That silently put `all_word_ids INTEGER[]` and
-- `(id_text)::INTEGER` back into production, so any online-worksheet
-- mint that includes a custom word now fails with:
--   value "1779003279407" is out of range for type integer
-- The share dialog catches the error, but to the teacher this looks
-- like "I hit Generate share link and nothing happens."
--
-- This migration recreates the function identically to 20260616000002
-- except for the BIGINT[] declaration and the `::BIGINT` cast.

DROP FUNCTION IF EXISTS public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_interactive_worksheet_v2(
  p_topic_name         TEXT,
  p_exercises          JSONB,
  p_settings           JSONB DEFAULT '{}'::jsonb,
  p_parent_slug        TEXT  DEFAULT NULL,
  p_minter_fingerprint TEXT  DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_slug          TEXT;
  first_type        TEXT;
  all_word_ids      BIGINT[];
  bad_count         INT;
  parent_owner      TEXT;
  v_actor_key       TEXT;
  v_fp              TEXT;
  recent_mints      INT;
  MINTS_PER_HOUR    CONSTANT INT := 30;
BEGIN
  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' OR jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one exercise';
  END IF;

  v_fp := NULLIF(p_minter_fingerprint, '');
  v_actor_key := COALESCE(NULLIF(auth.uid()::text, ''), v_fp);

  IF v_actor_key IS NOT NULL THEN
    DELETE FROM public.worksheet_mint_rate
    WHERE called_at < NOW() - INTERVAL '2 hours';

    SELECT COUNT(*) INTO recent_mints
    FROM   public.worksheet_mint_rate
    WHERE  actor_key = v_actor_key
      AND  called_at > NOW() - INTERVAL '1 hour';

    IF recent_mints >= MINTS_PER_HOUR THEN
      RAISE EXCEPTION 'Worksheet mint rate limit exceeded — try again in a few minutes'
        USING ERRCODE = '42P08';
    END IF;

    INSERT INTO public.worksheet_mint_rate (actor_key) VALUES (v_actor_key);
  END IF;

  IF p_parent_slug IS NOT NULL THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Anonymous worksheets cannot link to a parent';
    END IF;
    SELECT teacher_uid INTO parent_owner
    FROM public.interactive_worksheets
    WHERE slug = p_parent_slug;
    IF parent_owner IS NULL OR parent_owner <> auth.uid()::text THEN
      RAISE EXCEPTION 'Parent worksheet not found or not owned by current user';
    END IF;
  END IF;

  SELECT COUNT(*) INTO bad_count
  FROM jsonb_array_elements(p_exercises) AS ex
  WHERE NOT (
    ex ? 'type'
    AND ex ? 'word_ids'
    AND jsonb_typeof(ex->'word_ids') = 'array'
    AND jsonb_array_length(ex->'word_ids') > 0
  );
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Each exercise must include a type and a non-empty word_ids array';
  END IF;

  first_type := p_exercises->0->>'type';

  -- ::BIGINT (not ::INTEGER) — custom words from paste / OCR use
  -- `-(Date.now() + i)` which is ~±1.7e12 in 2026, well past int4 max.
  SELECT array_agg(DISTINCT (id_text)::BIGINT)
  INTO   all_word_ids
  FROM   jsonb_array_elements(p_exercises) AS ex,
         jsonb_array_elements_text(ex->'word_ids') AS id_text;

  new_slug := public.generate_worksheet_slug();

  INSERT INTO public.interactive_worksheets (
    slug, teacher_uid, topic_name, word_ids, format, exercises, settings, parent_slug,
    minter_fingerprint
  ) VALUES (
    new_slug,
    COALESCE(auth.uid()::text, NULL),
    p_topic_name,
    all_word_ids,
    first_type,
    p_exercises,
    COALESCE(p_settings, '{}'::jsonb),
    p_parent_slug,
    v_fp
  );

  RETURN new_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB, TEXT, TEXT)
  TO anon, authenticated;

COMMENT ON FUNCTION public.create_interactive_worksheet_v2 IS
  'Mints an interactive worksheet. Rate-limited at 30/hour. Stores minter_fingerprint so the same browser can revoke later. word_ids aggregated as BIGINT[] to accept custom-word IDs.';
