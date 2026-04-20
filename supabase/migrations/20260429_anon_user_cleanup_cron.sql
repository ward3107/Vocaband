-- ============================================================================
-- Anonymous user cleanup cron
--
-- Quick Play + demo mode both call supabase.auth.signInAnonymously(), which
-- creates a row in auth.users flagged is_anonymous = TRUE. Those rows are
-- never deleted — at 5 classes/day × 40 students that's ~73 000 dead
-- auth.users rows per year accumulating forever. Eventually that hits
-- Supabase seat limits / increases auth table bloat.
--
-- This migration installs a weekly pg_cron job that deletes anonymous
-- auth.users that:
--   - were created more than 30 days ago
--   - have no row in public.progress (never actually played a game)
--   - have no row in public.users (never upgraded to a real account)
--
-- Safe: students who played at least one game stay (we might still want
-- their progress for analytics). Safe: no real email accounts are touched.
-- ============================================================================

-- pg_cron is pre-installed on Supabase but needs to be enabled in the
-- extensions schema. Supabase Pro+ has it on by default; Starter may need
-- the "Database → Extensions → pg_cron" toggle in the dashboard.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- The worker function. Runs as postgres (the extension owner) so it can
-- touch auth.users, which is otherwise reserved to the service role.
CREATE OR REPLACE FUNCTION public.cleanup_stale_anon_users()
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Snapshot of candidate uids so the DELETE runs on a stable set and
  -- returns an accurate count.
  WITH candidates AS (
    SELECT u.id
    FROM auth.users u
    WHERE COALESCE(u.is_anonymous, FALSE) = TRUE
      AND u.created_at < now() - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.progress p WHERE p.student_uid = u.id::text
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.users pu WHERE pu.uid = u.id::text
      )
  ),
  deleted AS (
    DELETE FROM auth.users
    WHERE id IN (SELECT id FROM candidates)
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted FROM deleted;

  RAISE NOTICE '[cleanup_stale_anon_users] deleted % anonymous accounts', v_deleted;

  deleted_count := v_deleted;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_anon_users IS
  'Deletes anonymous auth.users older than 30 days with no progress/profile. Called weekly by pg_cron.';

-- Unschedule any previous version (idempotent).
SELECT cron.unschedule('cleanup_stale_anon_users_weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup_stale_anon_users_weekly'
);

-- Run every Sunday at 03:00 UTC — outside Israeli school hours.
SELECT cron.schedule(
  'cleanup_stale_anon_users_weekly',
  '0 3 * * 0',
  $cron$ SELECT public.cleanup_stale_anon_users(); $cron$
);
