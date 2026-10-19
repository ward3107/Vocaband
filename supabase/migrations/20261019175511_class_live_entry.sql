-- Approved class entry bridge. Additive; existing QR joins keep working.
BEGIN;

CREATE TABLE public.class_live_sessions (
  class_id uuid PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.quick_play_sessions(id) ON DELETE CASCADE,
  teacher_uid text NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  opened_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 hours'),
  CHECK (expires_at > opened_at AND expires_at <= opened_at + interval '6 hours')
);
CREATE UNIQUE INDEX class_live_one_open_class_per_session
  ON public.class_live_sessions(session_id) WHERE is_open;
ALTER TABLE public.class_live_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.class_live_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_live_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_live_sessions TO service_role;

-- A teacher must own BOTH the class and the Quick Play session. The
-- stored teacher id is checked again after a class ownership transfer.
CREATE POLICY class_live_owner ON public.class_live_sessions
  FOR ALL TO authenticated
  USING (
    teacher_uid = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_live_sessions.class_id
        AND c.teacher_uid = (SELECT auth.uid())::text
    )
    AND EXISTS (
      SELECT 1 FROM public.quick_play_sessions s
      WHERE s.id = class_live_sessions.session_id
        AND s.teacher_uid = (SELECT auth.uid())::text
    )
  )
  WITH CHECK (
    teacher_uid = (SELECT auth.uid())::text
    AND opened_at <= now() + interval '1 minute'
    AND expires_at <= now() + interval '6 hours'
    AND EXISTS (
      SELECT 1 FROM public.classes c JOIN public.quick_play_sessions s
        ON s.teacher_uid = c.teacher_uid
      WHERE c.id = class_live_sessions.class_id
        AND s.id = class_live_sessions.session_id
        AND c.teacher_uid = (SELECT auth.uid())::text
        AND (NOT class_live_sessions.is_open OR (
          coalesce(c.subject, 'english') = coalesce(s.subject, 'english')
          AND s.is_active = true
        ))
    )
  );

-- Membership comes from server-owned records, never a client class id or
-- user_metadata. Require both the user affiliation and approved profile;
-- a disagreement fails closed instead of guessing which class to use.
CREATE POLICY class_live_student ON public.class_live_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.users u ON u.class_code = c.code
      JOIN public.student_profiles p ON p.auth_uid::text = u.uid
        AND p.class_code = c.code AND p.status = 'approved'
      WHERE c.id = class_live_sessions.class_id
        AND c.teacher_uid = class_live_sessions.teacher_uid
        AND u.uid = (SELECT auth.uid())::text AND u.role = 'student'
    )
  );

CREATE FUNCTION public.set_class_live_session(p_class_id uuid, p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;
  INSERT INTO public.class_live_sessions (class_id, session_id, teacher_uid, is_open, opened_at, expires_at)
  SELECT c.id, s.id, auth.uid()::text, true, now(), now() + interval '6 hours'
  FROM public.classes c JOIN public.quick_play_sessions s ON s.teacher_uid = c.teacher_uid
  WHERE c.id = p_class_id AND s.id = p_session_id
    AND c.teacher_uid = auth.uid()::text AND s.is_active = true
    AND coalesce(c.subject, 'english') = coalesce(s.subject, 'english')
  ON CONFLICT (class_id) DO UPDATE SET
    session_id = EXCLUDED.session_id, teacher_uid = EXCLUDED.teacher_uid, is_open = true,
    opened_at = EXCLUDED.opened_at, expires_at = EXCLUDED.expires_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'class or session unavailable' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- No class id argument: the student cannot ask for another class's room.
CREATE FUNCTION public.get_my_live_class_session()
RETURNS TABLE (class_id uuid, class_name text, session_id uuid,
  session_code text, allowed_modes text[], expires_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT c.id, c.name, s.id, s.session_code, s.allowed_modes,
    CASE WHEN s.id IS NOT NULL THEN link.expires_at END
  FROM public.classes c
  JOIN public.users u ON u.class_code = c.code AND u.uid = (SELECT auth.uid())::text
  JOIN public.student_profiles p ON p.auth_uid::text = u.uid
    AND p.class_code = c.code AND p.status = 'approved'
  LEFT JOIN public.class_live_sessions link ON link.class_id = c.id
    AND c.teacher_uid = link.teacher_uid AND link.is_open AND link.expires_at > now()
  LEFT JOIN public.quick_play_sessions s ON s.id = link.session_id
    AND s.teacher_uid = c.teacher_uid AND s.is_active = true
    AND coalesce(c.subject, 'english') = coalesce(s.subject, 'english')
  WHERE u.role = 'student'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.set_class_live_session(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_live_class_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_class_live_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_live_class_session() TO authenticated;
-- Closing a game updates the bridge too. Its class-scoped SELECT policy stays
-- readable after closing, so Realtime can deliver the invalidation; only the
-- RPC above discloses active join details. Invoker rights work for the owning
-- teacher and the existing service-role session-ending path.
CREATE FUNCTION public.close_class_entry_on_session_end()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.class_live_sessions SET is_open = false
  WHERE session_id = NEW.id AND is_open;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.close_class_entry_on_session_end() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER close_class_entry_on_session_end
  AFTER UPDATE OF is_active ON public.quick_play_sessions
  FOR EACH ROW WHEN (OLD.is_active AND NOT NEW.is_active)
  EXECUTE FUNCTION public.close_class_entry_on_session_end();

-- Existing clients use postgres_changes. No polling or new broadcast channel
-- is needed, and each subscriber is checked by the table's membership RLS.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'class_live_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_live_sessions;
  END IF;
END;
$$;
COMMENT ON TABLE public.class_live_sessions IS
  'One current game per classroom; approved members discover it through get_my_live_class_session.';
COMMIT;
