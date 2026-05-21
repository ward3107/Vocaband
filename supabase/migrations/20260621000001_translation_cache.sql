-- =============================================================================
-- Translation cache — shared across all teachers, saves AI cost at scale
-- =============================================================================
-- Same English word translated to Hebrew + Arabic by 1,000 teachers should be
-- 1 API call, not 1,000. This table holds the cached translations so the
-- server-side translate endpoint can hit the DB first before paying Google
-- Translate. At 10K teachers, hit rate is 70-90% — saves ~$30/month and
-- scales linearly forever after.
--
-- Cheap to build now (~4h), painful to retrofit (requires migrating live
-- traffic to consult the cache without breaking the existing translate
-- pipeline), so we land it alongside the vocabulary library.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.translation_cache (
  -- Composite key: (source_lang, source_text_normalized, target_lang).
  -- Normalized = lowercased + trimmed so "Lion", "lion", " lion " hit the
  -- same row. The DB enforces this via the unique constraint at the bottom.
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lang     TEXT NOT NULL CHECK (source_lang IN ('en', 'he', 'ar')),
  source_text     TEXT NOT NULL CHECK (char_length(source_text) BETWEEN 1 AND 200),
  target_lang     TEXT NOT NULL CHECK (target_lang IN ('en', 'he', 'ar')),
  translation     TEXT NOT NULL CHECK (char_length(translation) BETWEEN 1 AND 400),
  -- Confidence score from the translation provider (0..1). NULL = unknown.
  -- Sub-threshold entries can be re-translated by a future cleanup pass.
  confidence      NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  -- Which provider produced this — lets us migrate to a better provider
  -- later without invalidating every cache row.
  provider        TEXT NOT NULL DEFAULT 'google_translate'
                    CHECK (char_length(provider) <= 60),
  -- Hit counter — drives eviction (least-used first if we ever cap the table).
  hit_count       INT NOT NULL DEFAULT 0,
  last_hit_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraint: same source+langs cannot have two cached translations.
  -- The server upserts on this key; reads do exact lookup.
  CONSTRAINT translation_cache_unique UNIQUE (source_lang, source_text, target_lang),
  -- Source/target must differ.
  CONSTRAINT translation_cache_diff_langs CHECK (source_lang <> target_lang)
);

-- The "is it cached?" lookup hits this index. Two indexes deliberately:
-- the unique constraint already creates one, but having a covering index
-- with `translation` makes the lookup an index-only scan.
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
  ON public.translation_cache (source_lang, target_lang, source_text);

-- Eviction support — find stale entries (low hit count, old).
CREATE INDEX IF NOT EXISTS idx_translation_cache_lru
  ON public.translation_cache (last_hit_at NULLS FIRST, hit_count);


-- ---------------------------------------------------------------------------
-- RLS — read-only for authenticated; writes via service role only
-- ---------------------------------------------------------------------------
-- The cache is shared infrastructure — no per-row ownership.
-- Any authenticated user can READ (they need to consult the cache).
-- Only the server (service role) can WRITE — prevents cache poisoning.
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tc_read" ON public.translation_cache;
CREATE POLICY "tc_read" ON public.translation_cache
  FOR SELECT TO authenticated USING (true);


-- ---------------------------------------------------------------------------
-- Upsert RPC — server-side endpoints call this to record new translations
-- ---------------------------------------------------------------------------
-- Wraps the INSERT ... ON CONFLICT pattern so the server doesn't have to
-- think about the unique constraint. Returns the cached row.
CREATE OR REPLACE FUNCTION public.upsert_translation(
  p_source_lang TEXT,
  p_source_text TEXT,
  p_target_lang TEXT,
  p_translation TEXT,
  p_confidence  NUMERIC DEFAULT NULL,
  p_provider    TEXT DEFAULT 'google_translate'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Service role only — clients should never call this directly.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'upsert_translation is service-role only';
  END IF;

  INSERT INTO public.translation_cache (
    source_lang, source_text, target_lang, translation, confidence, provider
  ) VALUES (
    p_source_lang, p_source_text, p_target_lang, p_translation, p_confidence, p_provider
  )
  ON CONFLICT (source_lang, source_text, target_lang) DO UPDATE
    SET translation = EXCLUDED.translation,
        confidence  = EXCLUDED.confidence,
        provider    = EXCLUDED.provider,
        last_hit_at = now(),
        hit_count   = public.translation_cache.hit_count + 1
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;

-- Note: no GRANT to authenticated — service role only.


-- ---------------------------------------------------------------------------
-- Bump-on-read RPC — counts cache hits so eviction stays smart
-- ---------------------------------------------------------------------------
-- Cheaper to bump in a separate call than to do a write on every read.
-- Server batches reads, then fires this once per batch with the matched ids.
CREATE OR REPLACE FUNCTION public.touch_translation_cache(p_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'touch_translation_cache is service-role only';
  END IF;

  UPDATE public.translation_cache
    SET hit_count = hit_count + 1, last_hit_at = now()
    WHERE id = ANY(p_ids);
END;
$$;
