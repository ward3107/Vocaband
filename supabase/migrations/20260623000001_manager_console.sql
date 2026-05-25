-- =============================================================================
-- Principal Console (v2) — aggregate RPCs for the school-manager dashboard
-- =============================================================================
-- Adds the read-only, school-scoped aggregate RPCs that power the console's
-- Overview / Teachers / Classes / Engagement views. Every function:
--   • is SECURITY DEFINER with a hardened search_path,
--   • self-scopes to public.manager_school() (the caller's school; NULL ⇒
--     fails closed with {"error":"not_a_manager"}),
--   • for drill-downs, verifies the requested teacher/class belongs to the
--     caller's school before returning anything (no cross-tenant peeking),
--   • aggregates server-side and references ONLY core tables (users, classes,
--     assignments, progress, schools) so it stays in lockstep with schema.sql.
-- =============================================================================

-- ── Overview: totals + teacher roster + 14-day series + breakdowns ──────────
CREATE OR REPLACE FUNCTION public.manager_overview()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;

  WITH sc AS (
    SELECT c.id, c.name, c.code, c.teacher_uid
    FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid
    WHERE u.school_id = sid
  ),
  ss AS (
    SELECT DISTINCT s.uid, s.xp FROM public.users s WHERE s.class_code IN (SELECT code FROM sc)
  ),
  eng AS (
    SELECT to_char(now()::date - n, 'MM-DD') AS d,
      (SELECT count(DISTINCT p.student_uid) FROM public.progress p
        WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS active,
      (SELECT count(*) FROM public.progress p
        WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS games
    FROM generate_series(13, 0, -1) AS n
  )
  SELECT jsonb_build_object(
    'school', (SELECT jsonb_build_object('id', id, 'name', name) FROM public.schools WHERE id = sid),
    'totals', jsonb_build_object(
      'teachers', (SELECT count(*) FROM public.users WHERE school_id = sid AND role = 'teacher'),
      'classes',  (SELECT count(*) FROM sc),
      'students', (SELECT count(*) FROM ss),
      'active_students_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '7 days'),
      'games_7d', (SELECT count(*) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '7 days'),
      'total_xp', (SELECT COALESCE(sum(xp), 0) FROM ss)
    ),
    'teachers', (SELECT COALESCE(jsonb_agg(t ORDER BY t->>'display_name'), '[]'::jsonb) FROM (
      SELECT jsonb_build_object(
        'uid', u.uid, 'display_name', u.display_name, 'email', u.email,
        'class_count', (SELECT count(*) FROM public.classes c WHERE c.teacher_uid = u.uid),
        'student_count', (SELECT count(DISTINCT s.uid) FROM public.users s WHERE s.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid)),
        'active_students_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid) AND p.completed_at > now() - interval '7 days'),
        'last_activity', (SELECT max(p.completed_at) FROM public.progress p WHERE p.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid))
      ) AS t FROM public.users u WHERE u.school_id = sid AND u.role = 'teacher') q),
    'engagement14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active, 'games', games)), '[]'::jsonb) FROM eng),
    'students_by_class', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', cnt) ORDER BY cnt DESC), '[]'::jsonb) FROM (
      SELECT sc.name, (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code) AS cnt FROM sc ORDER BY cnt DESC LIMIT 6) z),
    'xp_by_teacher', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', display_name, 'xp', xp) ORDER BY xp DESC), '[]'::jsonb) FROM (
      SELECT u.display_name, (SELECT COALESCE(sum(s.xp), 0) FROM public.users s WHERE s.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid)) AS xp
      FROM public.users u WHERE u.school_id = sid AND u.role = 'teacher') y),
    'classes', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'code', code,
        'teacher_name', (SELECT display_name FROM public.users WHERE uid = sc.teacher_uid),
        'students', (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code),
        'avg_score', (SELECT round(avg(p.score)) FROM public.progress p WHERE p.class_code = sc.code),
        'completion', CASE WHEN (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code) = 0 THEN 0
          ELSE round(100.0 * (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = sc.code) / (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code)) END,
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = sc.code AND p.completed_at > now() - interval '7 days'),
        'last_activity', (SELECT max(p.completed_at) FROM public.progress p WHERE p.class_code = sc.code)
      ) ORDER BY name), '[]'::jsonb) FROM sc)
  ) INTO result;
  RETURN result;
END; $$;

-- ── Engagement: 30-day trend, 14-day games, day-of-week, game modes ─────────
CREATE OR REPLACE FUNCTION public.manager_engagement()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;

  WITH sc AS (
    SELECT c.code FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid WHERE u.school_id = sid
  )
  SELECT jsonb_build_object(
    'active30', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(29, 0, -1) AS n) a),
    'games14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'games', games)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(*) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS games
      FROM generate_series(13, 0, -1) AS n) g),
    'dow', (SELECT COALESCE(jsonb_agg(jsonb_build_object('dow', dow, 'plays', plays) ORDER BY dow), '[]'::jsonb) FROM (
      SELECT EXTRACT(DOW FROM p.completed_at)::int AS dow, count(*) AS plays
      FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '30 days'
      GROUP BY 1) d),
    'modes', (SELECT COALESCE(jsonb_agg(jsonb_build_object('mode', mode, 'plays', plays) ORDER BY plays DESC), '[]'::jsonb) FROM (
      SELECT p.mode, count(*) AS plays
      FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '30 days'
      GROUP BY p.mode ORDER BY plays DESC LIMIT 8) m)
  ) INTO result;
  RETURN result;
END; $$;

-- ── Teacher drill-down (ownership-checked) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.manager_teacher_detail(p_uid TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;
  -- Cross-tenant guard: the teacher must belong to the caller's school.
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = p_uid AND school_id = sid AND role = 'teacher') THEN
    RETURN jsonb_build_object('error', 'not_in_school');
  END IF;

  WITH tc AS (SELECT id, name, code FROM public.classes WHERE teacher_uid = p_uid)
  SELECT jsonb_build_object(
    'teacher', (SELECT jsonb_build_object('uid', u.uid, 'display_name', u.display_name, 'email', u.email,
        'classes', (SELECT count(*) FROM tc),
        'students', (SELECT count(DISTINCT s.uid) FROM public.users s WHERE s.class_code IN (SELECT code FROM tc)),
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM tc) AND p.completed_at > now() - interval '7 days'),
        'xp', (SELECT COALESCE(sum(s.xp), 0) FROM public.users s WHERE s.class_code IN (SELECT code FROM tc)))
      FROM public.users u WHERE u.uid = p_uid),
    'activity14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM tc) AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(13, 0, -1) AS n) a),
    'per_class', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'students', cnt) ORDER BY name), '[]'::jsonb) FROM (
      SELECT tc.name, (SELECT count(*) FROM public.users s WHERE s.class_code = tc.code) AS cnt FROM tc) z),
    'top_students', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', display_name, 'xp', xp) ORDER BY xp DESC), '[]'::jsonb) FROM (
      SELECT s.display_name, COALESCE(s.xp, 0) AS xp FROM public.users s WHERE s.class_code IN (SELECT code FROM tc) ORDER BY s.xp DESC NULLS LAST LIMIT 5) y)
  ) INTO result;
  RETURN result;
END; $$;

-- ── Class drill-down (ownership-checked) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.manager_class_detail(p_class_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); ccode TEXT; result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;
  -- Cross-tenant guard: the class's teacher must belong to the caller's school.
  SELECT c.code INTO ccode FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid
    WHERE c.id = p_class_id AND u.school_id = sid;
  IF ccode IS NULL THEN RETURN jsonb_build_object('error', 'not_in_school'); END IF;

  SELECT jsonb_build_object(
    'class', (SELECT jsonb_build_object('id', c.id, 'name', c.name, 'code', c.code,
        'teacher_name', (SELECT display_name FROM public.users WHERE uid = c.teacher_uid),
        'students', (SELECT count(*) FROM public.users s WHERE s.class_code = c.code),
        'avg_score', (SELECT round(avg(p.score)) FROM public.progress p WHERE p.class_code = c.code),
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = c.code AND p.completed_at > now() - interval '7 days'))
      FROM public.classes c WHERE c.id = p_class_id),
    'score_dist', (SELECT COALESCE(jsonb_agg(jsonb_build_object('band', band, 'n', n) ORDER BY ord), '[]'::jsonb) FROM (
      SELECT '0–60' band, 1 ord, count(*) FILTER (WHERE p.score < 600) n FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '60–75', 2, count(*) FILTER (WHERE p.score >= 600 AND p.score < 750) FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '75–90', 3, count(*) FILTER (WHERE p.score >= 750 AND p.score < 900) FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '90–100', 4, count(*) FILTER (WHERE p.score >= 900) FROM public.progress p WHERE p.class_code = ccode) sd),
    'activity14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = ccode AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(13, 0, -1) AS n) a),
    'assignments', (SELECT COALESCE(jsonb_agg(jsonb_build_object('title', title, 'completion', completion) ORDER BY created_at DESC), '[]'::jsonb) FROM (
      SELECT a.title, a.created_at,
        CASE WHEN (SELECT count(*) FROM public.users s WHERE s.class_code = ccode) = 0 THEN 0
          ELSE round(100.0 * (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.assignment_id = a.id)
            / (SELECT count(*) FROM public.users s WHERE s.class_code = ccode)) END AS completion
      FROM public.assignments a WHERE a.class_id = p_class_id ORDER BY a.created_at DESC LIMIT 8) asg)
  ) INTO result;
  RETURN result;
END; $$;

-- Authenticated clients may call them; each self-scopes server-side.
REVOKE ALL ON FUNCTION public.manager_engagement()              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manager_teacher_detail(TEXT)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manager_class_detail(UUID)        FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_engagement()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_teacher_detail(TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_class_detail(UUID)     TO authenticated;
