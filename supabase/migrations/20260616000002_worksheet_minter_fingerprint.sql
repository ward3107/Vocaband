-- ============================================
-- Worksheet hardening 3 — anonymous-share revocation
-- ============================================
-- Closes the "I shared a link without logging in and now I can't take
-- it back" gap. Adds an opaque per-device handle stored on the row at
-- mint time, plus an RPC that lets the same device revoke (delete) it.
--
-- Threat model:
--   * Anonymous shares (teacher_uid IS NULL) previously had no owner
--     anywhere — once minted, the only way out was the 30-day expiry.
--   * Browser fingerprint is the same localStorage UUID used for
--     student-side attempt dedup. It's NOT cross-device — if a teacher
--     mints on her laptop and tries to revoke from her phone, no go.
--     That's an accepted limitation; cross-device revocation requires
--     a real account, which is exactly what teacher_uid already gives.
--   * Fingerprint is treated as a per-device secret. Without the
--     localStorage value, the revoke RPC returns "not found", same as
--     an unknown slug. So a stranger who learns a slug can't delete
--     it.
--
-- Authenticated teachers ignore the fingerprint entirely: ownership
-- via teacher_uid is the stronger claim, and the existing RLS
-- "Owners can delete own worksheets" policy still applies.

ALTER TABLE public.interactive_worksheets
  ADD COLUMN IF NOT EXISTS minter_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_interactive_worksheets_minter_fp
  ON public.interactive_worksheets (minter_fingerprint, created_at DESC)
  WHERE minter_fingerprint IS NOT NULL;

COMMENT ON COLUMN public.interactive_worksheets.minter_fingerprint IS
  'Opaque per-device handle (localStorage UUID) used so an anonymous mint can be revoked from the same browser. Never returned by SELECT — only consumed by revoke_my_worksheet().';

-- ── Mint RPC now stores the fingerprint ────────────────────────────────
-- Same body as 20260616000001 plus the fingerprint write at the end.
-- Rate-limit and validation logic is preserved verbatim.

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

  SELECT array_agg(DISTINCT (id_text)::INTEGER)
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
  'Mints an interactive worksheet. Rate-limited at 30/hour. Stores minter_fingerprint so the same browser can revoke later.';

-- ── revoke_my_worksheet ────────────────────────────────────────────────
-- Deletes a worksheet that this browser minted (or that the
-- authenticated caller owns). Two acceptance paths:
--   1. auth.uid() matches the stored teacher_uid (logged-in teacher);
--   2. p_fingerprint matches the stored minter_fingerprint AND the
--      row has no teacher_uid (i.e. it was an anonymous mint, so the
--      fingerprint is the ONLY claim of ownership).
-- Anything else returns FALSE — including a fingerprint that doesn't
-- match a row with NULL teacher_uid (so a stranger who learns the
-- slug can't delete a logged-in teacher's worksheet by guessing).

CREATE OR REPLACE FUNCTION public.revoke_my_worksheet(
  p_slug        TEXT,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_fp  TEXT := NULLIF(p_fingerprint, '');
  v_deleted INT;
BEGIN
  IF p_slug IS NULL OR length(p_slug) = 0 THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.interactive_worksheets
  WHERE slug = p_slug
    AND (
      -- Logged-in owner path.
      (v_uid IS NOT NULL AND teacher_uid IS NOT NULL AND teacher_uid = v_uid)
      OR
      -- Anonymous browser-owner path. Strict NULL teacher check: we
      -- never let fingerprint override a real account claim.
      (v_fp IS NOT NULL
        AND teacher_uid IS NULL
        AND minter_fingerprint = v_fp)
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_my_worksheet(TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.revoke_my_worksheet IS
  'Deletes a worksheet the caller can prove they own (auth.uid() = teacher_uid OR fingerprint = minter_fingerprint on an anonymous mint). Returns TRUE on delete, FALSE otherwise.';
