-- =============================================================================
-- Wrap auth.X() in (SELECT ...) and drop duplicate-permissive policies
-- =============================================================================
--
-- Background: two related performance advisor findings remain after the
-- earlier hardening pass:
--
--   - auth_rls_initplan: 13 RLS policies still call auth.uid() / auth.jwt()
--     / auth.email() directly, which Postgres evaluates per-row. Wrapping
--     the call in (SELECT auth.X()) lets the planner cache it once per
--     query (initplan optimization).
--
--   - multiple_permissive_policies: 4 entries remain across classes (×2)
--     and quick_play_sessions (×2). The classes ones are true duplicates —
--     an old "Teachers can ..." policy and a newer canonical "classes_*"
--     policy do the same thing. The quick_play_sessions pair has two
--     genuinely different rules (active-session-readable-by-all vs
--     own-sessions-readable-by-teacher) that can be merged into one
--     OR'd USING expression.
--
-- This migration does NOT touch the student_profiles SELECT/UPDATE pair —
-- those two policies cover distinct auth scenarios (uid match vs email
-- match for OAuth pre-link) and merging them safely requires a deeper
-- analysis. Their per-row auth wrapping is handled here.
--
-- Closes P1 #7 (initplan) and P1 #8 (duplicates) from the May 2026 audit.
-- Expected to clear all 13 auth_rls_initplan entries and 2 of the 4
-- multiple_permissive_policies entries.
-- =============================================================================

-- ── competitions: 4 policies wrap auth.uid() ──────────────────────────────
DROP POLICY IF EXISTS competitions_delete ON public.competitions;
CREATE POLICY competitions_delete ON public.competitions
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (is_teacher() AND (class_id IN (
      SELECT classes.id FROM classes
      WHERE classes.teacher_uid = (( SELECT auth.uid()))::text
    ))) OR is_admin()
  );

DROP POLICY IF EXISTS competitions_insert ON public.competitions;
CREATE POLICY competitions_insert ON public.competitions
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (is_teacher() AND (class_id IN (
      SELECT classes.id FROM classes
      WHERE classes.teacher_uid = (( SELECT auth.uid()))::text
    ))) OR is_admin()
  );

DROP POLICY IF EXISTS competitions_select ON public.competitions;
CREATE POLICY competitions_select ON public.competitions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (class_id IN (
      SELECT classes.id FROM classes
      WHERE classes.teacher_uid = (( SELECT auth.uid()))::text
         OR classes.code = (SELECT users.class_code FROM users WHERE users.uid = (( SELECT auth.uid()))::text)
    )) OR is_admin()
  );

DROP POLICY IF EXISTS competitions_update ON public.competitions;
CREATE POLICY competitions_update ON public.competitions
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (is_teacher() AND (class_id IN (
      SELECT classes.id FROM classes
      WHERE classes.teacher_uid = (( SELECT auth.uid()))::text
    ))) OR is_admin()
  );

-- ── interactive_worksheets: 2 owner policies wrap auth.uid() ──────────────
DROP POLICY IF EXISTS "Owners can delete own worksheets" ON public.interactive_worksheets;
CREATE POLICY "Owners can delete own worksheets" ON public.interactive_worksheets
  AS PERMISSIVE FOR DELETE TO public
  USING (teacher_uid IS NOT NULL AND (( SELECT auth.uid()))::text = teacher_uid);

DROP POLICY IF EXISTS "Owners can update own worksheets" ON public.interactive_worksheets;
CREATE POLICY "Owners can update own worksheets" ON public.interactive_worksheets
  AS PERMISSIVE FOR UPDATE TO public
  USING      (teacher_uid IS NOT NULL AND (( SELECT auth.uid()))::text = teacher_uid)
  WITH CHECK (teacher_uid IS NOT NULL AND (( SELECT auth.uid()))::text = teacher_uid);

-- ── saved_word_groups: 4 policies wrap auth.jwt()->>'email' ──────────────
DROP POLICY IF EXISTS saved_word_groups_delete_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_delete_own ON public.saved_word_groups
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (lower(teacher_email) = lower(( SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS saved_word_groups_insert_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_insert_own ON public.saved_word_groups
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (lower(teacher_email) = lower(( SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS saved_word_groups_select_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_select_own ON public.saved_word_groups
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (lower(teacher_email) = lower(( SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS saved_word_groups_update_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_update_own ON public.saved_word_groups
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING      (lower(teacher_email) = lower(( SELECT auth.jwt() ->> 'email')))
  WITH CHECK (lower(teacher_email) = lower(( SELECT auth.jwt() ->> 'email')));

-- ── student_profiles "Users can read own profile by email" wraps email() ──
DROP POLICY IF EXISTS "Users can read own profile by email" ON public.student_profiles;
CREATE POLICY "Users can read own profile by email" ON public.student_profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (email = ( SELECT auth.email()));

-- ── teacher_profiles_select wraps auth.jwt()->>'email' ────────────────────
DROP POLICY IF EXISTS teacher_profiles_select ON public.teacher_profiles;
CREATE POLICY teacher_profiles_select ON public.teacher_profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (lower(email) = lower(( SELECT auth.jwt() ->> 'email')) OR is_admin());

-- ── worksheet_attempts "Worksheet owner reads attempts" wraps auth.uid() ──
DROP POLICY IF EXISTS "Worksheet owner reads attempts" ON public.worksheet_attempts;
CREATE POLICY "Worksheet owner reads attempts" ON public.worksheet_attempts
  AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM interactive_worksheets w
    WHERE w.slug = worksheet_attempts.slug
      AND w.teacher_uid IS NOT NULL
      AND w.teacher_uid = (( SELECT auth.uid()))::text
  ));

-- ── P1 #8: drop duplicate classes DELETE/UPDATE policies ──────────────────
-- "Teachers can delete own classes" and "Teachers can update own classes"
-- are functionally subsumed by classes_delete and classes_update, which
-- additionally enforce is_teacher() / is_admin(). classes.teacher_uid is
-- always a teacher by app invariant, so dropping the older pair changes
-- no end-user behaviour but eliminates the multiple_permissive_policies
-- lint on (classes, authenticated, DELETE) and (classes, authenticated,
-- UPDATE).
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;

-- ── P1 #8: merge quick_play_sessions SELECT pair into one policy ──────────
-- Today there are two permissive SELECT policies on quick_play_sessions:
--   - "Teachers can read own sessions": teachers see their own sessions
--   - "qp_sessions_select":             ALL authenticated see ACTIVE sessions
-- Both serve real flows (teacher dashboard vs student joining via code),
-- but as separate permissive policies they multiply during evaluation.
-- Merging into one OR'd USING expression preserves both rules with a
-- single policy evaluation pass.
DROP POLICY IF EXISTS "Teachers can read own sessions" ON public.quick_play_sessions;
DROP POLICY IF EXISTS qp_sessions_select               ON public.quick_play_sessions;
CREATE POLICY qp_sessions_select ON public.quick_play_sessions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    is_active = true
    OR (( SELECT auth.uid()))::text = teacher_uid
  );
