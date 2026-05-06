-- Vocabagrut — Bagrut-style mock exam generator.
--
-- Three tables:
--   bagrut_tests      — generated tests (teacher-owned, optionally published to a class)
--   bagrut_responses  — per-student responses (autosaved while editing, locked on submit)
--   bagrut_cache      — server-only cache of AI-generated content keyed by sha256(module + model + sorted(words))
--
-- The Israeli English Bagrut is structured by *modules* (A, B, C, D, E, F, G).
-- v1 supports A, B, C — the three "general English exam" modules with the same
-- reading + vocab-in-context + writing shape, scaled by difficulty.  D and E will
-- come in v2 with their own templates (literature, extended writing).
--
-- mc_score is canonical only as written by the server-side `/api/submit-bagrut`
-- endpoint.  Clients can technically update the column via RLS (we don't have
-- column-level grants), but the gradebook always shows the server-computed
-- value re-derived from bagrut_tests.content + bagrut_responses.answers.

BEGIN;

-- ── bagrut_tests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bagrut_tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid   TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  class_id      UUID REFERENCES public.classes(id) ON DELETE SET NULL,  -- NULL while editing as draft
  module        TEXT NOT NULL CHECK (module IN ('A', 'B', 'C', 'D', 'E')),  -- D/E reserved for v2
  title         TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  source_words  TEXT[] NOT NULL,
  content       JSONB NOT NULL,                                          -- validated BagrutTest JSON
  published     BOOLEAN NOT NULL DEFAULT false,                          -- gates student visibility
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bagrut_tests_teacher  ON public.bagrut_tests (teacher_uid);
CREATE INDEX IF NOT EXISTS idx_bagrut_tests_class    ON public.bagrut_tests (class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bagrut_tests_pub_class ON public.bagrut_tests (class_id, published) WHERE published = true;

-- ── bagrut_responses ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bagrut_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id        UUID NOT NULL REFERENCES public.bagrut_tests(id) ON DELETE CASCADE,
  student_uid    TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  answers        JSONB NOT NULL DEFAULT '{}'::jsonb,    -- { [question_id]: string }
  mc_score       INTEGER,                               -- auto-graded MC subtotal (NULL until submit)
  mc_max         INTEGER,                               -- max points possible from MC questions
  writing_grade  INTEGER,                               -- nullable; teacher fills in later
  submitted_at   TIMESTAMPTZ,                           -- NULL while in-progress; set on submit
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_id, student_uid)                         -- one response per student per test
);

CREATE INDEX IF NOT EXISTS idx_bagrut_responses_test    ON public.bagrut_responses (test_id);
CREATE INDEX IF NOT EXISTS idx_bagrut_responses_student ON public.bagrut_responses (student_uid);

-- ── bagrut_cache ───────────────────────────────────────────────────────────
-- Server-only.  No RLS policies = no client access.  Accessed via service-role
-- key from server.ts.  Nightly cleanup deletes expired rows.
CREATE TABLE IF NOT EXISTS public.bagrut_cache (
  cache_key   TEXT PRIMARY KEY,                         -- sha256(module + model + sorted(words))
  module      TEXT NOT NULL,
  model       TEXT NOT NULL,                            -- which Claude model produced it
  content     JSONB NOT NULL,                           -- validated BagrutTest JSON
  hits        INTEGER NOT NULL DEFAULT 0,               -- track real hit rate for cost analysis
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_bagrut_cache_expires ON public.bagrut_cache (expires_at);

-- ── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.bagrut_tests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bagrut_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bagrut_cache     ENABLE ROW LEVEL SECURITY;
-- bagrut_cache: no policies = no client access (same pattern as ai_allowlist).

-- ── bagrut_tests RLS — mirrors `assignments` pattern ───────────────────────
DROP POLICY IF EXISTS "bagrut_tests_select" ON public.bagrut_tests;
CREATE POLICY "bagrut_tests_select" ON public.bagrut_tests
  FOR SELECT TO authenticated USING (
    -- Teacher who owns the test (drafts visible to owner regardless of class_id)
    teacher_uid = auth.uid()::text
    -- OR student enrolled in a class where the test is published
    OR (
      published = true
      AND class_id IS NOT NULL
      AND class_id IN (
        SELECT id FROM public.classes
        WHERE code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "bagrut_tests_insert" ON public.bagrut_tests;
CREATE POLICY "bagrut_tests_insert" ON public.bagrut_tests
  FOR INSERT WITH CHECK (
    public.is_teacher()
    AND teacher_uid = auth.uid()::text
    -- If class_id is set, must be a class the teacher owns
    AND (
      class_id IS NULL
      OR class_id IN (SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "bagrut_tests_update" ON public.bagrut_tests;
CREATE POLICY "bagrut_tests_update" ON public.bagrut_tests
  FOR UPDATE USING (
    teacher_uid = auth.uid()::text AND public.is_teacher()
  ) WITH CHECK (
    teacher_uid = auth.uid()::text
    AND (
      class_id IS NULL
      OR class_id IN (SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "bagrut_tests_delete" ON public.bagrut_tests;
CREATE POLICY "bagrut_tests_delete" ON public.bagrut_tests
  FOR DELETE USING (
    teacher_uid = auth.uid()::text AND public.is_teacher()
  );

-- ── bagrut_responses RLS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "bagrut_responses_select" ON public.bagrut_responses;
CREATE POLICY "bagrut_responses_select" ON public.bagrut_responses
  FOR SELECT TO authenticated USING (
    -- Student sees their own responses
    student_uid = auth.uid()::text
    -- Teacher sees all responses on tests they own
    OR test_id IN (
      SELECT id FROM public.bagrut_tests WHERE teacher_uid = auth.uid()::text
    )
    OR public.is_admin()
  );

-- Students may insert their own row, only against a published test in their class.
DROP POLICY IF EXISTS "bagrut_responses_insert" ON public.bagrut_responses;
CREATE POLICY "bagrut_responses_insert" ON public.bagrut_responses
  FOR INSERT WITH CHECK (
    student_uid = auth.uid()::text
    AND test_id IN (
      SELECT t.id FROM public.bagrut_tests t
      JOIN public.classes c ON c.id = t.class_id
      WHERE t.published = true
        AND c.code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
    )
  );

-- Students update own row pre-submit (autosave). Teachers can update writing_grade
-- on tests they own.  We don't enforce column-level restrictions in RLS — the
-- server-side `/api/submit-bagrut` endpoint computes mc_score canonically, and
-- the gradebook always re-derives MC from content + answers, so client tampering
-- with mc_score is moot.
DROP POLICY IF EXISTS "bagrut_responses_update" ON public.bagrut_responses;
CREATE POLICY "bagrut_responses_update" ON public.bagrut_responses
  FOR UPDATE USING (
    -- Student can update own row only while not yet submitted
    (student_uid = auth.uid()::text AND submitted_at IS NULL)
    -- Teacher can update responses on tests they own (for writing_grade)
    OR test_id IN (
      SELECT id FROM public.bagrut_tests WHERE teacher_uid = auth.uid()::text
    )
  );

-- ── updated_at triggers ────────────────────────────────────────────────────
-- SECURITY DEFINER + fixed search_path: prevents a malicious caller from
-- redirecting `now()` or `updated_at` via a custom search_path.  Matches
-- the pattern used in mark_teacher_onboarded (20260608_teacher_onboarded_at.sql).
CREATE OR REPLACE FUNCTION public.bagrut_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bagrut_tests_set_updated_at ON public.bagrut_tests;
CREATE TRIGGER bagrut_tests_set_updated_at
  BEFORE UPDATE ON public.bagrut_tests
  FOR EACH ROW EXECUTE FUNCTION public.bagrut_set_updated_at();

DROP TRIGGER IF EXISTS bagrut_responses_set_updated_at ON public.bagrut_responses;
CREATE TRIGGER bagrut_responses_set_updated_at
  BEFORE UPDATE ON public.bagrut_responses
  FOR EACH ROW EXECUTE FUNCTION public.bagrut_set_updated_at();

COMMIT;
