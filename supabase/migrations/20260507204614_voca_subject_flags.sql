-- VocaHebrew Phase 2 — subject flags on classes, assignments, and teacher profiles.
--
-- Adds the minimal schema needed to support multi-subject classes (English first,
-- Hebrew next, others later from VOCA-FAMILY-ROADMAP.md). All columns are
-- defaulted so existing rows continue working as English content with zero
-- backfill needed. CHECK constraint kept narrow ('english' | 'hebrew') —
-- expand it via a follow-up migration when each new Voca ships, not
-- preemptively (typo-protection > flexibility for now).
--
-- See docs/VOCAHEBREW-MVP-PLAN.md for the full plan this is the first
-- code commit of.

BEGIN;

-- 1. classes.subject — every class belongs to exactly one Voca.
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'english';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'classes_subject_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_subject_check
      CHECK (subject IN ('english', 'hebrew'));
  END IF;
END $$;

-- 2. assignments.subject — denormalized from classes.subject for fast filtering
--    (avoids a join on every dashboard list).  Application code is
--    responsible for setting it consistently with the parent class.
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'english';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assignments_subject_check'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_subject_check
      CHECK (subject IN ('english', 'hebrew'));
  END IF;
END $$;

-- 3. users.subjects_taught — for teachers, the array of Vocas they teach.
--    Founder gets {english,hebrew} via a separate UPDATE (see plan).
--    Students keep the default {english} but the field is unused for
--    them (their Voca comes from the class they joined).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subjects_taught TEXT[] NOT NULL DEFAULT '{english}';

COMMIT;

COMMENT ON COLUMN public.classes.subject IS
  'Which Voca this class belongs to. Defaults to ''english'' so existing rows are unchanged. Hebrew added in 20260507_voca_subject_flags. Future Vocas (arabic, math, history, science, bagrut) extend the CHECK constraint when they ship.';

COMMENT ON COLUMN public.assignments.subject IS
  'Denormalized from classes.subject for fast filtering. Application code must keep it consistent with the parent class.';

COMMENT ON COLUMN public.users.subjects_taught IS
  'For teachers: array of Vocas they''re entitled to use. Drives the Voca Picker (or skip-picker if length=1). Defaults to {english} so existing teachers are unchanged. Unused for students.';
