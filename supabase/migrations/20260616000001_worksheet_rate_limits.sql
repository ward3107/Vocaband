-- ============================================
-- Worksheet hardening 2 — rate limit ledgers
-- ============================================
-- Caps abuse on the two open-write paths a stranger can hit without
-- ever logging in: creating worksheets and submitting attempts.
--
-- Pattern: one tiny ledger table per action, written from inside the
-- SECURITY DEFINER RPC, with inline garbage-collection at every call.
-- Same shape as class_lookup_rate (see 20260428_security_medium_risk
-- _fixes.sql) so the maintenance story is identical.
--
-- Thresholds:
--   * Mint: 30 per hour per (auth.uid() ∨ minter_fingerprint).
--     A teacher in a planning session opens ~5–10 shares; 30/hour
--     is well above legit use and well below a bot trying to fill
--     the table.
--   * Submit per (slug, fingerprint): 20 per hour. Stops a kid who
--     mashes "Try again" 50 times. Real "retry to improve" flows
--     never need more than a couple per hour.
--   * Submit per slug: 200 per hour. A classroom of 30 students can
--     all finish in 5 minutes without tripping this; a bot can't
--     mass-stuff fake students.

CREATE TABLE IF NOT EXISTS public.worksheet_mint_rate (
  -- Either auth.uid() (for signed-in teachers) or the minter
  -- fingerprint from localStorage (for anonymous Free-Resources mints).
  -- Stored as a single TEXT so the function doesn't branch on which
  -- one identified the caller.
  actor_key TEXT NOT NULL,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worksheet_mint_rate_actor_time
  ON public.worksheet_mint_rate (actor_key, called_at DESC);

ALTER TABLE public.worksheet_mint_rate ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER RPC writes here.

CREATE TABLE IF NOT EXISTS public.worksheet_submit_rate (
  slug        TEXT NOT NULL,
  -- NULL when the browser blocks localStorage (private mode). The
  -- per-fingerprint limit doesn't apply in that case (we can't tell
  -- two anonymous callers apart), only the per-slug cap does.
  fingerprint TEXT,
  called_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worksheet_submit_rate_slug_time
  ON public.worksheet_submit_rate (slug, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_worksheet_submit_rate_fp_time
  ON public.worksheet_submit_rate (slug, fingerprint, called_at DESC)
  WHERE fingerprint IS NOT NULL;

ALTER TABLE public.worksheet_submit_rate ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER RPC writes here.

-- ── Mint RPC with rate limit ───────────────────────────────────────────
-- Re-creates create_interactive_worksheet_v2 (added in
-- 20260611000000_worksheet_parent_slug.sql) with two changes:
--   * Accepts an optional p_minter_fingerprint so anonymous shares can
--     be rate-limited per-browser (without it, an anonymous attacker
--     would have no actor_key and we'd have to cap globally).
--   * Adds the 30/hour cap before doing any work.
-- The minter_fingerprint is NOT stored on the row yet — that lands in
-- migration 20260616000002 which adds the column for the revoke flow.

DROP FUNCTION IF EXISTS public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB, TEXT);
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
  all_word_ids      INTEGER[];
  bad_count         INT;
  parent_owner      TEXT;
  v_actor_key       TEXT;
  recent_mints      INT;
  MINTS_PER_HOUR    CONSTANT INT := 30;
BEGIN
  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' OR jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one exercise';
  END IF;

  -- Rate-limit key: prefer the authenticated uid (stable, can't be
  -- rotated without a new account); fall back to the minter
  -- fingerprint (still rotatable, but at least costs the attacker a
  -- clean browser profile per 30 worksheets).
  v_actor_key := COALESCE(NULLIF(auth.uid()::text, ''), NULLIF(p_minter_fingerprint, ''));

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

  -- Parent ownership check — unchanged from 20260611000000.
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

GRANT EXECUTE ON FUNCTION public.create_interactive_worksheet_v2(TEXT, JSONB, JSONB, TEXT, TEXT)
  TO anon, authenticated;

COMMENT ON FUNCTION public.create_interactive_worksheet_v2 IS
  'Mints an interactive worksheet. Rate-limited at 30/hour per (auth.uid() ∨ minter_fingerprint).';

-- ── Submit RPC with rate limit ─────────────────────────────────────────
-- Same body as 20260616000000 (name validation), now with the
-- per-slug and per-(slug, fingerprint) caps wired in front of the
-- write. DROP + recreate so the validation+rate-limit pair land as
-- one atomic function.

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

  v_name := regexp_replace(p_student_name, '[ -]', '', 'g');
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

  -- Inline garbage-collect first so the table doesn't grow unboundedly
  -- under steady traffic. 2-hour retention is double the longest
  -- window we read, which leaves margin for clock skew.
  DELETE FROM public.worksheet_submit_rate
  WHERE called_at < NOW() - INTERVAL '2 hours';

  -- Per-slug cap is always checked. Real classrooms fit comfortably
  -- under 200/hour; bot stuffing does not.
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
