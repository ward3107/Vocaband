-- ============================================
-- Widen interactive_worksheets.word_ids to BIGINT[]
-- ============================================
-- Custom words (OCR'd / pasted / manually entered) carry Date.now()-style
-- 13-digit IDs that overflow INT4 (max ~2.1B). saved_word_groups.word_ids
-- is already BIGINT[] for the same reason; this aligns interactive_worksheets
-- with it so a Share Worksheet flow seeded from a saved group containing
-- custom words doesn't blow up on the cast inside create_interactive_worksheet_v2.
--
-- Surfaced as a 400 from create_interactive_worksheet_v2:
--   value "1779003279407" is out of range for type integer

ALTER TABLE public.interactive_worksheets
  ALTER COLUMN word_ids TYPE BIGINT[] USING word_ids::BIGINT[];

-- ---- v2 mint RPC, BIGINT-correct -------------------------------------
-- Body is identical to the 20260611 definition except for the local
-- all_word_ids type and the per-element cast that aggregates them.

DROP FUNCTION IF EXISTS public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.create_interactive_worksheet_v2(
  p_topic_name  TEXT,
  p_exercises   JSONB,
  p_settings    JSONB DEFAULT '{}'::jsonb,
  p_parent_slug TEXT  DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_slug      TEXT;
  first_type    TEXT;
  all_word_ids  BIGINT[];
  bad_count     INT;
  parent_owner  TEXT;
BEGIN
  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' OR jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one exercise';
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

  SELECT array_agg(DISTINCT (id_text)::BIGINT)
  INTO   all_word_ids
  FROM   jsonb_array_elements(p_exercises) AS ex,
         jsonb_array_elements_text(ex->'word_ids') AS id_text;

  new_slug := public.generate_worksheet_slug();

  INSERT INTO public.interactive_worksheets (
    slug, teacher_uid, topic_name, word_ids, format, exercises, settings, parent_slug
  ) VALUES (
    new_slug,
    COALESCE(auth.uid()::text, NULL),
    p_topic_name,
    all_word_ids,
    first_type,
    p_exercises,
    COALESCE(p_settings, '{}'::jsonb),
    p_parent_slug
  );

  RETURN new_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB, TEXT) TO anon, authenticated;

-- ---- v1 mint RPC, widened to match -----------------------------------
-- v1 isn't called from the current client but is still GRANTed and could
-- be invoked by an old cached bundle. Widen p_word_ids so it can't
-- re-introduce the same overflow if a stale client hits it.

DROP FUNCTION IF EXISTS public.create_interactive_worksheet(TEXT, INTEGER[], TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_interactive_worksheet(
  p_topic_name TEXT,
  p_word_ids   BIGINT[],
  p_format     TEXT,
  p_settings   JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_slug TEXT;
BEGIN
  IF array_length(p_word_ids, 1) IS NULL OR array_length(p_word_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one word';
  END IF;

  new_slug := public.generate_worksheet_slug();

  INSERT INTO public.interactive_worksheets (
    slug, teacher_uid, topic_name, word_ids, format, exercises, settings
  ) VALUES (
    new_slug,
    COALESCE(auth.uid()::text, NULL),
    p_topic_name,
    p_word_ids,
    p_format,
    jsonb_build_array(jsonb_build_object('type', p_format, 'word_ids', to_jsonb(p_word_ids))),
    COALESCE(p_settings, '{}'::jsonb)
  );

  RETURN new_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_interactive_worksheet(TEXT, BIGINT[], TEXT, JSONB) TO anon, authenticated;
