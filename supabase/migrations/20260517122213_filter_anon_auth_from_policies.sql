-- =============================================================================
-- Filter anonymous-Auth users out of policies they shouldn't reach
-- =============================================================================
--
-- Background: Supabase's signInAnonymously() issues a JWT with role
-- `authenticated` and `is_anonymous=true`. Vocaband uses this for Quick
-- Play guest students. The advisor's `auth_allow_anonymous_sign_ins`
-- lint flags every policy that's permissive to authenticated callers
-- AND doesn't explicitly exclude anonymous users via the JWT claim. 26
-- entries were flagged.
--
-- Strategy: add `(auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE`
-- (or COALESCE-with-false equivalent) to the USING clauses of policies
-- on tables that anonymous Quick Play guests should NOT touch:
--   - privacy / audit (audit_log, consent_log)
--   - teacher data (teacher_*, saved_word_groups, word_corrections)
--   - student-only features (daily_missions, review_schedule,
--     word_attempts, progress non-quickplay paths)
--   - account state (users)
--
-- Policies LEFT INTACT because anon-auth access is intentional:
--   - quick_play_sessions.qp_sessions_select  (guests need to find sessions)
--   - interactive_worksheets."Anyone can read..."  (public share-link)
--   - worksheet_attempts."Owner browser can update own attempt"  (anon submit)
--
-- The classes / assignments / competitions / bagrut policies are skipped
-- here even though the advisor flags them — they're already gated by
-- ownership checks (teacher_uid match, class_code IN ...) that an
-- anon-auth UID can't satisfy in practice, and rewriting them all in one
-- migration multiplies the regression surface. They can be tightened in
-- a follow-up.
-- =============================================================================

-- ── users.users_update: lock out anon-auth (users_select already filters) ─
DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (((( SELECT auth.uid()))::text = uid) OR is_admin())
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (
    is_admin()
    OR check_user_update_allowed((( SELECT auth.uid()))::text, role, class_code, plan, trial_ends_at)
  );

-- ── audit_log.audit_log_select ───────────────────────────────────────────
DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log
  AS PERMISSIVE FOR SELECT TO public
  USING (
    ((( SELECT auth.uid()))::text = actor_uid OR is_admin())
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── consent_log.consent_log_select ───────────────────────────────────────
DROP POLICY IF EXISTS consent_log_select ON public.consent_log;
CREATE POLICY consent_log_select ON public.consent_log
  AS PERMISSIVE FOR SELECT TO public
  USING (
    ((( SELECT auth.uid()))::text = uid OR is_admin())
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── daily_missions: select + update ──────────────────────────────────────
DROP POLICY IF EXISTS daily_missions_select ON public.daily_missions;
CREATE POLICY daily_missions_select ON public.daily_missions
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (( SELECT auth.uid()))::text = user_uid
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS daily_missions_update ON public.daily_missions;
CREATE POLICY daily_missions_update ON public.daily_missions
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (( SELECT auth.uid()))::text = user_uid
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (
    (( SELECT auth.uid()))::text = user_uid
  );

-- ── review_schedule: select + update ─────────────────────────────────────
DROP POLICY IF EXISTS review_schedule_select ON public.review_schedule;
CREATE POLICY review_schedule_select ON public.review_schedule
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (( SELECT auth.uid()))::text = student_uid
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS review_schedule_update ON public.review_schedule;
CREATE POLICY review_schedule_update ON public.review_schedule
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (( SELECT auth.uid()))::text = student_uid
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (
    (( SELECT auth.uid()))::text = student_uid
  );

-- ── teacher_rewards: students mark seen + select ─────────────────────────
DROP POLICY IF EXISTS "Students can mark own rewards seen" ON public.teacher_rewards;
CREATE POLICY "Students can mark own rewards seen" ON public.teacher_rewards
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (( SELECT auth.uid()))::text = student_uid
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (
    (( SELECT auth.uid()))::text = student_uid
  );

DROP POLICY IF EXISTS teacher_rewards_select ON public.teacher_rewards;
CREATE POLICY teacher_rewards_select ON public.teacher_rewards
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (((( SELECT auth.uid()))::text = student_uid) OR ((( SELECT auth.uid()))::text = teacher_uid))
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── teacher_profiles.teacher_profiles_select ─────────────────────────────
DROP POLICY IF EXISTS teacher_profiles_select ON public.teacher_profiles;
CREATE POLICY teacher_profiles_select ON public.teacher_profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (lower(email) = lower(( SELECT auth.jwt()) ->> 'email') OR is_admin())
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── saved_word_groups: 4 own policies, restrict to non-anon ──────────────
DROP POLICY IF EXISTS saved_word_groups_delete_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_delete_own ON public.saved_word_groups
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email')
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS saved_word_groups_insert_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_insert_own ON public.saved_word_groups
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email')
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS saved_word_groups_select_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_select_own ON public.saved_word_groups
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email')
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS saved_word_groups_update_own ON public.saved_word_groups;
CREATE POLICY saved_word_groups_update_own ON public.saved_word_groups
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email')
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (
    lower(teacher_email) = lower(( SELECT auth.jwt()) ->> 'email')
  );

-- ── word_corrections: 4 own policies ─────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own corrections" ON public.word_corrections;
CREATE POLICY "Users can view own corrections" ON public.word_corrections
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    corrected_by = (( SELECT auth.uid()))
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS "Users can insert own corrections" ON public.word_corrections;
CREATE POLICY "Users can insert own corrections" ON public.word_corrections
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    corrected_by = (( SELECT auth.uid()))
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

DROP POLICY IF EXISTS "Users can update own corrections" ON public.word_corrections;
CREATE POLICY "Users can update own corrections" ON public.word_corrections
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    corrected_by = (( SELECT auth.uid()))
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (corrected_by = (( SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can delete own corrections" ON public.word_corrections;
CREATE POLICY "Users can delete own corrections" ON public.word_corrections
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    corrected_by = (( SELECT auth.uid()))
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── word_attempts.word_attempts_select ───────────────────────────────────
DROP POLICY IF EXISTS word_attempts_select ON public.word_attempts;
CREATE POLICY word_attempts_select ON public.word_attempts
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((( SELECT auth.uid()))::text = student_uid
     OR class_code IN (
       SELECT classes.code FROM classes
       WHERE classes.teacher_uid = (( SELECT auth.uid()))::text
     ))
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  );

-- ── progress.progress_update — block anon-auth from updating non-QP rows ─
-- progress_select / progress_insert / quick_play_progress_delete are LEFT
-- AS-IS: they already handle the QUICK_PLAY scope explicitly, and
-- progress_insert WITH CHECK requires class_code to match users.class_code
-- which anon-auth users don't have.
DROP POLICY IF EXISTS progress_update ON public.progress;
CREATE POLICY progress_update ON public.progress
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (( SELECT auth.uid()))::text = student_uid
    AND COALESCE(((( SELECT auth.jwt()) ->> 'is_anonymous'))::boolean, false) IS FALSE
  )
  WITH CHECK (
    (( SELECT auth.uid()))::text = student_uid
    AND score >= ( SELECT p2.score FROM progress p2 WHERE p2.id = progress.id)
    AND score <= 1000::numeric
  );
