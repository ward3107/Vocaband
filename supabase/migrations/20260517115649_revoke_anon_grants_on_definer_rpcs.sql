-- =============================================================================
-- Revoke PUBLIC EXECUTE on SECURITY DEFINER RPCs; grant back to authenticated
-- =============================================================================
--
-- Background: ~60 SECURITY DEFINER functions had EXECUTE granted to PUBLIC
-- by default, which means `anon` (an unauthenticated HTTP caller via
-- PostgREST) inherited it. Per the Supabase security advisor's
-- `anon_security_definer_function_executable` lint, this is an information-
-- leak or privilege-escalation risk depending on each function's body.
--
-- Pattern applied:
--   REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon;     -- drop default + explicit
--   GRANT  EXECUTE ON FUNCTION ... TO authenticated;  -- restore for logged-in
--
-- Functions intended for service_role only (cron jobs, triggers, RLS
-- helpers, admin scripts) get the REVOKE but NOT the GRANT — service_role
-- inherits all privileges via superuser membership so it retains access.
--
-- Pre-auth and share-link flows keep their PUBLIC grant intact (NOT
-- touched by this migration):
--   - submit_worksheet_attempt        (public worksheet share-link submit)
--   - get_my_attempt_for_slug         (public worksheet attempt recovery)
--   - class_lookup_by_code            (rate-limited, pre-auth class lookup)
--   - get_or_create_student_profile   (student first signup pre-auth)
--   - class_roster_for_login          (pick-your-name screen pre-auth)
--   - get_class_by_code               (pre-auth class lookup)
--   - get_student_profile_for_login   (PIN/email recovery pre-auth)
--   - is_teacher_allowed              (OAuth teacher allowlist check)
--
-- If a future feature needs anon access to a function in this revoke list,
-- the failure mode is a clear "permission denied for function" error from
-- PostgREST — easy to diagnose, easy to grant back.
--
-- Closes P0 #4 from the May 2026 DB audit. Expected to clear the
-- `anon_security_definer_function_executable` entries from
-- get_advisors(security) for the 52 functions below.
-- =============================================================================

-- ── service_role-only: trigger / cron / RLS-helper / admin functions ──────
-- These should NEVER be called by end users; revoke only, no grant back.
REVOKE ALL ON FUNCTION public.admin_create_standalone_student(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auto_end_due_competitions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_user_update_allowed(text, text, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_data(integer, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cleanup_stale_anon_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_progress_student_exists() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_session_code() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_worksheet_slug() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.on_class_deleted() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_student_xp_to_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_class_count(text) FROM PUBLIC, anon;

-- ── authenticated end-user functions (students or teachers) ───────────────
-- Revoke PUBLIC, grant back to authenticated. Body-level role checks
-- (is_teacher / is_admin / etc.) continue to enforce finer-grained access.
REVOKE ALL ON FUNCTION public.approve_student(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.approve_student(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.award_reward(text, text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.award_reward(text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.competition_leaderboard(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.competition_leaderboard(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.count_due_reviews(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.count_due_reviews(date) TO authenticated;

REVOKE ALL ON FUNCTION public.create_interactive_worksheet(text, bigint[], text, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_interactive_worksheet(text, bigint[], text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.create_interactive_worksheet_v2(text, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_interactive_worksheet_v2(text, jsonb, jsonb, text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_quick_play_session(integer[], jsonb, text[], text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_quick_play_session(integer[], jsonb, text[], text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_student_session(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_student_session(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

REVOKE ALL ON FUNCTION public.end_quick_play_session(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.end_quick_play_session(text) TO authenticated;

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

REVOKE ALL ON FUNCTION public.generate_student_otp(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.generate_student_otp(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_assignments_for_class(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_assignments_for_class(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_due_reviews(date, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_due_reviews(date, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

REVOKE ALL ON FUNCTION public.get_or_create_daily_missions(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_create_daily_missions(date) TO authenticated;

REVOKE ALL ON FUNCTION public.get_or_create_student_profile_oauth(text, text, text, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_create_student_profile_oauth(text, text, text, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_pet_state(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_pet_state(date) TO authenticated;

REVOKE ALL ON FUNCTION public.get_unseen_rewards() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_unseen_rewards() TO authenticated;

REVOKE ALL ON FUNCTION public.get_word_with_corrections(integer, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_word_with_corrections(integer, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_pro_or_trialing() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_pro_or_trialing() TO authenticated;

REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

REVOKE ALL ON FUNCTION public.is_teacher(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_teacher(text) TO authenticated;

REVOKE ALL ON FUNCTION public.list_students_in_class(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_students_in_class(text) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_rewards_seen(uuid[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_rewards_seen(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_teacher_onboarded() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_teacher_onboarded() TO authenticated;

REVOKE ALL ON FUNCTION public.purchase_item(text, text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.purchase_item(text, text, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.record_mission_progress(date, text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_mission_progress(date, text, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.record_pet_activity(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_pet_activity(date) TO authenticated;

REVOKE ALL ON FUNCTION public.record_review_result(integer, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_review_result(integer, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.rename_student_display_name(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rename_student_display_name(text) TO authenticated;

REVOKE ALL ON FUNCTION public.schedule_review_words(integer[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.schedule_review_words(integer[]) TO authenticated;

REVOKE ALL ON FUNCTION public.set_user_timezone(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_user_timezone(text) TO authenticated;

REVOKE ALL ON FUNCTION public.student_sign_in(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.student_sign_in(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.student_touch_last_login() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.student_touch_last_login() TO authenticated;

REVOKE ALL ON FUNCTION public.switch_student_class(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.switch_student_class(text) TO authenticated;

REVOKE ALL ON FUNCTION public.teacher_create_roster_student(text, text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.teacher_create_roster_student(text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.teacher_delete_roster_student(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.teacher_delete_roster_student(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.teacher_reset_student_pin(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.teacher_reset_student_pin(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.teacher_view_roster(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.teacher_view_roster(text) TO authenticated;
