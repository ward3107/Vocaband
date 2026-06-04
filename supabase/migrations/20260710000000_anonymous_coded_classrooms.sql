-- =============================================================================
-- Anonymous Coded Classrooms (privacy-by-design school onboarding)
-- =============================================================================
-- Goal: never store a student NAME. Each roster student instead gets a
-- structured anonymous code encoding school · grade · branch · seq
-- (e.g. "07-5-2-14") plus a login PIN. The code is stored in display_name, so
-- every existing read (class_roster_for_login, teacher_view_roster, the print
-- sheet, progress) keeps working unchanged — it simply shows the code.
--
-- Two creation paths, both reusing the roster insert pattern from
-- 20260602_student_roster_pins.sql (auth.users bcrypt PIN + public.users +
-- student_profiles, roster_created=TRUE, status='approved'):
--   * teacher_bulk_create_roster  — teacher self-serve top-up (owns the class)
--   * admin_bulk_seed_school       — operator seeds a whole school at onboarding
--
-- Admin-seeded classes link to a teacher via claim-on-login: the class carries
-- pending_teacher_email and is claimed (teacher_uid set) the first time that
-- teacher signs in (claim_pending_classes()).
--
-- This migration is ADDITIVE and backward-compatible. The only change to
-- existing schema is loosening classes.teacher_uid to NULLABLE (so a seeded but
-- unclaimed class can exist) — which never breaks existing rows.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. schools.school_code — short numeric prefix for student codes
-- ---------------------------------------------------------------------------
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS school_code TEXT
    CHECK (school_code IS NULL OR school_code ~ '^[0-9]{1,4}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_school_code_uniq
  ON public.schools (school_code) WHERE school_code IS NOT NULL;

COMMENT ON COLUMN public.schools.school_code IS
  'Short numeric prefix (e.g. "07") forming the first segment of anonymous
   student codes school-grade-branch-seq. Operator/admin only via
   admin_set_school_code (schools has no client write policy).';

-- ---------------------------------------------------------------------------
-- 2. student_profiles — structured code parts (the code itself is display_name)
-- ---------------------------------------------------------------------------
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS grade    INT,
  ADD COLUMN IF NOT EXISTS branch   INT,
  ADD COLUMN IF NOT EXISTS anon_seq INT;

COMMENT ON COLUMN public.student_profiles.anon_seq IS
  'Sequence within (class_code, grade, branch) for coded roster students.
   display_name = school_code-grade-branch-anon_seq.';

-- Fast next-seq lookup + concurrency guard (two parallel bulk calls can never
-- mint the same seq — the second INSERT raises and its RPC rolls back).
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_anon_seq_uniq
  ON public.student_profiles (class_code, grade, branch, anon_seq)
  WHERE roster_created = TRUE AND anon_seq IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. classes — pending_teacher_email + nullable teacher_uid (claim-on-login)
-- ---------------------------------------------------------------------------
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS pending_teacher_email TEXT;

ALTER TABLE public.classes ALTER COLUMN teacher_uid DROP NOT NULL;

COMMENT ON COLUMN public.classes.pending_teacher_email IS
  'Set by admin_bulk_seed_school for a class with no owner yet. The matching
   teacher claims the class (teacher_uid set, this cleared) on first login via
   claim_pending_classes().';

-- ---------------------------------------------------------------------------
-- 4. generate_roster_pin() — server-side 6-char PIN
--    Charset matches the client (RosterModalV2.generatePin) AND the roster PIN
--    regex ^[A-HJ-KM-NP-Z2-9]{6}$ — drops I/L/O/0/1. PINs are not unique keys,
--    so no retry loop is needed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_roster_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  rb    BYTEA := extensions.gen_random_bytes(6);
  out   TEXT := '';
  i     INT;
BEGIN
  FOR i IN 0..5 LOOP
    out := out || substr(chars, (get_byte(rb, i) % length(chars)) + 1, 1);
  END LOOP;
  RETURN out;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. generate_class_code() — server-side 8-char class code with uniqueness
--    retry. Charset mirrors the client generator in useTeacherActions.ts
--    (keeps L; drops only I/O/0/1). Mirrors classes.code constraint (6–20).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_class_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  chars    TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempts INT := 0;
  v_code   TEXT;
  rb       BYTEA;
  i        INT;
BEGIN
  WHILE attempts < 10 LOOP
    rb := extensions.gen_random_bytes(8);
    v_code := '';
    FOR i IN 0..7 LOOP
      v_code := v_code || substr(chars, (get_byte(rb, i) % length(chars)) + 1, 1);
    END LOOP;
    -- Qualify the column to avoid the variable/column name collision that
    -- would make `code = v_code` ambiguous.
    IF NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.code = v_code) THEN
      RETURN v_code;
    END IF;
    attempts := attempts + 1;
  END LOOP;
  RAISE EXCEPTION 'failed to generate a unique class code after 10 attempts';
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. teacher_bulk_create_roster — teacher self-serve, N coded students at once
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.teacher_bulk_create_roster(
  p_class_code TEXT,
  p_grade      INT,
  p_branch     INT,
  p_count      INT
)
RETURNS TABLE (structured_id TEXT, pin TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, extensions
AS $$
DECLARE
  v_teacher_uid TEXT := auth.uid()::text;
  v_school_code TEXT;
  v_existing    INT;
  v_next_seq    INT;
  v_code        TEXT;
  v_pin         TEXT;
  v_auth_uid    UUID;
  v_email       TEXT;
  i             INT;
BEGIN
  IF v_teacher_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Ownership: the class must belong to the caller.
  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE code = p_class_code AND teacher_uid = v_teacher_uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not your class';
  END IF;

  IF p_grade  IS NULL OR p_grade  < 1 OR p_grade  > 99 THEN RAISE EXCEPTION 'invalid grade';  END IF;
  IF p_branch IS NULL OR p_branch < 1 OR p_branch > 99 THEN RAISE EXCEPTION 'invalid branch'; END IF;
  IF p_count  IS NULL OR p_count  < 1 OR p_count  > 60 THEN RAISE EXCEPTION 'invalid count';  END IF;

  -- Derive the school code through the teacher's school. Fallback '00'.
  SELECT COALESCE(s.school_code, '00')
    INTO v_school_code
  FROM public.users u
  LEFT JOIN public.schools s ON s.id = u.school_id
  WHERE u.uid = v_teacher_uid;
  v_school_code := COALESCE(v_school_code, '00');

  -- Free-tier cap: 30 roster students per class unless the teacher is Pro/school.
  IF NOT public.is_pro_or_trialing() THEN
    SELECT count(*) INTO v_existing
    FROM public.student_profiles
    WHERE class_code = p_class_code AND roster_created = TRUE;
    IF v_existing + p_count > 30 THEN
      RAISE EXCEPTION 'free_tier_cap';
    END IF;
  END IF;

  -- Next sequence within (class, grade, branch).
  SELECT COALESCE(MAX(anon_seq), 0) INTO v_next_seq
  FROM public.student_profiles
  WHERE class_code = p_class_code
    AND grade = p_grade AND branch = p_branch
    AND roster_created = TRUE;

  FOR i IN 1..p_count LOOP
    v_next_seq := v_next_seq + 1;
    v_code := v_school_code || '-' || p_grade || '-' || p_branch || '-' || v_next_seq;
    v_pin := public.generate_roster_pin();
    v_auth_uid := gen_random_uuid();
    v_email := 'student-' || v_auth_uid::text || '@class-' || lower(p_class_code) || '.vocaband.local';

    -- 1) auth.users — PIN bcrypt (same shape as teacher_create_roster_student).
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_auth_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pin, extensions.gen_salt('bf')), NOW(),
      jsonb_build_object('provider', 'roster_pin', 'providers', ARRAY['roster_pin']),
      jsonb_build_object('display_name', v_code, 'class_code', p_class_code,
                         'role', 'student', 'roster_created', true),
      NOW(), NOW()
    );

    -- 2) public.users — required for progress RLS.
    INSERT INTO public.users (uid, email, role, display_name, class_code, avatar)
    VALUES (v_auth_uid::text, v_email, 'student', v_code, p_class_code, '🦊');

    -- 3) student_profiles — approved, coded, structured parts populated.
    INSERT INTO public.student_profiles (
      unique_id, display_name, class_code, email, status, auth_uid,
      avatar, roster_created, roster_pin, approved_at, approved_by,
      grade, branch, anon_seq
    ) VALUES (
      lower(p_class_code) || ':roster:' || lower(v_code), v_code, p_class_code, v_email,
      'approved', v_auth_uid, '🦊', TRUE, v_pin, NOW(), auth.uid(),
      p_grade, p_branch, v_next_seq
    );

    structured_id := v_code;
    pin := v_pin;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. admin_set_school_code — operator assigns a school's numeric prefix
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_school_code(p_school_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_code TEXT := trim(COALESCE(p_code, ''));
BEGIN
  PERFORM public.assert_admin();
  IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id) THEN
    RAISE EXCEPTION 'school % not found', p_school_id USING ERRCODE = '23503';
  END IF;
  IF v_code !~ '^[0-9]{1,4}$' THEN
    RAISE EXCEPTION 'school code must be 1–4 digits' USING ERRCODE = '22023';
  END IF;

  BEGIN
    UPDATE public.schools SET school_code = v_code WHERE id = p_school_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'school code % is already in use', v_code USING ERRCODE = '23505';
  END;

  RETURN jsonb_build_object('success', true, 'id', p_school_id, 'school_code', v_code);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. admin_bulk_seed_school — create a school's classes + coded students
--    p_rows: [{ "grade":5, "branch":2, "count":14, "teacher_email":"t@x" }, …]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_bulk_seed_school(
  p_school_id UUID,
  p_rows      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, extensions
AS $$
DECLARE
  v_school_code  TEXT;
  v_school_name  TEXT;
  r              JSONB;
  v_grade        INT;
  v_branch       INT;
  v_count        INT;
  v_teacher_email TEXT;
  v_teacher_uid  TEXT;
  v_class_code   TEXT;
  v_class_name   TEXT;
  v_seq          INT;
  v_code         TEXT;
  v_pin          TEXT;
  v_auth_uid     UUID;
  v_email        TEXT;
  v_students     JSONB;
  v_classes      JSONB := '[]'::jsonb;
  i              INT;
BEGIN
  PERFORM public.assert_admin();

  SELECT school_code, name INTO v_school_code, v_school_name
  FROM public.schools WHERE id = p_school_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'school % not found', p_school_id USING ERRCODE = '23503';
  END IF;
  v_school_code := COALESCE(v_school_code, '00');

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_grade  := (r->>'grade')::INT;
    v_branch := (r->>'branch')::INT;
    v_count  := (r->>'count')::INT;
    v_teacher_email := lower(NULLIF(trim(COALESCE(r->>'teacher_email', '')), ''));

    IF v_grade IS NULL OR v_grade < 1 OR v_grade > 99
       OR v_branch IS NULL OR v_branch < 1 OR v_branch > 99
       OR v_count IS NULL OR v_count < 1 OR v_count > 60 THEN
      RAISE EXCEPTION 'invalid row: %', r USING ERRCODE = '22023';
    END IF;

    -- Resolve teacher if already signed up; else leave NULL (claim-on-login).
    v_teacher_uid := NULL;
    IF v_teacher_email IS NOT NULL THEN
      SELECT uid INTO v_teacher_uid
      FROM public.users WHERE lower(email) = v_teacher_email LIMIT 1;
    END IF;

    v_class_code := public.generate_class_code();
    v_class_name := 'Grade ' || v_grade || ' / ' || v_branch;

    INSERT INTO public.classes (name, teacher_uid, code, subject, school_name, pending_teacher_email)
    VALUES (v_class_name, v_teacher_uid, v_class_code, 'english', v_school_name,
            CASE WHEN v_teacher_uid IS NULL THEN v_teacher_email ELSE NULL END);

    v_students := '[]'::jsonb;
    FOR i IN 1..v_count LOOP
      v_seq := i;
      v_code := v_school_code || '-' || v_grade || '-' || v_branch || '-' || v_seq;
      v_pin := public.generate_roster_pin();
      v_auth_uid := gen_random_uuid();
      v_email := 'student-' || v_auth_uid::text || '@class-' || lower(v_class_code) || '.vocaband.local';

      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        v_auth_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        v_email, extensions.crypt(v_pin, extensions.gen_salt('bf')), NOW(),
        jsonb_build_object('provider', 'roster_pin', 'providers', ARRAY['roster_pin']),
        jsonb_build_object('display_name', v_code, 'class_code', v_class_code,
                           'role', 'student', 'roster_created', true),
        NOW(), NOW()
      );

      INSERT INTO public.users (uid, email, role, display_name, class_code, avatar)
      VALUES (v_auth_uid::text, v_email, 'student', v_code, v_class_code, '🦊');

      INSERT INTO public.student_profiles (
        unique_id, display_name, class_code, email, status, auth_uid,
        avatar, roster_created, roster_pin, approved_at, approved_by,
        grade, branch, anon_seq
      ) VALUES (
        lower(v_class_code) || ':roster:' || lower(v_code), v_code, v_class_code, v_email,
        'approved', v_auth_uid, '🦊', TRUE, v_pin, NOW(), auth.uid(),
        v_grade, v_branch, v_seq
      );

      v_students := v_students || jsonb_build_object('code', v_code, 'pin', v_pin);
    END LOOP;

    v_classes := v_classes || jsonb_build_object(
      'class_code', v_class_code, 'class_name', v_class_name,
      'grade', v_grade, 'branch', v_branch,
      'teacher_email', v_teacher_email, 'claimed', (v_teacher_uid IS NOT NULL),
      'students', v_students);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'school_code', v_school_code, 'classes', v_classes);
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. claim_pending_classes — teacher attaches any classes seeded for their email
--    Called once after a teacher session is established (teacherOnboarding).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_pending_classes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_uid     TEXT := auth.uid()::text;
  v_email   TEXT;
  v_claimed INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT lower(email) INTO v_email FROM public.users WHERE uid = v_uid;
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.classes
  SET teacher_uid = v_uid, pending_teacher_email = NULL
  WHERE teacher_uid IS NULL
    AND lower(pending_teacher_email) = v_email;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;

  RETURN v_claimed;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. admin_list_schools — add school_code to the existing payload so the
--     dashboard seed section can show / pre-fill it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_schools()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  result JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'school_code', s.school_code,
      'created_at', s.created_at,
      'teachers', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role IN ('teacher', 'manager')),
      'students', (SELECT count(*) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'student'),
      'managers', (SELECT COALESCE(jsonb_agg(u.email), '[]'::jsonb) FROM public.users u
                   WHERE u.school_id = s.id AND u.role = 'manager')
    ) ORDER BY s.name
  ), '[]'::jsonb)
  INTO result
  FROM public.schools s;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; per-function guards (ownership / assert_admin)
-- do the real gating. anon never reaches these.
-- ---------------------------------------------------------------------------
-- Pure internal helpers: no external caller needs them. They are invoked only
-- by the SECURITY DEFINER RPCs below (which run as the owner, so the nested
-- calls still resolve). Revoke from authenticated too to keep the API surface
-- minimal — they never appear as callable /rest/v1/rpc endpoints.
REVOKE ALL ON FUNCTION public.generate_roster_pin()                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_class_code()                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_bulk_create_roster(TEXT, INT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_school_code(UUID, TEXT)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_bulk_seed_school(UUID, JSONB)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_pending_classes()                        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.teacher_bulk_create_roster(TEXT, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_school_code(UUID, TEXT)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_seed_school(UUID, JSONB)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_classes()                        TO authenticated;

-- ---------------------------------------------------------------------------
-- Dark launch: register the gating flag (OFF). The teacher bulk-add UI and the
-- admin seed section render only when this is enabled. Ships disabled so the
-- feature is invisible until the operator flips it on (self first, then all)
-- from the Feature Flags panel. Idempotent — never clobbers an existing row.
-- ---------------------------------------------------------------------------
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('anon_coded_classrooms', false,
        'Anonymous coded classrooms: teacher bulk "add a whole class" + admin school seeding (no student names).')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- =============================================================================
-- Verification (run manually on a branch after applying):
--   -- as an admin:
--   SELECT public.admin_set_school_code('<school-uuid>', '07');
--   -- as a teacher who owns class CODE, attached to that school:
--   SELECT * FROM public.teacher_bulk_create_roster('CODE', 5, 2, 14);
--     -- expect 14 rows: 07-5-2-1 … 07-5-2-14, each with a 6-char PIN
--   SELECT display_name FROM public.class_roster_for_login('CODE');  -- codes only
--   -- admin seed:
--   SELECT public.admin_bulk_seed_school('<school-uuid>',
--     '[{"grade":5,"branch":2,"count":3,"teacher_email":"t@x.com"}]'::jsonb);
--   -- then sign in as t@x.com and:
--   SELECT public.claim_pending_classes();  -- expect 1
-- =============================================================================
