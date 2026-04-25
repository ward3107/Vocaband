-- ============================================================================
-- Hot-path index tightening — 2026-04-25
--
-- Audit triggered by a Supabase request-volume spike showed two queries
-- running on every interval that didn't have a fully-covering composite
-- index, falling back to a single-column index + an in-memory sort.
-- Both are fast at small N but get expensive once a busy classroom
-- pushes a few thousand rows in:
--
--  1. Quick Play teacher monitor — `WHERE assignment_id = $1
--     ORDER BY completed_at DESC LIMIT 200` runs on every Realtime
--     fan-out + on the polling fallback.  Today it uses
--     `idx_progress_assignment_id` for the filter and sorts in memory.
--     A composite (assignment_id, completed_at DESC) lets the index
--     serve both the filter and the order, so the sort and the LIMIT
--     are free.
--
--  2. Teacher approval list — `WHERE status = 'pending_approval'
--     ORDER BY joined_at DESC` runs on the dashboard poll.  Same
--     pattern: existing single-column status index, sort in memory.
--     A composite (status, joined_at DESC) collapses both into an
--     index scan that returns rows already ordered.
--
-- Both are CREATE INDEX IF NOT EXISTS so re-running the migration is
-- a no-op.  Neither rewrites a query — they just give the planner a
-- better path.
-- ============================================================================

-- Quick Play teacher monitor's "200 most recent rows for this session"
-- query is the single hottest progress lookup in the app — runs on
-- every score update + the polling fallback while Realtime is
-- connecting.  Composite means index-only scan with implicit ordering.
CREATE INDEX IF NOT EXISTS idx_progress_assignment_completed
  ON public.progress (assignment_id, completed_at DESC);

-- Teacher dashboard's pending-approval poll filters by status and
-- orders by joined_at.  Composite avoids the in-memory sort and shrinks
-- the bytes the planner has to touch on each cycle.
CREATE INDEX IF NOT EXISTS idx_student_profiles_status_joined
  ON public.student_profiles (status, joined_at DESC);

COMMENT ON INDEX public.idx_progress_assignment_completed IS
  'Composite (assignment_id, completed_at DESC) — covers Quick Play monitor''s "200 most recent rows for this session" query without an in-memory sort.';
COMMENT ON INDEX public.idx_student_profiles_status_joined IS
  'Composite (status, joined_at DESC) — covers the teacher dashboard''s pending-approval list query without an in-memory sort.';
