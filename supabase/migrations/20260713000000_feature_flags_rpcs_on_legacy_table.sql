-- =============================================================================
-- 20260713000000_feature_flags_rpcs_on_legacy_table.sql
--
-- Reconcile the two feature_flags designs onto the ONE table that is live in
-- production.
--
-- BACKGROUND:
--   * 20260514_feature_flags.sql created public.feature_flags keyed on `name`
--     (with enabled_for_classes[] for targeted rollouts). THIS is the table
--     that exists in prod, and src/hooks/useFeatureFlag.ts reads it by `name`.
--   * 20260627000000_feature_flags.sql tried to introduce a SECOND, different
--     design keyed on `key` plus admin RPCs (admin_list_flags / _upsert_flag /
--     _delete_flag). It never reached the live database — CREATE TABLE
--     IF NOT EXISTS no-op'd against the existing table, so its `key`-based
--     statements 404'd / errored.
--   * The Developer dashboard (DevFeatureFlagsPanel.tsx) calls those RPCs.
--     Result: the Feature-flags tab is broken because the RPCs don't exist.
--
-- DECISION (operator-approved): keep the live `name` table, and redefine the
-- three admin RPCs to operate on it — mapping the RPC's `key` parameter to the
-- table's `name` column. No table is dropped or renamed; the existing read
-- path (useFeatureFlag) and targeted-rollout column (enabled_for_classes) are
-- untouched.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION. Safe to
-- re-run. Depends on public.assert_admin() (20260624000000) and
-- public.audit_log (010_privacy_compliance.sql).
-- =============================================================================

BEGIN;

-- The dashboard surfaces "updated by <email>"; the legacy table never tracked
-- an author. Add it nullably so existing rows are fine.
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Authenticated clients read flags directly via the useFeatureFlag hook.
-- (The legacy world-read RLS policy already permits SELECT; this just makes
-- the table-level grant explicit and harmless if already present.)
GRANT SELECT ON public.feature_flags TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- admin_list_flags() — read all flags for the dashboard, newest author email
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
      'key', f.name,                 -- dashboard speaks `key`; table stores `name`
      'enabled', f.enabled,
      'description', f.description,
      'updated_at', f.updated_at,
      'updated_by', f.updated_by,
      'updated_by_email', u.email
    ) ORDER BY f.name
  ), '[]'::jsonb)
  INTO result
  FROM public.feature_flags f
  LEFT JOIN public.users u ON u.uid = f.updated_by;
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_upsert_flag(p_key, p_enabled, p_description) — create or toggle a flag
-- ---------------------------------------------------------------------------
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
  v_key  TEXT := lower(trim(COALESCE(p_key, '')));
  v_desc TEXT := COALESCE(trim(p_description), '');
BEGIN
  PERFORM public.assert_admin();
  IF char_length(v_key) = 0 THEN
    RAISE EXCEPTION 'flag key is required' USING ERRCODE = '22023';
  END IF;
  -- Mirror the legacy table's name CHECK so the admin gets a clear message
  -- instead of a raw constraint-violation error.
  IF v_key !~ '^[a-z][a-z0-9_]{1,63}$' THEN
    RAISE EXCEPTION 'flag key must be snake_case (a-z, 0-9, underscore), 2-64 chars'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.feature_flags (name, enabled, description, updated_at, updated_by)
  VALUES (v_key, p_enabled, v_desc, now(), caller)
  ON CONFLICT (name) DO UPDATE
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

-- ---------------------------------------------------------------------------
-- admin_delete_flag(p_key) — remove a flag
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_flag(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_key  TEXT := lower(trim(COALESCE(p_key, '')));
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM public.feature_flags WHERE name = v_key;
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'feature_flag_delete', 'feature_flags', jsonb_build_object('key', v_key));
  RETURN jsonb_build_object('success', true, 'key', v_key);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — writes are admin-only via these SECURITY DEFINER RPCs.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_flags()                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_flag(TEXT, BOOLEAN, TEXT)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_flag(TEXT)                  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_flags()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_flag(TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_flag(TEXT)               TO authenticated;

COMMIT;
