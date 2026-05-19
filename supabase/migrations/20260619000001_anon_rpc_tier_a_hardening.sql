-- Tier A hardening of anon-callable SECURITY DEFINER RPCs.
--
-- Background: an audit on 2026-05-19 flagged that five anon-callable
-- RPCs lacked rate limiting and (in two cases) leaked PII fields
-- (`email`, `auth_uid`) to anyone with a class code or student UUID.
-- A prior attempt on 2026-05-17 (revoke_anon_grants_on_definer_rpcs +
-- restore_anon_grants_on_preauth_rpcs) showed that simply revoking
-- anon EXECUTE breaks the pre-auth student-login flow.
--
-- Conservative Tier A approach: KEEP the anon grants, ADD rate limits
-- to every previously-unmetered function. The PII columns stay (the
-- consumer relies on them; see `processStudentProfile` defense-in-depth
-- at src/hooks/useStudentLogin.ts:128 — session.user.id must match
-- profile.auth_uid before any returned data is used). Tier B will
-- refactor the PIN login server-side so the email column can be
-- dropped from the roster RPC entirely.
--
-- All rate-limit storage consolidates into the existing
-- public.class_lookup_rate table, keyed by `<prefix>:<key>` so traffic
-- across RPCs does not cross-pollute counts.

-- ─── 1. class_roster_for_login — IP-keyed 20/min ──────────────────────
-- Was: LANGUAGE sql STABLE returning roster directly.
-- Now: LANGUAGE plpgsql VOLATILE so it can write to class_lookup_rate.
-- Generous enough for picker refetches; tight enough that an attacker
-- can't harvest >1200 roster fetches/hour from a single IP.
CREATE OR REPLACE FUNCTION public.class_roster_for_login(p_class_code text)
RETURNS TABLE(id uuid, display_name text, email text, avatar text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller_key   TEXT;
  v_recent_calls INTEGER;
  LIMIT_PER_MIN  CONSTANT INTEGER := 20;
BEGIN
  v_caller_key := 'roster:' || coalesce(
    auth.uid()::text,
    nullif(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    'anon-unknown'
  );

  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO v_recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = v_caller_key
    AND called_at > now() - INTERVAL '1 minute';

  IF v_recent_calls >= LIMIT_PER_MIN THEN
    RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (v_caller_key);

  RETURN QUERY
  SELECT sp.id, sp.display_name, sp.email, sp.avatar
  FROM public.student_profiles sp
  WHERE sp.class_code = p_class_code
    AND sp.status = 'approved'
    AND sp.roster_created = TRUE
  ORDER BY sp.display_name;
END;
$function$;

-- ─── 2. get_student_profile_for_login — IP-keyed 10/min ──────────────
-- Profile UUIDs appear in invite URLs, so unmetered lookups let an
-- attacker enumerate profiles. processStudentProfile already requires
-- session.user.id == profile.auth_uid before USING the result, so the
-- only remaining exposure is read-only PII harvesting — cap with 10/min.
CREATE OR REPLACE FUNCTION public.get_student_profile_for_login(p_student_id uuid)
RETURNS TABLE(id uuid, display_name text, email text, class_code text, auth_uid uuid, avatar text, badges text[], xp integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  v_caller_key   TEXT;
  v_recent_calls INTEGER;
  LIMIT_PER_MIN  CONSTANT INTEGER := 10;
BEGIN
  v_caller_key := 'profile_lookup:' || coalesce(
    auth.uid()::text,
    nullif(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    'anon-unknown'
  );

  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO v_recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = v_caller_key
    AND called_at > now() - INTERVAL '1 minute';

  IF v_recent_calls >= LIMIT_PER_MIN THEN
    RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (v_caller_key);

  RETURN QUERY
  SELECT sp.id, sp.display_name, sp.email, sp.class_code, sp.auth_uid,
         sp.avatar, sp.badges, sp.xp, sp.status
  FROM public.student_profiles sp
  WHERE sp.id = p_student_id;
END;
$function$;

-- ─── 3. get_class_by_code — IP-keyed 30/min ───────────────────────────
-- Was: no rate limit. Returns id/code/name/teacher_uid for any class
-- code. teacher_uid is the auth.users FK — leaking it lets an attacker
-- correlate a class to a Supabase user id (low severity, but free
-- mitigation). The duplicate class_lookup_by_code has 30/min/uid; mirror.
CREATE OR REPLACE FUNCTION public.get_class_by_code(p_class_code text)
RETURNS TABLE(id uuid, code text, name text, teacher_uid text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  v_caller_key   TEXT;
  v_recent_calls INTEGER;
  LIMIT_PER_MIN  CONSTANT INTEGER := 30;
BEGIN
  v_caller_key := 'class_by_code:' || coalesce(
    auth.uid()::text,
    nullif(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    'anon-unknown'
  );

  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO v_recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = v_caller_key
    AND called_at > now() - INTERVAL '1 minute';

  IF v_recent_calls >= LIMIT_PER_MIN THEN
    RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (v_caller_key);

  RETURN QUERY
  SELECT c.id, c.code, c.name, c.teacher_uid
  FROM public.classes c
  WHERE c.code = p_class_code;
END;
$function$;

-- ─── 4. is_teacher_allowed — IP-keyed 30/min ─────────────────────────
-- Was: no rate limit. Boolean probe enables teacher_allowlist email
-- enumeration. 30/min/IP makes bulk enumeration impractical without
-- breaking the legit post-OAuth single-shot lookup.
CREATE OR REPLACE FUNCTION public.is_teacher_allowed(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  v_caller_key   TEXT;
  v_recent_calls INTEGER;
  LIMIT_PER_MIN  CONSTANT INTEGER := 30;
BEGIN
  v_caller_key := 'is_teacher:' || coalesce(
    auth.uid()::text,
    nullif(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    'anon-unknown'
  );

  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO v_recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = v_caller_key
    AND called_at > now() - INTERVAL '1 minute';

  IF v_recent_calls >= LIMIT_PER_MIN THEN
    RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (v_caller_key);

  RETURN EXISTS (
    SELECT 1 FROM public.teacher_allowlist
    WHERE email = lower(check_email)
  );
END;
$function$;

-- ─── 5. get_or_create_student_profile — fix broken rate limit ────────
-- Old logic counted existing student_profiles rows for the auth_uid,
-- which is always 1 (one profile per auth_uid), so it never tripped.
-- New logic counts call attempts in class_lookup_rate, gating the
-- spam vector where an attacker with one auth session creates many
-- (class_code, display_name) variants and floods student_profiles
-- with pending_approval rows.
CREATE OR REPLACE FUNCTION public.get_or_create_student_profile(p_class_code text, p_display_name text, p_avatar text DEFAULT '🦊'::text)
RETURNS TABLE(profile student_profiles, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_unique_id    TEXT;
  v_profile      public.student_profiles;
  v_caller_uid   TEXT;
  v_caller_key   TEXT;
  v_recent_calls INTEGER;
  LIMIT_PER_5MIN CONSTANT INTEGER := 10;
BEGIN
  v_caller_uid := auth.uid()::text;
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_caller_key := 'profile_create:' || v_caller_uid;

  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  SELECT COUNT(*) INTO v_recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = v_caller_key
    AND called_at > now() - INTERVAL '5 minutes';

  IF v_recent_calls >= LIMIT_PER_5MIN THEN
    RAISE EXCEPTION 'Too many requests. Please wait a moment and try again.';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (v_caller_key);

  v_unique_id := LOWER(p_class_code) || LOWER(TRIM(p_display_name)) || ':' || v_caller_uid;

  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE unique_id = v_unique_id
     OR (unique_id = LOWER(p_class_code) || LOWER(TRIM(p_display_name)) AND auth_uid = auth.uid());

  IF NOT FOUND THEN
    INSERT INTO public.student_profiles (
      unique_id, display_name, class_code, email, status, auth_uid, avatar
    ) VALUES (
      v_unique_id, p_display_name, p_class_code,
      v_unique_id || '@internal.app', 'pending_approval', auth.uid(), p_avatar
    )
    RETURNING * INTO v_profile;
    RETURN QUERY SELECT v_profile, true::BOOLEAN;
  ELSE
    IF v_profile.unique_id != v_unique_id THEN
      UPDATE public.student_profiles
      SET unique_id = v_unique_id, email = v_unique_id || '@internal.app'
      WHERE id = v_profile.id;
      v_profile.unique_id := v_unique_id;
    END IF;
    IF p_avatar IS DISTINCT FROM v_profile.avatar THEN
      UPDATE public.student_profiles SET avatar = p_avatar WHERE id = v_profile.id;
      v_profile.avatar := p_avatar;
    END IF;
    RETURN QUERY SELECT v_profile, false::BOOLEAN;
  END IF;
END;
$function$;
