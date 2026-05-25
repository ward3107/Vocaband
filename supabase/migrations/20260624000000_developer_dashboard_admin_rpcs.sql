-- =============================================================================
-- 20260624000000_developer_dashboard_admin_rpcs.sql
--
-- Dated to sort AFTER its dependencies: ai_usage_counters (20260621000002),
-- schools (baseline schema + 20260623000000), and the admin-action audit
-- triggers (20260523000000).
--
-- Backs the admin-only Developer Dashboard (src/views/DeveloperDashboardView).
--
-- WHY this exists: teacher_allowlist + ai_allowlist have NO RLS policies, so
-- even an admin's authenticated session cannot read or mutate them from the
-- browser (only the service role bypasses RLS).  The dashboard therefore goes
-- through these SECURITY DEFINER RPCs, each of which fails closed unless the
-- caller is role='admin'.  Allowlist + role + plan mutations are already
-- audit-logged by the triggers in 20260523000000_audit_admin_actions.sql; the
-- plan-change RPC adds its own audit row since no trigger covers plan edits.
--
-- All functions:
--   * require an authenticated admin (42501 otherwise),
--   * pin search_path,
--   * are granted to `authenticated` only (anon is revoked at the bottom).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared guard — RAISEs unless the current session is an admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller_uid TEXT := auth.uid()::text;
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = caller_uid AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin privilege required' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Overview KPIs — one round-trip for the dashboard header strip.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dashboard_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
  v_cost_today BIGINT := 0;
  v_cost_7d    BIGINT := 0;
  v_cost_30d   BIGINT := 0;
  v_calls_30d  BIGINT := 0;
BEGIN
  PERFORM public.assert_admin();

  -- ai_usage_counters may not be deployed yet (its migration is independent).
  -- plpgsql plans this block lazily, so the guard keeps us from referencing a
  -- missing relation; absence simply yields zero spend.
  IF to_regclass('public.ai_usage_counters') IS NOT NULL THEN
    SELECT
      COALESCE(sum(cost_micro_usd) FILTER (WHERE day_bucket = current_date), 0),
      COALESCE(sum(cost_micro_usd) FILTER (WHERE day_bucket > current_date - 7), 0),
      COALESCE(sum(cost_micro_usd) FILTER (WHERE day_bucket > current_date - 30), 0),
      COALESCE(sum(count)          FILTER (WHERE day_bucket > current_date - 30), 0)
    INTO v_cost_today, v_cost_7d, v_cost_30d, v_calls_30d
    FROM public.ai_usage_counters;
  END IF;

  SELECT jsonb_build_object(
    'teachers',  (SELECT count(*) FROM public.users WHERE role = 'teacher'),
    'students',  (SELECT count(*) FROM public.users WHERE role = 'student'),
    'managers',  (SELECT count(*) FROM public.users WHERE role = 'manager'),
    'admins',    (SELECT count(*) FROM public.users WHERE role = 'admin'),
    'classes',   (SELECT count(*) FROM public.classes),
    'schools',   (SELECT count(*) FROM public.schools),
    'ai_cost_micro_today', v_cost_today,
    'ai_cost_micro_7d',    v_cost_7d,
    'ai_cost_micro_30d',   v_cost_30d,
    'ai_calls_30d',        v_calls_30d
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. AI usage breakdown — by day, by action, and the top spenders.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_ai_usage(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since DATE := current_date - v_days;
BEGIN
  PERFORM public.assert_admin();

  -- See admin_dashboard_overview: degrade to empty breakdowns when the
  -- ai_usage_counters table isn't deployed yet.
  IF to_regclass('public.ai_usage_counters') IS NULL THEN
    RETURN jsonb_build_object(
      'days', v_days,
      'by_day', '[]'::jsonb,
      'by_action', '[]'::jsonb,
      'top_teachers', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'days', v_days,
    'by_day', COALESCE((
      SELECT jsonb_agg(j ORDER BY j->>'day')
      FROM (
        SELECT jsonb_build_object(
          'day', day_bucket,
          'calls', sum(count),
          'cost_micro', sum(cost_micro_usd)
        ) AS j
        FROM public.ai_usage_counters
        WHERE day_bucket > v_since
        GROUP BY day_bucket
      ) d
    ), '[]'::jsonb),
    'by_action', COALESCE((
      SELECT jsonb_agg(j ORDER BY (j->>'cost_micro')::bigint DESC NULLS LAST)
      FROM (
        SELECT jsonb_build_object(
          'action', action,
          'calls', sum(count),
          'cost_micro', sum(cost_micro_usd)
        ) AS j
        FROM public.ai_usage_counters
        WHERE day_bucket > v_since
        GROUP BY action
      ) a
    ), '[]'::jsonb),
    'top_teachers', COALESCE((
      SELECT jsonb_agg(j ORDER BY (j->>'cost_micro')::bigint DESC NULLS LAST)
      FROM (
        SELECT jsonb_build_object(
          'teacher_uid', c.teacher_uid,
          'email', u.email,
          'calls', sum(c.count),
          'cost_micro', sum(c.cost_micro_usd)
        ) AS j
        FROM public.ai_usage_counters c
        LEFT JOIN public.users u ON u.uid = c.teacher_uid
        WHERE c.day_bucket > v_since
        GROUP BY c.teacher_uid, u.email
        ORDER BY sum(c.cost_micro_usd) DESC NULLS LAST
        LIMIT 25
      ) t
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Entitlements list — every teacher/manager/admin email with their plan,
--    AI-allowlist state, and school.  The ONLY read path for the allowlists.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_entitlements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  WITH emails AS (
    SELECT lower(email) AS email FROM public.teacher_allowlist WHERE email IS NOT NULL
    UNION
    SELECT lower(email) FROM public.users
    WHERE role IN ('teacher', 'manager', 'admin') AND email IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'email', e.email,
      'uid', u.uid,
      'role', u.role,
      'plan', u.plan,
      'trial_ends_at', u.trial_ends_at,
      'school_id', u.school_id,
      'school_name', s.name,
      'ai_enabled', (ai.email IS NOT NULL),
      'allowlisted', (ta.email IS NOT NULL),
      'signed_up', (u.uid IS NOT NULL)
    ) ORDER BY e.email
  ), '[]'::jsonb)
  INTO result
  FROM emails e
  LEFT JOIN public.users u ON lower(u.email) = e.email
  LEFT JOIN public.teacher_allowlist ta ON lower(ta.email) = e.email
  LEFT JOIN public.ai_allowlist ai ON lower(ai.email) = e.email
  LEFT JOIN public.schools s ON s.id = u.school_id;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Teacher allowlist add / remove.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_add_teacher(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
BEGIN
  PERFORM public.assert_admin();
  IF position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.teacher_allowlist (email)
  VALUES (v_email)
  ON CONFLICT (email) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_teacher(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM public.teacher_allowlist WHERE lower(email) = v_email;
  RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Per-teacher AI access — toggle the ai_allowlist membership.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_ai_access(p_email TEXT, p_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
BEGIN
  PERFORM public.assert_admin();
  IF position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023';
  END IF;

  IF p_enabled THEN
    INSERT INTO public.ai_allowlist (email) VALUES (v_email)
    ON CONFLICT (email) DO NOTHING;
  ELSE
    DELETE FROM public.ai_allowlist WHERE lower(email) = v_email;
  END IF;

  RETURN jsonb_build_object('success', true, 'email', v_email, 'ai_enabled', p_enabled);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Plan / trial setter.  No trigger audits plan edits, so we log here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_plan(
  p_uid TEXT,
  p_plan TEXT,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_old_plan TEXT;
BEGIN
  PERFORM public.assert_admin();
  IF p_plan NOT IN ('free', 'pro', 'school') THEN
    RAISE EXCEPTION 'plan must be free, pro, or school' USING ERRCODE = '22023';
  END IF;

  SELECT plan INTO v_old_plan FROM public.users WHERE uid = p_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % not found', p_uid USING ERRCODE = '23503';
  END IF;

  UPDATE public.users
  SET plan = p_plan,
      trial_ends_at = p_trial_ends_at
  WHERE uid = p_uid;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (
    auth.uid()::text,
    'plan_change',
    'users',
    p_uid,
    jsonb_build_object('old_plan', v_old_plan, 'new_plan', p_plan, 'trial_ends_at', p_trial_ends_at)
  );

  RETURN jsonb_build_object('success', true, 'uid', p_uid, 'plan', p_plan);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Schools — list, create, and assign a manager.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_schools()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'created_at', s.created_at,
      'teachers', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role IN ('teacher', 'manager')),
      'students', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'student'),
      'managers', (SELECT COALESCE(jsonb_agg(u.email), '[]'::jsonb) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'manager')
    ) ORDER BY s.name
  ), '[]'::jsonb)
  INTO result
  FROM public.schools s;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_school(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_name TEXT := trim(COALESCE(p_name, ''));
  v_id UUID;
BEGIN
  PERFORM public.assert_admin();
  IF char_length(v_name) = 0 THEN
    RAISE EXCEPTION 'school name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.schools (name) VALUES (v_name) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id, 'name', v_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_manager(p_email TEXT, p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_uid TEXT;
BEGIN
  PERFORM public.assert_admin();
  IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id) THEN
    RAISE EXCEPTION 'school % not found', p_school_id USING ERRCODE = '23503';
  END IF;

  SELECT uid INTO v_uid FROM public.users WHERE lower(email) = v_email LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'no signed-up user with email % — they must sign in once first', v_email
      USING ERRCODE = '23503';
  END IF;

  -- role-change here fires the audit trigger from 20260523000000.
  UPDATE public.users
  SET role = 'manager', school_id = p_school_id
  WHERE uid = v_uid;

  RETURN jsonb_build_object('success', true, 'uid', v_uid, 'school_id', p_school_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; the per-function assert_admin() does the
-- real gating.  anon never reaches these.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.assert_admin()                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_dashboard_overview()           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ai_usage(INTEGER)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_entitlements()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_teacher(TEXT)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remove_teacher(TEXT)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_ai_access(TEXT, BOOLEAN)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_plan(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_schools()                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_school(TEXT)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_assign_manager(TEXT, UUID)    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_overview()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage(INTEGER)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_entitlements()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_teacher(TEXT)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_teacher(TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_ai_access(TEXT, BOOLEAN)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_schools()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_school(TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_manager(TEXT, UUID)    TO authenticated;

COMMENT ON FUNCTION public.admin_dashboard_overview IS
  'Admin-only Developer Dashboard: KPI overview (user/class/school counts, AI cost rollups).';
COMMENT ON FUNCTION public.admin_list_entitlements IS
  'Admin-only: per-teacher plan + ai_allowlist + school state. Only read path for the RLS-less allowlists.';
