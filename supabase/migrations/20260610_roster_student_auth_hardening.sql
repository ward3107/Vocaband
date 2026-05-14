-- =============================================================================
-- Roster student auth-row hardening
-- =============================================================================
-- Two follow-ups to 20260602_student_roster_pins.sql that surfaced when
-- students hit "Database error querying schema" on the very first PIN
-- login attempt:
--
--   1. auth.identities row was never created.  Modern GoTrue
--      requires an identities row alongside auth.users for password
--      sign-in to round-trip.  Without it, downstream lookups drop the
--      user even though the bcrypt check passes.
--
--   2. confirmation_token / recovery_token / email_change_token_new /
--      email_change / email_change_token_current / reauthentication_token /
--      phone_change / phone_change_token were left NULL.  GoTrue's Go
--      scanner reads these into non-nullable strings and returns a
--      generic 500 "Database error querying schema" — misleading but
--      the same root cause every time.  Empty string '' is the value
--      GoTrue itself writes when it creates a user via signup.
--
-- Backfill of existing roster rows happened out-of-band before this
-- migration shipped (4 students patched in place).  This file makes
-- sure every NEW student created via the RPC carries the right shape.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.teacher_create_roster_student(
  p_class_code TEXT,
  p_display_name TEXT,
  p_pin TEXT,
  p_avatar TEXT DEFAULT '🦊'
)
RETURNS TABLE (id UUID, display_name TEXT, email TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_uid TEXT := auth.uid()::text;
  v_email TEXT;
  v_auth_uid UUID;
  v_unique_id TEXT;
  v_profile_id UUID;
  v_normalized_name TEXT;
BEGIN
  IF v_teacher_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = p_class_code AND teacher_uid = v_teacher_uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not your class';
  END IF;

  IF p_pin !~ '^[A-HJ-KM-NP-Z2-9]{6}$' THEN
    RAISE EXCEPTION 'invalid PIN format';
  END IF;

  v_normalized_name := trim(p_display_name);
  IF char_length(v_normalized_name) < 2 OR char_length(v_normalized_name) > 60 THEN
    RAISE EXCEPTION 'invalid display name length';
  END IF;

  v_auth_uid := gen_random_uuid();
  v_email := 'student-' || v_auth_uid::text || '@class-' || lower(p_class_code) || '.vocaband.local';
  v_unique_id := lower(p_class_code) || ':roster:' || lower(v_normalized_name);

  -- 1) auth.users — PIN as bcrypt password.  Token-shaped TEXT columns
  --    must be '' (not NULL) or the GoTrue scanner returns "Database
  --    error querying schema" on every subsequent password sign-in.
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    reauthentication_token,
    phone_change, phone_change_token,
    created_at, updated_at
  ) VALUES (
    v_auth_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_pin, extensions.gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'roster_pin', 'providers', ARRAY['roster_pin']),
    jsonb_build_object(
      'display_name', v_normalized_name,
      'class_code', p_class_code,
      'role', 'student',
      'roster_created', true
    ),
    '', '',
    '', '', '',
    '',
    '', '',
    NOW(), NOW()
  );

  -- 2) auth.identities — required for GoTrue to recognise the user
  --    on password sign-in.  Provider 'email' mirrors what the regular
  --    signup path writes; provider_id = user id keeps the row unique
  --    against the (provider, provider_id) constraint.  `email` is a
  --    generated column so it's omitted here.
  INSERT INTO auth.identities (
    id, user_id, provider, provider_id, identity_data,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_auth_uid,
    'email',
    v_auth_uid::text,
    jsonb_build_object(
      'sub', v_auth_uid::text,
      'email', v_email,
      'email_verified', false,
      'phone_verified', false
    ),
    NULL,
    NOW(), NOW()
  );

  -- 3) public.users — required for progress RLS check
  INSERT INTO public.users (uid, email, role, display_name, class_code, avatar)
  VALUES (v_auth_uid::text, v_email, 'student', v_normalized_name, p_class_code, p_avatar);

  -- 4) student_profiles — approved & roster-created. Plain-text PIN stored
  --    so the teacher can look it up later without forcing a reset.
  INSERT INTO public.student_profiles (
    unique_id, display_name, class_code, email, status, auth_uid,
    avatar, roster_created, roster_pin, approved_at, approved_by
  ) VALUES (
    v_unique_id, v_normalized_name, p_class_code, v_email, 'approved', v_auth_uid,
    p_avatar, TRUE, p_pin, NOW(), auth.uid()
  )
  RETURNING student_profiles.id INTO v_profile_id;

  RETURN QUERY SELECT v_profile_id, v_normalized_name, v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.teacher_create_roster_student(TEXT, TEXT, TEXT, TEXT) TO authenticated;
