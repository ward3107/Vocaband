-- Teacher dashboard theme — per-teacher visual preference for the
-- main dashboard chrome (page background, accents).  Stores the
-- short string id of one of the predefined themes defined in
-- src/constants/teacherDashboardThemes.ts ('default', 'spring',
-- 'sunset', 'forest', 'midnight' as of this commit).
--
-- Stored on `public.users` (single column) rather than a separate
-- `teacher_preferences` table because (a) we have one preference
-- and don't currently need a 1-N table, (b) every teacher row
-- already exists and gets the column for free with the default
-- value 'default', (c) a separate table would add a join on every
-- dashboard render.
--
-- Students get the column too but never read it client-side; not
-- worth a CHECK constraint or a partial index since the value is
-- only consumed by the teacher dashboard.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS teacher_dashboard_theme TEXT DEFAULT 'default';
