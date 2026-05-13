-- =============================================================================
-- Student Roster + PIN Login (Path C)
-- =============================================================================
-- Teacher pre-creates students with a 6-character PIN. Student logs in with
-- class code + their name (picked from class roster) + PIN.
--
-- Reuses the existing student_profiles table (originally built for OAuth).
-- Adds:
--   * roster_created flag (distinguishes PIN students from OAuth signups)
--   * last_pin_reset_at, last_login_at telemetry
--   * RPCs for the teacher (create / reset_pin / delete / view_roster)
--   * RPC for student login lookup (returns synthetic email)
--
-- PIN format: 6 chars, uppercase, alphanumeric, no visually-confusing chars
-- (no O / 0 / I / 1 / L). Validated by regex inside each RPC.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS roster_created BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS roster_pin TEXT,
  ADD COLUMN IF NOT EXISTS last_pin_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN public.student_profiles.roster_created IS
  'TRUE when the row was pre-created by a teacher with a PIN (Path C). FALSE for OAuth signups.';

COMMENT ON COLUMN public.student_profiles.roster_pin IS
  'Plain-text PIN for teacher recovery. Class teacher reads via RLS; the student
   reads their own row but never their classmates''. The actual auth credential
   lives bcrypt-hashed in auth.users.encrypted_password; this column exists so
   a teacher who misplaces a printed roster can look up a PIN without forcing
   every student to reset and re-learn theirs.';

-- Unique display name per class (case-insensitive) — only for roster students.
-- Prevents two students named "Yossi K" from colliding in the same class.
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_class_name_uniq
  ON public.student_profiles (class_code, lower(display_name))
  WHERE roster_created = TRUE;

-- ---------------------------------------------------------------------------
-- 2. Teacher: create a roster student with a PIN
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.teacher_create_roster_student(TEXT, TEXT, TEXT, TEXT);
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

  -- 6 chars, A-Z (excluding I, L, O) and 2-9 (excluding 0, 1)
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

  -- 1) auth.users — PIN as bcrypt password
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_auth_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_pin, gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'roster_pin', 'providers', ARRAY['roster_pin']),
    jsonb_build_object(
      'display_name', v_normalized_name,
      'class_code', p_class_code,
      'role', 'student',
      'roster_created', true
    ),
    NOW(), NOW()
  );

  -- 2) public.users — required for progress RLS check
  INSERT INTO public.users (uid, email, role, display_name, class_code, avatar)
  VALUES (v_auth_uid::text, v_email, 'student', v_normalized_name, p_class_code, p_avatar);

  -- 3) student_profiles — approved & roster-created. Plain-text PIN stored
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

-- ---------------------------------------------------------------------------
-- 3. Teacher: reset a student's PIN
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.teacher_reset_student_pin(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.teacher_reset_student_pin(
  p_profile_id UUID,
  p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_uid TEXT := auth.uid()::text;
  v_class_code TEXT;
  v_auth_uid UUID;
BEGIN
  IF v_teacher_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT sp.class_code, sp.auth_uid INTO v_class_code, v_auth_uid
  FROM public.student_profiles sp WHERE sp.id = p_profile_id;

  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE code = v_class_code AND teacher_uid = v_teacher_uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not your class';
  END IF;

  IF p_new_pin !~ '^[A-HJ-KM-NP-Z2-9]{6}$' THEN
    RAISE EXCEPTION 'invalid PIN format';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_pin, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_auth_uid;

  UPDATE public.student_profiles
  SET roster_pin = p_new_pin,
      last_pin_reset_at = NOW()
  WHERE id = p_profile_id;

  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.teacher_reset_student_pin(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Teacher: delete a roster student (revokes login)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.teacher_delete_roster_student(UUID);
CREATE OR REPLACE FUNCTION public.teacher_delete_roster_student(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_uid TEXT := auth.uid()::text;
  v_class_code TEXT;
  v_auth_uid UUID;
BEGIN
  IF v_teacher_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT sp.class_code, sp.auth_uid INTO v_class_code, v_auth_uid
  FROM public.student_profiles sp WHERE sp.id = p_profile_id;

  IF v_auth_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE code = v_class_code AND teacher_uid = v_teacher_uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not your class';
  END IF;

  DELETE FROM public.users WHERE uid = v_auth_uid::text;
  DELETE FROM public.student_profiles WHERE id = p_profile_id;
  DELETE FROM auth.users WHERE id = v_auth_uid;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.teacher_delete_roster_student(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Teacher: view their class roster (with XP + last-seen)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.teacher_view_roster(TEXT);
CREATE OR REPLACE FUNCTION public.teacher_view_roster(p_class_code TEXT)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar TEXT,
  xp INTEGER,
  roster_pin TEXT,
  last_login_at TIMESTAMPTZ,
  last_pin_reset_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_uid TEXT := auth.uid()::text;
BEGIN
  IF v_teacher_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE code = p_class_code AND teacher_uid = v_teacher_uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not your class';
  END IF;

  RETURN QUERY
  SELECT sp.id, sp.display_name, sp.avatar, sp.xp, sp.roster_pin,
         sp.last_login_at, sp.last_pin_reset_at, sp.joined_at
  FROM public.student_profiles sp
  WHERE sp.class_code = p_class_code AND sp.roster_created = TRUE
  ORDER BY sp.display_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.teacher_view_roster(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Student: lookup roster for login screen
-- Returns display_name + synthetic email (needed for signInWithPassword).
-- Anyone with the class code may call this — class code is the join credential.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.class_roster_for_login(TEXT);
CREATE OR REPLACE FUNCTION public.class_roster_for_login(p_class_code TEXT)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  email TEXT,
  avatar TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT id, display_name, email, avatar
  FROM public.student_profiles
  WHERE class_code = p_class_code
    AND status = 'approved'
    AND roster_created = TRUE
  ORDER BY display_name;
$$;
GRANT EXECUTE ON FUNCTION public.class_roster_for_login(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Student: mark last_login_at (called after successful sign-in)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.student_touch_last_login();
CREATE OR REPLACE FUNCTION public.student_touch_last_login()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.student_profiles
  SET last_login_at = NOW()
  WHERE auth_uid = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.student_touch_last_login() TO authenticated;
