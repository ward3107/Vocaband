-- =============================================================================
-- Migration 006: Prevent duplicate progress records
-- =============================================================================
--
-- Problem: Without a unique constraint, race conditions (two tabs, rapid
--   clicks) can insert duplicate progress rows for the same student +
--   assignment + mode + class.  This inflates grades in the teacher gradebook.
--
-- Fix: Add a unique constraint.  If duplicates already exist, deduplicate
--   first by keeping the highest-scoring row per combination.
-- =============================================================================

-- Step 1: Remove existing duplicates (keep the row with the highest score)
DELETE FROM public.progress
WHERE id NOT IN (
  SELECT DISTINCT ON (assignment_id, student_uid, mode, class_code) id
  FROM public.progress
  ORDER BY assignment_id, student_uid, mode, class_code, score DESC
);

-- Step 2: Add the unique constraint
ALTER TABLE public.progress
  ADD CONSTRAINT uq_progress_assignment_student_mode_class
  UNIQUE (assignment_id, student_uid, mode, class_code);
