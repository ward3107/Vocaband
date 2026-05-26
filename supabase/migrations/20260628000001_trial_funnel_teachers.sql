-- =============================================================================
-- 20260628000001_trial_funnel_teachers.sql
--
-- Extends admin_trial_funnel (mig 20260626000000) with a per-teacher list of
-- everyone currently in their trial window. Backs the "Trialing teachers"
-- drill-down list on the Trial Funnel panel — the bucket histogram is a
-- summary, this is the per-person view so operators can see exactly who's
-- about to expire.
--
-- CREATE OR REPLACE rewrites the function in place; no data migration.
-- =============================================================================

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
    ), '[]'::jsonb),
    'trialing_teachers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'uid', u.uid,
          'email', u.email,
          'display_name', u.display_name,
          'school_name', s.name,
          'trial_ends_at', u.trial_ends_at,
          'first_seen_at', u.first_seen_at,
          'days_left', GREATEST(
            0,
            CEIL(EXTRACT(EPOCH FROM (u.trial_ends_at - now())) / 86400)
          )::int
        ) ORDER BY u.trial_ends_at ASC
      )
      FROM public.users u
      LEFT JOIN public.schools s ON s.id = u.school_id
      WHERE u.role = 'teacher'
        AND u.plan = 'free'
        AND u.trial_ends_at > now()
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.admin_trial_funnel IS
  'Admin-only: trial snapshot — trialing/expired/converted counts + days-remaining histogram + per-teacher drill-down list. Converted is approximate (see header).';
