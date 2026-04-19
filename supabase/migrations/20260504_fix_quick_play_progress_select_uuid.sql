-- Fix quick_play_progress_select so the teacher monitor can actually read
-- progress rows for their own session.
--
-- Background: the policy added in 20260408 tried to check that the
-- assignment_id (UUID column on progress) matched a session the teacher
-- owns:
--
--     assignment_id IN (
--       SELECT id::text FROM public.quick_play_sessions
--       WHERE teacher_uid = auth.uid()::text
--     )
--
-- `id::text` casts the session UUID to text, but `assignment_id` is still
-- UUID. `uuid IN (text, text, ...)` doesn't resolve to a valid operator,
-- so the predicate either errors under some planner paths or silently
-- evaluates to false under RLS — which is exactly the symptom we saw:
-- Quick Play sessions record progress rows (student insert is fine), but
-- the teacher's monitor view fetches zero rows and no student ever shows
-- up on the leaderboard.
--
-- Fix: drop the cast so both sides stay UUID. Works the same on existing
-- data (no backfill needed) and aligns with how the client does the
-- equivalent filter (.eq('assignment_id', sessionId)).

DROP POLICY IF EXISTS "quick_play_progress_select" ON public.progress;

CREATE POLICY "quick_play_progress_select" ON public.progress
  FOR SELECT TO authenticated USING (
    class_code = 'QUICK_PLAY'
    AND assignment_id IN (
      SELECT id FROM public.quick_play_sessions
      WHERE teacher_uid = auth.uid()::text
    )
  );

COMMENT ON POLICY "quick_play_progress_select" ON public.progress IS
  'Teachers can read progress rows for Quick Play sessions they own. Both sides of the IN comparison are UUID; the previous id::text cast broke the lookup silently.';
