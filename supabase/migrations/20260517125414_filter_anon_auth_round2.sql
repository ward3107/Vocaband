-- =============================================================================
-- Filter anon-Auth from remaining policies (round 2: teacher/student tables)
-- =============================================================================
--
-- Round 1 (20260517122213_filter_anon_auth_from_policies.sql) tightened
-- the policies where leaking data to anonymous Quick Play guests was most
-- obviously bad (privacy logs, teacher data, student-only features, user
-- account writes). This migration finishes the job for the remaining 26
-- policies the advisor flagged — tables that are already protected by
-- ownership / class-membership checks in their qual but lack the explicit
-- is_anonymous IS NOT TRUE guard.
--
-- Each policy gets the existing USING expression preserved verbatim, with
-- an outer AND that adds:
--   COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) IS FALSE
--
-- The COALESCE-with-false form matches the idiom used by users_select and
-- the round-1 policies, so the codebase stays consistent.
--
-- Tables touched in this round (26 policies across 13 tables):
--   - assignments, bagrut_responses, bagrut_tests, classes, competitions
--   - feature_flags (delete/update only — SELECT stays public)
--   - interactive_worksheets (owner delete/update — "Anyone can read..." stays)
--   - progress.progress_select + quick_play_progress_delete
--   - quick_play_joins.qp_joins_select
--   - quick_play_ratings.qp_ratings_select
--   - student_profiles (3 policies)
--   - worksheet_attempts."Worksheet owner reads attempts"
--
-- Policies NOT touched (intentionally anon-accessible):
--   - quick_play_sessions.qp_sessions_select   (guests find sessions by code)
--   - interactive_worksheets."Anyone can read" (public share-link)
--   - worksheet_attempts."Owner browser can update own attempt"
--   - feature_flags.feature_flags_select       (intentionally world-readable)
--
-- Policies LEFT (lint will still fire on these 4 — they're qual:false
-- denial policies that the advisor flags syntactically, but adding the
-- filter to `false` is functionally pointless):
--   - teacher_profiles."Teachers cannot be deleted via API"  (qual: false)
--   - teacher_profiles."Teachers cannot be updated via API"  (qual: false)
--
-- Cron schema policies (cron.job_policy, cron.job_run_details_policy) are
-- managed by the cron extension and out of scope for application
-- migrations.
--
-- Closes the remainder of the May 2026 audit's auth_allow_anonymous_sign_ins
-- entries that this codebase owns.
-- =============================================================================

-- ── assignments ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS assignments_delete ON public.assignments;
CREATE POLICY assignments_delete ON public.assignments
  AS PERMISSIVE FOR DELETE TO public
  USING (
    ((is_teacher() AND (class_id IN (SELECT classes.id FROM classes WHERE classes.teacher_uid = ((SELECT auth.uid()))::text))) OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS assignments_select ON public.assignments;
CREATE POLICY assignments_select ON public.assignments
  AS PERMISSIVE FOR SELECT TO public
  USING (
    ((class_id IN (SELECT classes.id FROM classes WHERE classes.teacher_uid = ((SELECT auth.uid()))::text))
     OR (class_id IN (SELECT classes.id FROM classes WHERE classes.code = (SELECT u.class_code FROM users u WHERE u.uid = ((SELECT auth.uid()))::text)))
     OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS assignments_update ON public.assignments;
CREATE POLICY assignments_update ON public.assignments
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    ((is_teacher() AND (class_id IN (SELECT classes.id FROM classes WHERE classes.teacher_uid = ((SELECT auth.uid()))::text))) OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── bagrut_responses ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS bagrut_responses_select ON public.bagrut_responses;
CREATE POLICY bagrut_responses_select ON public.bagrut_responses
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((student_uid = ((SELECT auth.uid()))::text)
     OR (test_id IN (SELECT bagrut_tests.id FROM bagrut_tests WHERE bagrut_tests.teacher_uid = ((SELECT auth.uid()))::text))
     OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS bagrut_responses_update ON public.bagrut_responses;
CREATE POLICY bagrut_responses_update ON public.bagrut_responses
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (((student_uid = ((SELECT auth.uid()))::text) AND (submitted_at IS NULL))
     OR (test_id IN (SELECT bagrut_tests.id FROM bagrut_tests WHERE bagrut_tests.teacher_uid = ((SELECT auth.uid()))::text)))
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── bagrut_tests ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS bagrut_tests_delete ON public.bagrut_tests;
CREATE POLICY bagrut_tests_delete ON public.bagrut_tests
  AS PERMISSIVE FOR DELETE TO public
  USING (
    ((teacher_uid = ((SELECT auth.uid()))::text) AND is_teacher())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS bagrut_tests_select ON public.bagrut_tests;
CREATE POLICY bagrut_tests_select ON public.bagrut_tests
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((teacher_uid = ((SELECT auth.uid()))::text)
     OR ((published = true) AND (class_id IS NOT NULL) AND (class_id IN (SELECT classes.id FROM classes WHERE classes.code = (SELECT users.class_code FROM users WHERE users.uid = ((SELECT auth.uid()))::text))))
     OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS bagrut_tests_update ON public.bagrut_tests;
CREATE POLICY bagrut_tests_update ON public.bagrut_tests
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    ((teacher_uid = ((SELECT auth.uid()))::text) AND is_teacher())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (
    (teacher_uid = ((SELECT auth.uid()))::text)
    AND ((class_id IS NULL) OR (class_id IN (SELECT classes.id FROM classes WHERE classes.teacher_uid = ((SELECT auth.uid()))::text)))
  );

-- ── classes ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS classes_delete ON public.classes;
CREATE POLICY classes_delete ON public.classes
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (((SELECT auth.uid()))::text = teacher_uid AND is_teacher())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS classes_select ON public.classes;
CREATE POLICY classes_select ON public.classes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((teacher_uid = ((SELECT auth.uid()))::text)
     OR (code = (SELECT users.class_code FROM users WHERE users.uid = ((SELECT auth.uid()))::text))
     OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS classes_update ON public.classes;
CREATE POLICY classes_update ON public.classes
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (((SELECT auth.uid()))::text = teacher_uid AND is_teacher())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── competitions ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS competitions_delete ON public.competitions;
CREATE POLICY competitions_delete ON public.competitions
  AS PERMISSIVE FOR DELETE TO public
  USING (
    ((is_teacher() AND (class_id IN (SELECT classes.id FROM classes WHERE classes.teacher_uid = ((SELECT auth.uid()))::text))) OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS competitions_select ON public.competitions;
CREATE POLICY competitions_select ON public.competitions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((class_id IN (SELECT classes.id FROM classes WHERE classes.teacher_uid = ((SELECT auth.uid()))::text OR classes.code = (SELECT users.class_code FROM users WHERE users.uid = ((SELECT auth.uid()))::text))) OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS competitions_update ON public.competitions;
CREATE POLICY competitions_update ON public.competitions
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    ((is_teacher() AND (class_id IN (SELECT classes.id FROM classes WHERE classes.teacher_uid = ((SELECT auth.uid()))::text))) OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── feature_flags: delete + update (select stays public) ──────────────────
DROP POLICY IF EXISTS feature_flags_delete ON public.feature_flags;
CREATE POLICY feature_flags_delete ON public.feature_flags
  AS PERMISSIVE FOR DELETE TO public
  USING (
    is_admin()
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS feature_flags_update ON public.feature_flags;
CREATE POLICY feature_flags_update ON public.feature_flags
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    is_admin()
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (is_admin());

-- ── interactive_worksheets owner policies ────────────────────────────────
DROP POLICY IF EXISTS "Owners can delete own worksheets" ON public.interactive_worksheets;
CREATE POLICY "Owners can delete own worksheets" ON public.interactive_worksheets
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (teacher_uid IS NOT NULL AND ((SELECT auth.uid()))::text = teacher_uid)
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS "Owners can update own worksheets" ON public.interactive_worksheets;
CREATE POLICY "Owners can update own worksheets" ON public.interactive_worksheets
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (teacher_uid IS NOT NULL AND ((SELECT auth.uid()))::text = teacher_uid)
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (teacher_uid IS NOT NULL AND ((SELECT auth.uid()))::text = teacher_uid);

-- ── progress.progress_select + quick_play_progress_delete ────────────────
DROP POLICY IF EXISTS progress_select ON public.progress;
CREATE POLICY progress_select ON public.progress
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((((SELECT auth.uid()))::text = student_uid)
     OR (class_code IN (SELECT c.code FROM classes c WHERE c.teacher_uid = ((SELECT auth.uid()))::text))
     OR ((class_code = 'QUICK_PLAY'::text) AND (assignment_id IN (SELECT s.id FROM quick_play_sessions s WHERE s.teacher_uid = ((SELECT auth.uid()))::text)))
     OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS quick_play_progress_delete ON public.progress;
CREATE POLICY quick_play_progress_delete ON public.progress
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    ((class_code = 'QUICK_PLAY'::text) AND (assignment_id IN (SELECT s.id FROM quick_play_sessions s WHERE s.teacher_uid = ((SELECT auth.uid()))::text)))
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── quick_play_joins.qp_joins_select (teacher-only) ──────────────────────
DROP POLICY IF EXISTS qp_joins_select ON public.quick_play_joins;
CREATE POLICY qp_joins_select ON public.quick_play_joins
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((EXISTS (SELECT 1 FROM quick_play_sessions s WHERE s.session_code = quick_play_joins.session_code AND s.teacher_uid = ((SELECT auth.uid()))::text)) OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── quick_play_ratings.qp_ratings_select (teacher-only) ──────────────────
DROP POLICY IF EXISTS qp_ratings_select ON public.quick_play_ratings;
CREATE POLICY qp_ratings_select ON public.quick_play_ratings
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((EXISTS (SELECT 1 FROM quick_play_sessions s WHERE s.session_code = quick_play_ratings.session_code AND s.teacher_uid = ((SELECT auth.uid()))::text)) OR is_admin())
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── student_profiles (3 policies) ────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own profile by email" ON public.student_profiles;
CREATE POLICY "Users can read own profile by email" ON public.student_profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (email = (SELECT auth.email()))
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS student_profiles_select ON public.student_profiles;
CREATE POLICY student_profiles_select ON public.student_profiles
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (((SELECT auth.uid()) = auth_uid)
     OR (EXISTS (SELECT 1 FROM classes WHERE classes.code = student_profiles.class_code AND classes.teacher_uid = ((SELECT auth.uid()))::text)))
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS student_profiles_update ON public.student_profiles;
CREATE POLICY student_profiles_update ON public.student_profiles
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (((SELECT auth.uid()) = auth_uid)
     OR (EXISTS (SELECT 1 FROM classes WHERE classes.code = student_profiles.class_code AND classes.teacher_uid = ((SELECT auth.uid()))::text)))
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (
    ((SELECT auth.uid()) = auth_uid)
    OR ((status = 'approved'::text) AND (approved_at = now()) AND (approved_by = (SELECT auth.uid())))
  );

-- ── worksheet_attempts."Worksheet owner reads attempts" ──────────────────
DROP POLICY IF EXISTS "Worksheet owner reads attempts" ON public.worksheet_attempts;
CREATE POLICY "Worksheet owner reads attempts" ON public.worksheet_attempts
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (EXISTS (SELECT 1 FROM interactive_worksheets w WHERE w.slug = worksheet_attempts.slug AND w.teacher_uid IS NOT NULL AND w.teacher_uid = ((SELECT auth.uid()))::text))
    AND COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );
