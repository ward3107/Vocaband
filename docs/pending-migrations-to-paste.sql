-- ============================================================================
-- Medium-risk security hardening
--
-- 1. get_assignments_for_class:
--    Previously any authenticated user could pass any class_id and read
--    its assignments (info leak).  Now the caller must either be the
--    class's teacher or a student enrolled in that class.
--
-- 2. class_lookup_by_code:
--    Removes the `anon` grant (unauthenticated brute-force vector) and
--    adds a per-caller rate limit using a lightweight in-memory table.
--    OAuth / class-switch flows always call this post-auth, so requiring
--    auth does not regress any real user flow.
--
-- 3. award_reward:
--    XP was unbounded — a compromised teacher account could grant
--    millions of XP in one call.  Cap per-call XP at 10 000 and reject
--    negative / non-numeric values explicitly.
-- ============================================================================

-- ── 1. get_assignments_for_class: scope to class members ────────────────────
DROP FUNCTION IF EXISTS public.get_assignments_for_class(UUID);

CREATE OR REPLACE FUNCTION public.get_assignments_for_class(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  class_id UUID,
  word_ids INTEGER[],
  words JSONB,
  allowed_modes TEXT[],
  deadline TEXT,
  sentences TEXT[],
  sentence_difficulty INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_uid   TEXT := auth.uid()::text;
  caller_role  TEXT;
  caller_class TEXT;
  target_code  TEXT;
  is_teacher   BOOLEAN;
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT u.role, u.class_code INTO caller_role, caller_class
  FROM public.users u WHERE u.uid = caller_uid;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '42501';
  END IF;

  -- Teacher path: must own the class.
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_uid = caller_uid
  ) INTO is_teacher;

  IF NOT is_teacher THEN
    -- Student path: must be enrolled in the class.
    SELECT c.code INTO target_code FROM public.classes c WHERE c.id = p_class_id;

    IF target_code IS NULL OR caller_class IS NULL OR caller_class <> target_code THEN
      RAISE EXCEPTION 'Access denied: caller is not a member of this class'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.class_id,
    a.word_ids,
    a.words,
    a.allowed_modes,
    a.deadline,
    a.sentences,
    a.sentence_difficulty,
    a.created_at
  FROM public.assignments a
  WHERE a.class_id = p_class_id
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assignments_for_class(UUID) FROM anon;

COMMENT ON FUNCTION public.get_assignments_for_class IS
  'Assignments for a class. SECURITY DEFINER with explicit membership check — caller must be the class teacher or an enrolled student.';

-- ── 2. class_lookup_by_code: auth-only + per-uid rate limit ─────────────────
-- Lightweight rate-limit ledger.  One row per lookup call, cleaned up by
-- the RPC as it runs (no cron / pg_net required).
CREATE TABLE IF NOT EXISTS public.class_lookup_rate (
  caller_uid TEXT NOT NULL,
  called_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_class_lookup_rate_caller_time
  ON public.class_lookup_rate (caller_uid, called_at DESC);

ALTER TABLE public.class_lookup_rate ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER RPC touches the table, so the
-- ledger is effectively private to the function.

DROP FUNCTION IF EXISTS public.class_lookup_by_code(text);

CREATE OR REPLACE FUNCTION public.class_lookup_by_code(p_code text)
RETURNS TABLE (code text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_uid      TEXT := auth.uid()::text;
  recent_calls    INTEGER;
  LIMIT_PER_MINUTE CONSTANT INTEGER := 30;
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Housekeeping: delete rows older than 5 minutes so the ledger stays tiny.
  DELETE FROM public.class_lookup_rate WHERE called_at < now() - INTERVAL '5 minutes';

  -- Per-uid window check: block obvious scripted brute-force.
  SELECT COUNT(*) INTO recent_calls
  FROM public.class_lookup_rate
  WHERE caller_uid = class_lookup_by_code.caller_uid
    AND called_at > now() - INTERVAL '1 minute';

  IF recent_calls >= LIMIT_PER_MINUTE THEN
    RAISE EXCEPTION 'Rate limit exceeded for class lookup' USING ERRCODE = '42P08';
  END IF;

  INSERT INTO public.class_lookup_rate (caller_uid) VALUES (caller_uid);

  RETURN QUERY
  SELECT c.code, c.name
  FROM public.classes c
  WHERE c.code = upper(trim(p_code))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.class_lookup_by_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.class_lookup_by_code(text) FROM anon;

COMMENT ON FUNCTION public.class_lookup_by_code IS
  'Looks up {code, name} for a class code. Auth required + per-caller rate limit (30/min) to deter brute-force.';

-- ── 3. award_reward: cap XP + sanitise inputs ───────────────────────────────
-- Re-create the function with an explicit XP cap.  Everything else in the
-- function body is identical to 20260425_teacher_rewards.sql.
CREATE OR REPLACE FUNCTION public.award_reward(
  p_student_uid TEXT,
  p_reward_type TEXT,
  p_reward_value TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_uid   TEXT := auth.uid()::text;
  student_name  TEXT;
  current_xp    INTEGER;
  new_xp        INTEGER;
  xp_amount     INTEGER;
  -- Cap a single award at 10 000 XP.  Legitimate teacher rewards in the
  -- app UI max out at 500 XP; 10 000 still feels generous while blocking
  -- a compromised account from granting millions in one call.
  MAX_XP_PER_CALL CONSTANT INTEGER := 10000;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = teacher_uid AND role = 'teacher') THEN
    RAISE EXCEPTION 'Only teachers can award rewards' USING ERRCODE = '42501';
  END IF;

  SELECT display_name INTO student_name FROM public.users WHERE uid = p_student_uid;
  IF student_name IS NULL THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = '42704';
  END IF;

  IF p_reward_type = 'xp' THEN
    -- Reject non-integer or negative values explicitly.
    BEGIN
      xp_amount := CAST(p_reward_value AS INTEGER);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'XP value must be an integer, got %', p_reward_value
        USING ERRCODE = '22023';
    END;

    IF xp_amount <= 0 THEN
      RAISE EXCEPTION 'XP value must be positive, got %', xp_amount
        USING ERRCODE = '22023';
    END IF;

    IF xp_amount > MAX_XP_PER_CALL THEN
      RAISE EXCEPTION 'XP value % exceeds per-call cap of %', xp_amount, MAX_XP_PER_CALL
        USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(xp, 0) INTO current_xp FROM public.users WHERE uid = p_student_uid;
    new_xp := current_xp + xp_amount;
    UPDATE public.users SET xp = new_xp WHERE uid = p_student_uid;

  ELSIF p_reward_type = 'badge' THEN
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY[p_reward_value]);

  ELSIF p_reward_type = 'title' THEN
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), '🏷️ ' || p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY['🏷️ ' || p_reward_value]);

  ELSIF p_reward_type = 'avatar' THEN
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), '🎭 ' || p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY['🎭 ' || p_reward_value]);
  ELSE
    RAISE EXCEPTION 'Invalid reward_type: %', p_reward_type USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.teacher_rewards (
    teacher_uid, student_uid, student_name, reward_type, reward_value, reason
  ) VALUES (
    teacher_uid, p_student_uid, student_name, p_reward_type, p_reward_value, p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'student_name', student_name,
    'reward_type', p_reward_type,
    'reward_value', p_reward_value
  );
END;
$$;
-- ============================================================================
-- Anonymous user cleanup cron
--
-- Quick Play + demo mode both call supabase.auth.signInAnonymously(), which
-- creates a row in auth.users flagged is_anonymous = TRUE. Those rows are
-- never deleted — at 5 classes/day × 40 students that's ~73 000 dead
-- auth.users rows per year accumulating forever. Eventually that hits
-- Supabase seat limits / increases auth table bloat.
--
-- This migration installs a weekly pg_cron job that deletes anonymous
-- auth.users that:
--   - were created more than 30 days ago
--   - have no row in public.progress (never actually played a game)
--   - have no row in public.users (never upgraded to a real account)
--
-- Safe: students who played at least one game stay (we might still want
-- their progress for analytics). Safe: no real email accounts are touched.
-- ============================================================================

-- pg_cron is pre-installed on Supabase but needs to be enabled in the
-- extensions schema. Supabase Pro+ has it on by default; Starter may need
-- the "Database → Extensions → pg_cron" toggle in the dashboard.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- The worker function. Runs as postgres (the extension owner) so it can
-- touch auth.users, which is otherwise reserved to the service role.
CREATE OR REPLACE FUNCTION public.cleanup_stale_anon_users()
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Snapshot of candidate uids so the DELETE runs on a stable set and
  -- returns an accurate count.
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
$$;

COMMENT ON FUNCTION public.cleanup_stale_anon_users IS
  'Deletes anonymous auth.users older than 30 days with no progress/profile. Called weekly by pg_cron.';

-- Unschedule any previous version (idempotent).
SELECT cron.unschedule('cleanup_stale_anon_users_weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup_stale_anon_users_weekly'
);

-- Run every Sunday at 03:00 UTC — outside Israeli school hours.
SELECT cron.schedule(
  'cleanup_stale_anon_users_weekly',
  '0 3 * * 0',
  $cron$ SELECT public.cleanup_stale_anon_users(); $cron$
);
-- ============================================================================
-- Post-audit hardening + performance
--
-- Combines the remaining audit items that fit in a single migration:
--   1. Tighten classes RLS — stop batch-enumeration of codes
--   2. Add a covering index on progress.student_uid
--   3. Validate progress inserts reference a real auth.users row
--   4. Add partial index for the "missed words" analytics query
--
-- None of these change app behaviour when used correctly — they only
-- close abuse paths and speed up the hot analytics queries.
-- ============================================================================

-- ── 1. classes SELECT: drop the blanket USING(true) ────────────────────────
-- Previously any authenticated user could fetch every classes row by passing
-- a list of codes to `.from('classes').select('code, name').in('code', [...])`
-- which sidesteps the rate-limited class_lookup_by_code RPC.
--
-- New policy: only members of the class (teacher or enrolled student) or
-- admins can read directly. Unknown-code lookups must go through the RPC,
-- which is already rate-limited per caller and auth-required.
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated USING (
    teacher_uid = auth.uid()::text
    OR code = (SELECT class_code FROM public.users WHERE uid = auth.uid()::text)
    OR public.is_admin()
  );

COMMENT ON POLICY "classes_select" ON public.classes IS
  'Direct reads limited to class members. Unknown-code discovery must use class_lookup_by_code() RPC (rate-limited).';

-- ── 2. progress.student_uid index ──────────────────────────────────────────
-- The save_student_progress RPC and Quick Play cleanup both filter on
-- student_uid. Without this index Postgres seq-scans the whole progress
-- table for those queries — fine at 100 rows, painful at 100 000.
CREATE INDEX IF NOT EXISTS idx_progress_student_uid
  ON public.progress (student_uid);

-- ── 3. progress insert: require a real auth user ───────────────────────────
-- We can't FK student_uid → auth.users.id directly because student_uid is
-- TEXT (to share the same column between quick-play guests and regular
-- students). Use a trigger instead: reject inserts where student_uid
-- doesn't match the auth.users row making the call.  Anonymous Supabase
-- sessions still count — they have a real auth row.
CREATE OR REPLACE FUNCTION public.ensure_progress_student_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.student_uid IS NULL OR char_length(NEW.student_uid) = 0 THEN
    RAISE EXCEPTION 'progress.student_uid cannot be null' USING ERRCODE = '23502';
  END IF;

  -- We do NOT require student_uid = auth.uid() here — the save_student_progress
  -- RPC runs as service role and legitimately inserts on the student's behalf.
  -- Instead just verify the uid corresponds to a real auth user, catching
  -- client-side bugs that would otherwise create orphan rows.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id::text = NEW.student_uid) THEN
    RAISE EXCEPTION 'progress.student_uid % does not reference a real auth user', NEW.student_uid
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_progress_student_uid_check ON public.progress;
CREATE TRIGGER trg_progress_student_uid_check
  BEFORE INSERT ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.ensure_progress_student_exists();

COMMENT ON FUNCTION public.ensure_progress_student_exists IS
  'Rejects progress rows whose student_uid does not match any auth.users row. Prevents orphans without requiring a literal FK.';

-- ── 4. word_attempts: partial index for "missed words" analytics ──────────
-- Teacher dashboard queries `WHERE class_code = ? AND is_correct = false`
-- to find which words the class struggles with most. A full index on
-- (class_code, word_id) exists, but adding a partial index on just the
-- is_correct = false rows makes the scan smaller and faster, especially
-- once word_attempts reaches millions of rows.
CREATE INDEX IF NOT EXISTS idx_word_attempts_missed
  ON public.word_attempts (class_code, word_id)
  WHERE is_correct = FALSE;
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
