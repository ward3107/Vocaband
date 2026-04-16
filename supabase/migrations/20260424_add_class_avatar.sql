-- =============================================================================
-- Add avatar column to classes
-- =============================================================================
-- Lets teachers attach a small visual identifier (emoji) to each class so
-- their dashboard becomes scannable when they have many classes.  The
-- avatar is purely cosmetic — joining a class still uses the code, and
-- all foreign keys (assignments, progress, student_profiles) are tied to
-- class_id / class_code (NOT name or avatar), so renaming and avatar
-- changes are non-destructive: students, assignments, and progress all
-- survive both operations.
--
-- The teacher UPDATE policy on classes already covers this column
-- (added in 20260402_add_teacher_class_rls.sql).

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS avatar TEXT;

COMMENT ON COLUMN public.classes.avatar IS
  'Optional emoji identifier for the class — chosen from a curated, '
  'education-appropriate pool in the client.  NULL = use default icon.';
