-- =============================================================================
-- School Manager (principal) role + multi-tenant "schools" layer
-- =============================================================================
-- Adds an organization layer above teachers so a school principal can oversee
-- *only* the teachers + classes + students in their own school — distinct from
-- the existing global `admin` role, which still sees everything.
--
-- Design notes:
--   • A `manager` is a read-only overseer (v1). No write policies are granted;
--     they observe rosters + analytics but never edit a teacher's data.
--   • A class's school is derived through its teacher (`classes.teacher_uid`
--     -> `users.school_id`). We deliberately do NOT denormalize `school_id`
--     onto `classes` so it can never drift from the teacher's school.
--   • Tenant scoping is enforced via SECURITY DEFINER helpers so the RLS
--     subqueries don't recurse on `public.users` (which has its own RLS).
--
-- Provisioning a principal (operator / service-role only — there is no
-- self-serve school onboarding in v1):
--   1) INSERT INTO public.schools (name) VALUES ('Example High') RETURNING id;
--   2) INSERT INTO public.teacher_allowlist (email) VALUES (lower('head@example.com'));
--   3) The principal signs in once via the normal teacher login (Google / OTP),
--      which mints a `teacher` row.
--   4) UPDATE public.users SET role='manager', school_id='<school-uuid>'
--        WHERE email = 'head@example.com';
--   5) Assign teachers to the school:
--      UPDATE public.users SET school_id='<school-uuid>'
--        WHERE email IN ('t1@example.com','t2@example.com');
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) < 200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users (school_id);

-- Add 'manager' to the role CHECK (was: teacher / student / admin).
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('teacher', 'student', 'admin', 'manager'));

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER — bypass RLS, hardened search_path)
-- ---------------------------------------------------------------------------

-- The caller's school, but ONLY when they are a manager. NULL otherwise, so
-- every policy clause below fails closed for non-managers (NULL = x is never
-- TRUE).
CREATE OR REPLACE FUNCTION public.manager_school()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.users
  WHERE uid = auth.uid()::text AND role = 'manager';
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND role = 'manager'
  );
$$;

-- The set of classes (id + code) belonging to the caller's school, resolved
-- through each class's teacher. SECURITY DEFINER so policy subqueries that
-- reference it don't recurse through users/classes RLS. Empty for non-managers.
CREATE OR REPLACE FUNCTION public.manager_classes()
RETURNS TABLE(id UUID, code TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.code
  FROM public.classes c
  JOIN public.users u ON u.uid = c.teacher_uid
  WHERE u.school_id = public.manager_school();
$$;

-- ---------------------------------------------------------------------------
-- RLS — schools table
-- ---------------------------------------------------------------------------

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_select" ON public.schools;
CREATE POLICY "schools_select" ON public.schools
  FOR SELECT TO authenticated USING (
    public.is_admin()
    OR id = public.manager_school()
    OR id = (SELECT school_id FROM public.users WHERE uid = auth.uid()::text)
  );
-- No insert/update/delete policies: schools are managed by the operator via
-- the service role / dashboard only (fail closed for all clients).

-- ---------------------------------------------------------------------------
-- RLS — extend the existing _select policies with a school-manager clause.
-- Each policy below is recreated VERBATIM from schema.sql plus one OR branch.
-- ---------------------------------------------------------------------------

-- ·· users ·· managers see staff (by school_id) + students (by class membership)
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    auth.uid()::text = uid
    OR public.is_admin()
    OR (
      public.is_manager() AND (
        school_id = public.manager_school()
        OR class_code IN (SELECT code FROM public.manager_classes())
      )
    )
  );

-- ·· classes ··
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated
  USING (
    (
      teacher_uid = auth.uid()::text
      OR public.is_admin()
      OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
      OR (public.is_manager() AND id IN (SELECT id FROM public.manager_classes()))
    )
    AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ·· assignments ··
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments
  FOR SELECT TO authenticated USING (
    class_id IN (
      SELECT id FROM public.classes
      WHERE teacher_uid = auth.uid()::text
         OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
    )
    OR public.is_admin()
    OR (public.is_manager() AND class_id IN (SELECT id FROM public.manager_classes()))
  );

-- ·· progress ··
DROP POLICY IF EXISTS "progress_select" ON public.progress;
CREATE POLICY "progress_select" ON public.progress
  FOR SELECT TO authenticated USING (
    auth.uid()::text = student_uid
    OR class_code IN (
      SELECT code FROM public.classes WHERE teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
    OR (public.is_manager() AND class_code IN (SELECT code FROM public.manager_classes()))
  );

-- ---------------------------------------------------------------------------
-- manager_overview() — one round-trip dashboard payload, scoped server-side
-- to the caller's school. Aggregates instead of shipping every progress row.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.manager_overview()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sid    UUID := public.manager_school();
  result JSONB;
BEGIN
  IF sid IS NULL THEN
    -- Not a manager (or unassigned). Fail closed with an explicit marker.
    RETURN jsonb_build_object('error', 'not_a_manager');
  END IF;

  WITH school_classes AS (
    SELECT c.id, c.code, c.teacher_uid
    FROM public.classes c
    JOIN public.users u ON u.uid = c.teacher_uid
    WHERE u.school_id = sid
  ),
  school_students AS (
    SELECT DISTINCT s.uid, s.xp
    FROM public.users s
    WHERE s.class_code IN (SELECT code FROM school_classes)
  )
  SELECT jsonb_build_object(
    'school', (
      SELECT jsonb_build_object('id', sc.id, 'name', sc.name)
      FROM public.schools sc WHERE sc.id = sid
    ),
    'totals', jsonb_build_object(
      'teachers', (SELECT count(*) FROM public.users WHERE school_id = sid AND role = 'teacher'),
      'classes',  (SELECT count(*) FROM school_classes),
      'students', (SELECT count(*) FROM school_students),
      'active_students_7d', (
        SELECT count(DISTINCT p.student_uid)
        FROM public.progress p
        WHERE p.completed_at > now() - interval '7 days'
          AND p.class_code IN (SELECT code FROM school_classes)
      ),
      'games_7d', (
        SELECT count(*)
        FROM public.progress p
        WHERE p.completed_at > now() - interval '7 days'
          AND p.class_code IN (SELECT code FROM school_classes)
      ),
      'total_xp', (SELECT COALESCE(sum(xp), 0) FROM school_students)
    ),
    'teachers', COALESCE((
      SELECT jsonb_agg(t ORDER BY t->>'display_name')
      FROM (
        SELECT jsonb_build_object(
          'uid', u.uid,
          'display_name', u.display_name,
          'email', u.email,
          'class_count', (
            SELECT count(*) FROM public.classes c WHERE c.teacher_uid = u.uid
          ),
          'student_count', (
            SELECT count(DISTINCT s.uid) FROM public.users s
            WHERE s.class_code IN (
              SELECT c.code FROM public.classes c WHERE c.teacher_uid = u.uid
            )
          ),
          'active_students_7d', (
            SELECT count(DISTINCT p.student_uid) FROM public.progress p
            WHERE p.completed_at > now() - interval '7 days'
              AND p.class_code IN (
                SELECT c.code FROM public.classes c WHERE c.teacher_uid = u.uid
              )
          ),
          'last_activity', (
            SELECT max(p.completed_at) FROM public.progress p
            WHERE p.class_code IN (
              SELECT c.code FROM public.classes c WHERE c.teacher_uid = u.uid
            )
          )
        ) AS t
        FROM public.users u
        WHERE u.school_id = sid AND u.role = 'teacher'
      ) sub
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- Authenticated clients may call it; the body self-scopes to the caller's
-- school and returns {"error":"not_a_manager"} for everyone else.
REVOKE ALL ON FUNCTION public.manager_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_overview() TO authenticated;
