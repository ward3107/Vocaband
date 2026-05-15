-- Broaden is_teacher() to also return true for admins.
--
-- Before: is_teacher() returned true ONLY for role='teacher'. The
-- single admin account (developer login) was rejected by classes_insert /
-- classes_update / classes_delete and bagrut_tests_* RLS policies even
-- though the client (src/core/supabase.ts isTeacherLike) treats both
-- 'teacher' and 'admin' as teacher-capable and routes the admin to the
-- teacher dashboard. This produced a stream of "new row violates
-- row-level security policy for table classes" errors when the admin
-- tried Create class.
--
-- The assignments_* policies already wrap is_teacher() with
-- "OR is_admin()" — fix the function instead so every teacher-capable
-- code path agrees in one place.
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text
      AND role IN ('teacher', 'admin')
  );
$function$;
