-- =============================================================================
-- Generic AI result cache — for pure, deterministic AI generators
-- =============================================================================
-- Some AI endpoints are pure functions of their input: the same request
-- always SHOULD produce the same payload, so re-paying the model (and making
-- the teacher re-wait several seconds) on an identical request is pure waste.
--
-- This table backs the server-side aiCacheGet / aiCacheSet helpers, which
-- currently cover:
--   - ai_process_text     (/api/ai-process-text, Gemini, temp 0.2)
--   - ai_generate_lesson  (/api/ai-generate-lesson, Gemini, multi-call)
--
-- Each feature namespaces its own keys via the `feature` column, so one
-- table serves them all without collisions. The bagrut/sentence/translation
-- caches keep their dedicated tables (different shapes + RPCs).
--
-- NOT cached here (by design): the library sentence/distractor generators —
-- they persist candidates to the DB and exist to give teachers FRESH variety
-- on each "Regenerate", so a cache hit would defeat the feature.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_cache (
  -- (feature, cache_key) is the composite identity. cache_key is a SHA-256
  -- hex digest of the canonical request inputs, computed server-side.
  feature     TEXT NOT NULL CHECK (char_length(feature) BETWEEN 1 AND 60),
  cache_key   TEXT NOT NULL CHECK (char_length(cache_key) BETWEEN 1 AND 128),
  -- The full response payload to replay on a hit.
  content     JSONB NOT NULL,
  -- Hit counter — bumped via touch_ai_cache on read; informs future eviction.
  hits        INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Default 30-day TTL keeps the table bounded and lets prompt/model
  -- improvements roll in. Server overrides expires_at on upsert.
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  PRIMARY KEY (feature, cache_key)
);

-- Expiry sweeps (cleanup_expired_data or a future cron) scan by expires_at.
CREATE INDEX IF NOT EXISTS idx_ai_cache_expiry ON public.ai_cache (expires_at);

-- ---------------------------------------------------------------------------
-- RLS — server-side only. No policies = no client access at all (same
-- posture as ai_allowlist / sentence_cache). The server reads + writes with
-- the service-role key, which bypasses RLS; clients can neither read cached
-- content nor poison it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Bump-on-read RPC — counts cache hits without a full-row rewrite on read.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_ai_cache(p_feature TEXT, p_cache_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role only — clients should never call this directly.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'touch_ai_cache is service-role only';
  END IF;

  UPDATE public.ai_cache
    SET hits = hits + 1
    WHERE feature = p_feature AND cache_key = p_cache_key;
END;
$$;

-- Note: no GRANT to authenticated — service role only.
