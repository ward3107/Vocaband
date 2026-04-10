-- ============================================
-- Fix: Students can't see assignments (RLS blocks anonymous users)
-- ============================================
-- The assignments_select policy required is_anonymous IS NOT TRUE,
-- but ALL students use anonymous auth. This means students saw 0 assignments
-- on direct queries, causing only 1 (or 0) assignments to display.
--
-- Fix: Remove the anonymous check. Students can read assignments
-- if they belong to a class that has those assignments.
-- Also rebuilds the RPC to include missing columns.

DROP POLICY IF EXISTS assignments_select ON public.assignments;
CREATE POLICY assignments_select ON public.assignments
  FOR SELECT
  USING (
    -- Teachers see their own class assignments
    (class_id IN (
      SELECT classes.id FROM classes
      WHERE classes.teacher_uid = ((SELECT auth.uid()))::text
    ))
    -- Students (including anonymous) see assignments for their enrolled class
    OR (class_id IN (
      SELECT classes.id FROM classes
      WHERE classes.code = (
        SELECT u.class_code FROM users u
        WHERE u.uid = ((SELECT auth.uid()))::text
      )
    ))
    OR is_admin()
  );

-- Rebuild RPC with all columns (words, sentences, sentence_difficulty were missing)
DROP FUNCTION IF EXISTS public.get_assignments_for_class(UUID);
CREATE FUNCTION public.get_assignments_for_class(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  class_id UUID,
  word_ids INTEGER[],
  words JSONB,
  allowed_modes TEXT[],
  deadline TEXT,
  sentences TEXT[],
  sentence_difficulty INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.title, a.class_id, a.word_ids, a.words,
    a.allowed_modes, a.deadline, a.sentences,
    a.sentence_difficulty, a.created_at
  FROM public.assignments a
  WHERE a.class_id = p_class_id
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO anon;
