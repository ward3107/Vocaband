-- =============================================================================
-- 20260629000001_dashboard_analytics_rpcs.sql
--
-- Five admin-only additions for the developer dashboard:
--
--   1. admin_onboarding_funnel  — signup → first class → first assignment →
--                                 first student joined (per-day cohort)
--   2. admin_top_modes          — most-played game modes + most-used
--                                 assignment titles in a window
--   3. admin_active_users       — directional DAU/WAU/MAU split by role,
--                                 derived from progress.completed_at (student
--                                 activity) and audit_log (teacher activity).
--                                 No new schema — approximation noted in panel.
--   4. admin_db_health          — table sizes, slow-query top-N, RLS hygiene
--   5. admin_recent_exports     — recent admin_export_user actions for the
--                                 Security Ops panel's "any unusual export
--                                 volume?" check
--
-- Plus a defensive update to admin_export_user_data: raise on >20 exports per
-- caller per 24h. The threshold catches "compromised admin scraping every
-- user" patterns without bothering legitimate operators who export 1–2 a day.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Onboarding funnel — same shape as the Trial Funnel: counts + rate.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_onboarding_funnel(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result          JSONB;
  v_days          INT         := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since         TIMESTAMPTZ := now() - (v_days::text || ' days')::interval;
  v_signed_up     INT;
  v_made_class    INT;
  v_made_assign   INT;
  v_got_student   INT;
BEGIN
  PERFORM public.assert_admin();

  -- Cohort: teachers whose first_seen_at falls in the window.
  SELECT count(*) INTO v_signed_up
  FROM public.users
  WHERE role = 'teacher' AND first_seen_at >= v_since;

  SELECT count(DISTINCT u.uid) INTO v_made_class
  FROM public.users u
  JOIN public.classes c ON c.teacher_uid = u.uid
  WHERE u.role = 'teacher' AND u.first_seen_at >= v_since;

  SELECT count(DISTINCT u.uid) INTO v_made_assign
  FROM public.users u
  JOIN public.classes c ON c.teacher_uid = u.uid
  JOIN public.assignments a ON a.class_id = c.id
  WHERE u.role = 'teacher' AND u.first_seen_at >= v_since;

  SELECT count(DISTINCT u.uid) INTO v_got_student
  FROM public.users u
  JOIN public.classes c ON c.teacher_uid = u.uid
  WHERE u.role = 'teacher'
    AND u.first_seen_at >= v_since
    AND EXISTS (SELECT 1 FROM public.progress p WHERE p.class_code = c.code);

  SELECT jsonb_build_object(
    'days',          v_days,
    'signed_up',     v_signed_up,
    'made_class',    v_made_class,
    'made_assignment', v_made_assign,
    'got_student',   v_got_student,
    'rates', jsonb_build_object(
      'class_pct',      CASE WHEN v_signed_up   > 0 THEN (v_made_class::numeric  / v_signed_up)  ELSE 0 END,
      'assignment_pct', CASE WHEN v_made_class  > 0 THEN (v_made_assign::numeric / v_made_class) ELSE 0 END,
      'student_pct',    CASE WHEN v_made_assign > 0 THEN (v_got_student::numeric / v_made_assign) ELSE 0 END
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Top modes + top assignments (proxy for "top content").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_top_modes(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result  JSONB;
  v_days  INT         := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since TIMESTAMPTZ := now() - (v_days::text || ' days')::interval;
BEGIN
  PERFORM public.assert_admin();

  SELECT jsonb_build_object(
    'days', v_days,
    'modes', COALESCE((
      SELECT jsonb_agg(j ORDER BY (j->>'plays')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'mode', mode,
          'plays', count(*),
          'players', count(DISTINCT student_uid),
          'avg_score', round(avg(score)::numeric, 1)
        ) AS j
        FROM public.progress
        WHERE completed_at >= v_since
        GROUP BY mode
      ) m
    ), '[]'::jsonb),
    'assignments', COALESCE((
      SELECT jsonb_agg(j ORDER BY (j->>'plays')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'assignment_id', a.id,
          'title',         a.title,
          'class_name',    c.name,
          'plays',         count(*),
          'players',       count(DISTINCT p.student_uid)
        ) AS j
        FROM public.progress p
        JOIN public.assignments a ON a.id = p.assignment_id
        JOIN public.classes c     ON c.id = a.class_id
        WHERE p.completed_at >= v_since
        GROUP BY a.id, a.title, c.name
        ORDER BY count(*) DESC
        LIMIT 15
      ) t
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Active users (DAU/WAU/MAU) — directional approximation.
--    Student activity = a progress row in the window.
--    Teacher activity = an audit_log row OR owning a class with progress
--                       in the window (approximation; without last_seen_at
--                       we can't capture "logged in but did nothing").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_active_users()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result  JSONB;
BEGIN
  PERFORM public.assert_admin();

  WITH windows AS (
    SELECT 'day'   AS w, now() - interval '1 day'   AS since UNION ALL
    SELECT 'week'  AS w, now() - interval '7 days'  UNION ALL
    SELECT 'month' AS w, now() - interval '30 days'
  ),
  student_active AS (
    SELECT w.w, count(DISTINCT p.student_uid) AS n
    FROM windows w
    LEFT JOIN public.progress p ON p.completed_at >= w.since
    GROUP BY w.w
  ),
  teacher_active AS (
    SELECT w.w, count(DISTINCT tid) AS n
    FROM windows w
    LEFT JOIN LATERAL (
      SELECT actor_uid AS tid
      FROM public.audit_log al
      WHERE al.created_at >= w.since
      UNION
      SELECT c.teacher_uid
      FROM public.progress p
      JOIN public.classes c ON c.code = p.class_code
      WHERE p.completed_at >= w.since
    ) sub ON true
    LEFT JOIN public.users u ON u.uid = sub.tid AND u.role IN ('teacher', 'admin', 'manager')
    WHERE u.uid IS NOT NULL
    GROUP BY w.w
  )
  SELECT jsonb_build_object(
    'students', jsonb_build_object(
      'dau', (SELECT n FROM student_active WHERE w = 'day'),
      'wau', (SELECT n FROM student_active WHERE w = 'week'),
      'mau', (SELECT n FROM student_active WHERE w = 'month')
    ),
    'teachers', jsonb_build_object(
      'dau', (SELECT n FROM teacher_active WHERE w = 'day'),
      'wau', (SELECT n FROM teacher_active WHERE w = 'week'),
      'mau', (SELECT n FROM teacher_active WHERE w = 'month')
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. DB health — table sizes + slow queries (if pg_stat_statements is on)
--    + RLS coverage check. Read-only, no mutations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_db_health()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
  v_pgss_available BOOLEAN;
BEGIN
  PERFORM public.assert_admin();

  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) INTO v_pgss_available;

  SELECT jsonb_build_object(
    'table_sizes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'table', schemaname || '.' || tablename,
        'total_bytes', pg_total_relation_size(schemaname || '.' || tablename),
        'rows_estimate', n_live_tup
      ) ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC)
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      LIMIT 30
    ), '[]'::jsonb),
    'rls_coverage', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'table', schemaname || '.' || tablename,
        'rls_enabled', rowsecurity,
        'policy_count', (
          SELECT count(*) FROM pg_policies p
          WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
        )
      ) ORDER BY tablename)
      FROM pg_tables t
      WHERE schemaname = 'public'
    ), '[]'::jsonb),
    'slow_queries_available', v_pgss_available,
    'slow_queries', CASE
      WHEN v_pgss_available THEN COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'query', left(query, 200),
          'calls', calls,
          'mean_ms', round((mean_exec_time)::numeric, 2),
          'total_ms', round((total_exec_time)::numeric, 0)
        ) ORDER BY total_exec_time DESC)
        FROM (
          SELECT query, calls, mean_exec_time, total_exec_time
          FROM pg_stat_statements
          WHERE query NOT LIKE '%pg_stat_statements%'
            AND query NOT LIKE '%pg_extension%'
          ORDER BY total_exec_time DESC
          LIMIT 15
        ) s
      ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Recent exports — for the Security Ops panel + manual scan.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_recent_exports(p_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result   JSONB;
  v_hours  INT         := LEAST(GREATEST(COALESCE(p_hours, 24), 1), 720);
  v_since  TIMESTAMPTZ := now() - (v_hours::text || ' hours')::interval;
BEGIN
  PERFORM public.assert_admin();

  SELECT jsonb_build_object(
    'hours', v_hours,
    'total', (
      SELECT count(*) FROM public.audit_log
      WHERE action = 'admin_export_user' AND created_at >= v_since
    ),
    'by_actor', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'actor_uid', actor_uid,
        'actor_email', ua.email,
        'count', cnt,
        'last_at', last_at
      ) ORDER BY cnt DESC)
      FROM (
        SELECT actor_uid, count(*) AS cnt, max(created_at) AS last_at
        FROM public.audit_log
        WHERE action = 'admin_export_user' AND created_at >= v_since
        GROUP BY actor_uid
      ) s
      LEFT JOIN public.users ua ON ua.uid = s.actor_uid
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Defensive update: rate-limit admin_export_user_data to <=20 per 24h per
-- caller. Catches "compromised admin scraping all users" without bothering
-- legitimate single-user exports.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_export_user_data(p_uid TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email   TEXT;
  v_exists  BOOLEAN;
  v_recent  INT;
  result    JSONB;
  caller    TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();

  -- Rate limit: refuse if this caller has run >= 20 exports in the last 24h.
  SELECT count(*) INTO v_recent
  FROM public.audit_log
  WHERE action = 'admin_export_user'
    AND actor_uid = caller
    AND created_at >= now() - interval '24 hours';
  IF v_recent >= 20 THEN
    RAISE EXCEPTION 'Export rate limit exceeded (% in last 24h). Contact another admin if this is legitimate.', v_recent
      USING ERRCODE = '42501';
  END IF;

  SELECT email, true INTO v_email, v_exists FROM public.users WHERE uid = p_uid;
  IF NOT COALESCE(v_exists, false) THEN
    RAISE EXCEPTION 'User % not found', p_uid USING ERRCODE = '23503';
  END IF;

  SELECT jsonb_build_object(
    'export_format_version', '2026-05-22',
    'exported_at',           now(),
    'exported_by_admin',     caller,
    'subject_uid',           p_uid,
    'subject_email',         v_email,
    'tables', jsonb_build_object(
      'user', (
        SELECT to_jsonb(u.*) FROM public.users u WHERE u.uid = p_uid
      ),
      'student_profile', (
        SELECT to_jsonb(sp.*) FROM public.student_profiles sp
        WHERE sp.auth_uid::text = p_uid LIMIT 1
      ),
      'teacher_profile', (
        SELECT to_jsonb(tp.*) FROM public.teacher_profiles tp
        WHERE tp.email = v_email LIMIT 1
      ),
      'classes_owned', (
        SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
        FROM public.classes c WHERE c.teacher_uid = p_uid
      ),
      'progress', (
        SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb)
        FROM public.progress p WHERE p.student_uid = p_uid
      ),
      'consent_history', (
        SELECT COALESCE(jsonb_agg(to_jsonb(cl.*)), '[]'::jsonb)
        FROM public.consent_log cl WHERE cl.uid = p_uid
      ),
      'audit_log_as_actor', (
        SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
        FROM public.audit_log al WHERE al.actor_uid = p_uid
      ),
      'audit_log_as_target', (
        SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
        FROM public.audit_log al WHERE al.target_uid = p_uid AND al.actor_uid <> p_uid
      )
    )
  ) INTO result;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid)
  VALUES (caller, 'admin_export_user', 'all', p_uid);

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_onboarding_funnel(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_top_modes(INTEGER)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_active_users()              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_db_health()                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_recent_exports(INTEGER)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_onboarding_funnel(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_modes(INTEGER)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_active_users()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_db_health()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_exports(INTEGER)     TO authenticated;
