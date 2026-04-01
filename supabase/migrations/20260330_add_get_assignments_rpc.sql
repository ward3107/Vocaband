-- Get assignments for a class (for students)
-- This function has SECURITY DEFINER to bypass RLS
-- allowing students to fetch assignments for their class

CREATE OR REPLACE FUNCTION public.get_assignments_for_class(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  class_id UUID,
  word_ids INTEGER[],
  allowedModes TEXT[],
  deadline TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.class_id,
    a.word_ids,
    a.allowed_modes,
    a.deadline,
    a.created_at
  FROM public.assignments a
  WHERE a.class_id = p_class_id
  ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_assignments_for_class IS 'Get assignments for a class (for student dashboard)';
