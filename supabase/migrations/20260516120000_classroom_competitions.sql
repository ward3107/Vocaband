-- =============================================================================
-- Classroom competitions — async tournaments layered onto assignments
-- =============================================================================
--
-- A "competition" is a thin metadata wrapper around an existing assignment.
-- Teachers toggle it on at assignment-create time; while it's live the
-- students of that class see a leaderboard ranking everyone's cumulative
-- score on the assignment.  When the assignment deadline passes (or the
-- teacher manually ends it) the leaderboard freezes and shows the final
-- standings.
--
-- Design intent: NO changes to the progress table or any scoring code.
-- The leaderboard is a SUM-over-progress query filtered by the
-- competition's time window.  This keeps the surface area small and the
-- migration fully reversible (DROP TABLE leaves all gameplay intact).
--
-- One competition per assignment (UNIQUE on assignment_id).  A teacher
-- who wants a fresh competition on the same word list creates a new
-- assignment.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.competitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE
                  REFERENCES public.assignments(id) ON DELETE CASCADE,
  class_id      UUID NOT NULL
                  REFERENCES public.classes(id) ON DELETE CASCADE,
  opens_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at     TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'live'
                  CHECK (status IN ('live', 'ended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT competitions_window CHECK (closes_at > opens_at)
);

CREATE INDEX IF NOT EXISTS idx_competitions_class_status
  ON public.competitions (class_id, status);
CREATE INDEX IF NOT EXISTS idx_competitions_assignment
  ON public.competitions (assignment_id);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- SELECT: teacher of the class OR student enrolled in the class.
-- Mirrors the assignments_select policy so a student who can see the
-- assignment can also see the competition wrapper, but no cross-class
-- leakage.
DROP POLICY IF EXISTS "competitions_select" ON public.competitions;
CREATE POLICY "competitions_select" ON public.competitions
  FOR SELECT TO authenticated USING (
    class_id IN (
      SELECT id FROM public.classes
      WHERE teacher_uid = auth.uid()::text
         OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
    )
    OR public.is_admin()
  );

-- INSERT / UPDATE / DELETE: teacher of the class only.
DROP POLICY IF EXISTS "competitions_insert" ON public.competitions;
CREATE POLICY "competitions_insert" ON public.competitions
  FOR INSERT WITH CHECK (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "competitions_update" ON public.competitions;
CREATE POLICY "competitions_update" ON public.competitions
  FOR UPDATE USING (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "competitions_delete" ON public.competitions;
CREATE POLICY "competitions_delete" ON public.competitions
  FOR DELETE USING (
    (
      public.is_teacher()
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_uid = auth.uid()::text
      )
    )
    OR public.is_admin()
  );

-- Realtime: the leaderboard widget needs to repaint when a classmate
-- finishes a round (progress row appears) AND when the teacher flips a
-- competition to 'ended'.  progress is already in the publication
-- (see 20260517_enable_realtime_for_dashboard_tables.sql).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'competitions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- competition_leaderboard(p_competition_id) — SECURITY DEFINER
-- ---------------------------------------------------------------------------
-- Returns the ranked aggregate scores for a single competition.  Used by
-- both the teacher's live-standings view and the student's in-game
-- leaderboard tab.
--
-- The function is SECURITY DEFINER on purpose: regular progress RLS only
-- exposes a student's own rows, but the competition page intentionally
-- shows classmates' aggregate totals (not individual mode rows).  By
-- aggregating server-side we never leak per-row attempts to other
-- students.
--
-- Ranking:
--   1. total_score DESC  (sum across all modes within the window)
--   2. last_played ASC   (whoever hit that score first wins the tie)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.competition_leaderboard(UUID);

CREATE OR REPLACE FUNCTION public.competition_leaderboard(
  p_competition_id UUID
)
RETURNS TABLE (
  student_uid  TEXT,
  student_name TEXT,
  avatar       TEXT,
  total_score  NUMERIC,
  last_played  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_assignment_id UUID;
  v_class_id      UUID;
  v_class_code    TEXT;
  v_opens_at      TIMESTAMPTZ;
  v_closes_at     TIMESTAMPTZ;
  v_caller_uid    TEXT;
  v_caller_is_teacher BOOLEAN;
  v_caller_class_code TEXT;
BEGIN
  v_caller_uid := auth.uid()::text;
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT c.assignment_id, c.class_id, cl.code, c.opens_at, c.closes_at
    INTO v_assignment_id, v_class_id, v_class_code, v_opens_at, v_closes_at
    FROM public.competitions c
    JOIN public.classes cl ON cl.id = c.class_id
   WHERE c.id = p_competition_id;

  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Competition not found' USING ERRCODE = '42704';
  END IF;

  -- Authorization: caller must be the teacher of the class OR a student
  -- enrolled in it (class_code matches).  Mirrors the SELECT policy.
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = v_class_id AND teacher_uid = v_caller_uid
  ) INTO v_caller_is_teacher;

  SELECT class_code INTO v_caller_class_code
    FROM public.users WHERE uid = v_caller_uid;

  IF NOT v_caller_is_teacher
     AND v_caller_class_code IS DISTINCT FROM v_class_code
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized for this competition' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      p.student_uid,
      MAX(p.student_name)             AS student_name,
      MAX(p.avatar)                   AS avatar,
      SUM(p.score)::numeric           AS total_score,
      MAX(p.completed_at)             AS last_played
    FROM public.progress p
    WHERE p.assignment_id = v_assignment_id
      AND p.class_code   = v_class_code
      AND p.completed_at >= v_opens_at
      AND p.completed_at <= LEAST(v_closes_at, now())
      AND p.mode <> 'flashcards'
    GROUP BY p.student_uid
    ORDER BY total_score DESC, last_played ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.competition_leaderboard(UUID) TO authenticated;

COMMENT ON FUNCTION public.competition_leaderboard IS
  'Returns the ranked leaderboard for a classroom competition. '
  'Authorizes the caller as either the class teacher or an enrolled '
  'student, then sums progress.score per student within the '
  'competition window. Tie-break: earliest last completion wins.';

-- ---------------------------------------------------------------------------
-- auto_end_due_competitions() — flips status to 'ended' when closes_at passes
-- ---------------------------------------------------------------------------
-- Called opportunistically from the client (cheap, idempotent) so we
-- don't need a cron extension.  Returns the number of competitions
-- updated, so the caller can know whether to refresh local state.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_end_due_competitions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.competitions
     SET status = 'ended'
   WHERE status = 'live'
     AND closes_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_end_due_competitions() TO authenticated;

COMMENT ON FUNCTION public.auto_end_due_competitions IS
  'Best-effort closer — flips overdue live competitions to ended. '
  'Called opportunistically by clients to avoid needing a cron job.';
