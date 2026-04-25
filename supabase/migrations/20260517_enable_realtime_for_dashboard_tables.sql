-- =============================================================================
-- Enable Realtime publication for the tables the dashboard subscribes to
-- =============================================================================
--
-- 2026-04-25 polling-elimination work in `useDashboardPolling.ts` and
-- `RewardInboxCard.tsx` swaps the steady-state polls for Supabase Realtime
-- postgres_changes subscriptions.  For the subscriptions to actually
-- receive events, each table has to be added to the
-- `supabase_realtime` publication — Supabase ships with that publication
-- empty by default, so the client subscribes successfully but never sees
-- any events and our 5-minute fallback poll silently takes over for
-- everyone.
--
-- This migration adds the four tables the dashboard cares about.
-- ALTER PUBLICATION ... ADD TABLE is idempotent in the sense that we
-- guard with NOT EXISTS-style check; on first run it adds, on subsequent
-- runs the IF EXISTS / pg_publication_tables guard keeps it a no-op.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'assignments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'student_profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'progress'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.progress';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'teacher_rewards'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_rewards';
  END IF;
END $$;

COMMENT ON PUBLICATION supabase_realtime IS
  'Includes: assignments, student_profiles, progress, teacher_rewards — '
  'consumed by the dashboard Realtime subscriptions in useDashboardPolling '
  'and RewardInboxCard (added 2026-04-25 polling-elimination work).';
