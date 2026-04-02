-- Get class data by code for students
-- This function has SECURITY DEFINER to bypass RLS
-- allowing authenticated students to fetch their class info

CREATE OR REPLACE FUNCTION public.get_class_by_code(p_class_code TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  teacher_uid TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.code,
    c.name,
    c.teacher_uid
  FROM public.classes c
  WHERE c.code = p_class_code;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_class_by_code(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_class_by_code IS 'Get class data by code (for student login)';
