BEGIN;

-- A follow-up belongs to one approved profile, including roster entries whose
-- student has not signed in yet. Repeated teacher clicks cannot create copies.
CREATE TABLE public.assignment_followups (
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('reminder', 'practice')),
  word_ids integer[] NOT NULL DEFAULT '{}',
  sent_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (assignment_id, profile_id, kind)
);
ALTER TABLE public.assignment_followups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assignment_followups FROM PUBLIC, anon, authenticated;
CREATE INDEX assignment_followups_student_idx ON public.assignment_followups(profile_id, sent_at DESC);

-- List mode only returns totals. Opening one assignment also returns the
-- teacher's current approved roster and the word-level evidence for follow-up.
CREATE FUNCTION public.teacher_assignment_report(p_class_id uuid, p_assignment_id uuid DEFAULT NULL)
RETURNS TABLE(assignment_id uuid, title text, expected bigint, participated bigint, attempts bigint, students jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH owned AS (
    SELECT c.id, c.code FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_uid = (SELECT auth.uid())::text
  ), assignments AS (
    SELECT a.id, a.title, a.created_at FROM public.assignments a JOIN owned c ON c.id = a.class_id
    WHERE p_assignment_id IS NULL OR a.id = p_assignment_id
  ), roster AS (
    SELECT s.id, s.auth_uid, s.unique_id, s.display_name, s.avatar,
      count(*) OVER (PARTITION BY lower(trim(s.display_name))) AS same_name
    FROM public.student_profiles s JOIN owned c ON c.code = s.class_code
    WHERE s.status = 'approved'
  ), matched AS (
    SELECT p.id, p.assignment_id, r.id AS profile_id, p.play_count, p.mistakes, p.score
    FROM public.progress p JOIN assignments a ON a.id = p.assignment_id
    JOIN owned c ON c.code = p.class_code
    JOIN roster r ON p.student_uid IN (r.auth_uid::text, r.id::text, r.unique_id)
      OR (nullif(trim(p.student_uid), '') IS NULL AND r.same_name = 1
          AND lower(trim(p.student_name)) = lower(trim(r.display_name)))
  ), plays AS (
    SELECT m.assignment_id, m.profile_id, sum(greatest(1,m.play_count))::bigint AS n, max(m.score) AS best_points
    FROM matched m GROUP BY m.assignment_id, m.profile_id
  ), answers AS (
    SELECT m.profile_id, round(100.0 * count(*) FILTER (WHERE w.is_correct) / count(*))::integer AS accuracy,
      array_agg(DISTINCT w.word_id) FILTER (WHERE NOT w.is_correct) AS missed
    FROM matched m JOIN public.word_attempts w ON w.progress_id = m.id
    WHERE p_assignment_id IS NOT NULL GROUP BY m.profile_id
  ), old_mistakes AS (
    SELECT m.profile_id, array_agg(DISTINCT word_id) AS missed
    FROM matched m CROSS JOIN LATERAL unnest(m.mistakes) AS word_id
    WHERE p_assignment_id IS NOT NULL GROUP BY m.profile_id
  )
  SELECT a.id, a.title, (SELECT count(*) FROM roster),
    (SELECT count(*) FROM plays p WHERE p.assignment_id = a.id),
    coalesce((SELECT sum(p.n)::bigint FROM plays p WHERE p.assignment_id = a.id),0),
    CASE WHEN p_assignment_id IS NULL THEN NULL ELSE coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',r.id, 'name',r.display_name, 'avatar',r.avatar, 'plays',coalesce(p.n,0),
        'accuracy',w.accuracy, 'best_points',p.best_points, 'missed',coalesce(CASE WHEN w.profile_id IS NULL THEN om.missed ELSE w.missed END, '{}'::integer[]),
        'reminder_sent',fr.profile_id IS NOT NULL, 'practice_sent',fp.profile_id IS NOT NULL
      ) ORDER BY r.display_name,r.id)
      FROM roster r LEFT JOIN plays p ON p.profile_id=r.id AND p.assignment_id=a.id
      LEFT JOIN answers w ON w.profile_id=r.id LEFT JOIN old_mistakes om ON om.profile_id=r.id
      LEFT JOIN public.assignment_followups fr ON fr.assignment_id=a.id AND fr.profile_id=r.id AND fr.kind='reminder'
      LEFT JOIN public.assignment_followups fp ON fp.assignment_id=a.id AND fp.profile_id=r.id AND fp.kind='practice'
    ),'[]'::jsonb) END
  FROM assignments a ORDER BY a.created_at DESC, a.id;
$$;

CREATE FUNCTION public.send_assignment_followup(p_assignment_id uuid, p_kind text, p_profile_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_class uuid; written integer;
BEGIN
  SELECT a.class_id INTO STRICT v_class FROM public.assignments a JOIN public.classes c ON a.class_id=c.id
    WHERE a.id=p_assignment_id AND c.teacher_uid=(SELECT auth.uid())::text;
  IF p_kind IS NULL OR p_kind NOT IN ('reminder','practice') THEN RAISE EXCEPTION 'Unknown follow-up'; END IF;
  WITH recipients AS (
    SELECT s.* FROM public.teacher_assignment_report(v_class,p_assignment_id) r
    CROSS JOIN LATERAL jsonb_to_recordset(r.students)
      AS s(id uuid, plays bigint, accuracy integer, missed integer[])
    WHERE s.id=ANY(p_profile_ids) AND
      ((p_kind='reminder' AND s.plays=0) OR (p_kind='practice' AND s.plays>0
        AND (s.accuracy<70 OR cardinality(s.missed)>0)))
  )
  INSERT INTO public.assignment_followups(assignment_id,profile_id,kind,word_ids)
    SELECT p_assignment_id,id,p_kind,CASE WHEN p_kind='practice' THEN missed ELSE '{}'::integer[] END
    FROM recipients ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS written = ROW_COUNT;
  RETURN written;
END; $$;

CREATE FUNCTION public.my_assignment_followups(p_class_code text)
RETURNS TABLE(assignment_id uuid, kind text, word_ids integer[], profile_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT f.assignment_id,f.kind,f.word_ids,s.id FROM public.assignment_followups f
  JOIN public.student_profiles s ON s.id=f.profile_id
  JOIN public.assignments a ON a.id=f.assignment_id JOIN public.classes c ON c.id=a.class_id
  WHERE s.auth_uid=(SELECT auth.uid()) AND s.status='approved' AND s.class_code=c.code AND c.code=p_class_code
    AND f.completed_at IS NULL
    AND (f.kind='practice' OR NOT EXISTS (SELECT FROM public.progress p WHERE p.assignment_id=a.id AND p.class_code=c.code
      AND p.student_uid IN (s.auth_uid::text,s.id::text,s.unique_id) AND p.completed_at>=f.sent_at))
  ORDER BY f.sent_at DESC;
$$;
-- A short personalised round has its own receipt, never a full-class score.
CREATE FUNCTION public.complete_assignment_practice(p_assignment_id uuid, p_profile_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.assignment_followups f SET completed_at=coalesce(f.completed_at, now())
    FROM public.student_profiles s, public.assignments a, public.classes c
    WHERE f.assignment_id=p_assignment_id AND f.profile_id=p_profile_id AND f.kind='practice'
      AND s.id=f.profile_id AND s.auth_uid=(SELECT auth.uid()) AND s.status='approved'
      AND a.id=f.assignment_id AND c.id=a.class_id AND c.code=s.class_code;
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.complete_assignment_practice(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_assignment_practice(uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.teacher_assignment_report(uuid,uuid), public.send_assignment_followup(uuid,text,uuid[]),
  public.my_assignment_followups(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_assignment_report(uuid,uuid), public.send_assignment_followup(uuid,text,uuid[]),
  public.my_assignment_followups(text) TO authenticated;

-- One versioned workspace per teacher, class and activity. A null payload is
-- a tombstone so a stale tab cannot resurrect a published or discarded draft.
CREATE TABLE public.assignment_drafts (
  teacher_uid uuid NOT NULL DEFAULT auth.uid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (length(slot) BETWEEN 1 AND 100),
  revision uuid NOT NULL, payload jsonb,
  PRIMARY KEY (teacher_uid,class_id,slot)
);
ALTER TABLE public.assignment_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assignment_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.assignment_drafts TO authenticated;
CREATE POLICY assignment_drafts_owner_read ON public.assignment_drafts FOR SELECT TO authenticated
  USING (teacher_uid=(SELECT auth.uid()) AND EXISTS (SELECT FROM public.classes c WHERE c.id=class_id AND c.teacher_uid=(SELECT auth.uid())::text));

CREATE FUNCTION public.save_assignment_draft(p_class_id uuid,p_slot text,p_base uuid,p_revision uuid,p_payload jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner_id uuid := auth.uid(); affected integer;
BEGIN
  IF NOT EXISTS(SELECT FROM public.classes c WHERE c.id=p_class_id AND c.teacher_uid=owner_id::text)
    THEN RAISE EXCEPTION 'Unknown class' USING ERRCODE='42501'; END IF;
  IF p_revision IS NULL OR (p_payload IS NOT NULL AND jsonb_typeof(p_payload)<>'object') THEN
    RAISE EXCEPTION 'Invalid draft'; END IF;
  INSERT INTO public.assignment_drafts(teacher_uid,class_id,slot,revision,payload)
    SELECT owner_id,p_class_id,p_slot,p_revision,p_payload
    WHERE p_base IS NULL OR EXISTS (SELECT FROM public.assignment_drafts d WHERE
      d.teacher_uid=owner_id AND d.class_id=p_class_id AND d.slot=p_slot)
  ON CONFLICT (teacher_uid,class_id,slot) DO UPDATE SET revision=excluded.revision, payload=excluded.payload
    WHERE assignment_drafts.revision=p_base OR assignment_drafts.revision=p_revision;
  GET DIAGNOSTICS affected=ROW_COUNT;
  RETURN affected=1;
END; $$;
REVOKE ALL ON FUNCTION public.save_assignment_draft(uuid,text,uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_assignment_draft(uuid,text,uuid,uuid,jsonb) TO authenticated;
-- Immutable template configurations plus idempotent UI operations. A removed
-- legacy template must stay removed when an older school laptop next connects.
CREATE TABLE public.teacher_activity_templates (
  owner_id uuid NOT NULL, template_id text NOT NULL, content jsonb NOT NULL,
  pin_stamp bigint NOT NULL DEFAULT 0, removed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (owner_id,template_id)
);
ALTER TABLE public.teacher_activity_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_activity_templates FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.sync_activity_templates(p_changes jsonb)
RETURNS SETOF jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item jsonb; task jsonb; operation text; owner_id_var uuid := auth.uid(); stamp bigint;
BEGIN
  IF owner_id_var IS NULL OR NOT public.is_teacher() THEN RAISE EXCEPTION 'Teacher required' USING ERRCODE='42501'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    task:=item->'task'; operation:=item->>'op'; stamp:=(item->>'stamp')::bigint;
    IF operation NOT IN ('save','pin','use','remove') OR coalesce(length(task->>'id'),0) NOT BETWEEN 1 AND 128
      OR jsonb_typeof(task->'wordIds') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid template'; END IF;
    INSERT INTO public.teacher_activity_templates AS prev(owner_id,template_id,content,pin_stamp,removed)
      VALUES(owner_id_var,task->>'id',task,CASE WHEN operation='pin' THEN stamp ELSE 0 END,operation='remove')
    ON CONFLICT(owner_id,template_id) DO UPDATE SET
      removed=prev.removed OR operation='remove',
      pin_stamp=CASE WHEN operation='pin' THEN greatest(prev.pin_stamp,stamp) ELSE prev.pin_stamp END,
      content=CASE
        WHEN operation='pin' AND stamp>=prev.pin_stamp THEN jsonb_set(prev.content,'{pinned}',task->'pinned')
        WHEN operation='use' THEN prev.content || jsonb_build_object(
          'timesUsed',greatest((prev.content->>'timesUsed')::bigint,(task->>'timesUsed')::bigint),
          'lastUsedAt',greatest((prev.content->>'lastUsedAt')::bigint,(task->>'lastUsedAt')::bigint))
        ELSE prev.content END;
  END LOOP;
  RETURN QUERY SELECT t.content FROM public.teacher_activity_templates t WHERE t.owner_id=owner_id_var AND NOT t.removed;
END; $$;
REVOKE ALL ON FUNCTION public.sync_activity_templates(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sync_activity_templates(jsonb) TO authenticated;
COMMIT;
