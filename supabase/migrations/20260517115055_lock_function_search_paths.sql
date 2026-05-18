-- =============================================================================
-- Lock search_path on 23 SECURITY DEFINER / trigger functions
-- =============================================================================
--
-- Background: the Supabase security advisor flagged 23 functions with
-- `function_search_path_mutable`. When a SECURITY DEFINER function (or any
-- function called by one) has no explicit `SET search_path`, the planner
-- resolves unqualified table/function names against whatever search_path
-- the caller set. An attacker who can create objects in a writable schema
-- could shadow tables the function expects, hijacking its behaviour while
-- it runs with elevated privileges.
--
-- Setting `SET search_path = pg_catalog, public, auth` on each one pins
-- name resolution at function-definition time. `pg_catalog` first means
-- built-in operators always resolve correctly. `auth` is included because
-- many of these functions read auth.uid() / auth.jwt() / auth.users —
-- having it in path is harmless for the few that don't.
--
-- Functions touched (23):
--   trigger / utility — update_updated_at_column,
--                       touch_saved_word_groups_updated_at,
--                       feature_flags_set_updated_at,
--                       on_class_deleted,
--                       _daily_mission_target, _daily_mission_reward,
--                       _review_interval_days
--   identity helpers  — is_admin, is_teacher_allowed, get_my_email
--   account lifecycle — delete_my_account, export_my_data,
--                       approve_student, cleanup_expired_data
--   class / sign-in   — get_class_by_code,
--                       get_student_profile_for_login,
--                       generate_student_otp, create_student_session,
--                       student_sign_in,
--                       get_or_create_student_profile_oauth,
--                       end_quick_play_session
--   misc              — purchase_item, get_word_with_corrections
--
-- Closes P0 #3 from the May 2026 DB audit. Expected to clear all 23
-- `function_search_path_mutable` entries from get_advisors(security).
-- =============================================================================

-- ── trigger / utility ─────────────────────────────────────────────────────
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.touch_saved_word_groups_updated_at()
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.feature_flags_set_updated_at()
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.on_class_deleted()
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public._daily_mission_target(p_type text)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public._daily_mission_reward(p_type text)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public._review_interval_days(p_step integer)
  SET search_path = pg_catalog, public, auth;

-- ── identity helpers ──────────────────────────────────────────────────────
ALTER FUNCTION public.is_admin()
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.is_teacher_allowed(check_email text)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.get_my_email()
  SET search_path = pg_catalog, public, auth;

-- ── account lifecycle ─────────────────────────────────────────────────────
ALTER FUNCTION public.delete_my_account()
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.export_my_data()
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.approve_student(p_profile_id uuid)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.cleanup_expired_data(
    progress_retention_days integer,
    orphan_retention_days integer,
    audit_retention_days integer)
  SET search_path = pg_catalog, public, auth;

-- ── class / sign-in ───────────────────────────────────────────────────────
ALTER FUNCTION public.get_class_by_code(p_class_code text)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.get_student_profile_for_login(p_student_id uuid)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.generate_student_otp(p_auth_uid uuid)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.create_student_session(p_auth_uid uuid)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.student_sign_in(p_class_code text, p_display_name text)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.get_or_create_student_profile_oauth(
    p_class_code text,
    p_display_name text,
    p_email text,
    p_auth_uid uuid,
    p_avatar text)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.end_quick_play_session(p_session_code text)
  SET search_path = pg_catalog, public, auth;

-- ── misc ──────────────────────────────────────────────────────────────────
ALTER FUNCTION public.purchase_item(item_type text, item_id text, item_cost integer)
  SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.get_word_with_corrections(
    p_word_id integer,
    p_default_hebrew text,
    p_default_arabic text)
  SET search_path = pg_catalog, public, auth;
