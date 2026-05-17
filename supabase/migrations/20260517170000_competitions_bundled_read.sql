-- =============================================================================
-- Add bundled competitions read+auto-close RPCs
-- =============================================================================
--
-- The dashboard hot path (useCompetitionsForClass / useCompetitionsForClassIds)
-- previously made 3 round-trips per refresh:
--   1. auto_end_due_competitions RPC
--   2. classes.select('id').eq('code', code).limit(1)
--   3. competitions.select('*').eq('class_id', classId)
--
-- These two new RPCs collapse that into 1 round-trip. Refresh fires on
-- every Realtime change + mount, so the saving compounds on busy dashboards.
--
-- Both functions mirror the competitions_select RLS predicate exactly:
--   - Teacher of the class (via classes.teacher_uid match), OR
--   - Student enrolled (via users.class_code match), OR
--   - Admin
--   - AND not anonymous.
--
-- The original auto_end_due_competitions RPC is left in place — the client
-- just stops calling it directly. Anything else that depends on it (cron,
-- future code) still works.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- competitions_for_class(p_class_code) — student / single-class teacher view
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.competitions_for_class(p_class_code text)
RETURNS SETOF public.competitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_class_id   UUID;
  v_caller_uid TEXT    := auth.uid()::text;
  v_is_anon    BOOLEAN := COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false);
BEGIN
  -- Mirror the deny-anon clause of competitions_select.
  IF v_caller_uid IS NULL OR v_is_anon THEN
    RETURN;
  END IF;

  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = p_class_code
  LIMIT 1;

  IF v_class_id IS NULL THEN
    RETURN;
  END IF;

  -- Authorize: teacher of class, enrolled student, or admin.
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = v_class_id AND teacher_uid = v_caller_uid
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE uid = v_caller_uid AND class_code = p_class_code
    )
    OR public.is_admin()
  ) THEN
    RETURN;
  END IF;

  -- Best-effort close — folds in the old auto_end_due_competitions call.
  UPDATE public.competitions
     SET status = 'ended'
   WHERE status = 'live' AND closes_at <= now();

  RETURN QUERY
  SELECT *
  FROM public.competitions
  WHERE class_id = v_class_id
  ORDER BY created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.competitions_for_class(text) TO authenticated;

COMMENT ON FUNCTION public.competitions_for_class(text) IS
  'Bundled read: auto-close overdue competitions + return all competitions '
  'for the given class code. Replaces 3 round-trips (auto_end + class '
  'lookup + competitions select) with 1. Mirrors the competitions_select '
  'RLS predicate in the body.';


-- ---------------------------------------------------------------------------
-- competitions_for_teacher() — teacher dashboard, all classes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.competitions_for_teacher()
RETURNS SETOF public.competitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_uid TEXT    := auth.uid()::text;
  v_is_anon    BOOLEAN := COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false);
BEGIN
  IF v_caller_uid IS NULL OR v_is_anon OR NOT public.is_teacher() THEN
    RETURN;
  END IF;

  UPDATE public.competitions
     SET status = 'ended'
   WHERE status = 'live' AND closes_at <= now();

  RETURN QUERY
  SELECT c.*
  FROM public.competitions c
  JOIN public.classes cl ON cl.id = c.class_id
  WHERE (cl.teacher_uid = v_caller_uid OR public.is_admin())
  ORDER BY c.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.competitions_for_teacher() TO authenticated;

COMMENT ON FUNCTION public.competitions_for_teacher() IS
  'Bundled read: auto-close overdue competitions + return all competitions '
  'for the calling teacher''s classes. Replaces 2 round-trips (auto_end + '
  'competitions select) with 1. is_admin() returns all classes.';
