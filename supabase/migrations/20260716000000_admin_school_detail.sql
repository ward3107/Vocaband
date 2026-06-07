-- =============================================================================
-- admin_school_detail: full roster drill-down for one school (Developer Dashboard)
-- =============================================================================
-- The Schools panel only listed counts + manager emails (admin_list_schools).
-- To answer "who is in this school" — its principal, its teachers (with the
-- grade/branch they teach), and the coded students that were generated for it —
-- the admin needs the per-school detail. This RPC returns that for a single
-- school, in one round-trip.
--
-- School membership mirrors admin_list_schools / admin_delete_school rather than
-- manager_overview. manager_overview finds classes via teacher_uid -> school_id,
-- which DROPS freshly-seeded classes a teacher has not claimed yet (teacher_uid
-- is NULL until first login). The admin view exists precisely to inspect those
-- just-generated rosters, so a class counts as the school's when EITHER:
--   * classes.school_name = school.name        (seeded classes, claimed or not),
--   * classes.teacher_uid -> users.school_id    (classes a member created direct).
-- The OR keeps the detail's class/student totals reconciled with the Schools
-- list while still surfacing teacher-owned classes.
--
-- Students come from student_profiles (not users) because that is where the
-- code (display_name), PIN (roster_pin) and grade/branch live — exactly what the
-- printable handoff sheet needs.
--
-- SECURITY DEFINER + assert_admin(): re-checks is_admin() server-side; the data
-- crosses every tenant, so this must never be reachable by a non-admin.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_school_detail(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  s_name TEXT;
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT name INTO s_name FROM public.schools WHERE id = p_school_id;
  IF s_name IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Classes belonging to this school (see header for the two-path rationale).
  WITH sc AS (
    SELECT c.id, c.name, c.code, c.teacher_uid, c.pending_teacher_email
    FROM public.classes c
    WHERE c.school_name = s_name
       OR c.teacher_uid IN (SELECT u.uid FROM public.users u WHERE u.school_id = p_school_id)
  )
  SELECT jsonb_build_object(
    'school', (SELECT jsonb_build_object(
        'id', s.id, 'name', s.name, 'school_code', s.school_code,
        'plan', s.plan, 'trial_ends_at', s.trial_ends_at, 'created_at', s.created_at
      ) FROM public.schools s WHERE s.id = p_school_id),

    -- Principal(s): users carrying the manager role for this school.
    'managers', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'uid', u.uid, 'email', u.email, 'display_name', u.display_name
      ) ORDER BY u.display_name), '[]'::jsonb)
      FROM public.users u WHERE u.school_id = p_school_id AND u.role = 'manager'),

    -- Teaching staff + how many classes/roster students each owns.
    'teachers', (SELECT COALESCE(jsonb_agg(t ORDER BY t->>'display_name'), '[]'::jsonb) FROM (
      SELECT jsonb_build_object(
        'uid', u.uid, 'display_name', u.display_name, 'email', u.email, 'subject', u.subject,
        'class_count', (SELECT count(*) FROM public.classes c WHERE c.teacher_uid = u.uid),
        'student_count', (SELECT count(*) FROM public.student_profiles sp
                          WHERE sp.class_code IN (SELECT c.code FROM public.classes c WHERE c.teacher_uid = u.uid))
      ) AS t
      FROM public.users u WHERE u.school_id = p_school_id AND u.role = 'teacher') q),

    -- One entry per class, each carrying its full student roster so the panel
    -- can show the grade/branch breakdown and reprint the code/PIN sheet.
    'classes', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sc.id, 'name', sc.name, 'code', sc.code,
        'teacher_uid', sc.teacher_uid,
        'teacher_name', (SELECT u.display_name FROM public.users u WHERE u.uid = sc.teacher_uid),
        'teacher_email', (SELECT u.email FROM public.users u WHERE u.uid = sc.teacher_uid),
        'pending_teacher_email', sc.pending_teacher_email,
        'student_count', (SELECT count(*) FROM public.student_profiles sp WHERE sp.class_code = sc.code),
        'students', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'display_name', sp.display_name,
            'roster_pin', sp.roster_pin,
            'roster_created', sp.roster_created,
            'grade', sp.grade,
            'branch', sp.branch,
            'anon_seq', sp.anon_seq,
            'status', sp.status,
            'avatar', sp.avatar
          ) ORDER BY sp.grade NULLS LAST, sp.branch NULLS LAST, sp.anon_seq NULLS LAST, sp.display_name), '[]'::jsonb)
          FROM public.student_profiles sp WHERE sp.class_code = sc.code)
      ) ORDER BY sc.name), '[]'::jsonb) FROM sc)
  ) INTO result;

  RETURN result;
END;
$$;

-- Authenticated clients may call it; assert_admin() inside fails closed for
-- anyone who is not an admin. Never default to PUBLIC EXECUTE on a fresh create.
REVOKE ALL ON FUNCTION public.admin_school_detail(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_school_detail(UUID) TO authenticated;

COMMIT;
