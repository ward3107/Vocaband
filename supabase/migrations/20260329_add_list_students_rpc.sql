-- Add a public function to list students in a class
-- This function has SECURITY DEFINER to bypass RLS
-- allowing unauthenticated users to see the list of approved students
-- so they can click their name to log in

CREATE OR REPLACE FUNCTION public.list_students_in_class(p_class_code TEXT)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  xp INTEGER,
  avatar TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.display_name,
    sp.xp,
    sp.avatar,
    sp.status
  FROM public.student_profiles sp
  WHERE sp.class_code = p_class_code
    AND sp.status = 'approved'
  ORDER BY sp.display_name ASC;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.list_students_in_class(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_students_in_class(TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION public.list_students_in_class IS 'List approved students in a class (public access for login flow)';
