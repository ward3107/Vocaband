-- Fix is_teacher() to check users table in addition to teacher_profiles
-- teacher_profiles was empty, so all teacher RLS policies (delete assignments,
-- delete classes, etc.) were silently failing.

CREATE OR REPLACE FUNCTION public.is_teacher(p_user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.teacher_profiles
    WHERE email = p_user_email AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND role = 'teacher'
  );
END;
$function$;
