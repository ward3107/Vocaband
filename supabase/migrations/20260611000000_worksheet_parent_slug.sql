-- ============================================
-- Practice worksheets — parent → child linking
-- ============================================
-- A practice worksheet is a follow-up to the original a student already
-- solved, seeded with the words they got wrong. Today the retry shows
-- up on the teacher dashboard as an unrelated card. This migration adds
-- a parent_slug self-reference so the teacher sees one entry per
-- original worksheet with the practice rounds nested under each
-- student's first attempt, and so the student can see their own
-- improvement on the practice's results screen.
--
-- ON DELETE SET NULL: deleting a parent doesn't cascade-delete the
-- children — the child's own attempts stay accessible via its slug.
-- The dashboard just stops grouping them.

ALTER TABLE public.interactive_worksheets
  ADD COLUMN IF NOT EXISTS parent_slug TEXT
  REFERENCES public.interactive_worksheets(slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interactive_worksheets_parent
  ON public.interactive_worksheets(parent_slug)
  WHERE parent_slug IS NOT NULL;

-- ---- v2 mint RPC, with parent linking --------------------------------
-- Same shape as before, plus an optional p_parent_slug. The RPC enforces
-- two invariants the client can't be trusted with:
--   1. Only the owner of the parent may mint a child. RLS would already
--      block the read on a foreign parent, but doing the check inside
--      the SECURITY DEFINER function gives a clear error message instead
--      of a silent insert with NULL parent.
--   2. Anonymous mints (no auth.uid()) cannot have a parent — without
--      ownership we'd be letting any caller link to any teacher's
--      worksheet, which would let strangers pollute the dashboard.

DROP FUNCTION IF EXISTS public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB);
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
  all_word_ids  INTEGER[];
  bad_count     INT;
  parent_owner  TEXT;
BEGIN
  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' OR jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one exercise';
  END IF;

  -- Parent ownership check — see header comment for the invariants.
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

  SELECT array_agg(DISTINCT (id_text)::INTEGER)
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

-- ---- Parent-attempt lookup for the student-side history -------------
-- An anonymous student finishing a practice worksheet can't read the
-- worksheet_attempts table directly (RLS only lets the teacher see
-- attempts). This helper takes a slug + the caller's localStorage
-- fingerprint and returns just the score / total they got on that
-- slug — enough to render a "first attempt → now" comparison on the
-- results card and nothing more. The fingerprint is treated as a
-- per-browser secret: without the value stored in the student's own
-- localStorage you can't read anyone's score.

CREATE OR REPLACE FUNCTION public.get_my_attempt_for_slug(
  p_slug        TEXT,
  p_fingerprint TEXT
)
RETURNS TABLE (
  topic_name TEXT,
  score      INT,
  total      INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_fingerprint IS NULL OR length(p_fingerprint) = 0 THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT w.topic_name, a.score, a.total
    FROM   public.worksheet_attempts a
    JOIN   public.interactive_worksheets w ON w.slug = a.slug
    WHERE  a.slug = p_slug
      AND  a.fingerprint = p_fingerprint
      AND  a.completed_at IS NOT NULL
    ORDER BY a.completed_at DESC
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_attempt_for_slug(TEXT, TEXT) TO anon, authenticated;
