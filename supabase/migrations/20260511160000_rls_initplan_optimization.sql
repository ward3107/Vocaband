-- Scaling pass — 2026-05-11
-- Optimize RLS policies for 5000+ concurrent users.
-- Wraps `auth.uid()` in `(SELECT auth.uid())` so Postgres evaluates it
-- once per query (initplan) instead of once per row. No security change.
-- Also adds 2 missing FK indexes on student_profiles.
--
-- Already applied to production 2026-05-11 via Supabase MCP. This file
-- exists so the migration history matches prod state for a future
-- `supabase db reset` or fresh-clone setup.

BEGIN;

-- ─── assignments ────────────────────────────────────────────────
DROP POLICY IF EXISTS assignments_delete ON public.assignments;
CREATE POLICY assignments_delete ON public.assignments AS PERMISSIVE FOR DELETE TO public
  USING ((is_teacher() AND (class_id IN (SELECT classes.id FROM classes WHERE (classes.teacher_uid = ((SELECT auth.uid()))::text)))) OR is_admin());

DROP POLICY IF EXISTS assignments_insert ON public.assignments;
CREATE POLICY assignments_insert ON public.assignments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_teacher() AND (class_id IN (SELECT classes.id FROM classes WHERE (classes.teacher_uid = ((SELECT auth.uid()))::text)))) OR is_admin());

DROP POLICY IF EXISTS assignments_update ON public.assignments;
CREATE POLICY assignments_update ON public.assignments AS PERMISSIVE FOR UPDATE TO public
  USING ((is_teacher() AND (class_id IN (SELECT classes.id FROM classes WHERE (classes.teacher_uid = ((SELECT auth.uid()))::text)))) OR is_admin());

-- ─── audit_log ──────────────────────────────────────────────────
DROP POLICY IF EXISTS audit_log_insert ON public.audit_log;
CREATE POLICY audit_log_insert ON public.audit_log AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()))::text = actor_uid);

DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log AS PERMISSIVE FOR SELECT TO public
  USING ((((SELECT auth.uid()))::text = actor_uid) OR is_admin());

-- ─── bagrut_responses ───────────────────────────────────────────
DROP POLICY IF EXISTS bagrut_responses_insert ON public.bagrut_responses;
CREATE POLICY bagrut_responses_insert ON public.bagrut_responses AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((student_uid = ((SELECT auth.uid()))::text) AND (test_id IN (SELECT t.id FROM (bagrut_tests t JOIN classes c ON ((c.id = t.class_id))) WHERE ((t.published = true) AND (c.code = (SELECT users.class_code FROM users WHERE (users.uid = ((SELECT auth.uid()))::text)))))));

DROP POLICY IF EXISTS bagrut_responses_select ON public.bagrut_responses;
CREATE POLICY bagrut_responses_select ON public.bagrut_responses AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_uid = ((SELECT auth.uid()))::text) OR (test_id IN (SELECT bagrut_tests.id FROM bagrut_tests WHERE (bagrut_tests.teacher_uid = ((SELECT auth.uid()))::text))) OR is_admin());

DROP POLICY IF EXISTS bagrut_responses_update ON public.bagrut_responses;
CREATE POLICY bagrut_responses_update ON public.bagrut_responses AS PERMISSIVE FOR UPDATE TO public
  USING (((student_uid = ((SELECT auth.uid()))::text) AND (submitted_at IS NULL)) OR (test_id IN (SELECT bagrut_tests.id FROM bagrut_tests WHERE (bagrut_tests.teacher_uid = ((SELECT auth.uid()))::text))));

-- ─── bagrut_tests ───────────────────────────────────────────────
DROP POLICY IF EXISTS bagrut_tests_delete ON public.bagrut_tests;
CREATE POLICY bagrut_tests_delete ON public.bagrut_tests AS PERMISSIVE FOR DELETE TO public
  USING ((teacher_uid = ((SELECT auth.uid()))::text) AND is_teacher());

DROP POLICY IF EXISTS bagrut_tests_insert ON public.bagrut_tests;
CREATE POLICY bagrut_tests_insert ON public.bagrut_tests AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (is_teacher() AND (teacher_uid = ((SELECT auth.uid()))::text) AND ((class_id IS NULL) OR (class_id IN (SELECT classes.id FROM classes WHERE (classes.teacher_uid = ((SELECT auth.uid()))::text)))));

DROP POLICY IF EXISTS bagrut_tests_select ON public.bagrut_tests;
CREATE POLICY bagrut_tests_select ON public.bagrut_tests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((teacher_uid = ((SELECT auth.uid()))::text) OR ((published = true) AND (class_id IS NOT NULL) AND (class_id IN (SELECT classes.id FROM classes WHERE (classes.code = (SELECT users.class_code FROM users WHERE (users.uid = ((SELECT auth.uid()))::text)))))) OR is_admin());

DROP POLICY IF EXISTS bagrut_tests_update ON public.bagrut_tests;
CREATE POLICY bagrut_tests_update ON public.bagrut_tests AS PERMISSIVE FOR UPDATE TO public
  USING ((teacher_uid = ((SELECT auth.uid()))::text) AND is_teacher())
  WITH CHECK ((teacher_uid = ((SELECT auth.uid()))::text) AND ((class_id IS NULL) OR (class_id IN (SELECT classes.id FROM classes WHERE (classes.teacher_uid = ((SELECT auth.uid()))::text)))));

-- ─── classes ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Teachers can delete own classes" ON public.classes;
CREATE POLICY "Teachers can delete own classes" ON public.classes AS PERMISSIVE FOR DELETE TO authenticated
  USING (teacher_uid = ((SELECT auth.uid()))::text);

DROP POLICY IF EXISTS "Teachers can update own classes" ON public.classes;
CREATE POLICY "Teachers can update own classes" ON public.classes AS PERMISSIVE FOR UPDATE TO authenticated
  USING (teacher_uid = ((SELECT auth.uid()))::text)
  WITH CHECK (teacher_uid = ((SELECT auth.uid()))::text);

DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
CREATE POLICY "Teachers can view own classes" ON public.classes AS PERMISSIVE FOR SELECT TO authenticated
  USING (teacher_uid = ((SELECT auth.uid()))::text);

DROP POLICY IF EXISTS classes_delete ON public.classes;
CREATE POLICY classes_delete ON public.classes AS PERMISSIVE FOR DELETE TO public
  USING ((((SELECT auth.uid()))::text = teacher_uid) AND is_teacher());

DROP POLICY IF EXISTS classes_insert ON public.classes;
CREATE POLICY classes_insert ON public.classes AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()))::text = teacher_uid) AND is_teacher() AND (is_pro_or_trialing() OR (teacher_class_count(((SELECT auth.uid()))::text) = 0)));

DROP POLICY IF EXISTS classes_select ON public.classes;
CREATE POLICY classes_select ON public.classes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((teacher_uid = ((SELECT auth.uid()))::text) OR (code = (SELECT users.class_code FROM users WHERE (users.uid = ((SELECT auth.uid()))::text))) OR is_admin());

DROP POLICY IF EXISTS classes_update ON public.classes;
CREATE POLICY classes_update ON public.classes AS PERMISSIVE FOR UPDATE TO public
  USING ((((SELECT auth.uid()))::text = teacher_uid) AND is_teacher());

-- ─── consent_log ────────────────────────────────────────────────
DROP POLICY IF EXISTS consent_log_insert ON public.consent_log;
CREATE POLICY consent_log_insert ON public.consent_log AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()))::text = uid);

DROP POLICY IF EXISTS consent_log_select ON public.consent_log;
CREATE POLICY consent_log_select ON public.consent_log AS PERMISSIVE FOR SELECT TO public
  USING ((((SELECT auth.uid()))::text = uid) OR is_admin());

-- ─── daily_missions ─────────────────────────────────────────────
DROP POLICY IF EXISTS daily_missions_insert ON public.daily_missions;
CREATE POLICY daily_missions_insert ON public.daily_missions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()))::text = user_uid);

DROP POLICY IF EXISTS daily_missions_select ON public.daily_missions;
CREATE POLICY daily_missions_select ON public.daily_missions AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()))::text = user_uid);

DROP POLICY IF EXISTS daily_missions_update ON public.daily_missions;
CREATE POLICY daily_missions_update ON public.daily_missions AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()))::text = user_uid)
  WITH CHECK (((SELECT auth.uid()))::text = user_uid);

-- ─── quick_play_joins ───────────────────────────────────────────
DROP POLICY IF EXISTS qp_joins_select ON public.quick_play_joins;
CREATE POLICY qp_joins_select ON public.quick_play_joins AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM quick_play_sessions s WHERE ((s.session_code = quick_play_joins.session_code) AND (s.teacher_uid = ((SELECT auth.uid()))::text)))) OR is_admin());

-- ─── quick_play_ratings ─────────────────────────────────────────
DROP POLICY IF EXISTS qp_ratings_select ON public.quick_play_ratings;
CREATE POLICY qp_ratings_select ON public.quick_play_ratings AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM quick_play_sessions s WHERE ((s.session_code = quick_play_ratings.session_code) AND (s.teacher_uid = ((SELECT auth.uid()))::text)))) OR is_admin());

-- ─── quick_play_sessions ────────────────────────────────────────
DROP POLICY IF EXISTS "Teachers can read own sessions" ON public.quick_play_sessions;
CREATE POLICY "Teachers can read own sessions" ON public.quick_play_sessions AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()))::text = teacher_uid);

-- ─── review_schedule ────────────────────────────────────────────
DROP POLICY IF EXISTS review_schedule_insert ON public.review_schedule;
CREATE POLICY review_schedule_insert ON public.review_schedule AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()))::text = student_uid);

DROP POLICY IF EXISTS review_schedule_select ON public.review_schedule;
CREATE POLICY review_schedule_select ON public.review_schedule AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()))::text = student_uid);

DROP POLICY IF EXISTS review_schedule_update ON public.review_schedule;
CREATE POLICY review_schedule_update ON public.review_schedule AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()))::text = student_uid)
  WITH CHECK (((SELECT auth.uid()))::text = student_uid);

-- ─── student_profiles ───────────────────────────────────────────
DROP POLICY IF EXISTS "Students can read own profile" ON public.student_profiles;
CREATE POLICY "Students can read own profile" ON public.student_profiles AS PERMISSIVE FOR SELECT TO public
  USING ((SELECT auth.uid()) = auth_uid);

DROP POLICY IF EXISTS "Students can update own profile" ON public.student_profiles;
CREATE POLICY "Students can update own profile" ON public.student_profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((SELECT auth.uid()) = auth_uid)
  WITH CHECK ((SELECT auth.uid()) = auth_uid);

DROP POLICY IF EXISTS "Teachers can approve class students" ON public.student_profiles;
CREATE POLICY "Teachers can approve class students" ON public.student_profiles AS PERMISSIVE FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM classes WHERE ((classes.code = student_profiles.class_code) AND (classes.teacher_uid = ((SELECT auth.uid()))::text))))
  WITH CHECK ((status = 'approved'::text) AND (approved_at = now()) AND (approved_by = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Teachers can insert student profiles" ON public.student_profiles;
CREATE POLICY "Teachers can insert student profiles" ON public.student_profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((status = 'pending_approval'::text) AND (EXISTS (SELECT 1 FROM classes WHERE ((classes.code = student_profiles.class_code) AND (classes.teacher_uid = ((SELECT auth.uid()))::text)))));

DROP POLICY IF EXISTS "Teachers can read class profiles" ON public.student_profiles;
CREATE POLICY "Teachers can read class profiles" ON public.student_profiles AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM classes WHERE ((classes.code = student_profiles.class_code) AND (classes.teacher_uid = ((SELECT auth.uid()))::text))));

-- ─── teacher_rewards ────────────────────────────────────────────
DROP POLICY IF EXISTS "Students can mark own rewards seen" ON public.teacher_rewards;
CREATE POLICY "Students can mark own rewards seen" ON public.teacher_rewards AS PERMISSIVE FOR UPDATE TO public
  USING (((SELECT auth.uid()))::text = student_uid)
  WITH CHECK (((SELECT auth.uid()))::text = student_uid);

DROP POLICY IF EXISTS "Students can view own rewards" ON public.teacher_rewards;
CREATE POLICY "Students can view own rewards" ON public.teacher_rewards AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()))::text = student_uid);

DROP POLICY IF EXISTS "Teachers can insert rewards" ON public.teacher_rewards;
CREATE POLICY "Teachers can insert rewards" ON public.teacher_rewards AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((SELECT auth.uid()))::text = teacher_uid);

DROP POLICY IF EXISTS "Teachers can view their own rewards" ON public.teacher_rewards;
CREATE POLICY "Teachers can view their own rewards" ON public.teacher_rewards AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT auth.uid()))::text = teacher_uid);

-- ─── users ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((((SELECT auth.uid()))::text = uid) AND (role = ANY (ARRAY['teacher'::text, 'student'::text])));

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users AS PERMISSIVE FOR UPDATE TO public
  USING ((((SELECT auth.uid()))::text = uid) OR is_admin())
  WITH CHECK (is_admin() OR check_user_update_allowed(((SELECT auth.uid()))::text, role, class_code));

-- ─── word_attempts ──────────────────────────────────────────────
DROP POLICY IF EXISTS word_attempts_select ON public.word_attempts;
CREATE POLICY word_attempts_select ON public.word_attempts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT auth.uid()))::text = student_uid) OR (class_code IN (SELECT classes.code FROM classes WHERE (classes.teacher_uid = ((SELECT auth.uid()))::text))));

-- ─── word_corrections ───────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own corrections" ON public.word_corrections;
CREATE POLICY "Users can delete own corrections" ON public.word_corrections AS PERMISSIVE FOR DELETE TO authenticated
  USING (corrected_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own corrections" ON public.word_corrections;
CREATE POLICY "Users can insert own corrections" ON public.word_corrections AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (corrected_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own corrections" ON public.word_corrections;
CREATE POLICY "Users can update own corrections" ON public.word_corrections AS PERMISSIVE FOR UPDATE TO authenticated
  USING (corrected_by = (SELECT auth.uid()))
  WITH CHECK (corrected_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own corrections" ON public.word_corrections;
CREATE POLICY "Users can view own corrections" ON public.word_corrections AS PERMISSIVE FOR SELECT TO authenticated
  USING (corrected_by = (SELECT auth.uid()));

-- ─── Missing FK indexes ─────────────────────────────────────────
-- Both columns on student_profiles are queried via FK joins.
CREATE INDEX IF NOT EXISTS idx_student_profiles_approved_by ON public.student_profiles(approved_by);
CREATE INDEX IF NOT EXISTS idx_student_profiles_auth_uid   ON public.student_profiles(auth_uid);

COMMIT;
