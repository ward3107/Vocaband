-- =============================================================================
-- Lock down 9 SECURITY DEFINER RPCs flagged by the May 2026 audit
-- =============================================================================
--
-- All of these were SECURITY DEFINER and callable by `authenticated` with no
-- body-level auth check. Each fix preserves the function's existing
-- signature, return type, security mode, and search_path.
--
-- P0 — clear bugs:
--   1. generate_student_otp                 — restrict to caller's own uid
--   2. get_or_create_student_profile_oauth  — bind to JWT uid + email
--   3. check_user_update_allowed            — restrict comparison to self
--   4. run_cleanup_expired_data             — cron + admin only
--   5. cleanup_stale_anon_users             — cron + admin only
--   6. purge_expired_worksheets             — cron + admin only
--
-- P1 — functional gaps:
--   7. create_interactive_worksheet         — require is_teacher()
--   8. create_interactive_worksheet_v2      — require is_teacher()
--   9. student_sign_in                      — throttle 10/min/uid
--  10. create_student_session               — drop (dead code returning NULLs)
--
-- The cron-or-admin gate uses session_user IN ('postgres','supabase_admin')
-- because pg_cron jobs run as the `postgres` role (see cron.job.username)
-- where auth.uid() / auth.role() are NULL.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- P0.1 — generate_student_otp(uuid)
-- ---------------------------------------------------------------------------
-- BEFORE: any authenticated user could pass any p_auth_uid and mint an OTP
-- into that user's auth.users.raw_user_meta_data.
-- AFTER: must call for own uid.

CREATE OR REPLACE FUNCTION public.generate_student_otp(p_auth_uid uuid)
RETURNS TABLE(otp_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  v_user       auth.users%ROWTYPE;
  v_otp_token  TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '10 minutes';
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_auth_uid THEN
    RAISE EXCEPTION 'Can only generate OTP for own account' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_user
  FROM auth.users
  WHERE id = p_auth_uid AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found for UID: %', p_auth_uid;
  END IF;

  v_otp_token := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'otp_token', v_otp_token,
    'otp_expires', v_expires_at
  )
  WHERE id = p_auth_uid;

  RETURN QUERY SELECT v_otp_token, v_expires_at;
END;
$function$;


-- ---------------------------------------------------------------------------
-- P0.2 — get_or_create_student_profile_oauth(...)
-- ---------------------------------------------------------------------------
-- BEFORE: caller supplied p_email and p_auth_uid directly; any authenticated
-- user could spoof another user's profile.
-- AFTER: both must match the caller's JWT.

CREATE OR REPLACE FUNCTION public.get_or_create_student_profile_oauth(
  p_class_code   text,
  p_display_name text,
  p_email        text,
  p_auth_uid     uuid,
  p_avatar       text DEFAULT '🦊'::text
)
RETURNS TABLE(profile student_profiles, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  v_unique_id TEXT;
  v_profile   public.student_profiles;
  v_jwt_email TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_auth_uid THEN
    RAISE EXCEPTION 'Can only create or update own profile' USING ERRCODE = '42501';
  END IF;

  v_jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF v_jwt_email = '' OR v_jwt_email <> lower(coalesce(p_email, '')) THEN
    RAISE EXCEPTION 'Email does not match authenticated user' USING ERRCODE = '42501';
  END IF;

  v_unique_id := LOWER(p_class_code) || ':' || LOWER(p_email);

  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE email = p_email OR unique_id = v_unique_id;

  IF NOT FOUND THEN
    INSERT INTO public.student_profiles (
      unique_id, display_name, class_code, email, status, auth_uid, avatar
    ) VALUES (
      v_unique_id, p_display_name, p_class_code, p_email, 'pending_approval', p_auth_uid, p_avatar
    )
    RETURNING * INTO v_profile;
    RETURN QUERY SELECT v_profile, true::BOOLEAN;
  ELSE
    UPDATE public.student_profiles
    SET
      display_name = COALESCE(p_display_name, display_name),
      email        = COALESCE(p_email, email),
      auth_uid     = COALESCE(p_auth_uid, auth_uid),
      avatar       = COALESCE(p_avatar, avatar)
    WHERE id = v_profile.id
    RETURNING * INTO v_profile;
    RETURN QUERY SELECT v_profile, false::BOOLEAN;
  END IF;
END;
$function$;


-- ---------------------------------------------------------------------------
-- P0.3 — check_user_update_allowed(...)
-- ---------------------------------------------------------------------------
-- BEFORE: callable with arbitrary p_uid; acts as a (role, plan, trial)
-- oracle for any account.
-- AFTER: restricted to comparing the caller's own uid. Used in RLS
-- WITH CHECK clauses where the row's uid equals auth.uid(), so legitimate
-- usage is unaffected.

CREATE OR REPLACE FUNCTION public.check_user_update_allowed(
  p_uid              text,
  p_new_role         text,
  p_new_class_code   text,
  p_new_plan         text,
  p_new_trial_ends_at timestamp with time zone
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    (auth.uid()::text = p_uid)
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE uid = p_uid
        AND role = p_new_role
        AND (class_code IS NULL OR class_code = p_new_class_code)
        AND COALESCE(plan, 'free') = COALESCE(p_new_plan, 'free')
        AND COALESCE(trial_ends_at, '1970-01-01'::timestamptz)
          = COALESCE(p_new_trial_ends_at, '1970-01-01'::timestamptz)
    );
$function$;


-- ---------------------------------------------------------------------------
-- P0.4 — run_cleanup_expired_data()
-- ---------------------------------------------------------------------------
-- BEFORE: any authenticated user could mass-DELETE from progress (>365d),
-- orphan student rows in users, and audit_log (>730d).
-- AFTER: cron (postgres session) or admin only.

CREATE OR REPLACE FUNCTION public.run_cleanup_expired_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin or cron caller required' USING ERRCODE = '42501';
  END IF;

  WITH
    deleted_progress AS (
      DELETE FROM public.progress
      WHERE completed_at < now() - INTERVAL '365 days'
      RETURNING 1
    ),
    deleted_orphans AS (
      DELETE FROM public.users
      WHERE role = 'student'
        AND class_code IS NULL
        AND (first_seen_at IS NULL OR first_seen_at < now() - INTERVAL '90 days')
      RETURNING 1
    ),
    deleted_audit AS (
      DELETE FROM public.audit_log
      WHERE created_at < now() - INTERVAL '730 days'
      RETURNING 1
    )
  SELECT jsonb_build_object(
    'deleted_progress', (SELECT COUNT(*) FROM deleted_progress),
    'deleted_orphans',  (SELECT COUNT(*) FROM deleted_orphans),
    'deleted_audit',    (SELECT COUNT(*) FROM deleted_audit)
  ) INTO result;

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES ('system:cron', 'scheduled_cleanup', 'system', result);

  RAISE NOTICE '[run_cleanup_expired_data] %', result;
  RETURN result;
END;
$function$;


-- ---------------------------------------------------------------------------
-- P0.5 — cleanup_stale_anon_users()
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_stale_anon_users()
RETURNS TABLE(deleted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin or cron caller required' USING ERRCODE = '42501';
  END IF;

  WITH candidates AS (
    SELECT u.id
    FROM auth.users u
    WHERE COALESCE(u.is_anonymous, FALSE) = TRUE
      AND u.created_at < now() - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.progress p WHERE p.student_uid = u.id::text
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.users pu WHERE pu.uid = u.id::text
      )
  ),
  deleted AS (
    DELETE FROM auth.users
    WHERE id IN (SELECT id FROM candidates)
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted FROM deleted;

  RAISE NOTICE '[cleanup_stale_anon_users] deleted % anonymous accounts', v_deleted;

  deleted_count := v_deleted;
  RETURN NEXT;
END;
$function$;


-- ---------------------------------------------------------------------------
-- P0.6 — purge_expired_worksheets()
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_expired_worksheets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INT;
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin or cron caller required' USING ERRCODE = '42501';
  END IF;

  WITH purged AS (
    DELETE FROM public.interactive_worksheets
    WHERE expires_at < NOW() - INTERVAL '7 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM purged;

  RETURN v_deleted;
END;
$function$;


-- ---------------------------------------------------------------------------
-- P1.7 — create_interactive_worksheet(...)
-- ---------------------------------------------------------------------------
-- BEFORE: any authenticated user (including students) could create
-- worksheets, even anonymously (COALESCE(auth.uid(), NULL)).
-- AFTER: require is_teacher() (covers role IN ('teacher','admin')).

CREATE OR REPLACE FUNCTION public.create_interactive_worksheet(
  p_topic_name text,
  p_word_ids   bigint[],
  p_format     text,
  p_settings   jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_slug TEXT;
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Teacher role required' USING ERRCODE = '42501';
  END IF;

  IF array_length(p_word_ids, 1) IS NULL OR array_length(p_word_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one word';
  END IF;

  new_slug := public.generate_worksheet_slug();

  INSERT INTO public.interactive_worksheets (
    slug, teacher_uid, topic_name, word_ids, format, exercises, settings
  ) VALUES (
    new_slug,
    auth.uid()::text,
    p_topic_name,
    p_word_ids,
    p_format,
    jsonb_build_array(jsonb_build_object('type', p_format, 'word_ids', to_jsonb(p_word_ids))),
    COALESCE(p_settings, '{}'::jsonb)
  );

  RETURN new_slug;
END;
$function$;


-- ---------------------------------------------------------------------------
-- P1.8 — create_interactive_worksheet_v2(...)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_interactive_worksheet_v2(
  p_topic_name  text,
  p_exercises   jsonb,
  p_settings    jsonb DEFAULT '{}'::jsonb,
  p_parent_slug text  DEFAULT NULL::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_slug      TEXT;
  first_type    TEXT;
  all_word_ids  BIGINT[];
  bad_count     INT;
  parent_owner  TEXT;
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Teacher role required' USING ERRCODE = '42501';
  END IF;

  IF p_exercises IS NULL
     OR jsonb_typeof(p_exercises) <> 'array'
     OR jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'Worksheet must contain at least one exercise';
  END IF;

  IF p_parent_slug IS NOT NULL THEN
    SELECT teacher_uid INTO parent_owner
    FROM public.interactive_worksheets
    WHERE slug = p_parent_slug;
    IF parent_owner IS NULL OR parent_owner <> auth.uid()::text THEN
      RAISE EXCEPTION 'Parent worksheet not found or not owned by current user';
    END IF;
  END IF;

  SELECT COUNT(*) INTO bad_count
  FROM jsonb_array_elements(p_exercises) AS ex
  WHERE NOT (
    ex ? 'type'
    AND ex ? 'word_ids'
    AND jsonb_typeof(ex->'word_ids') = 'array'
    AND jsonb_array_length(ex->'word_ids') > 0
  );
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Each exercise must include a type and a non-empty word_ids array';
  END IF;

  first_type := p_exercises->0->>'type';

  SELECT array_agg(DISTINCT (id_text)::BIGINT)
  INTO   all_word_ids
  FROM   jsonb_array_elements(p_exercises) AS ex,
         jsonb_array_elements_text(ex->'word_ids') AS id_text;

  new_slug := public.generate_worksheet_slug();

  INSERT INTO public.interactive_worksheets (
    slug, teacher_uid, topic_name, word_ids, format, exercises, settings, parent_slug
  ) VALUES (
    new_slug,
    auth.uid()::text,
    p_topic_name,
    all_word_ids,
    first_type,
    p_exercises,
    COALESCE(p_settings, '{}'::jsonb),
    p_parent_slug
  );

  RETURN new_slug;
END;
$function$;


-- ---------------------------------------------------------------------------
-- P1.9 — student_sign_in(class_code, display_name): rate-limited
-- ---------------------------------------------------------------------------
-- Anonymous Supabase sign-ins are enabled, so the caller always has an
-- auth.uid() by the time they reach this RPC (matches class_lookup_by_code).
-- 10 attempts/min/uid: ample for a real student typing their name, hostile
-- to bulk enumeration.

CREATE TABLE IF NOT EXISTS public.student_sign_in_rate (
  id         BIGSERIAL PRIMARY KEY,
  caller_uid TEXT        NOT NULL,
  called_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_sign_in_rate_caller_at
  ON public.student_sign_in_rate (caller_uid, called_at);

ALTER TABLE public.student_sign_in_rate ENABLE ROW LEVEL SECURITY;
-- No policies needed: only the SECURITY DEFINER function below touches it.

CREATE OR REPLACE FUNCTION public.student_sign_in(p_class_code text, p_display_name text)
RETURNS TABLE(
  success      boolean,
  auth_uid     uuid,
  display_name text,
  class_code   text,
  email        text,
  avatar       text,
  xp           integer,
  badges       text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  v_profile        public.student_profiles;
  v_caller_uid     TEXT := auth.uid()::text;
  v_recent_calls   INTEGER;
  LIMIT_PER_MINUTE CONSTANT INTEGER := 10;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.student_sign_in_rate
   WHERE called_at < now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO v_recent_calls
    FROM public.student_sign_in_rate
   WHERE caller_uid = v_caller_uid
     AND called_at > now() - INTERVAL '1 minute';

  IF v_recent_calls >= LIMIT_PER_MINUTE THEN
    RAISE EXCEPTION 'Rate limit exceeded for student sign-in' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.student_sign_in_rate (caller_uid) VALUES (v_caller_uid);

  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE LOWER(class_code) = LOWER(p_class_code)
    AND LOWER(display_name) = LOWER(p_display_name);

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false::BOOLEAN, NULL::UUID, NULL::TEXT, NULL::TEXT,
      NULL::TEXT, NULL::TEXT, 0::INTEGER, '{}'::TEXT[];
    RETURN;
  END IF;

  IF v_profile.status != 'approved' THEN
    RETURN QUERY SELECT
      false::BOOLEAN, v_profile.auth_uid, v_profile.display_name,
      v_profile.class_code, v_profile.email, v_profile.avatar,
      v_profile.xp, v_profile.badges;
    RETURN;
  END IF;

  IF v_profile.auth_uid IS NULL THEN
    RAISE EXCEPTION 'Student profile has no auth_uid - needs approval';
  END IF;

  RETURN QUERY SELECT
    true::BOOLEAN,
    v_profile.auth_uid,
    v_profile.display_name,
    v_profile.class_code,
    v_profile.email,
    COALESCE(v_profile.avatar, '🦊'),
    COALESCE(v_profile.xp, 0),
    COALESCE(v_profile.badges, '{}');
END;
$function$;


-- ---------------------------------------------------------------------------
-- P1.10 — drop create_student_session(uuid)
-- ---------------------------------------------------------------------------
-- Dead code: body returned (NULL, NULL, expires_in) and the comment
-- explicitly notes tokens couldn't be generated in plpgsql. No callers
-- in app code.

DROP FUNCTION IF EXISTS public.create_student_session(uuid);
