-- =============================================================================
-- Vocaband — Supabase PostgreSQL Schema
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  uid          TEXT PRIMARY KEY,          -- matches auth.uid()
  email        TEXT,
  role         TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
  display_name TEXT NOT NULL DEFAULT '',
  class_code   TEXT,
  avatar       TEXT,
  badges       TEXT[]
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

-- ---------------------------------------------------------------------------
-- Indexes (mirrors the Firestore composite indexes)
-- ---------------------------------------------------------------------------

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

ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress    ENABLE ROW LEVEL SECURITY;

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

-- ·· users ··
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid()::text = uid OR public.is_admin());

CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::text = uid);

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
-- The 6-digit class code IS the join credential — knowing it grants access to the class.
-- We intentionally allow any authenticated user to look up a class by code so that
-- new students (who have no user row yet) can validate the code during login.
-- The practical enumeration risk is low (1 million possible codes, rate-limited by Supabase).
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );

CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );

CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (
    auth.uid()::text = teacher_uid AND public.is_teacher()
  );

-- ·· assignments ··
-- Teachers see their own classes' assignments; students see their enrolled class's assignments.
CREATE POLICY "assignments_select" ON public.assignments
  FOR SELECT TO authenticated USING (
    class_id IN (
      SELECT id FROM public.classes
      WHERE teacher_uid = auth.uid()::text
         OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
    )
    OR public.is_admin()
  );

CREATE POLICY "assignments_insert" ON public.assignments
  FOR INSERT WITH CHECK (public.is_teacher() OR public.is_admin());

CREATE POLICY "assignments_update" ON public.assignments
  FOR UPDATE USING (public.is_teacher() OR public.is_admin());

CREATE POLICY "assignments_delete" ON public.assignments
  FOR DELETE USING (public.is_teacher() OR public.is_admin());

-- ·· progress ··
-- Students see only their own progress; teachers see progress for their classes only.
CREATE POLICY "progress_select" ON public.progress
  FOR SELECT TO authenticated USING (
    auth.uid()::text = student_uid
    OR class_code IN (
      SELECT code FROM public.classes WHERE teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  );

CREATE POLICY "progress_insert" ON public.progress
  FOR INSERT WITH CHECK (
    auth.uid()::text = student_uid
  );

-- Students can only update their own records, and only to a higher score
CREATE POLICY "progress_update" ON public.progress
  FOR UPDATE
  USING (auth.uid()::text = student_uid)
  WITH CHECK (
    auth.uid()::text = student_uid AND
    score >= (SELECT p2.score FROM public.progress p2 WHERE p2.id = progress.id)
  );

-- ---------------------------------------------------------------------------
-- Enable anonymous sign-ins
-- (Dashboard → Authentication → Providers → Anonymous: toggle ON)
-- This cannot be done via SQL; do it in the Supabase dashboard.
-- ---------------------------------------------------------------------------
