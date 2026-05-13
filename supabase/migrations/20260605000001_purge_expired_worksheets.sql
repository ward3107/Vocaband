-- ============================================
-- Purge expired interactive worksheets (Phase 2 — cleanup)
-- ============================================
-- interactive_worksheets rows carry an `expires_at` (default ~30 days
-- from creation).  The solver + submit RPC already filter expired
-- rows at query time, but the rows themselves stay in the table
-- forever — so without a cleanup job the table grows monotonically
-- as teachers mint shares.
--
-- This installs a daily pg_cron job that DELETEs expired rows.
-- worksheet_attempts.slug has ON DELETE CASCADE, so each row's
-- attempts go with it — no orphans.
--
-- pg_cron is pre-installed on Supabase but must be enabled at least
-- once (already done by 20260429_anon_user_cleanup_cron.sql).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.purge_expired_worksheets()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  -- A generous 7-day grace period after expires_at: teachers sometimes
  -- discover a forgotten draft a few days late and we'd rather not
  -- have the row vanish on the dot.  Tweak the interval if storage
  -- ever becomes a real concern.
  WITH purged AS (
    DELETE FROM public.interactive_worksheets
    WHERE expires_at < NOW() - INTERVAL '7 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM purged;

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.purge_expired_worksheets IS
  'Deletes interactive_worksheets older than expires_at + 7 days. Attempts cascade via FK. Called daily by pg_cron.';

-- Unschedule any previous version (idempotent so re-running this
-- migration during local development doesn't double-schedule).
SELECT cron.unschedule('purge_expired_worksheets_daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'purge_expired_worksheets_daily'
);

-- Run every day at 03:30 UTC — staggered from the 03:00 anon-user
-- cleanup so the two jobs don't contend for the same wal slot.
SELECT cron.schedule(
  'purge_expired_worksheets_daily',
  '30 3 * * *',
  $cron$ SELECT public.purge_expired_worksheets(); $cron$
);

-- Lock down REST exposure: the function is SECURITY DEFINER for the
-- pg_cron owner; we don't want anon/authenticated POSTing to
-- /rest/v1/rpc/purge_expired_worksheets to trigger a DELETE.  Cron
-- runs as the function owner, so it still works.
REVOKE EXECUTE ON FUNCTION public.purge_expired_worksheets() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_expired_worksheets() FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_expired_worksheets() FROM authenticated;
