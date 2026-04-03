-- Allow Quick Play guests to insert their own progress records.
-- The existing progress_insert policy requires class_code to match the
-- users table, but Quick Play guests use "QUICK_PLAY" as class_code
-- and have no users row. This policy allows authenticated users to
-- insert progress with class_code='QUICK_PLAY' if student_uid matches.

CREATE POLICY "quick_play_progress_insert" ON public.progress
  FOR INSERT WITH CHECK (
    auth.uid()::text = student_uid
    AND class_code = 'QUICK_PLAY'
  );

-- Allow teachers to read Quick Play progress for sessions they own.
-- The assignment_id column stores the quick_play_sessions.id for QP progress.
CREATE POLICY "quick_play_progress_select" ON public.progress
  FOR SELECT TO authenticated USING (
    class_code = 'QUICK_PLAY'
    AND assignment_id IN (
      SELECT id::text FROM public.quick_play_sessions
      WHERE teacher_uid = auth.uid()::text
    )
  );
