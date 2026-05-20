-- ============================================================================
-- authz_failures — per-tenant authorization-failure audit log
-- ============================================================================
-- security-audit-framework module 02, item #11 on the readiness scorecard.
--
-- Today: when an attacker probes for over-permissions or when a misconfigured
-- RLS policy silently blocks a legitimate read, there's no on-platform signal.
-- We see nothing.  This table is the missing telemetry.
--
-- Schema design:
--   * actor_uid nullable — anonymous callers and unauthenticated probes get
--     a row with actor_uid = NULL but populated ip_address.
--   * reason is free-text but the writing helpers use a small enum-like
--     set (`requireProTeacher_*`, `rls_denied_42501`, etc.) to keep the
--     dashboard filterable.
--   * metadata jsonb leaves room for endpoint-specific context (which
--     class_id was being probed, which assignment, etc.) without schema
--     migrations every time we add an instrumented site.
--
-- RLS posture:
--   * SELECT — admin only.  Teachers should not be able to enumerate
--     other tenants' authz failures (would itself be a privacy leak).
--   * INSERT — no direct policy.  Writes only go through the
--     SECURITY DEFINER RPC `log_authz_failure(...)`, which lets us
--     centralise rate-limiting and field-shape checks.
--
-- Retention: 90 days, trimmed by `cleanup_expired_data()` (modified below).

CREATE TABLE IF NOT EXISTS public.authz_failures (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_uid    TEXT,                       -- NULL for anon / unauthenticated
  actor_role   TEXT,                       -- 'student' | 'teacher' | 'admin' | NULL
  ip_address   TEXT,
  endpoint     TEXT NOT NULL,              -- e.g. '/api/translate', 'socket:join_challenge'
  table_name   TEXT,                       -- e.g. 'classes', 'progress'
  operation    TEXT,                       -- e.g. 'select', 'insert', 'update', 'rpc:export_my_data'
  reason       TEXT NOT NULL,              -- short tag, see helper below
  metadata     JSONB
);

-- Recent-events view scans by occurred_at; (actor_uid) for per-user
-- investigation drill-down; partial index on rejected RLS hits so the
-- dashboard's "RLS denials in last 24h" tile is a cheap lookup.
CREATE INDEX IF NOT EXISTS idx_authz_failures_occurred
  ON public.authz_failures (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_authz_failures_actor
  ON public.authz_failures (actor_uid);
CREATE INDEX IF NOT EXISTS idx_authz_failures_rls_denied
  ON public.authz_failures (occurred_at DESC)
  WHERE reason = 'rls_denied_42501';

ALTER TABLE public.authz_failures ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT.  No INSERT policy (writes must go through the RPC).
DROP POLICY IF EXISTS "authz_failures_admin_select" ON public.authz_failures;
CREATE POLICY "authz_failures_admin_select" ON public.authz_failures
  FOR SELECT USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- RPC: log_authz_failure
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER so the function can write to the table even though no
-- direct INSERT policy exists.  search_path locked to satisfy the Supabase
-- security advisor (same hardening pattern as the audit_log functions).
--
-- Soft per-actor rate limit: cap at 100 inserts/hour to defang an attacker
-- who tries to flood the table to mask their real probes.  Anonymous flood
-- protection comes from the Express rate limiter at the API edge.
--
-- We do NOT raise on rate-limit hit — silently dropping is correct because
-- the caller is usually a fire-and-forget error path.

CREATE OR REPLACE FUNCTION public.log_authz_failure(
  p_endpoint    TEXT,
  p_reason      TEXT,
  p_table_name  TEXT DEFAULT NULL,
  p_operation   TEXT DEFAULT NULL,
  p_metadata    JSONB DEFAULT NULL,
  p_ip_address  TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid          TEXT := auth.uid()::text;
  v_role         TEXT;
  v_recent_count INT;
BEGIN
  -- Per-actor soft cap.  COALESCE so anonymous spikes still get throttled
  -- as a single bucket per IP (writer passes IP for anon callers).
  SELECT COUNT(*) INTO v_recent_count
  FROM public.authz_failures
  WHERE COALESCE(actor_uid, ip_address, '<unknown>') =
        COALESCE(v_uid, p_ip_address, '<unknown>')
    AND occurred_at > now() - INTERVAL '1 hour';
  IF v_recent_count >= 100 THEN
    RETURN;
  END IF;

  SELECT role INTO v_role FROM public.users WHERE uid = v_uid;

  INSERT INTO public.authz_failures (
    actor_uid, actor_role, ip_address, endpoint, table_name, operation, reason, metadata
  ) VALUES (
    v_uid, v_role, p_ip_address, p_endpoint, p_table_name, p_operation, p_reason, p_metadata
  );
END;
$$;

-- Both anon and authenticated callers can log a failure they observed.
GRANT EXECUTE ON FUNCTION public.log_authz_failure(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT)
  TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- Extend cleanup_expired_data to trim authz_failures
-- ----------------------------------------------------------------------------
-- 90-day retention matches the existing orphan_retention_days default;
-- authz failures aren't useful past a quarter for investigation purposes,
-- and PPA-13 wants a defensible minimisation story.

CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  progress_retention_days INT DEFAULT 365,
  orphan_retention_days   INT DEFAULT 90,
  audit_retention_days    INT DEFAULT 730,
  authz_retention_days    INT DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  deleted_progress INT := 0;
  deleted_orphans  INT := 0;
  deleted_audit    INT := 0;
  deleted_authz    INT := 0;
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

  DELETE FROM public.audit_log
  WHERE created_at < now() - (audit_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_audit = ROW_COUNT;

  DELETE FROM public.authz_failures
  WHERE occurred_at < now() - (authz_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_authz = ROW_COUNT;

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (auth.uid()::text, 'scheduled_cleanup', 'system', jsonb_build_object(
    'deleted_progress', deleted_progress,
    'deleted_orphans',  deleted_orphans,
    'deleted_audit',    deleted_audit,
    'deleted_authz',    deleted_authz
  ));

  RETURN jsonb_build_object(
    'deleted_progress', deleted_progress,
    'deleted_orphans',  deleted_orphans,
    'deleted_audit',    deleted_audit,
    'deleted_authz',    deleted_authz
  );
END;
$$;
