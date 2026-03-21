-- =============================================================================
-- Migration 010: Privacy & Compliance (Israeli PPA Amendment 13)
-- =============================================================================
-- Adds:
--   1. consent_log     — tracks per-user policy acceptance
--   2. audit_log       — records admin/teacher access to student data
--   3. export_my_data  — RPC for data-subject access requests
--   4. delete_my_account — RPC for data-subject erasure requests
--   5. cleanup_expired — RPC for scheduled retention cleanup
--   6. anonymize_class_students — handles class deletion privacy
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Consent log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consent_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid             TEXT NOT NULL,
  policy_version  TEXT NOT NULL,
  terms_version   TEXT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('accept', 'withdraw')),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address      TEXT  -- nullable; only stored where lawful
);

CREATE INDEX IF NOT EXISTS idx_consent_log_uid ON public.consent_log (uid);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own consent records
CREATE POLICY "consent_log_insert" ON public.consent_log
  FOR INSERT WITH CHECK (auth.uid()::text = uid);

-- Users can view their own consent history
CREATE POLICY "consent_log_select" ON public.consent_log
  FOR SELECT USING (auth.uid()::text = uid OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Audit log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uid     TEXT NOT NULL,
  action        TEXT NOT NULL,  -- e.g. 'view_gradebook', 'delete_class', 'export_data'
  data_category TEXT,           -- e.g. 'progress', 'users', 'classes'
  target_uid    TEXT,           -- the user whose data was accessed (nullable)
  metadata      JSONB,          -- extra context (class_id, etc.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_uid);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only the actor can insert their own audit entries
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid()::text = actor_uid);

-- Admins can read all; teachers can read their own entries
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT USING (auth.uid()::text = actor_uid OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Add consent columns to users table
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'users'
                 AND column_name = 'consent_policy_version') THEN
    ALTER TABLE public.users ADD COLUMN consent_policy_version TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'users'
                 AND column_name = 'consent_given_at') THEN
    ALTER TABLE public.users ADD COLUMN consent_given_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'users'
                 AND column_name = 'first_seen_at') THEN
    ALTER TABLE public.users ADD COLUMN first_seen_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. RPC: Export all data for the current user (data subject access)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  my_uid TEXT := auth.uid()::text;
  result JSONB;
BEGIN
  IF my_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'user', (
      SELECT to_jsonb(u.*) FROM public.users u WHERE u.uid = my_uid
    ),
    'classes_owned', (
      SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
      FROM public.classes c WHERE c.teacher_uid = my_uid
    ),
    'progress', (
      SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb)
      FROM public.progress p WHERE p.student_uid = my_uid
    ),
    'consent_history', (
      SELECT COALESCE(jsonb_agg(to_jsonb(cl.*)), '[]'::jsonb)
      FROM public.consent_log cl WHERE cl.uid = my_uid
    ),
    'assignments_created', (
      SELECT COALESCE(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb)
      FROM public.assignments a
      WHERE a.class_id IN (SELECT id FROM public.classes WHERE teacher_uid = my_uid)
    )
  ) INTO result;

  -- Log the export action
  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid)
  VALUES (my_uid, 'export_data', 'all', my_uid);

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: Delete account (data subject erasure)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  my_uid TEXT := auth.uid()::text;
  my_role TEXT;
  deleted_progress INT;
  deleted_assignments INT;
  deleted_classes INT;
BEGIN
  IF my_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO my_role FROM public.users WHERE uid = my_uid;
  IF my_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Log the deletion BEFORE deleting (so we have a record)
  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid)
  VALUES (my_uid, 'delete_account', 'all', my_uid);

  IF my_role = 'student' THEN
    -- Delete progress records
    DELETE FROM public.progress WHERE student_uid = my_uid;
    GET DIAGNOSTICS deleted_progress = ROW_COUNT;

    -- Delete consent log
    DELETE FROM public.consent_log WHERE uid = my_uid;

    -- Delete user row
    DELETE FROM public.users WHERE uid = my_uid;

    RETURN jsonb_build_object(
      'success', true,
      'deleted_progress', deleted_progress,
      'note', 'Account and all associated data deleted. Supabase auth record will be cleaned up separately.'
    );

  ELSIF my_role = 'teacher' THEN
    -- Anonymize progress for students in teacher's classes (don't delete — students own that data)
    UPDATE public.progress
    SET student_name = 'Deleted Student'
    WHERE class_code IN (SELECT code FROM public.classes WHERE teacher_uid = my_uid)
      AND student_uid NOT IN (SELECT uid FROM public.users WHERE role = 'student');
    -- Note: We do NOT delete student accounts — they belong to the students

    -- Assignments cascade-delete via FK when classes are deleted
    -- Delete classes (cascades to assignments)
    DELETE FROM public.classes WHERE teacher_uid = my_uid;
    GET DIAGNOSTICS deleted_classes = ROW_COUNT;

    -- Delete consent log
    DELETE FROM public.consent_log WHERE uid = my_uid;

    -- Delete user row
    DELETE FROM public.users WHERE uid = my_uid;

    RETURN jsonb_build_object(
      'success', true,
      'deleted_classes', deleted_classes,
      'note', 'Teacher account, classes, and assignments deleted. Student progress records are preserved (owned by students).'
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Admin accounts cannot self-delete');
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: Cleanup expired data (called by scheduled job / cron)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  progress_retention_days INT DEFAULT 365,
  orphan_retention_days INT DEFAULT 90,
  audit_retention_days INT DEFAULT 730
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_progress INT := 0;
  deleted_orphans INT := 0;
  deleted_audit INT := 0;
BEGIN
  -- Only admins can run cleanup
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can run data cleanup';
  END IF;

  -- 1. Delete old progress records
  DELETE FROM public.progress
  WHERE completed_at < now() - (progress_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_progress = ROW_COUNT;

  -- 2. Delete orphaned student accounts (no class_code, inactive for N days)
  DELETE FROM public.users
  WHERE role = 'student'
    AND class_code IS NULL
    AND (first_seen_at IS NULL OR first_seen_at < now() - (orphan_retention_days || ' days')::INTERVAL);
  GET DIAGNOSTICS deleted_orphans = ROW_COUNT;

  -- 3. Trim old audit log entries
  DELETE FROM public.audit_log
  WHERE created_at < now() - (audit_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_audit = ROW_COUNT;

  -- Log the cleanup itself
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (auth.uid()::text, 'scheduled_cleanup', 'system', jsonb_build_object(
    'deleted_progress', deleted_progress,
    'deleted_orphans', deleted_orphans,
    'deleted_audit', deleted_audit
  ));

  RETURN jsonb_build_object(
    'deleted_progress', deleted_progress,
    'deleted_orphans', deleted_orphans,
    'deleted_audit', deleted_audit
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Handle class deletion: anonymize or delete orphaned students
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.on_class_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Clear class_code from students who were in this class
  -- (makes them "orphaned" — cleanup_expired_data will handle them after retention period)
  UPDATE public.users
  SET class_code = NULL
  WHERE role = 'student' AND class_code = OLD.code;

  -- Log the class deletion
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (
    OLD.teacher_uid,
    'delete_class',
    'classes',
    jsonb_build_object('class_id', OLD.id, 'class_code', OLD.code, 'class_name', OLD.name)
  );

  RETURN OLD;
END;
$$;

-- Trigger fires BEFORE delete so we still have access to OLD values
DROP TRIGGER IF EXISTS trg_class_deleted ON public.classes;
CREATE TRIGGER trg_class_deleted
  BEFORE DELETE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.on_class_deleted();
