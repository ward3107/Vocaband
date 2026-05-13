-- ============================================
-- Interactive Worksheets
-- ============================================
-- Online-solvable counterpart to the printable Free Resources sheets.
-- A teacher picks a topic pack + a format from the Free Resources page,
-- gets a short URL (vocaband.com/w/<slug>) they can paste into WhatsApp,
-- and students open it on their phone and solve it in the browser.
--
-- Phase 1 MVP — no per-student persistence. Slug is the "anyone-with-link"
-- credential, like Google Drive sharing. Expires automatically after 30
-- days so abandoned links don't pile up forever.

CREATE TABLE IF NOT EXISTS public.interactive_worksheets (
  -- 8-char human-typeable slug used as both PK and the URL segment.
  -- Short enough to fit in a SMS preview, long enough to resist guessing.
  slug TEXT PRIMARY KEY,
  -- Nullable so the public Free Resources page can mint shares without a
  -- logged-in teacher. Authenticated routes can stamp this for ownership.
  teacher_uid TEXT,
  -- Display name shown on the solver landing card (e.g. "Animals").
  topic_name TEXT NOT NULL,
  -- Reference into ALL_WORDS by id. Frontend resolves names locally so we
  -- don't need a join — the words bundle is already on the client.
  word_ids INTEGER[] NOT NULL,
  -- Restricted to the four formats supported by the solver in Phase 1.
  format TEXT NOT NULL CHECK (format IN ('matching', 'quiz', 'fillblank', 'listening')),
  -- Settings the teacher picked at share time (worksheet language, casing,
  -- etc.). Frozen on the row so a settings change later doesn't break old
  -- links that students are mid-way through.
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Most reads will be "fetch by slug" — that's already the PK, so no
-- additional index needed there. This one supports the teacher's
-- "my shares" listing once Phase 2 adds it.
CREATE INDEX IF NOT EXISTS idx_interactive_worksheets_teacher
  ON public.interactive_worksheets(teacher_uid, created_at DESC)
  WHERE teacher_uid IS NOT NULL;

ALTER TABLE public.interactive_worksheets ENABLE ROW LEVEL SECURITY;

-- Anyone with the slug can SELECT (including anonymous students). The slug
-- is the credential; without it you can't read a row.
CREATE POLICY "Anyone can read interactive worksheets"
ON public.interactive_worksheets FOR SELECT
USING (expires_at > NOW());

-- INSERTs are open. The Free Resources page is publicly accessible and we
-- want teachers to be able to share without first signing up. Rate
-- limiting is enforced by the slug-generator function (max 10 collision
-- retries) rather than RLS.
CREATE POLICY "Anyone can create interactive worksheets"
ON public.interactive_worksheets FOR INSERT
WITH CHECK (true);

-- Only the row's owner (if any) can mutate it. Anonymous shares can never
-- be edited or deleted — they just expire.
CREATE POLICY "Owners can update own worksheets"
ON public.interactive_worksheets FOR UPDATE
USING (teacher_uid IS NOT NULL AND auth.uid()::text = teacher_uid)
WITH CHECK (teacher_uid IS NOT NULL AND auth.uid()::text = teacher_uid);

CREATE POLICY "Owners can delete own worksheets"
ON public.interactive_worksheets FOR DELETE
USING (teacher_uid IS NOT NULL AND auth.uid()::text = teacher_uid);

CREATE POLICY "Service role full access on interactive worksheets"
ON public.interactive_worksheets FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Slug generation
-- ============================================
-- 8 characters from a 32-symbol alphabet → ~10^12 keyspace. Crockford-ish
-- (no 0/O/1/I/L) so a teacher reading a slug out loud doesn't get tripped
-- up. SECURITY DEFINER so the function can read existing slugs during
-- collision check even when the caller is anonymous.
CREATE OR REPLACE FUNCTION public.generate_worksheet_slug()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  slug TEXT;
  attempts INTEGER := 0;
BEGIN
  WHILE attempts < 10 LOOP
    slug := '';
    FOR i IN 1..8 LOOP
      slug := slug || SUBSTRING(chars FROM (floor(random() * length(chars)) + 1)::INTEGER FOR 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.interactive_worksheets WHERE interactive_worksheets.slug = slug) THEN
      RETURN slug;
    END IF;
    attempts := attempts + 1;
  END LOOP;
  RAISE EXCEPTION 'Failed to generate unique worksheet slug after 10 attempts';
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_worksheet_slug() TO anon, authenticated;

-- ============================================
-- Single-shot create RPC
-- ============================================
-- Wraps slug generation + insert so the client only makes one call.
-- Returns the generated slug so the UI can immediately build the share URL.
CREATE OR REPLACE FUNCTION public.create_interactive_worksheet(
  p_topic_name TEXT,
  p_word_ids INTEGER[],
  p_format TEXT,
  p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_slug TEXT;
BEGIN
  IF p_format NOT IN ('matching', 'quiz', 'fillblank', 'listening') THEN
    RAISE EXCEPTION 'Unsupported worksheet format: %', p_format;
  END IF;
  IF array_length(p_word_ids, 1) IS NULL OR array_length(p_word_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one word';
  END IF;

  new_slug := public.generate_worksheet_slug();

  INSERT INTO public.interactive_worksheets (
    slug, teacher_uid, topic_name, word_ids, format, settings
  ) VALUES (
    new_slug,
    -- auth.uid() returns NULL for anonymous callers, which the column allows.
    COALESCE(auth.uid()::text, NULL),
    p_topic_name,
    p_word_ids,
    p_format,
    COALESCE(p_settings, '{}'::jsonb)
  );

  RETURN new_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_interactive_worksheet(TEXT, INTEGER[], TEXT, JSONB) TO anon, authenticated;
