-- =============================================================================
-- bootstrap_student_session — one RPC to replace the auth-restore round-trip maze
-- =============================================================================
--
-- Background: `useAuthRestore.ts` runs 3-5 sequential round-trips on every
-- student login (users → student_profiles → classes → assignments + progress),
-- with separate fallback branches for OAuth-first-login, localStorage UID
-- restoration, and the "broken users row" recovery path. On cellular networks
-- in Israeli classrooms this adds 600-1200ms of white screen before the
-- dashboard renders.
--
-- This RPC collapses every student-side entry path into a single SECURITY
-- DEFINER call that returns ALL the state the student dashboard needs:
--   - the users row (creating it from student_profiles if needed)
--   - the class
--   - assignments for the class
--   - the student's progress in that class
--   - daily missions for today
--   - pet evolution state
--   - any unseen teacher rewards
--
-- Composes existing RPCs — does NOT duplicate their logic:
--   - get_or_create_student_profile_oauth (for OAuth first-login)
--   - get_assignments_for_class
--   - get_or_create_daily_missions
--   - get_pet_state
--   - get_unseen_rewards
--
-- Return shape: jsonb with a discriminated `status` field. Callers branch on
-- status — see src/core/bootstrap.ts for the TS side.
--
-- ┌─────────────────────┬──────────────────────────────────────────────────┐
-- │ status              │ When                                             │
-- ├─────────────────────┼──────────────────────────────────────────────────┤
-- │ 'ok'                │ Full session loaded — student can play           │
-- │ 'needs-class-code'  │ OAuth user with no users row and no fallback     │
-- │                     │ p_class_code provided — show class-code prompt   │
-- │ 'pending-approval'  │ student_profiles row is pending_approval         │
-- │ 'class-not-found'   │ users.class_code references a deleted class      │
-- └─────────────────────┴──────────────────────────────────────────────────┘
--
-- NB: this RPC is student-only. Teacher bootstrap has a different shape
-- (classes → students → progress per class) and is a separate scope.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_student_session(
  p_class_code   text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_avatar       text DEFAULT '🦊',
  p_local_date   date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_auth_uid     text := (auth.uid())::text;
  v_email        text := (auth.jwt() ->> 'email');
  v_user         public.users%ROWTYPE;
  v_profile      public.student_profiles%ROWTYPE;
  v_class        public.classes%ROWTYPE;
  v_local_date   date := COALESCE(p_local_date, CURRENT_DATE);
  v_status       text := 'ok';
  v_assignments  jsonb := '[]'::jsonb;
  v_progress     jsonb := '[]'::jsonb;
  v_missions     jsonb := '[]'::jsonb;
  v_pet          jsonb := NULL;
  v_rewards      jsonb := '[]'::jsonb;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'bootstrap_student_session requires authentication'
      USING ERRCODE = '28000';
  END IF;

  -- ── Step 1: existing users row (happy path) ────────────────────────────
  SELECT * INTO v_user FROM public.users WHERE uid = v_auth_uid;

  -- ── Step 2: broken-user / OAuth-half-done fallback ─────────────────────
  -- A student_profiles row exists for this email but no users row was minted.
  IF v_user.uid IS NULL AND v_email IS NOT NULL THEN
    SELECT * INTO v_profile
    FROM public.student_profiles
    WHERE email = v_email
    LIMIT 1;

    IF v_profile.id IS NOT NULL THEN
      IF v_profile.status = 'pending_approval' THEN
        RETURN jsonb_build_object(
          'status', 'pending-approval',
          'pending_profile', jsonb_build_object(
            'id',            v_profile.id,
            'display_name',  v_profile.display_name,
            'class_code',    v_profile.class_code
          )
        );
      END IF;

      -- Approved / active profile but no users row → mint one
      INSERT INTO public.users (uid, email, role, display_name, class_code, avatar, xp)
      VALUES (
        v_auth_uid,
        v_profile.email,
        'student',
        COALESCE(v_profile.display_name, 'Student'),
        v_profile.class_code,
        COALESCE(v_profile.avatar, p_avatar),
        COALESCE(v_profile.xp, 0)
      )
      ON CONFLICT (uid) DO NOTHING;

      SELECT * INTO v_user FROM public.users WHERE uid = v_auth_uid;
    END IF;
  END IF;

  -- ── Step 3: OAuth first-login fallback ─────────────────────────────────
  -- No users row, no student_profile by email — caller passed a class code
  -- and display name, so we can mint a profile + users row in one shot.
  IF v_user.uid IS NULL THEN
    IF p_class_code IS NOT NULL
       AND p_display_name IS NOT NULL
       AND v_email IS NOT NULL THEN
      -- Reuse the existing OAuth profile-creation RPC so approval rules,
      -- unique_id derivation, and audit logging stay in lockstep.
      SELECT (q.profile).* INTO v_profile
      FROM public.get_or_create_student_profile_oauth(
        p_class_code,
        p_display_name,
        v_email,
        (auth.uid()),
        p_avatar
      ) AS q;

      IF v_profile.id IS NULL THEN
        -- Class code didn't resolve — surface to caller
        RETURN jsonb_build_object('status', 'class-not-found');
      END IF;

      IF v_profile.status = 'pending_approval' THEN
        RETURN jsonb_build_object(
          'status', 'pending-approval',
          'pending_profile', jsonb_build_object(
            'id',            v_profile.id,
            'display_name',  v_profile.display_name,
            'class_code',    v_profile.class_code
          )
        );
      END IF;

      INSERT INTO public.users (uid, email, role, display_name, class_code, avatar)
      VALUES (v_auth_uid, v_email, 'student', p_display_name, p_class_code, p_avatar)
      ON CONFLICT (uid) DO NOTHING;

      SELECT * INTO v_user FROM public.users WHERE uid = v_auth_uid;
    ELSE
      -- No row, no fallback inputs → caller must show class-code prompt
      RETURN jsonb_build_object('status', 'needs-class-code');
    END IF;
  END IF;

  -- ── At this point v_user is guaranteed populated ───────────────────────
  -- Non-students (teachers, admin) shouldn't go through this RPC — they
  -- have their own bootstrap path. Return their user row so the React layer
  -- can detect the role mismatch and route accordingly.
  IF v_user.role <> 'student' THEN
    RETURN jsonb_build_object(
      'status', 'ok',
      'user',   to_jsonb(v_user),
      'class',  NULL,
      'assignments',    '[]'::jsonb,
      'progress',       '[]'::jsonb,
      'daily_missions', '[]'::jsonb,
      'pet_state',      NULL,
      'unseen_rewards', '[]'::jsonb
    );
  END IF;

  -- ── Step 4: class + assignments + progress ─────────────────────────────
  IF v_user.class_code IS NOT NULL THEN
    SELECT * INTO v_class
    FROM public.classes
    WHERE code = v_user.class_code;

    IF v_class.id IS NULL THEN
      v_status := 'class-not-found';
    ELSE
      SELECT COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
        INTO v_assignments
      FROM public.get_assignments_for_class(v_class.id) a;

      SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
        INTO v_progress
      FROM public.progress p
      WHERE p.class_code  = v_user.class_code
        AND p.student_uid = v_auth_uid;
    END IF;
  END IF;

  -- ── Step 5: daily missions / pet / rewards (best-effort) ───────────────
  -- These are non-critical — if any one fails (e.g. timezone missing on
  -- a freshly-minted user), the dashboard still renders. Each is wrapped
  -- in its own savepoint so a single failure doesn't roll back the rest.
  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      INTO v_missions
    FROM public.get_or_create_daily_missions(v_local_date) m;
  EXCEPTION WHEN OTHERS THEN
    v_missions := '[]'::jsonb;
  END;

  BEGIN
    SELECT to_jsonb(ps) INTO v_pet
    FROM public.get_pet_state(v_local_date) ps;
  EXCEPTION WHEN OTHERS THEN
    v_pet := NULL;
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
      INTO v_rewards
    FROM public.get_unseen_rewards() r;
  EXCEPTION WHEN OTHERS THEN
    v_rewards := '[]'::jsonb;
  END;

  RETURN jsonb_build_object(
    'status',         v_status,
    'user',           to_jsonb(v_user),
    'class',          CASE WHEN v_class.id IS NOT NULL THEN to_jsonb(v_class) ELSE NULL END,
    'assignments',    v_assignments,
    'progress',       v_progress,
    'daily_missions', v_missions,
    'pet_state',      v_pet,
    'unseen_rewards', v_rewards
  );
END;
$$;

-- Lock down the default grant — only authenticated users may call.
REVOKE EXECUTE ON FUNCTION
  public.bootstrap_student_session(text, text, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION
  public.bootstrap_student_session(text, text, text, date) FROM anon;
GRANT  EXECUTE ON FUNCTION
  public.bootstrap_student_session(text, text, text, date) TO authenticated;

COMMENT ON FUNCTION public.bootstrap_student_session(text, text, text, date) IS
  'Single-call student session bootstrap. Returns {status, user, class, '
  'assignments, progress, daily_missions, pet_state, unseen_rewards}. '
  'See src/core/bootstrap.ts for the TS contract. Replaces the 3-5 '
  'sequential round-trip restoration in useAuthRestore.ts.';
