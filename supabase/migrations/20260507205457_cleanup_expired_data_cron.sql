-- ============================================================================
-- Cleanup expired data — schedule the existing cleanup_expired_data() RPC
--
-- The function itself was created in 010_privacy_compliance.sql with three
-- jobs:
--   1. Trim public.progress older than 365 days
--   2. Delete orphaned student users (no class_code, inactive 90 days)
--   3. Trim public.audit_log older than 730 days (= 2-year retention floor
--      mandated by תקנות אבטחת מידע 2017 § 7 for High-level databases)
--
-- The function existed but was never scheduled, so retention was theoretical:
-- old progress accumulated, audit_log grew without bound, and the
-- 2-year retention claim in PRIVACY_CHECKLIST.md / privacy-config.ts
-- was wrong in practice.  This migration fixes that — installs a nightly
-- pg_cron job that calls the RPC.
--
-- The RPC uses public.is_admin() to gate access, so calling it from a cron
-- run by the postgres role works (admin checks pass for the postgres /
-- service-role context).  We wrap in SECURITY DEFINER so the cron caller
-- doesn't have to be admin themselves.
--
-- Sister cron: 20260429_anon_user_cleanup_cron.sql installs a weekly job
-- for the anon-user cleanup.  This one runs nightly because the audit_log
-- + progress trim windows are larger and we want to amortise the delete.
-- ============================================================================

-- pg_cron is pre-installed on Supabase but needs the schema enabled.  Same
-- statement as 20260429 — idempotent, safe to repeat.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Wrapper that bypasses the is_admin() check inside cleanup_expired_data
-- so the pg_cron worker can call it without an admin auth context.  We
-- never expose this wrapper to anon / authenticated — only to the cron
-- worker (which runs as postgres).
CREATE OR REPLACE FUNCTION public.run_cleanup_expired_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Inline the core of cleanup_expired_data() but skip the admin check.
  -- We use the same default retention windows: 365 / 90 / 730 days.
  WITH
    deleted_progress AS (
      DELETE FROM public.progress
      WHERE completed_at < now() - INTERVAL '365 days'
      RETURNING 1
    ),
    deleted_orphans AS (
      DELETE FROM public.users
      WHERE role = 'student'
        AND class_code IS NULL
        AND (first_seen_at IS NULL OR first_seen_at < now() - INTERVAL '90 days')
      RETURNING 1
    ),
    deleted_audit AS (
      DELETE FROM public.audit_log
      WHERE created_at < now() - INTERVAL '730 days'
      RETURNING 1
    )
  SELECT jsonb_build_object(
    'deleted_progress', (SELECT COUNT(*) FROM deleted_progress),
    'deleted_orphans',  (SELECT COUNT(*) FROM deleted_orphans),
    'deleted_audit',    (SELECT COUNT(*) FROM deleted_audit)
  ) INTO result;

  -- Self-audit: record the cleanup itself in the audit log.  Use a
  -- placeholder system actor since cron has no auth.uid().
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES ('system:cron', 'scheduled_cleanup', 'system', result);

  RAISE NOTICE '[run_cleanup_expired_data] %', result;
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.run_cleanup_expired_data IS
  'pg_cron entry point for retention enforcement (PPA Reg 2017 § 7).  Inlines the core of cleanup_expired_data() without the admin check so the cron worker can call it.  Trims progress > 365d, orphan students > 90d, audit_log > 730d.  Logs the cleanup itself to audit_log.';

-- Lock the wrapper down — only the cron worker (postgres role) should
-- ever call it.  Revoke from public, anon, authenticated to be explicit.
REVOKE EXECUTE ON FUNCTION public.run_cleanup_expired_data FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_cleanup_expired_data FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_cleanup_expired_data FROM authenticated;

-- Unschedule any previous version (idempotent — safe to re-run migration).
SELECT cron.unschedule('cleanup_expired_data_nightly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup_expired_data_nightly'
);

-- Run every night at 03:30 UTC = 05:30 / 06:30 Israel time — outside
-- Israeli school hours so the trim doesn't compete with classroom load.
-- 30 minutes after the anon-user cleanup at 03:00 UTC so the two don't
-- contend for table locks.
SELECT cron.schedule(
  'cleanup_expired_data_nightly',
  '30 3 * * *',
  $cron$ SELECT public.run_cleanup_expired_data(); $cron$
);
