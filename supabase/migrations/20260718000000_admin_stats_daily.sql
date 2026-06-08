-- =============================================================================
-- Admin daily stats snapshot — trend sparklines for the count KPIs
-- =============================================================================
-- The Developer Dashboard's KPI strip sparklines AI cost/calls (it has a real
-- daily series from ai_usage_counters), but Teachers/Students/Classes/Schools
-- were point-in-time only — there was no honest historical series to chart.
--
-- This adds a tiny once-a-day snapshot table + a nightly pg_cron capture, and
-- an admin-only read RPC the dashboard uses to sparkline those four counts.
-- Sparklines light up once ≥2 days have accrued (the frontend renders a plain
-- number until then — no fabricated trend).
--
-- Pattern mirrors 20260507205457_cleanup_expired_data_cron.sql (pg_cron) and
-- every other admin_* RPC (SECURITY DEFINER, pinned search_path, anon revoked).
-- Additive + idempotent. Touches no existing object.
-- =============================================================================

BEGIN;

-- One row per day. RLS on with NO policies → direct client access is denied;
-- only the SECURITY DEFINER functions below (owner-run) touch it.
CREATE TABLE IF NOT EXISTS public.admin_stats_daily (
  day         DATE PRIMARY KEY DEFAULT current_date,
  teachers    INTEGER NOT NULL DEFAULT 0,
  students    INTEGER NOT NULL DEFAULT 0,
  classes     INTEGER NOT NULL DEFAULT 0,
  schools     INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_stats_daily ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Capture today's counts (idempotent upsert). NO assert_admin(): this is run
-- by the pg_cron worker, which has no auth context. It only writes aggregate
-- counts and is never granted to clients (revoked below), so it's not an
-- exposure surface.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_capture_stats_daily()
RETURNS public.admin_stats_daily
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE r public.admin_stats_daily;
BEGIN
  INSERT INTO public.admin_stats_daily (day, teachers, students, classes, schools, captured_at)
  VALUES (
    current_date,
    (SELECT count(*) FROM public.users    WHERE role = 'teacher'),
    (SELECT count(*) FROM public.users    WHERE role = 'student'),
    (SELECT count(*) FROM public.classes),
    (SELECT count(*) FROM public.schools),
    now()
  )
  ON CONFLICT (day) DO UPDATE SET
    teachers = EXCLUDED.teachers, students = EXCLUDED.students,
    classes  = EXCLUDED.classes,  schools  = EXCLUDED.schools,
    captured_at = now()
  RETURNING * INTO r;
  RETURN r;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin read: last p_days of snapshots (oldest→newest) for the sparklines.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_stats_series(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_days INT := LEAST(GREATEST(COALESCE(p_days, 30), 2), 180);
  result JSONB;
BEGIN
  PERFORM public.assert_admin();
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'day', day, 'teachers', teachers, 'students', students,
           'classes', classes, 'schools', schools) ORDER BY day), '[]'::jsonb)
  INTO result
  FROM public.admin_stats_daily
  WHERE day > current_date - v_days;
  RETURN result;
END;
$$;

-- Seed one row now so the series isn't empty (it grows daily from here).
SELECT public.admin_capture_stats_daily();

-- ---------------------------------------------------------------------------
-- Nightly capture via pg_cron (00:10 UTC). Same approach as the retention cron.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('admin_stats_daily_capture')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'admin_stats_daily_capture');

SELECT cron.schedule(
  'admin_stats_daily_capture',
  '10 0 * * *',
  $cron$ SELECT public.admin_capture_stats_daily(); $cron$
);

-- ---------------------------------------------------------------------------
-- Grants — capture is cron/owner-only; only the admin-gated read is exposed.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_capture_stats_daily()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_stats_series(INTEGER)      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_stats_series(INTEGER)  TO authenticated;

COMMENT ON FUNCTION public.admin_stats_series IS
  'Admin-only: daily teacher/student/class/school counts for KPI sparklines. Backed by admin_stats_daily (nightly pg_cron snapshot).';

COMMIT;
