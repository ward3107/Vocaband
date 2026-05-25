-- =============================================================================
-- Vocaband — Supabase PostgreSQL Schema
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Organization layer above teachers. A school groups its teachers (and,
-- through them, classes + students) so a 'manager' (principal) can oversee
-- only their own school. Managed by the operator via the service role.
CREATE TABLE IF NOT EXISTS public.schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) < 200),
  -- Billing: 'free' = no license (members keep their own plan); 'school' = an
  -- active license that makes every member user Pro, derived through
  -- is_pro_or_trialing().  trial_ends_at gives an optional school-wide Pro
  -- trial.  Operator/service-role only -- schools has no client write policy.
  -- See migration 20260624000000_school_license_propagates_pro.sql.
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'school')),
  trial_ends_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  uid          TEXT PRIMARY KEY,          -- matches auth.uid()
  email        TEXT,
  -- Three roles only.  The client-side `AppUser.role` TS union
  -- also includes 'guest' for in-memory Quick Play participants —
  -- guests are intentionally NOT persisted here (no `public.users`
  -- row exists for them).  See src/core/supabase.ts AppUser type
  -- for the architectural note.  Audit L-4 (2026-05-23).
  -- 'manager' = school principal: read-only oversight of their school's
  -- teachers/classes/students (school-scoped, distinct from the global
  -- 'admin'). See migration 20260623000000_school_manager.sql.
  role         TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin', 'manager')),
  display_name TEXT NOT NULL DEFAULT '',
  class_code   TEXT,
  avatar       TEXT,
  badges       TEXT[],
  -- School the user belongs to (teachers + managers). NULL for users not
  -- attached to a school. A class's school is derived through its teacher,
  -- so `classes` intentionally has no school_id of its own.
  school_id    UUID REFERENCES public.schools(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) < 100),
  teacher_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  code        TEXT NOT NULL CHECK (char_length(code) = 6),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  word_ids      INTEGER[],
  words         JSONB,
  title         TEXT NOT NULL CHECK (char_length(title) > 0),
  deadline      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  allowed_modes TEXT[]
);

CREATE TABLE IF NOT EXISTS public.progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name  TEXT NOT NULL CHECK (char_length(student_name) > 0),
  student_uid   TEXT NOT NULL,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  class_code    TEXT NOT NULL,
  score         NUMERIC NOT NULL CHECK (score >= 0 AND score <= 1000),
  mode          TEXT NOT NULL,
  completed_at  TIMESTAMPTZ NOT NULL,
  mistakes      INTEGER[],
  avatar        TEXT
);

-- Pre-approved teacher email addresses.
-- Managed via the Supabase dashboard only (no client-side access).
CREATE TABLE IF NOT EXISTS public.teacher_allowlist (
  email TEXT PRIMARY KEY CHECK (char_length(email) > 0)
);

-- ---------------------------------------------------------------------------
-- Indexes (mirrors the Firestore composite indexes)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_school_id      ON public.users (school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_uid ON public.classes (teacher_uid);
CREATE INDEX IF NOT EXISTS idx_classes_code        ON public.classes (code);
CREATE INDEX IF NOT EXISTS idx_assignments_class   ON public.assignments (class_id);

-- Composite indexes equivalent to firestore.indexes.json
CREATE INDEX IF NOT EXISTS idx_progress_class_student
  ON public.progress (class_code, student_name);

CREATE INDEX IF NOT EXISTS idx_progress_dedup
  ON public.progress (assignment_id, mode, student_name, class_code);

CREATE INDEX IF NOT EXISTS idx_progress_class_date
  ON public.progress (class_code, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_progress_score_desc
  ON public.progress (score DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.schools           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_allowlist ENABLE ROW LEVEL SECURITY;
-- No RLS policies on teacher_allowlist — all client access is denied by default.

-- Helper: check if the current user is a teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND role = 'teacher'
  );
$$;

-- Helper: check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND role = 'admin'
  );
$$;

-- Check if an email is in the teacher allowlist (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_teacher_allowed(check_email TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_allowlist
    WHERE email = lower(check_email)
  );
$$;

-- Helper: the caller's school, but ONLY when they are a manager.  NULL for
-- everyone else, so the manager RLS clauses below fail closed (NULL = x is
-- never TRUE).  See migration 20260623000000_school_manager.sql.
CREATE OR REPLACE FUNCTION public.manager_school()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.users
  WHERE uid = auth.uid()::text AND role = 'manager';
$$;

-- Helper: is the current user a (school) manager?
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND role = 'manager'
  );
$$;

-- Helper: the classes (id + code) in the caller's school, resolved through
-- each class's teacher.  SECURITY DEFINER so policy subqueries referencing it
-- don't recurse through users/classes RLS.  Empty set for non-managers.
CREATE OR REPLACE FUNCTION public.manager_classes()
RETURNS TABLE(id UUID, code TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.code
  FROM public.classes c
  JOIN public.users u ON u.uid = c.teacher_uid
  WHERE u.school_id = public.manager_school();
$$;

-- ·· schools ·· managers read their own school; admins read all; any user
-- may read the school they belong to (for display).  No write policies —
-- schools are operator-managed via the service role.
DROP POLICY IF EXISTS "schools_select" ON public.schools;
CREATE POLICY "schools_select" ON public.schools
  FOR SELECT TO authenticated USING (
    public.is_admin()
    OR id = public.manager_school()
    OR id = (SELECT school_id FROM public.users WHERE uid = auth.uid()::text)
  );

-- ·· users ··
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

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (auth.uid()::text = uid OR public.is_admin())
  WITH CHECK (
    -- Admins can assign any valid role
    public.is_admin()
    OR
    -- Everyone else must keep their existing role (no self-promotion)
    role = (SELECT u.role FROM public.users u WHERE u.uid = auth.uid()::text)
  );

-- ·· classes ··
-- Tenant-scoped read: teachers see only their own classes; students see
-- only the single class their `users.class_code` points at; admins see
-- everything.  Anonymous-auth sessions (`auth.jwt() ->> 'is_anonymous'
-- = true`) are blocked from direct reads as belt-and-braces against a
-- compromised anon session enumerating classes.
--
-- Pre-membership lookup — when a student is joining a class by code
-- for the first time and is not yet in `public.users` — goes through
-- the SECURITY DEFINER RPC `get_class_by_code` (rate-limited 30/min
-- per uid+ip).  See migration 20260619000001 for the rate limit, and
-- 20260517160000 for the anon-execute grant on the RPC.
--
-- History — earlier baselines of this file had `USING(true)`, which
-- let any authenticated user list every class row in the database.
-- The fix shipped in migrations 20260430_hardening_and_perf.sql and
-- 20260517125414_filter_anon_auth_round2.sql; this baseline mirrors
-- the resulting effective policy so the file matches production and
-- a fresh `psql -f schema.sql` bootstrap starts in the secure state.
-- Cross-tenant enumeration is verified by pen-test [9b] in
-- scripts/security-pen-test.sh.  Closes audit finding C-3.
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

DROP POLICY IF EXISTS "classes_insert" ON public.classes;
CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );

DROP POLICY IF EXISTS "classes_update" ON public.classes;
CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );

DROP POLICY IF EXISTS "classes_delete" ON public.classes;
CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );

-- ·· assignments ··
-- Teachers see their own classes' assignments; students see their enrolled class's assignments.
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

DROP POLICY IF EXISTS "assignments_insert" ON public.assignments;
CREATE POLICY "assignments_insert" ON public.assignments
  FOR INSERT WITH CHECK (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "assignments_update" ON public.assignments;
CREATE POLICY "assignments_update" ON public.assignments
  FOR UPDATE USING (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "assignments_delete" ON public.assignments;
CREATE POLICY "assignments_delete" ON public.assignments
  FOR DELETE USING (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

-- ·· progress ··
-- Students see only their own progress; teachers see progress for their classes only.
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

DROP POLICY IF EXISTS "progress_insert" ON public.progress;
CREATE POLICY "progress_insert" ON public.progress
  FOR INSERT WITH CHECK (
    auth.uid()::text = student_uid
    AND class_code = (
      SELECT class_code FROM public.users WHERE uid = auth.uid()::text
    )
  );

-- Students can only update their own records, and only to a higher score
DROP POLICY IF EXISTS "progress_update" ON public.progress;
CREATE POLICY "progress_update" ON public.progress
  FOR UPDATE
  USING (auth.uid()::text = student_uid)
  WITH CHECK (
    auth.uid()::text = student_uid AND
    score >= (SELECT p2.score FROM public.progress p2 WHERE p2.id = progress.id)
  );

-- ---------------------------------------------------------------------------
-- manager_overview() + the Principal Console drill-down / engagement RPCs.
-- All school-scoped, SECURITY DEFINER, aggregated server-side; the detail
-- functions also verify the requested teacher/class belongs to the caller's
-- school.  See migrations 20260623000000_school_manager.sql and
-- 20260623000001_manager_console.sql for full rationale.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manager_overview()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;
  WITH sc AS (
    SELECT c.id, c.name, c.code, c.teacher_uid
    FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid WHERE u.school_id = sid
  ),
  ss AS (SELECT DISTINCT s.uid, s.xp FROM public.users s WHERE s.class_code IN (SELECT code FROM sc)),
  eng AS (
    SELECT to_char(now()::date - n, 'MM-DD') AS d,
      (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS active,
      (SELECT count(*) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS games
    FROM generate_series(13, 0, -1) AS n
  )
  SELECT jsonb_build_object(
    'school', (SELECT jsonb_build_object('id', id, 'name', name) FROM public.schools WHERE id = sid),
    'totals', jsonb_build_object(
      'teachers', (SELECT count(*) FROM public.users WHERE school_id = sid AND role = 'teacher'),
      'classes',  (SELECT count(*) FROM sc),
      'students', (SELECT count(*) FROM ss),
      'active_students_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '7 days'),
      'games_7d', (SELECT count(*) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '7 days'),
      'total_xp', (SELECT COALESCE(sum(xp), 0) FROM ss)
    ),
    'teachers', (SELECT COALESCE(jsonb_agg(t ORDER BY t->>'display_name'), '[]'::jsonb) FROM (
      SELECT jsonb_build_object(
        'uid', u.uid, 'display_name', u.display_name, 'email', u.email,
        'class_count', (SELECT count(*) FROM public.classes c WHERE c.teacher_uid = u.uid),
        'student_count', (SELECT count(DISTINCT s.uid) FROM public.users s WHERE s.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid)),
        'active_students_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid) AND p.completed_at > now() - interval '7 days'),
        'last_activity', (SELECT max(p.completed_at) FROM public.progress p WHERE p.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid))
      ) AS t FROM public.users u WHERE u.school_id = sid AND u.role = 'teacher') q),
    'engagement14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active, 'games', games)), '[]'::jsonb) FROM eng),
    'students_by_class', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', cnt) ORDER BY cnt DESC), '[]'::jsonb) FROM (
      SELECT sc.name, (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code) AS cnt FROM sc ORDER BY cnt DESC LIMIT 6) z),
    'xp_by_teacher', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', display_name, 'xp', xp) ORDER BY xp DESC), '[]'::jsonb) FROM (
      SELECT u.display_name, (SELECT COALESCE(sum(s.xp), 0) FROM public.users s WHERE s.class_code IN (SELECT code FROM public.classes c WHERE c.teacher_uid = u.uid)) AS xp
      FROM public.users u WHERE u.school_id = sid AND u.role = 'teacher') y),
    'classes', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'code', code,
        'teacher_name', (SELECT display_name FROM public.users WHERE uid = sc.teacher_uid),
        'students', (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code),
        'avg_score', (SELECT round(avg(p.score)) FROM public.progress p WHERE p.class_code = sc.code),
        'completion', CASE WHEN (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code) = 0 THEN 0
          ELSE round(100.0 * (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = sc.code) / (SELECT count(*) FROM public.users s WHERE s.class_code = sc.code)) END,
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = sc.code AND p.completed_at > now() - interval '7 days'),
        'last_activity', (SELECT max(p.completed_at) FROM public.progress p WHERE p.class_code = sc.code)
      ) ORDER BY name), '[]'::jsonb) FROM sc)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.manager_engagement()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;
  WITH sc AS (SELECT c.code FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid WHERE u.school_id = sid)
  SELECT jsonb_build_object(
    'active30', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(29, 0, -1) AS n) a),
    'games14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'games', games)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(*) FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at::date = now()::date - n) AS games
      FROM generate_series(13, 0, -1) AS n) g),
    'dow', (SELECT COALESCE(jsonb_agg(jsonb_build_object('dow', dow, 'plays', plays) ORDER BY dow), '[]'::jsonb) FROM (
      SELECT EXTRACT(DOW FROM p.completed_at)::int AS dow, count(*) AS plays
      FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '30 days' GROUP BY 1) d),
    'modes', (SELECT COALESCE(jsonb_agg(jsonb_build_object('mode', mode, 'plays', plays) ORDER BY plays DESC), '[]'::jsonb) FROM (
      SELECT p.mode, count(*) AS plays FROM public.progress p WHERE p.class_code IN (SELECT code FROM sc) AND p.completed_at > now() - interval '30 days' GROUP BY p.mode ORDER BY plays DESC LIMIT 8) m)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.manager_teacher_detail(p_uid TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = p_uid AND school_id = sid AND role = 'teacher') THEN
    RETURN jsonb_build_object('error', 'not_in_school');
  END IF;
  WITH tc AS (SELECT id, name, code FROM public.classes WHERE teacher_uid = p_uid)
  SELECT jsonb_build_object(
    'teacher', (SELECT jsonb_build_object('uid', u.uid, 'display_name', u.display_name, 'email', u.email,
        'classes', (SELECT count(*) FROM tc),
        'students', (SELECT count(DISTINCT s.uid) FROM public.users s WHERE s.class_code IN (SELECT code FROM tc)),
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM tc) AND p.completed_at > now() - interval '7 days'),
        'xp', (SELECT COALESCE(sum(s.xp), 0) FROM public.users s WHERE s.class_code IN (SELECT code FROM tc)))
      FROM public.users u WHERE u.uid = p_uid),
    'activity14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code IN (SELECT code FROM tc) AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(13, 0, -1) AS n) a),
    'per_class', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'students', cnt) ORDER BY name), '[]'::jsonb) FROM (
      SELECT tc.name, (SELECT count(*) FROM public.users s WHERE s.class_code = tc.code) AS cnt FROM tc) z),
    'top_students', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', display_name, 'xp', xp) ORDER BY xp DESC), '[]'::jsonb) FROM (
      SELECT s.display_name, COALESCE(s.xp, 0) AS xp FROM public.users s WHERE s.class_code IN (SELECT code FROM tc) ORDER BY s.xp DESC NULLS LAST LIMIT 5) y)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.manager_class_detail(p_class_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID := public.manager_school(); ccode TEXT; result JSONB;
BEGIN
  IF sid IS NULL THEN RETURN jsonb_build_object('error', 'not_a_manager'); END IF;
  SELECT c.code INTO ccode FROM public.classes c JOIN public.users u ON u.uid = c.teacher_uid WHERE c.id = p_class_id AND u.school_id = sid;
  IF ccode IS NULL THEN RETURN jsonb_build_object('error', 'not_in_school'); END IF;
  SELECT jsonb_build_object(
    'class', (SELECT jsonb_build_object('id', c.id, 'name', c.name, 'code', c.code,
        'teacher_name', (SELECT display_name FROM public.users WHERE uid = c.teacher_uid),
        'students', (SELECT count(*) FROM public.users s WHERE s.class_code = c.code),
        'avg_score', (SELECT round(avg(p.score)) FROM public.progress p WHERE p.class_code = c.code),
        'active_7d', (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = c.code AND p.completed_at > now() - interval '7 days'))
      FROM public.classes c WHERE c.id = p_class_id),
    'score_dist', (SELECT COALESCE(jsonb_agg(jsonb_build_object('band', band, 'n', n) ORDER BY ord), '[]'::jsonb) FROM (
      SELECT '0–60' band, 1 ord, count(*) FILTER (WHERE p.score < 600) n FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '60–75', 2, count(*) FILTER (WHERE p.score >= 600 AND p.score < 750) FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '75–90', 3, count(*) FILTER (WHERE p.score >= 750 AND p.score < 900) FROM public.progress p WHERE p.class_code = ccode
      UNION ALL SELECT '90–100', 4, count(*) FILTER (WHERE p.score >= 900) FROM public.progress p WHERE p.class_code = ccode) sd),
    'activity14', (SELECT COALESCE(jsonb_agg(jsonb_build_object('d', d, 'active', active)), '[]'::jsonb) FROM (
      SELECT to_char(now()::date - n, 'MM-DD') AS d,
        (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.class_code = ccode AND p.completed_at::date = now()::date - n) AS active
      FROM generate_series(13, 0, -1) AS n) a),
    'assignments', (SELECT COALESCE(jsonb_agg(jsonb_build_object('title', title, 'completion', completion) ORDER BY created_at DESC), '[]'::jsonb) FROM (
      SELECT a.title, a.created_at,
        CASE WHEN (SELECT count(*) FROM public.users s WHERE s.class_code = ccode) = 0 THEN 0
          ELSE round(100.0 * (SELECT count(DISTINCT p.student_uid) FROM public.progress p WHERE p.assignment_id = a.id) / (SELECT count(*) FROM public.users s WHERE s.class_code = ccode)) END AS completion
      FROM public.assignments a WHERE a.class_id = p_class_id ORDER BY a.created_at DESC LIMIT 8) asg)
  ) INTO result;
  RETURN result;
END; $$;

REVOKE ALL ON FUNCTION public.manager_overview()              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manager_engagement()            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manager_teacher_detail(TEXT)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manager_class_detail(UUID)      FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_overview()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_engagement()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_teacher_detail(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_class_detail(UUID)   TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable anonymous sign-ins
-- (Dashboard → Authentication → Providers → Anonymous: toggle ON)
-- This cannot be done via SQL; do it in the Supabase dashboard.
-- ---------------------------------------------------------------------------
