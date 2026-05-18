-- =============================================================================
-- 20260518120000_audit_log_immutability.sql
--
-- Closes the audit-log mutability gap flagged in docs/MOE-REQUIREMENTS.md A4.
--
-- Privacy Protection Regulations 2017 § 8 ("Documentation of access") require
-- that the audit log be immutable for normal operation. Before this migration:
--
--   1. RLS denied UPDATE/DELETE by default (no policies), BUT
--   2. The cleanup_expired_data RPC runs as SECURITY DEFINER and could DELETE
--      audit rows freely, AND
--   3. Nothing stopped a future migration from accidentally adding an UPDATE
--      or DELETE policy.
--
-- After this migration:
--
--   • A BEFORE UPDATE trigger ALWAYS raises — audit rows can never be modified.
--   • A BEFORE DELETE trigger raises UNLESS the session GUC
--     `app.allow_audit_purge` is set to 'true' for the current transaction.
--   • cleanup_expired_data sets that GUC inside its own SECURITY DEFINER body
--     (txn-scoped), purges, then unsets it. No other path can purge.
--   • UPDATE/DELETE privileges are explicitly REVOKED from anon, authenticated,
--     and PUBLIC — defence in depth even if a future policy is added by mistake.
--
-- Pen-test:
--   • An admin running plain `DELETE FROM public.audit_log` should now FAIL
--     with "audit_log is append-only".
--   • Calling cleanup_expired_data() should still succeed and emit a
--     'scheduled_cleanup' row.
-- =============================================================================

-- 1. Lock down the privilege table.
REVOKE UPDATE, DELETE ON public.audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.audit_log FROM anon;
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated;

-- 2. Trigger function that forbids UPDATE outright.
CREATE OR REPLACE FUNCTION public.audit_log_forbid_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (UPDATE forbidden)'
    USING ERRCODE = '42501';  -- insufficient_privilege
END;
$$;

-- 3. Trigger function that forbids DELETE except via the controlled purge path.
CREATE OR REPLACE FUNCTION public.audit_log_forbid_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  purge_flag TEXT;
BEGIN
  -- current_setting(..., true) returns NULL if the GUC is not set, no error.
  purge_flag := current_setting('app.allow_audit_purge', true);
  IF purge_flag IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'audit_log is append-only (DELETE forbidden outside retention purge)'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

-- 4. Attach the triggers.
DROP TRIGGER IF EXISTS trg_audit_log_no_update ON public.audit_log;
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_forbid_update();

DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON public.audit_log;
CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_forbid_delete();

-- 5. Rewrite cleanup_expired_data so the audit-purge step sets the
--    transaction-scoped GUC before deleting, then unsets it. We re-declare
--    the function with the same signature as 010_privacy_compliance.sql.
CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  progress_retention_days INT DEFAULT 365,
  orphan_retention_days INT DEFAULT 90,
  audit_retention_days INT DEFAULT 730
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_progress INT := 0;
  deleted_orphans INT := 0;
  deleted_audit INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can run data cleanup';
  END IF;

  DELETE FROM public.progress
  WHERE completed_at < now() - (progress_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_progress = ROW_COUNT;

  DELETE FROM public.users
  WHERE role = 'student'
    AND class_code IS NULL
    AND (first_seen_at IS NULL OR first_seen_at < now() - (orphan_retention_days || ' days')::INTERVAL);
  GET DIAGNOSTICS deleted_orphans = ROW_COUNT;

  -- Audit-log retention purge: explicitly open the controlled window, delete,
  -- then close it. set_config(..., true) means "txn-local" — the GUC reverts
  -- at COMMIT/ROLLBACK so no other statement in any other session sees it.
  PERFORM set_config('app.allow_audit_purge', 'true', true);
  DELETE FROM public.audit_log
  WHERE created_at < now() - (audit_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_audit = ROW_COUNT;
  PERFORM set_config('app.allow_audit_purge', 'false', true);

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

-- 6. Verification helpers — paste into Supabase SQL editor after applying.
--
-- a) UPDATE should fail with 42501:
--      UPDATE public.audit_log SET action = 'tampered' WHERE id = (SELECT id FROM public.audit_log LIMIT 1);
--      -- expect: ERROR: audit_log is append-only (UPDATE forbidden)
--
-- b) Plain DELETE should fail:
--      DELETE FROM public.audit_log WHERE id = (SELECT id FROM public.audit_log LIMIT 1);
--      -- expect: ERROR: audit_log is append-only (DELETE forbidden outside retention purge)
--
-- c) Retention purge should still work:
--      SELECT public.cleanup_expired_data(365, 90, 730);
--      -- expect: jsonb with deleted_audit count, and a new 'scheduled_cleanup' row.
