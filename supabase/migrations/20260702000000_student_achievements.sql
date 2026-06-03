-- =============================================================================
-- 20260702000000_student_achievements.sql
--
-- Persistent storage for student-earned achievements (arcade redesign,
-- PR #1006).  A row is created the first time a student satisfies an
-- achievement predicate (e.g. "5-Day Streak", "100 Words Mastered").
--
-- Design notes:
--   * Append-only — no UPDATE or DELETE policy.  An achievement, once
--     earned, is permanent.
--   * Composite primary key (user_uid, achievement_id) — guarantees a
--     student can only unlock each achievement once and lets the
--     client use ON CONFLICT DO NOTHING for idempotent upserts.
--   * Students INSERT + SELECT their own rows; teachers SELECT their
--     class's rows for the gradebook view.
--   * No XP grant happens in this table — XP is added via the existing
--     users.xp update path so the economy stays in one place.
--     `xp_awarded` here is informational so the client can render
--     "earned +50 XP" on the toast without re-deriving it from the
--     achievement definition.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_achievements (
  user_uid       text        NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  achievement_id text        NOT NULL,
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  xp_awarded     int         NOT NULL DEFAULT 0,
  PRIMARY KEY (user_uid, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_user
  ON public.student_achievements(user_uid);

ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

-- Students can read their own achievements.
CREATE POLICY "students_read_own_achievements"
  ON public.student_achievements
  FOR SELECT
  USING (auth.uid()::text = user_uid);

-- Students can unlock their own achievements (append-only — no UPDATE/DELETE).
CREATE POLICY "students_insert_own_achievements"
  ON public.student_achievements
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_uid);

-- Teachers can read achievements for students whose class they own.
-- Mirrors the gradebook visibility pattern on the progress table.
CREATE POLICY "teachers_read_class_achievements"
  ON public.student_achievements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users student
      JOIN public.classes cls ON cls.code = student.class_code
      WHERE student.uid = student_achievements.user_uid
        AND cls.teacher_uid = auth.uid()::text
    )
  );
