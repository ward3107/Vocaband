-- =============================================================================
-- 20260626000000_developer_dashboard_batch1_rpcs.sql
--
-- Batch 1 of the developer-dashboard expansion. Adds five admin-only RPCs:
--
--   1. admin_search_users        — user lookup by email / class code / uid
--   2. admin_list_audit_log      — paginated read of audit_log with filters
--   3. admin_trial_funnel        — trial state + conversion-rate snapshot
--   4. admin_export_user_data    — admin-side GDPR Art. 15 export (parent req.)
--   5. admin_delete_user_account — admin-side GDPR Art. 17 erasure (parent req.)
--
-- Pattern matches 20260624000000_developer_dashboard_admin_rpcs.sql:
--   * each function calls public.assert_admin() at the top,
--   * pins search_path = pg_catalog, public, auth,
--   * is SECURITY DEFINER + REVOKEd from anon / PUBLIC,
--   * is granted to `authenticated` (assert_admin enforces the role check).
-- All mutating actions write an audit_log row before mutating so a rolled-back
-- transaction still leaves a trail of the *attempt*.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_search_users — substring/code lookup, returns rich profile +
--    owned classes + last activity timestamp. Caps at 200 results.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_search_users(
  p_query TEXT,
  p_limit INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
  q      TEXT := lower(trim(COALESCE(p_query, '')));
  v_limit INT  := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 200);
BEGIN
  PERFORM public.assert_admin();

  -- Two-character minimum keeps an accidental empty input from returning
  -- the whole users table.
  IF char_length(q) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH matches AS (
    SELECT u.*
    FROM public.users u
    WHERE lower(u.email) LIKE '%' || q || '%'
       OR lower(u.display_name) LIKE '%' || q || '%'
       OR u.uid = q
       OR EXISTS (
         SELECT 1 FROM public.classes c
         WHERE c.teacher_uid = u.uid AND lower(c.code) = q
       )
       OR upper(u.class_code) = upper(q)
    ORDER BY u.role, lower(u.email)
    LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'uid', m.uid,
      'email', m.email,
      'display_name', m.display_name,
      'role', m.role,
      'plan', m.plan,
      'trial_ends_at', m.trial_ends_at,
      'school_id', m.school_id,
      'school_name', s.name,
      'first_seen_at', m.first_seen_at,
      'consent_given_at', m.consent_given_at,
      'classes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'code', c.code,
          'student_count', (
            SELECT count(DISTINCT p.student_uid)
            FROM public.progress p WHERE p.class_code = c.code
          )
        ) ORDER BY c.name)
        FROM public.classes c WHERE c.teacher_uid = m.uid
      ), '[]'::jsonb),
      'last_activity_at', (
        SELECT max(p.completed_at) FROM public.progress p WHERE p.student_uid = m.uid
      )
    )
  ), '[]'::jsonb)
  INTO result
  FROM matches m
  LEFT JOIN public.schools s ON s.id = m.school_id;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. admin_list_audit_log — newest-first list with optional filters.
--    Joins actor + target uids to email for human-readable display.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_audit_log(
  p_limit  INTEGER       DEFAULT 100,
  p_action TEXT          DEFAULT NULL,
  p_actor  TEXT          DEFAULT NULL,
  p_since  TIMESTAMPTZ   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result  JSONB;
  v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  PERFORM public.assert_admin();

  WITH page AS (
    SELECT *
    FROM public.audit_log al
    WHERE (p_action IS NULL OR al.action      = p_action)
      AND (p_actor  IS NULL OR al.actor_uid   = p_actor)
      AND (p_since  IS NULL OR al.created_at >= p_since)
    ORDER BY al.created_at DESC
    LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'actor_uid', p.actor_uid,
      'actor_email', ua.email,
      'action', p.action,
      'data_category', p.data_category,
      'target_uid', p.target_uid,
      'target_email', ut.email,
      'metadata', p.metadata,
      'created_at', p.created_at
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM page p
  LEFT JOIN public.users ua ON ua.uid = p.actor_uid
  LEFT JOIN public.users ut ON ut.uid = p.target_uid;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. admin_trial_funnel — snapshot + days-remaining histogram.
--
-- Caveat: "converted" is an approximation — we count teachers on a paid plan
-- whose first_seen_at falls inside the window. That overcounts teachers who
-- arrived on a school license (never trialed) and undercounts teachers whose
-- trial expired and converted later in a separate window. Directionally fine
-- for "is conversion improving."  A precise cohort metric would need a
-- plan_history table; tracked as a follow-up.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_trial_funnel(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result          JSONB;
  v_days          INT         := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_since         TIMESTAMPTZ := now() - (v_days::text || ' days')::interval;
  v_trialing_now  INT;
  v_expired       INT;
  v_converted     INT;
  v_rate          NUMERIC;
  v_pro_total     INT;
  v_school_total  INT;
BEGIN
  PERFORM public.assert_admin();

  SELECT count(*) INTO v_trialing_now
  FROM public.users
  WHERE role = 'teacher' AND plan = 'free' AND trial_ends_at > now();

  SELECT count(*) INTO v_expired
  FROM public.users
  WHERE role = 'teacher'
    AND plan = 'free'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at <= now();

  SELECT count(*) INTO v_converted
  FROM public.users
  WHERE role = 'teacher'
    AND plan IN ('pro', 'school')
    AND first_seen_at >= v_since;

  SELECT
    count(*) FILTER (WHERE plan = 'pro'),
    count(*) FILTER (WHERE plan = 'school')
  INTO v_pro_total, v_school_total
  FROM public.users
  WHERE role = 'teacher';

  IF (v_converted + v_expired + v_trialing_now) > 0 THEN
    v_rate := v_converted::numeric / (v_converted + v_expired + v_trialing_now);
  ELSE
    v_rate := 0;
  END IF;

  SELECT jsonb_build_object(
    'days',            v_days,
    'trialing_now',    v_trialing_now,
    'expired',         v_expired,
    'converted',       v_converted,
    'conversion_rate', v_rate,
    'paid_total',      jsonb_build_object('pro', v_pro_total, 'school', v_school_total),
    'trialing_buckets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('days_left', bucket, 'count', cnt) ORDER BY bucket)
      FROM (
        SELECT
          CASE
            WHEN trial_ends_at - now() <= interval '1 day'  THEN 1
            WHEN trial_ends_at - now() <= interval '3 days' THEN 3
            WHEN trial_ends_at - now() <= interval '7 days' THEN 7
            ELSE 14
          END AS bucket,
          count(*) AS cnt
        FROM public.users
        WHERE role = 'teacher' AND plan = 'free' AND trial_ends_at > now()
        GROUP BY 1
      ) buckets
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. admin_export_user_data — admin-side wrapper around the GDPR Art. 15
--    export logic in 20260522020000_expand_export_and_delete.sql.
--
-- Why this duplicates export_my_data: the original is intentionally
-- self-service (uses auth.uid()). A parent request scenario needs an admin
-- to export on behalf of a target uid, so we re-author the same payload
-- shape with the target's uid + a separate audit action.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_export_user_data(p_uid TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email TEXT;
  v_exists BOOLEAN;
  result  JSONB;
  caller  TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();

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
-- 5. admin_delete_user_account — admin-side wrapper around the GDPR Art. 17
--    erasure logic. Refuses on admin / manager targets (change role first)
--    and on self (use delete_my_account instead).
--
-- Audit row is INSERTed BEFORE the destructive deletes so a rolled-back
-- transaction still preserves the attempt record. The audit_log retention
-- argument from 20260522020000 (730-day legal-claim exemption + the
-- immutability trigger from 20260518120000) carries over unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user_account(
  p_uid TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_role  TEXT;
  v_email TEXT;
  caller  TEXT := auth.uid()::text;
  deleted_progress         INT := 0;
  deleted_classes          INT := 0;
  deleted_student_profile  INT := 0;
  deleted_teacher_profile  INT := 0;
  deleted_auth_user        INT := 0;
BEGIN
  PERFORM public.assert_admin();

  SELECT role, email INTO v_role, v_email FROM public.users WHERE uid = p_uid;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User % not found', p_uid USING ERRCODE = '23503';
  END IF;

  IF v_role IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Cannot delete % accounts via this RPC — change role first', v_role
      USING ERRCODE = '42501';
  END IF;

  IF caller = p_uid THEN
    RAISE EXCEPTION 'Use delete_my_account() for self-deletion'
      USING ERRCODE = '42501';
  END IF;

  -- Audit FIRST — see migration header.
  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (
    caller,
    'admin_delete_user',
    'all',
    p_uid,
    jsonb_build_object(
      'role',         v_role,
      'reason',       COALESCE(trim(p_reason), ''),
      'email_domain', split_part(COALESCE(v_email, ''), '@', 2)
    )
  );

  IF v_role = 'student' THEN
    DELETE FROM public.progress WHERE student_uid = p_uid;
    GET DIAGNOSTICS deleted_progress = ROW_COUNT;

    DELETE FROM public.student_profiles WHERE auth_uid::text = p_uid;
    GET DIAGNOSTICS deleted_student_profile = ROW_COUNT;

    DELETE FROM public.consent_log WHERE uid = p_uid;

  ELSIF v_role = 'teacher' THEN
    -- Anonymise gradebook progress for the teacher's classes
    -- (student rows survive — those belong to the students).
    UPDATE public.progress
    SET student_name = 'Deleted Student'
    WHERE class_code IN (SELECT code FROM public.classes WHERE teacher_uid = p_uid)
      AND student_uid NOT IN (SELECT uid FROM public.users WHERE role = 'student');

    IF v_email IS NOT NULL THEN
      DELETE FROM public.teacher_profiles WHERE email = v_email;
      GET DIAGNOSTICS deleted_teacher_profile = ROW_COUNT;
    END IF;

    DELETE FROM public.classes WHERE teacher_uid = p_uid;
    GET DIAGNOSTICS deleted_classes = ROW_COUNT;

    DELETE FROM public.consent_log WHERE uid = p_uid;
  END IF;

  DELETE FROM public.users WHERE uid = p_uid;

  -- Same defensive wrap as delete_my_account — see 20260522020000 header.
  BEGIN
    DELETE FROM auth.users WHERE id::text = p_uid;
    GET DIAGNOSTICS deleted_auth_user = ROW_COUNT;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table THEN
      deleted_auth_user := -1;
  END;

  RETURN jsonb_build_object(
    'success',                  true,
    'uid',                      p_uid,
    'role',                     v_role,
    'deleted_progress',         deleted_progress,
    'deleted_classes',          deleted_classes,
    'deleted_student_profile',  deleted_student_profile,
    'deleted_teacher_profile',  deleted_teacher_profile,
    'deleted_auth_user',        deleted_auth_user,
    'audit_log_retained_until', (CURRENT_DATE + INTERVAL '730 days')
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; assert_admin() does the real gating.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_search_users(TEXT, INTEGER)                            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_audit_log(INTEGER, TEXT, TEXT, TIMESTAMPTZ)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_trial_funnel(INTEGER)                                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_export_user_data(TEXT)                                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_user_account(TEXT, TEXT)                        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_search_users(TEXT, INTEGER)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_log(INTEGER, TEXT, TEXT, TIMESTAMPTZ)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_trial_funnel(INTEGER)                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_export_user_data(TEXT)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(TEXT, TEXT)                     TO authenticated;

COMMENT ON FUNCTION public.admin_search_users IS
  'Admin-only: substring lookup over users.email/display_name + exact class code/uid match.';
COMMENT ON FUNCTION public.admin_list_audit_log IS
  'Admin-only: newest-first read of audit_log with optional action/actor/since filters.';
COMMENT ON FUNCTION public.admin_trial_funnel IS
  'Admin-only: trial snapshot — trialing/expired/converted counts + days-remaining histogram. Converted is approximate (see header).';
COMMENT ON FUNCTION public.admin_export_user_data IS
  'Admin-only GDPR Art. 15 export on behalf of a target uid (parent-request scenario). Mirrors export_my_data payload shape.';
COMMENT ON FUNCTION public.admin_delete_user_account IS
  'Admin-only GDPR Art. 17 erasure on behalf of a target uid. Refuses admin/manager and self targets.';
