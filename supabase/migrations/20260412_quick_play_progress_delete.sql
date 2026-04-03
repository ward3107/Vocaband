-- Allow teachers to delete Quick Play progress for sessions they own.
-- This enables the "remove student" feature in the teacher monitor.
CREATE POLICY "quick_play_progress_delete" ON public.progress
  FOR DELETE TO authenticated USING (
    class_code = 'QUICK_PLAY'
    AND assignment_id IN (
      SELECT id FROM public.quick_play_sessions
      WHERE teacher_uid = auth.uid()::text
    )
  );
