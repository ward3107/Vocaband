-- =============================================================================
-- 20260523000000_audit_admin_actions.sql
--
-- H-12 from the 2026-05-22 edtech-compliance audit: close the gap
-- between the comprehensive in-app audit logging (src/utils/audit.ts
-- + the per-RPC INSERTs in migration 010 + 20260522020000) and the
-- admin actions that bypass the app entirely.
--
-- Pattern today:
--   - `src/utils/audit.ts → logAudit()` covers 13 in-app sites
--     (view_gradebook, delete_class, edit_assignment, …).
--   - SECURITY DEFINER RPCs (export_my_data, delete_my_account,
--     cleanup_expired_data) write their own audit_log entries.
--   - admin operations — role changes, allowlist edits — happen via
--     the Supabase dashboard SQL editor and leave NO trail in
--     audit_log, because they never go through the app layer.
--
-- Pattern after this migration:
--   - Three AFTER triggers fire on UPDATE / INSERT / DELETE of the
--     security-sensitive tables and write an audit_log row no
--     matter who issued the SQL.
--   - actor_uid resolves to `auth.uid()::text` when there is a
--     session, or `'system:direct-sql'` when a bare service-role
--     call did the work (dashboard SQL editor, cron, migration).
--   - The audit_log immutability triggers from
--     20260518120000_audit_log_immutability.sql remain unchanged —
--     audit rows are still append-only.
--
-- Tables covered:
--   1. public.users — UPDATE where role changes
--   2. public.teacher_allowlist — INSERT / UPDATE / DELETE
--   3. public.ai_allowlist     — INSERT / UPDATE / DELETE
--
-- No infinite-recursion risk: audit_log has BEFORE UPDATE / BEFORE
-- DELETE triggers but no AFTER INSERT trigger, so writing to it
-- from inside another trigger is safe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Role-change trigger on public.users
-- ---------------------------------------------------------------------------
--
-- The existing users_update RLS WITH CHECK already enforces that
-- only admins can change role (schema.sql:127-135).  This trigger
-- adds the *audit trail* — the WHO + the WHAT-CHANGED — so a later
-- security review can answer "who promoted that account to admin?"
-- even when the change was made via the Supabase dashboard.

CREATE OR REPLACE FUNCTION public.audit_users_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  actor TEXT;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    actor := COALESCE(auth.uid()::text, 'system:direct-sql');
    INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
    VALUES (
      actor,
      'role_change',
      'users',
      NEW.uid,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_users_role_change ON public.users;
CREATE TRIGGER trg_audit_users_role_change
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_users_role_change();

-- ---------------------------------------------------------------------------
-- 2. Allowlist edits — teacher_allowlist + ai_allowlist
-- ---------------------------------------------------------------------------
--
-- Both tables are dashboard-managed (no RLS policies means no client
-- access; service-role bypasses RLS).  An INSERT here grants a
-- teacher / AI-feature access; a DELETE revokes it.  Each of those
-- is a meaningful security event.
--
-- One trigger function used by both tables — it consults
-- TG_TABLE_NAME to set the `data_category` field correctly so a
-- later query can filter by allowlist type.

CREATE OR REPLACE FUNCTION public.audit_allowlist_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  actor    TEXT;
  category TEXT;
  op       TEXT;
  metadata JSONB;
BEGIN
  actor    := COALESCE(auth.uid()::text, 'system:direct-sql');
  category := TG_TABLE_NAME;     -- 'teacher_allowlist' or 'ai_allowlist'

  IF TG_OP = 'INSERT' THEN
    op := 'allowlist_add';
    metadata := jsonb_build_object('email_domain', split_part(NEW.email, '@', 2));
    -- NB: we log only the domain, not the full email, to keep the
    -- audit log itself low-PII.  The full email is recoverable from
    -- the table at the time of the event by the operator on-call;
    -- this row tells them WHEN + WHO + WHICH TABLE.
  ELSIF TG_OP = 'UPDATE' THEN
    op := 'allowlist_update';
    metadata := jsonb_build_object(
      'old_email_domain', split_part(OLD.email, '@', 2),
      'new_email_domain', split_part(NEW.email, '@', 2)
    );
  ELSIF TG_OP = 'DELETE' THEN
    op := 'allowlist_remove';
    metadata := jsonb_build_object('email_domain', split_part(OLD.email, '@', 2));
  END IF;

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (actor, op, category, metadata);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_teacher_allowlist ON public.teacher_allowlist;
CREATE TRIGGER trg_audit_teacher_allowlist
  AFTER INSERT OR UPDATE OR DELETE ON public.teacher_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.audit_allowlist_change();

DROP TRIGGER IF EXISTS trg_audit_ai_allowlist ON public.ai_allowlist;
CREATE TRIGGER trg_audit_ai_allowlist
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.audit_allowlist_change();

-- ---------------------------------------------------------------------------
-- 3. Comments — discoverable for the next reviewer
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.audit_users_role_change() IS
  '2026-05-23 H-12: writes an audit_log row whenever public.users.role changes. '
  'Catches admin role assignments performed via the Supabase dashboard SQL editor '
  '(which bypasses the in-app logAudit() helper).';

COMMENT ON FUNCTION public.audit_allowlist_change() IS
  '2026-05-23 H-12: writes an audit_log row for INSERT / UPDATE / DELETE on '
  'teacher_allowlist and ai_allowlist. Logs only the email domain, not the full '
  'address, to keep the audit log itself low-PII.';

-- ---------------------------------------------------------------------------
-- 4. Verification queries — paste into Supabase SQL editor after applying.
-- ---------------------------------------------------------------------------
--
-- a) Triggers exist:
--      SELECT tgname, tgrelid::regclass FROM pg_trigger
--      WHERE tgname IN (
--        'trg_audit_users_role_change',
--        'trg_audit_teacher_allowlist',
--        'trg_audit_ai_allowlist'
--      ) AND NOT tgisinternal;
--      -- expect: 3 rows.
--
-- b) Role-change writes an audit row (run as admin):
--      UPDATE public.users SET role = 'teacher' WHERE uid = '<test-uid>';
--      SELECT * FROM public.audit_log
--      WHERE action = 'role_change' AND target_uid = '<test-uid>'
--      ORDER BY created_at DESC LIMIT 1;
--      -- expect: 1 row with metadata containing old_role + new_role.
--
-- c) Allowlist add writes an audit row:
--      INSERT INTO public.teacher_allowlist (email) VALUES ('test@example.com');
--      SELECT * FROM public.audit_log
--      WHERE action = 'allowlist_add'
--        AND data_category = 'teacher_allowlist'
--      ORDER BY created_at DESC LIMIT 1;
--      -- expect: 1 row; metadata.email_domain = 'example.com'.
--
-- d) Triggers don't recurse (audit_log inserts don't fire their own audit row):
--      SELECT COUNT(*) FROM public.audit_log WHERE action LIKE 'audit_log%';
--      -- expect: 0 (no row whose action mentions audit_log itself).
