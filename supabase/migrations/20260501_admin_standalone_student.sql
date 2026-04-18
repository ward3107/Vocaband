-- ============================================================================
-- admin_create_standalone_student
--
-- Lets an authenticated admin attach a public.users row to an existing
-- auth.users account, with role='student' and NO class_code.  Useful for
-- on-boarding a student before their teacher is set up, or for creating
-- a demo student account owned by the developer.
--
-- How to use:
--   1. Create the user in the Supabase Auth dashboard (Authentication →
--      Users → Add user).  Provide email + password.  Copy the new
--      user's UUID from the row that appears.
--   2. In the SQL editor run:
--        SELECT public.admin_create_standalone_student(
--          'the-uuid-you-just-copied',
--          'Display Name Goes Here'
--        );
--   3. The student can now sign in with that email + password and will
--      land on the student dashboard with no class assigned.  They can
--      join a class later by pasting a class code into the "switch class"
--      flow; until they do, assignments just appear empty (expected).
--
-- Safety: the RPC requires the caller to have role='admin' in public.users.
-- A non-admin call returns an authorisation error with no data exposure.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_standalone_student(
  p_auth_uid TEXT,
  p_display_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_uid TEXT := auth.uid()::text;
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = caller_uid AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create standalone students' USING ERRCODE = '42501';
  END IF;

  IF p_display_name IS NULL OR char_length(trim(p_display_name)) = 0 THEN
    RAISE EXCEPTION 'display_name is required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id::text = p_auth_uid) THEN
    RAISE EXCEPTION 'auth user % does not exist — create them in the Supabase Auth dashboard first', p_auth_uid
      USING ERRCODE = '23503';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE uid = p_auth_uid) THEN
    RAISE EXCEPTION 'user row for % already exists — nothing to do', p_auth_uid
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.users (uid, email, role, display_name, class_code, xp, streak, badges)
  SELECT au.id::text, au.email, 'student', trim(p_display_name), NULL, 0, 0, ARRAY[]::TEXT[]
  FROM auth.users au
  WHERE au.id::text = p_auth_uid;

  RETURN jsonb_build_object(
    'success', true,
    'uid', p_auth_uid,
    'display_name', trim(p_display_name),
    'role', 'student',
    'class_code', NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_standalone_student(TEXT, TEXT)
  TO authenticated;

COMMENT ON FUNCTION public.admin_create_standalone_student IS
  'Admin-only: attach a student public.users row to an existing auth.users account, with no class and no teacher approval required.';
