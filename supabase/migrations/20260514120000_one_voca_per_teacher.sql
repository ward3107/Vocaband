-- One Voca per teacher.
--
-- Before: users.subjects_taught TEXT[] allowed any teacher to be entitled to
-- multiple Vocas, and the client showed a Voca Picker after login to pick
-- which one to work in.  In practice English and Hebrew teachers in Israeli
-- schools are different specialists, so the multi-Voca-per-teacher model
-- added complexity for ~0% of real users.  Multi-Voca access is now an
-- admin-only concept (governed by role, not by this column), so each
-- teacher account collapses to a single Voca.
--
-- After: users.subject TEXT (scalar) is the teacher's one Voca.  Admins
-- still see the picker because getEntitledVocas() returns all Vocas when
-- role='admin' regardless of users.subject.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'english';

-- Backfill from the array — first element wins.  COALESCE handles legacy
-- rows that somehow have an empty array (DB default is {english}, so this
-- only triggers on hand-edited rows).
UPDATE public.users
SET subject = COALESCE(subjects_taught[1], 'english')
WHERE subjects_taught IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_subject_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_subject_check
      CHECK (subject IN ('english', 'hebrew'));
  END IF;
END $$;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS subjects_taught;

COMMIT;

COMMENT ON COLUMN public.users.subject IS
  'The single Voca this user belongs to (english | hebrew). For teachers this is immutable after signup. For admins this is a default — admin role grants entry to all Vocas via getEntitledVocas() in src/core/subject.ts. For students, the field is unused (their Voca comes from the class they joined). Replaces users.subjects_taught (dropped 20260514).';
