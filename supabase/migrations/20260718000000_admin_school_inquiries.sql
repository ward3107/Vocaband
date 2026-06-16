-- =============================================================================
-- 20260718000000_admin_school_inquiries.sql
--
-- Admin read/triage for the public "School inquiry" lead form
-- (src/components/SchoolInquiryModal.tsx → public.school_inquiries).
--
-- The form already persists leads anonymously. This migration adds the admin
-- side: a triage state (handled_at / handled_by) and three admin-only RPCs to
-- list, mark-handled, and delete inquiries. No automation — purely a read +
-- manual-triage surface for the Developer Dashboard.
--
-- Read/write posture:
--   * Public insert policy (the landing form) is left untouched.
--   * All three RPCs are SECURITY DEFINER + assert_admin(), so they bypass RLS
--     for admins only. Anon/PUBLIC execute is revoked.
-- =============================================================================

-- Triage columns. Nullable + IF NOT EXISTS so the existing anon insert path
-- (which sets neither) keeps working unchanged.
ALTER TABLE public.school_inquiries ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
ALTER TABLE public.school_inquiries ADD COLUMN IF NOT EXISTS handled_by TEXT;

-- ---------------------------------------------------------------------------
-- Admin reads + triage
-- ---------------------------------------------------------------------------

-- Returns every inquiry, unhandled first, newest first within each group.
-- to_jsonb(si) is used so the payload carries whatever columns the table has
-- (id, created_at, contact fields, triage state) without re-listing them here.
CREATE OR REPLACE FUNCTION public.admin_list_school_inquiries()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.assert_admin();
  SELECT COALESCE(jsonb_agg(
    to_jsonb(si) ORDER BY (si.handled_at IS NOT NULL), si.created_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM public.school_inquiries si;
  RETURN result;
END;
$$;

-- Toggle an inquiry's handled state. p_handled = false re-opens it.
CREATE OR REPLACE FUNCTION public.admin_mark_school_inquiry_handled(
  p_id      UUID,
  p_handled BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE caller TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();
  UPDATE public.school_inquiries
     SET handled_at = CASE WHEN p_handled THEN now() ELSE NULL END,
         handled_by = CASE WHEN p_handled THEN caller ELSE NULL END
   WHERE id = p_id;

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller,
          CASE WHEN p_handled THEN 'school_inquiry_handled' ELSE 'school_inquiry_reopened' END,
          'school_inquiries',
          jsonb_build_object('id', p_id));

  RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_school_inquiry(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE caller TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM public.school_inquiries WHERE id = p_id;
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'school_inquiry_delete', 'school_inquiries', jsonb_build_object('id', p_id));
  RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — admin-only, enforced by assert_admin() inside each function.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_list_school_inquiries()                          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_mark_school_inquiry_handled(UUID, BOOLEAN)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_school_inquiry(UUID)                      FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_school_inquiries()                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_school_inquiry_handled(UUID, BOOLEAN)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_school_inquiry(UUID)                   TO authenticated;
