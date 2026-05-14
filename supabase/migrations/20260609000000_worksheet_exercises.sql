-- ============================================
-- Mixed-type interactive worksheets
-- ============================================
-- Phase-1 worksheets had a single `format` column — a worksheet was one
-- exercise type.  Phase-2 turns each worksheet into an ordered list of
-- exercises so a teacher can stack Matching + Quiz + Listening behind a
-- single share link and students walk through them in one session.
--
-- The list lives in a new `exercises` JSONB column.  Each element looks
-- like { "type": "<exercise_type>", "word_ids": [..], ...config }, where
-- config is type-specific (e.g. translation typing carries a
-- "direction": "en_to_he" field).  Per-exercise word_ids let teachers
-- run heavy exercises (cloze, sentence building) on a subset of the
-- worksheet's word pool while keeping lighter ones (matching, quiz) on
-- the full set.
--
-- The legacy `format` column stays on the row, populated by the v2 RPC
-- with `exercises[0].type`, so the existing WorksheetAttemptsView list
-- keeps rendering a "main format" label without code changes.  Old
-- shared links auto-migrate to single-item `exercises` arrays so no
-- previously-distributed URL breaks.

-- ---- Add the new column + backfill from the legacy shape -------------
ALTER TABLE public.interactive_worksheets
  ADD COLUMN IF NOT EXISTS exercises JSONB;

UPDATE public.interactive_worksheets
SET exercises = jsonb_build_array(
  jsonb_build_object(
    'type', format,
    'word_ids', to_jsonb(word_ids)
  )
)
WHERE exercises IS NULL;

ALTER TABLE public.interactive_worksheets
  ALTER COLUMN exercises SET NOT NULL,
  ALTER COLUMN exercises SET DEFAULT '[]'::jsonb;

-- The legacy CHECK constraint accepted only the 4 phase-1 formats.  We
-- now support 12 exercise types and the source of truth has moved to
-- `exercises`, so drop the constraint.  `format` stays as a derived
-- label for back-compat with views that haven't been ported yet.
ALTER TABLE public.interactive_worksheets
  DROP CONSTRAINT IF EXISTS interactive_worksheets_format_check;

-- ---- v2 mint RPC -----------------------------------------------------
-- Takes the full exercises array.  Validates each element has the two
-- required fields, derives the legacy `format` from element 0, and
-- aggregates every referenced word_id into `word_ids` so analytics
-- queries that count "words in worksheet" keep working.
DROP FUNCTION IF EXISTS public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.create_interactive_worksheet_v2(
  p_topic_name TEXT,
  p_exercises  JSONB,
  p_settings   JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_slug      TEXT;
  first_type    TEXT;
  all_word_ids  INTEGER[];
  bad_count     INT;
BEGIN
  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' OR jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one exercise';
  END IF;

  -- Reject malformed elements early — the solver assumes type + word_ids
  -- on every entry and will crash on a missing field, not skip gracefully.
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

  -- Aggregate every word_id referenced anywhere in the plan.  Used as a
  -- denormalised "all words touched" field on the row so quick lookups
  -- (e.g. "does this worksheet teach <word>?") don't need to JSONB-walk.
  SELECT array_agg(DISTINCT (id_text)::INTEGER)
  INTO   all_word_ids
  FROM   jsonb_array_elements(p_exercises) AS ex,
         jsonb_array_elements_text(ex->'word_ids') AS id_text;

  new_slug := public.generate_worksheet_slug();

  INSERT INTO public.interactive_worksheets (
    slug, teacher_uid, topic_name, word_ids, format, exercises, settings
  ) VALUES (
    new_slug,
    COALESCE(auth.uid()::text, NULL),
    p_topic_name,
    all_word_ids,
    first_type,
    p_exercises,
    COALESCE(p_settings, '{}'::jsonb)
  );

  RETURN new_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB) TO anon, authenticated;

-- ---- Keep the legacy RPC populating the new column -------------------
-- Until every caller is moved to v2, the legacy RPC needs to write the
-- single-item exercises array as well, otherwise rows minted during the
-- transition would have format set but exercises = '[]' and the runner
-- would render an empty worksheet.
CREATE OR REPLACE FUNCTION public.create_interactive_worksheet(
  p_topic_name TEXT,
  p_word_ids   INTEGER[],
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

GRANT EXECUTE ON FUNCTION public.create_interactive_worksheet(TEXT, INTEGER[], TEXT, JSONB) TO anon, authenticated;
