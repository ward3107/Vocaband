-- =============================================================================
-- Rewrite (SELECT auth.jwt() ->> 'email') to (SELECT auth.jwt()) ->> 'email'
-- =============================================================================
--
-- Background: the previous migration wrapped auth.jwt() calls in
--   `lower((SELECT auth.jwt() ->> 'email'))`
-- which Postgres parses as `lower((SELECT (auth.jwt() ->> 'email')))` —
-- the SELECT scopes the whole expression. The Supabase advisor still
-- flags these as auth_rls_initplan because its pattern matcher looks
-- specifically for `(SELECT auth.X())` with the function call (and
-- nothing else) inside the subselect.
--
-- Rewriting to `lower((SELECT auth.jwt()) ->> 'email')` puts only the
-- auth.jwt() call inside the subselect and moves the ->> operator
-- outside. Semantically identical, but matches the advisor's expected
-- form so the lint clears.
--
-- Same fix applied to the 5 policies still flagged after the previous
-- migration:
--   - teacher_profiles_select
--   - saved_word_groups_delete_own / insert_own / select_own / update_own
-- =============================================================================

DROP POLICY IF EXISTS saved_word_groups_delete_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_delete_own ON public.saved_word_groups
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email'));

DROP POLICY IF EXISTS saved_word_groups_insert_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_insert_own ON public.saved_word_groups
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email'));

DROP POLICY IF EXISTS saved_word_groups_select_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_select_own ON public.saved_word_groups
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email'));

DROP POLICY IF EXISTS saved_word_groups_update_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_update_own ON public.saved_word_groups
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING      (lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email'))
  WITH CHECK (lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email'));

DROP POLICY IF EXISTS teacher_profiles_select ON public.teacher_profiles;
CREATE POLICY teacher_profiles_select ON public.teacher_profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (lower(email) = lower(( SELECT auth.jwt()) ->> 'email') OR is_admin());
