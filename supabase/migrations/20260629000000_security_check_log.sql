-- =============================================================================
-- 20260629000000_security_check_log.sql
--
-- Tracked-cadence security checklist for the admin dashboard's Security tab.
-- Each "I did this" click writes a row here AND a row in audit_log; the panel
-- reads the latest row per check_key to compute overdue / fresh status.
--
-- The catalog of checks lives inside admin_list_security_checks as a CTE so
-- adding/removing reminders is a single in-migration edit — no separate
-- catalog table to keep in sync.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.security_check_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key     TEXT NOT NULL CHECK (char_length(check_key) > 0 AND char_length(check_key) <= 64),
  performed_by  TEXT NOT NULL,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_security_check_log_key_time
  ON public.security_check_log (check_key, performed_at DESC);

ALTER TABLE public.security_check_log ENABLE ROW LEVEL SECURITY;
-- No client SELECT / INSERT policy — everything goes through admin RPCs.

-- ---------------------------------------------------------------------------
-- admin_list_security_checks — catalog × latest performed_at JOIN.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_security_checks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.assert_admin();

  WITH catalog AS (
    SELECT * FROM (VALUES
      (
        'review_audit_log',
        'Review audit log',
        'Open the Audit log tab. Scan the last 7 days for unexpected admin actions, role changes, or deletes.',
        7,
        'weekly'
      ),
      (
        'audit_admin_accounts',
        'Audit admin accounts',
        'Confirm everyone with role=admin still needs access. Demote anyone who left the team.',
        30,
        'monthly'
      ),
      (
        'verify_admin_mfa',
        'Verify admin MFA',
        'Check that 2-Step Verification is still enabled on every admin''s Google account.',
        90,
        'quarterly'
      ),
      (
        'rotate_service_role_key',
        'Rotate Supabase service role key',
        'Reset SUPABASE_SERVICE_ROLE_KEY in the Supabase dashboard, then update the secret on Fly.io.',
        180,
        'every 6 months'
      ),
      (
        'rotate_anthropic_key',
        'Rotate Anthropic API key',
        'Issue a new Anthropic API key, update Fly secrets, revoke the old one.',
        365,
        'yearly'
      )
    ) AS c(check_key, title, description, cadence_days, cadence_label)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'key',                     c.check_key,
      'title',                   c.title,
      'description',             c.description,
      'cadence_days',            c.cadence_days,
      'cadence_label',           c.cadence_label,
      'last_performed_at',       l.last_at,
      'last_performed_by_email', u.email,
      'last_notes',              l.notes,
      'days_since_last', CASE
        WHEN l.last_at IS NULL THEN NULL
        ELSE FLOOR(EXTRACT(EPOCH FROM (now() - l.last_at)) / 86400)::int
      END,
      'overdue_days', CASE
        WHEN l.last_at IS NULL THEN NULL
        ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - l.last_at)) / 86400)::int - c.cadence_days)
      END
    ) ORDER BY c.cadence_days
  )
  INTO result
  FROM catalog c
  LEFT JOIN LATERAL (
    SELECT performed_at AS last_at, performed_by, notes
    FROM public.security_check_log
    WHERE check_key = c.check_key
    ORDER BY performed_at DESC
    LIMIT 1
  ) l ON true
  LEFT JOIN public.users u ON u.uid = l.performed_by;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_record_security_check — record a "done" click, log to audit trail.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_record_security_check(
  p_key   TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_key  TEXT := trim(COALESCE(p_key, ''));
BEGIN
  PERFORM public.assert_admin();
  IF char_length(v_key) = 0 THEN
    RAISE EXCEPTION 'check key is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.security_check_log (check_key, performed_by, performed_at, notes)
  VALUES (v_key, caller, now(), NULLIF(trim(COALESCE(p_notes, '')), ''));

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'security_check_done', 'security', jsonb_build_object('key', v_key));

  RETURN jsonb_build_object('success', true, 'key', v_key);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_security_checks()             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_security_check(TEXT, TEXT)  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_security_checks()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_security_check(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_list_security_checks IS
  'Admin-only: catalog of recurring security checks JOINed with the latest performed_at per key.';
COMMENT ON FUNCTION public.admin_record_security_check IS
  'Admin-only: record completion of a security check. Writes to security_check_log AND audit_log.';
