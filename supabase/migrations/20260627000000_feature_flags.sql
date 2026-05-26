-- =============================================================================
-- 20260627000000_feature_flags.sql
--
-- Generic admin-managed feature-flag table for kill-switches and gradual
-- rollouts. Distinct from /api/features in server.ts, which is hand-coded
-- per-feature based on plan eligibility + provider keys (e.g. aiSentences
-- depends on ANTHROPIC_API_KEY + ai_allowlist). This table is the canonical
-- store for "turn this feature off across the app" admin kill-switches.
--
-- Read posture:
--   * All authenticated users can SELECT — the useFeatureFlag hook needs to
--     read the current state to gate UI without a round-trip per check.
--   * Flag keys are intentionally public (like a Stripe publishable key) —
--     don't name flags after sensitive internals.
--
-- Write posture:
--   * All writes through admin RPCs (SECURITY DEFINER + assert_admin).
--   * Every change writes an audit_log row.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         TEXT PRIMARY KEY CHECK (char_length(key) > 0 AND char_length(key) <= 64),
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_select" ON public.feature_flags;
CREATE POLICY "feature_flags_select" ON public.feature_flags
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- No INSERT / UPDATE / DELETE policy — writes blocked at RLS for everyone,
-- including admins. Mutations go through the SECURITY DEFINER RPCs below.

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_flags()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.assert_admin();
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'key', f.key,
      'enabled', f.enabled,
      'description', f.description,
      'updated_at', f.updated_at,
      'updated_by', f.updated_by,
      'updated_by_email', u.email
    ) ORDER BY f.key
  ), '[]'::jsonb)
  INTO result
  FROM public.feature_flags f
  LEFT JOIN public.users u ON u.uid = f.updated_by;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_flag(
  p_key         TEXT,
  p_enabled     BOOLEAN,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_key  TEXT := trim(COALESCE(p_key, ''));
  v_desc TEXT := COALESCE(trim(p_description), '');
BEGIN
  PERFORM public.assert_admin();
  IF char_length(v_key) = 0 THEN
    RAISE EXCEPTION 'flag key is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.feature_flags (key, enabled, description, updated_at, updated_by)
  VALUES (v_key, p_enabled, v_desc, now(), caller)
  ON CONFLICT (key) DO UPDATE
    SET enabled     = EXCLUDED.enabled,
        description = CASE
          WHEN char_length(EXCLUDED.description) > 0 THEN EXCLUDED.description
          ELSE public.feature_flags.description
        END,
        updated_at  = now(),
        updated_by  = caller;

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'feature_flag_set', 'feature_flags',
          jsonb_build_object('key', v_key, 'enabled', p_enabled));

  RETURN jsonb_build_object('success', true, 'key', v_key, 'enabled', p_enabled);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_flag(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE caller TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM public.feature_flags WHERE key = p_key;
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'feature_flag_delete', 'feature_flags', jsonb_build_object('key', p_key));
  RETURN jsonb_build_object('success', true, 'key', p_key);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_list_flags()                          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_flag(TEXT, BOOLEAN, TEXT)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_flag(TEXT)                     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_flags()                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_flag(TEXT, BOOLEAN, TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_flag(TEXT)                  TO authenticated;

-- Authenticated users can SELECT the table directly for the client hook.
GRANT SELECT ON public.feature_flags TO authenticated;

COMMENT ON TABLE public.feature_flags IS
  'Admin-managed kill-switch / rollout flags. Read-by-all-authenticated, written via admin RPCs only.';
