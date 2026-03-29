-- Add a public function to get a student's profile for login
-- This function has SECURITY DEFINER to bypass RLS
-- allowing unauthenticated users to fetch their full profile
-- so they can log in with their auth account

CREATE OR REPLACE FUNCTION public.get_student_profile_for_login(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  email TEXT,
  class_code TEXT,
  auth_uid UUID,
  avatar TEXT,
  badges TEXT[],
  xp INTEGER,
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
    sp.email,
    sp.class_code,
    sp.auth_uid,
    sp.avatar,
    sp.badges,
    sp.xp,
    sp.status
  FROM public.student_profiles sp
  WHERE sp.id = p_student_id;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_student_profile_for_login(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_profile_for_login(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_student_profile_for_login IS 'Get student profile for login (public access for login flow)';
