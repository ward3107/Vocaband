-- =============================================================================
-- 20260627000001_announcements.sql
--
-- Admin-broadcast announcement banner. Two tables:
--
--   1. announcements           — the messages themselves (admin-managed).
--   2. announcement_dismissals — per-user dismissal records, so a teacher
--                                who clicked "X" on a banner doesn't see it
--                                next login.
--
-- Read posture:
--   * All authenticated users can SELECT announcements (the banner needs
--     them) and their OWN dismissal rows.
--
-- Write posture:
--   * announcements: admin RPCs only.
--   * announcement_dismissals: each user inserts their own (gated by RLS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  message    TEXT NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 2000),
  level      TEXT NOT NULL CHECK (level IN ('info','warning','critical')) DEFAULT 'info',
  audience   TEXT NOT NULL CHECK (audience IN ('teachers','students','all')) DEFAULT 'teachers',
  starts_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at    TIMESTAMPTZ,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
  uid             TEXT NOT NULL,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  dismissed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_active        ON public.announcements (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_uid ON public.announcement_dismissals (uid);

ALTER TABLE public.announcements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "announcement_dismissals_select" ON public.announcement_dismissals;
CREATE POLICY "announcement_dismissals_select" ON public.announcement_dismissals
  FOR SELECT USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "announcement_dismissals_insert" ON public.announcement_dismissals;
CREATE POLICY "announcement_dismissals_insert" ON public.announcement_dismissals
  FOR INSERT WITH CHECK (auth.uid()::text = uid);

-- ---------------------------------------------------------------------------
-- Admin CRUD
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_announcements()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.assert_admin();
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'message', a.message,
      'level', a.level,
      'audience', a.audience,
      'starts_at', a.starts_at,
      'ends_at', a.ends_at,
      'dismissible', a.dismissible,
      'created_by', a.created_by,
      'created_by_email', u.email,
      'created_at', a.created_at,
      'is_active', (a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())),
      'dismissed_count', (SELECT count(*) FROM public.announcement_dismissals d WHERE d.announcement_id = a.id)
    ) ORDER BY a.created_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM public.announcements a
  LEFT JOIN public.users u ON u.uid = a.created_by;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_announcement(
  p_title       TEXT,
  p_message     TEXT,
  p_level       TEXT     DEFAULT 'info',
  p_audience    TEXT     DEFAULT 'teachers',
  p_starts_at   TIMESTAMPTZ DEFAULT NULL,
  p_ends_at     TIMESTAMPTZ DEFAULT NULL,
  p_dismissible BOOLEAN  DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_id   UUID;
BEGIN
  PERFORM public.assert_admin();
  IF char_length(trim(COALESCE(p_title, ''))) = 0 OR char_length(trim(COALESCE(p_message, ''))) = 0 THEN
    RAISE EXCEPTION 'title and message are required' USING ERRCODE = '22023';
  END IF;
  IF p_level NOT IN ('info','warning','critical') THEN
    RAISE EXCEPTION 'level must be info, warning, or critical' USING ERRCODE = '22023';
  END IF;
  IF p_audience NOT IN ('teachers','students','all') THEN
    RAISE EXCEPTION 'audience must be teachers, students, or all' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.announcements
    (title, message, level, audience, starts_at, ends_at, dismissible, created_by)
  VALUES
    (trim(p_title), trim(p_message), p_level, p_audience,
     COALESCE(p_starts_at, now()), p_ends_at, p_dismissible, caller)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'announcement_create', 'announcements',
          jsonb_build_object('id', v_id, 'title', p_title, 'level', p_level, 'audience', p_audience));

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_announcement(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE caller TEXT := auth.uid()::text;
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM public.announcements WHERE id = p_id;
  INSERT INTO public.audit_log (actor_uid, action, data_category, metadata)
  VALUES (caller, 'announcement_delete', 'announcements', jsonb_build_object('id', p_id));
  RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- User-facing reads
-- ---------------------------------------------------------------------------

-- Returns announcements that are currently active AND match the caller's
-- audience AND haven't been dismissed by the caller. Used by the global
-- AnnouncementBanner component.
CREATE OR REPLACE FUNCTION public.get_active_announcements()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller TEXT := auth.uid()::text;
  v_role TEXT;
  result JSONB;
BEGIN
  IF caller IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT role INTO v_role FROM public.users WHERE uid = caller;
  -- Guests / not-yet-provisioned users see only 'all' announcements.
  IF v_role IS NULL THEN v_role := 'guest'; END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'message', a.message,
      'level', a.level,
      'dismissible', a.dismissible
    ) ORDER BY
      CASE a.level WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      a.created_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM public.announcements a
  WHERE a.starts_at <= now()
    AND (a.ends_at IS NULL OR a.ends_at > now())
    AND (
      a.audience = 'all'
      OR (a.audience = 'teachers' AND v_role IN ('teacher', 'admin', 'manager'))
      OR (a.audience = 'students' AND v_role = 'student')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.announcement_dismissals d
      WHERE d.announcement_id = a.id AND d.uid = caller
    );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_announcement(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE caller TEXT := auth.uid()::text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.announcement_dismissals (uid, announcement_id)
  VALUES (caller, p_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_list_announcements()                                             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_announcement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_announcement(UUID)                                        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_announcements()                                             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_announcement(UUID)                                             FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_announcements()                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_announcement(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_announcement(UUID)                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_announcements()                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_announcement(UUID)                                          TO authenticated;

COMMENT ON TABLE public.announcements IS
  'Admin-broadcast banner messages. Read-by-all-authenticated, written via admin RPCs only.';
COMMENT ON TABLE public.announcement_dismissals IS
  'Per-user dismissal records. Each user manages their own rows (gated by RLS).';
