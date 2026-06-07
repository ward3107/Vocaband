-- =============================================================================
-- admin_list_schools: add a class count to the Schools panel payload
-- =============================================================================
-- admin_delete_school (20260712000000) refuses to drop a school that still has
-- members (users.school_id) OR classes (classes.school_name = name), raising a
-- 23503 which PostgREST returns as HTTP 409. The Developer Dashboard Schools
-- panel only showed staff + students, so a school with leftover classes looked
-- empty yet 409'd on delete — a confusing, bug-looking refusal.
--
-- This re-defines admin_list_schools to also return the same class count the
-- delete guard uses, so the UI can show "N classes" and block the delete button
-- up front instead of letting the operator discover it through a failed call.
--
-- CREATE OR REPLACE — additive; the only change vs 20260710000000 is the new
-- 'classes' key. Grants re-asserted so a fresh create (function absent) never
-- defaults to PUBLIC EXECUTE.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_schools()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'school_code', s.school_code,
      'created_at', s.created_at,
      'teachers', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role IN ('teacher', 'manager')),
      'students', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'student'),
      -- Mirrors admin_delete_school's guard (classes.school_name = name) so the
      -- "N classes" the UI shows is exactly what blocks a delete.
      'classes', (SELECT count(*) FROM public.classes c
                  WHERE c.school_name = s.name),
      'managers', (SELECT COALESCE(jsonb_agg(u.email), '[]'::jsonb) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'manager')
    ) ORDER BY s.name
  ), '[]'::jsonb)
  INTO result
  FROM public.schools s;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_schools() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_schools() TO authenticated;

COMMIT;
