-- Fix Quick Play progress: two bugs prevented student progress from saving
-- and teacher monitor from reading it.
--
-- Bug 1: progress.assignment_id has a FK constraint referencing assignments(id).
--   Quick Play stores quick_play_sessions.id in assignment_id, which doesn't
--   exist in the assignments table, so every insert fails with FK violation.
--
-- Bug 2: The quick_play_progress_select RLS policy compares assignment_id (UUID)
--   against id::text (TEXT), causing a type mismatch.

-- 1. Drop the FK constraint so Quick Play can reuse assignment_id for session IDs.
ALTER TABLE public.progress
  DROP CONSTRAINT IF EXISTS progress_assignment_id_fkey;

-- 2. Fix the RLS select policy: remove the ::text cast so both sides are UUID.
DROP POLICY IF EXISTS "quick_play_progress_select" ON public.progress;

CREATE POLICY "quick_play_progress_select" ON public.progress
  FOR SELECT TO authenticated USING (
    class_code = 'QUICK_PLAY'
    AND assignment_id IN (
      SELECT id FROM public.quick_play_sessions
      WHERE teacher_uid = auth.uid()::text
    )
  );
