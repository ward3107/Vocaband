-- ============================================
-- Database Optimizations
-- ============================================
-- Adds missing indexes and optimizes query patterns.

-- 1. GIN index on quick_play_sessions.allowed_modes for array containment queries
CREATE INDEX IF NOT EXISTS idx_quick_play_allowed_modes
  ON public.quick_play_sessions USING GIN (allowed_modes);

-- 2. Index on progress.completed_at for ORDER BY queries (teacher gradebook)
CREATE INDEX IF NOT EXISTS idx_progress_completed_at
  ON public.progress (completed_at DESC);

-- 3. Composite index on progress for the most common teacher query pattern:
--    WHERE class_code IN (...) ORDER BY completed_at DESC
CREATE INDEX IF NOT EXISTS idx_progress_class_code_completed
  ON public.progress (class_code, completed_at DESC);

-- 4. Index on progress.assignment_id for Quick Play realtime filters
CREATE INDEX IF NOT EXISTS idx_progress_assignment_id
  ON public.progress (assignment_id);

-- 5. Index on assignments.class_id for teacher dashboard queries
CREATE INDEX IF NOT EXISTS idx_assignments_class_id
  ON public.assignments (class_id);

-- 6. Sync xp/streak from student_profiles to users via trigger
-- This resolves the data duplication where xp/streak exists in both tables.
-- student_profiles is the source of truth for approval flow,
-- users table is the source of truth for the logged-in session.
-- When a student_profile is approved, copy xp to users.
CREATE OR REPLACE FUNCTION sync_student_xp_to_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if the student has an auth_uid (linked to a users row)
  IF NEW.auth_uid IS NOT NULL THEN
    UPDATE public.users
    SET xp = COALESCE(NEW.xp, 0)
    WHERE uid = NEW.auth_uid::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS trg_sync_student_xp ON public.student_profiles;
CREATE TRIGGER trg_sync_student_xp
  AFTER UPDATE OF xp ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_student_xp_to_users();
