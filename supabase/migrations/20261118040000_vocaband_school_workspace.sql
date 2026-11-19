BEGIN;

-- Paid products govern new admissions. Existing pupils and work stay readable
-- after a term expires, and archiving an assignment does not delete progress.
ALTER TABLE public.assignments ADD COLUMN closed_at timestamptz, ADD COLUMN publish_request_id uuid;
CREATE UNIQUE INDEX assignment_publish_once ON public.assignments(class_id,publish_request_id)
 WHERE publish_request_id IS NOT NULL;
CREATE POLICY assignments_hide_closed ON public.assignments AS RESTRICTIVE
 FOR SELECT TO authenticated USING (
   closed_at IS NULL OR public.is_admin() OR EXISTS (
     SELECT FROM public.classes c WHERE c.id=class_id
       AND (c.teacher_uid=(SELECT auth.uid())::text OR c.id IN (SELECT m.id FROM public.manager_classes() m))
   )
 );


-- The existing bootstrap RPC calls this same entry point.
CREATE OR REPLACE FUNCTION public.get_assignments_for_class(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  class_id UUID,
  word_ids INTEGER[],
  words JSONB,
  allowed_modes TEXT[],
  deadline TEXT,
  sentences TEXT[],
  sentence_difficulty INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_uid   TEXT := auth.uid()::text;
  v_caller_role  TEXT;
  v_caller_class TEXT;
  v_target_code  TEXT;
  v_is_teacher   BOOLEAN;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT u.role, u.class_code INTO v_caller_role, v_caller_class
  FROM public.users u WHERE u.uid = v_caller_uid;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '42501';
  END IF;

  -- Teacher path: must own the class.
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_uid = v_caller_uid
  ) INTO v_is_teacher;

  IF NOT v_is_teacher THEN
    -- Student path: must be enrolled in the class.
    SELECT c.code INTO v_target_code FROM public.classes c WHERE c.id = p_class_id;

    IF v_caller_role <> 'student' OR v_target_code IS NULL OR v_caller_class IS NULL OR v_caller_class <> v_target_code THEN
      RAISE EXCEPTION 'Access denied: caller is not a member of this class'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.class_id,
    a.word_ids::INTEGER[],                 -- keep INTEGER[] even if schema drifts
    a.words,
    a.allowed_modes,
    a.deadline,
    a.sentences,
    a.sentence_difficulty::INTEGER,        -- SMALLINT on prod; cast up to INTEGER
    a.created_at
  FROM public.assignments a
  WHERE a.class_id = p_class_id AND (v_is_teacher OR a.closed_at IS NULL)
  ORDER BY a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignments_for_class(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_assignments_for_class(uuid) TO authenticated;

-- Longitudinal reports are paid. The per-assignment gradebook is still available.
CREATE OR REPLACE FUNCTION public.get_teacher_class_analytics(
  p_class_codes TEXT[],
  p_since       TIMESTAMPTZ
)
RETURNS TABLE (
  class_code     TEXT,
  student_count  INTEGER,
  total_attempts INTEGER,
  total_score    NUMERIC,
  students       JSONB,
  mistakes       JSONB,
  modes          JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_uid TEXT := auth.uid()::text;
  v_owned      TEXT[];
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF coalesce(public.billing_entitlement(v_caller_uid)->>'tier','free')='free' THEN
    RAISE EXCEPTION 'teacher_plan_required' USING ERRCODE = '42501';
  END IF;

  -- Restrict to the caller's own classes; unowned codes are silently dropped.
  SELECT array_agg(c.code) INTO v_owned
  FROM public.classes c
  WHERE c.teacher_uid = v_caller_uid AND c.code = ANY(p_class_codes);

  IF v_owned IS NULL THEN
    RETURN; -- caller owns none of the requested classes
  END IF;

  RETURN QUERY
  WITH r AS (
    SELECT p.class_code,
      COALESCE(NULLIF(p.student_uid, ''), p.student_name) AS ident,
      p.student_uid, p.student_name, p.avatar, p.score, p.mode, p.mistakes, p.completed_at
    FROM public.progress p
    WHERE p.class_code = ANY(v_owned) AND p.completed_at >= p_since
  ),
  per_student AS (
    SELECT r.class_code, r.ident,
      (array_agg(r.student_uid  ORDER BY r.completed_at DESC))[1] AS uid,
      (array_agg(r.student_name ORDER BY r.completed_at DESC))[1] AS name,
      (array_agg(COALESCE(r.avatar, '🦊') ORDER BY r.completed_at DESC))[1] AS avatar,
      SUM(r.score) AS total, COUNT(*) AS cnt
    FROM r GROUP BY r.class_code, r.ident
  ),
  per_word AS (
    SELECT r.class_code, m.word_id, COUNT(*) AS cnt
    FROM r, unnest(r.mistakes) AS m(word_id)
    GROUP BY r.class_code, m.word_id
  ),
  per_mode AS (
    SELECT r.class_code, r.mode, COUNT(*) AS cnt, SUM(r.score) AS total
    FROM r GROUP BY r.class_code, r.mode
  ),
  totals AS (
    SELECT r.class_code,
      COUNT(*) AS total_attempts,
      SUM(r.score) AS total_score,
      COUNT(DISTINCT r.ident) AS student_count
    FROM r GROUP BY r.class_code
  )
  SELECT
    t.class_code,
    t.student_count::INTEGER,
    t.total_attempts::INTEGER,
    t.total_score,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('uid', ps.uid, 'name', ps.name, 'avatar', ps.avatar, 'total', ps.total, 'count', ps.cnt))
              FROM per_student ps WHERE ps.class_code = t.class_code), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('word_id', pw.word_id, 'count', pw.cnt))
              FROM per_word pw WHERE pw.class_code = t.class_code), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('mode', pm.mode, 'count', pm.cnt, 'total', pm.total))
              FROM per_mode pm WHERE pm.class_code = t.class_code), '[]'::jsonb)
  FROM totals t;
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_class_analytics(text[],timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_analytics(text[],timestamptz) TO authenticated;

CREATE FUNCTION public.close_my_assignment(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.assignments a SET closed_at=coalesce(a.closed_at,now())
 FROM public.classes c WHERE a.id=p_id AND c.id=a.class_id AND c.teacher_uid=auth.uid()::text;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.close_my_assignment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.close_my_assignment(uuid) TO authenticated;

CREATE FUNCTION public.billing_check_assignment_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_uid text;
BEGIN
 IF NEW.closed_at IS NOT NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.class_id=NEW.class_id AND OLD.closed_at IS NULL
   THEN RETURN NEW; END IF;
 SELECT c.teacher_uid INTO owner_uid FROM public.classes c WHERE c.id=NEW.class_id;
 IF owner_uid IS NULL THEN RETURN NEW; END IF;
 IF coalesce(public.billing_entitlement(owner_uid)->>'tier','free')='free' THEN
   PERFORM public.billing_scope_lock(owner_uid,NULL);
   IF coalesce(public.billing_entitlement(owner_uid)->>'tier','free')='free' AND
     (SELECT count(*) FROM public.assignments a JOIN public.classes c ON c.id=a.class_id
      WHERE c.teacher_uid=owner_uid AND c.archived_at IS NULL AND a.id<>NEW.id
        AND a.closed_at IS NULL)>=3
   THEN RAISE EXCEPTION 'free_tier_assignment_cap'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER billing_check_assignment_limit BEFORE INSERT OR UPDATE OF class_id,closed_at
 ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.billing_check_assignment_limit();

CREATE FUNCTION public.billing_check_roster_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_uid text; school uuid; scope_school uuid; seat_limit integer; access jsonb; old_profile uuid;
BEGIN
 IF NEW.status NOT IN ('approved','active') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
   old_profile:=OLD.id;
   IF OLD.status IN ('approved','active') AND OLD.class_code=NEW.class_code
      AND (OLD.auth_uid IS NULL OR OLD.auth_uid IS NOT DISTINCT FROM NEW.auth_uid)
   THEN RETURN NEW; END IF;
 END IF;
 SELECT c.teacher_uid,u.school_id INTO owner_uid,school FROM public.classes c
 JOIN public.users u ON u.uid=c.teacher_uid WHERE c.code=NEW.class_code AND c.archived_at IS NULL;
 IF owner_uid IS NULL THEN RETURN NEW; END IF;
 -- Use one mutex for all admissions in a linked school. This also serializes
 -- changes to its membership and prevents two class owners from filling one seat.
 PERFORM public.billing_scope_lock(owner_uid,school);
 access:=public.billing_entitlement(owner_uid);
 seat_limit:=(access->>'capacity')::integer;
 IF seat_limit IS NULL THEN RETURN NEW; END IF;
 scope_school:=CASE WHEN access->>'tier'='school' THEN school END;
 IF (SELECT count(DISTINCT coalesce(sp.auth_uid,sp.id)) FROM public.student_profiles sp
     JOIN public.classes c ON c.code=sp.class_code JOIN public.users u ON u.uid=c.teacher_uid
     WHERE c.archived_at IS NULL AND sp.status IN ('approved','active')
       AND ((scope_school IS NULL AND c.teacher_uid=owner_uid) OR u.school_id=scope_school)
       AND sp.id IS DISTINCT FROM old_profile
       AND coalesce(sp.auth_uid,sp.id)<>coalesce(NEW.auth_uid,NEW.id))>=seat_limit
 THEN
   IF access->>'tier'='free' THEN RAISE EXCEPTION 'free_tier_student_cap'; END IF;
   RAISE EXCEPTION 'plan_student_cap';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER billing_check_roster_limit BEFORE INSERT OR UPDATE OF status,class_code,auth_uid
 ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.billing_check_roster_limit();

-- Keep the original insert policy aligned with the active-class limit.
CREATE OR REPLACE FUNCTION public.teacher_class_count(p_uid text) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT count(*) FROM public.classes WHERE teacher_uid=p_uid AND archived_at IS NULL
$$;
REVOKE ALL ON FUNCTION public.teacher_class_count(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.teacher_class_count(text) TO authenticated;

-- New or restored classes must fit the receiving plan, even when an operator
-- uses a service RPC. Ordinary updates and archived data retain their history.
CREATE FUNCTION public.billing_check_class_activation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE school uuid; scope_school uuid; access jsonb; capacity integer;
BEGIN
 IF NEW.archived_at IS NOT NULL OR NEW.teacher_uid IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.archived_at IS NULL AND OLD.teacher_uid=NEW.teacher_uid THEN RETURN NEW; END IF;
 SELECT u.school_id INTO school FROM public.users u WHERE u.uid=NEW.teacher_uid AND u.role='teacher';
 IF NOT FOUND THEN RETURN NEW; END IF;
 PERFORM public.billing_scope_lock(NEW.teacher_uid,school);
 IF school IS NOT NULL THEN PERFORM public.billing_scope_lock(NEW.teacher_uid,NULL); END IF;
 access:=public.billing_entitlement(NEW.teacher_uid);
 IF access->>'tier'='free' THEN
   IF EXISTS(SELECT FROM public.classes c WHERE c.teacher_uid=NEW.teacher_uid AND c.id<>NEW.id AND c.archived_at IS NULL)
   THEN RAISE EXCEPTION 'free_tier_class_cap'; END IF;
   IF TG_OP='UPDATE' AND (SELECT count(*) FROM public.assignments a WHERE a.class_id=NEW.id AND a.closed_at IS NULL)>3
   THEN RAISE EXCEPTION 'free_tier_assignment_cap'; END IF;
 END IF;
 capacity:=(access->>'capacity')::integer;
 IF capacity IS NULL OR TG_OP='INSERT' THEN RETURN NEW; END IF;
 scope_school:=CASE WHEN access->>'tier'='school' THEN school END;
 IF (SELECT count(DISTINCT coalesce(sp.auth_uid,sp.id)) FROM public.student_profiles sp
     JOIN public.classes c ON c.code=sp.class_code LEFT JOIN public.users u ON u.uid=c.teacher_uid
     WHERE sp.status IN ('approved','active') AND (c.id=NEW.id OR (
       access->>'tier'<>'free' AND c.archived_at IS NULL AND
       ((scope_school IS NULL AND c.teacher_uid=NEW.teacher_uid) OR u.school_id=scope_school)
     )))>capacity
 THEN RAISE EXCEPTION 'plan_student_cap'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER billing_check_class_activation BEFORE INSERT OR UPDATE OF teacher_uid,archived_at
 ON public.classes FOR EACH ROW EXECUTE FUNCTION public.billing_check_class_activation();

-- Basic paid plans can save new library content. Teachers keep access to
-- material already saved if the subscription or trial expires.
CREATE POLICY vocabulary_sets_paid_insert ON public.vocabulary_sets AS RESTRICTIVE
 FOR INSERT TO authenticated WITH CHECK (public.is_pro_or_trialing());
CREATE POLICY vocabulary_collections_paid_insert ON public.vocabulary_collections AS RESTRICTIVE
 FOR INSERT TO authenticated WITH CHECK (public.is_pro_or_trialing());

CREATE FUNCTION public.billing_check_school_staff() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cap integer; teacher_count integer; licensed public.schools;
BEGIN
 IF NEW.school_id IS NULL OR NEW.role<>'teacher' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.role='teacher' AND OLD.school_id=NEW.school_id THEN RETURN NEW; END IF;
 PERFORM public.billing_scope_lock(NEW.uid,NEW.school_id);
 SELECT * INTO licensed FROM public.schools WHERE id=NEW.school_id;
 IF licensed.plan='school' OR licensed.trial_ends_at>now() THEN RETURN NEW; END IF;
 cap:=public.billing_school_seats(NEW.school_id);
 IF cap=0 THEN RETURN NEW; END IF;
 SELECT count(*) INTO teacher_count FROM public.users
 WHERE school_id=NEW.school_id AND role='teacher' AND uid<>NEW.uid;
 IF teacher_count>=cap THEN RAISE EXCEPTION 'school_teacher_cap'; END IF;
 IF (SELECT count(DISTINCT coalesce(sp.auth_uid,sp.id))
     FROM public.student_profiles sp JOIN public.classes c ON c.code=sp.class_code
     JOIN public.users u ON u.uid=c.teacher_uid
     WHERE c.archived_at IS NULL AND sp.status IN ('approved','active')
       AND (u.school_id=NEW.school_id OR u.uid=NEW.uid))>400
 THEN RAISE EXCEPTION 'plan_student_cap'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER billing_check_school_staff BEFORE INSERT OR UPDATE OF school_id,role ON public.users
 FOR EACH ROW EXECUTE FUNCTION public.billing_check_school_staff();

-- Atomic reservation before calling an external model. Per-calendar-month
-- combined OCR and AI requests. Existing hourly/daily abuse limits still apply.
CREATE TABLE public.teacher_work_quota (
 teacher_uid text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
 month_start date NOT NULL,
 used integer NOT NULL CHECK (used BETWEEN 1 AND 30),
 PRIMARY KEY(teacher_uid,month_start)
);
ALTER TABLE public.teacher_work_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_work_quota FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.billing_use_work_quota(p_uid text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tier text; month_day date;
BEGIN
 SELECT public.billing_entitlement(p_uid)->>'tier' INTO tier;
 IF tier IS NULL OR tier NOT IN ('pro','trial','school') THEN RETURN false; END IF;
 IF EXISTS(SELECT FROM public.users WHERE uid=p_uid AND (role='admin' OR lower(email)='wasya92@gmail.com'))
   THEN RETURN true; END IF;
 month_day:=date_trunc('month',now() AT TIME ZONE 'Asia/Jerusalem')::date;
 INSERT INTO public.teacher_work_quota(teacher_uid,month_start,used) VALUES(p_uid,month_day,1)
 ON CONFLICT(teacher_uid,month_start) DO UPDATE SET used=teacher_work_quota.used+1
 WHERE teacher_work_quota.used<30;
 RETURN FOUND;
END $$;

-- Separate published snapshots keep personal folders and drafts private.
CREATE TABLE public.school_word_resources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 source_set_id uuid REFERENCES public.vocabulary_sets(id) ON DELETE SET NULL,
 published_by text REFERENCES public.users(uid) ON DELETE SET NULL,
 title text NOT NULL,
 grade_level integer,
 words jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(school_id,source_set_id)
);
CREATE INDEX school_resources_recent ON public.school_word_resources(school_id,published_at DESC);

CREATE TABLE public.school_assignment_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 resource_id uuid REFERENCES public.school_word_resources(id) ON DELETE SET NULL,
 coordinator_uid text REFERENCES public.users(uid) ON DELETE SET NULL,
 title text NOT NULL,
 requested_classes uuid[] NOT NULL,
 deadline text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX school_batches_recent ON public.school_assignment_batches(school_id,created_at DESC);
CREATE TABLE public.school_assignment_deliveries (
 assignment_id uuid PRIMARY KEY REFERENCES public.assignments(id) ON DELETE CASCADE,
 batch_id uuid NOT NULL REFERENCES public.school_assignment_batches(id) ON DELETE CASCADE
);
CREATE INDEX school_deliveries_by_batch ON public.school_assignment_deliveries(batch_id);

ALTER TABLE public.school_word_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assignment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assignment_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_word_resources,public.school_assignment_batches,public.school_assignment_deliveries
 FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.billing_my_school(p_manager boolean) RETURNS uuid
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT u.school_id FROM public.users u JOIN public.schools s ON s.id=u.school_id
 WHERE u.uid=auth.uid()::text AND u.role IN ('teacher','manager')
   AND (NOT p_manager OR u.role='manager')
   AND (s.plan='school' OR s.trial_ends_at>now() OR public.billing_school_seats(s.id)>0)
$$;

CREATE FUNCTION public.publish_school_word_set(p_set uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE school uuid; source public.vocabulary_sets; snapshot jsonb; result uuid;
BEGIN
 school:=public.billing_my_school(false);
 IF school IS NULL THEN RAISE EXCEPTION 'school_license_required'; END IF;
 SELECT * INTO source FROM public.vocabulary_sets
 WHERE id=p_set AND teacher_uid=auth.uid()::text AND NOT is_archived;
 IF NOT FOUND THEN RAISE EXCEPTION 'word_set_unavailable'; END IF;
 SELECT jsonb_agg(jsonb_build_object(
   'id',coalesce(w.curriculum_word_id,-(1+abs(hashtext(lower(w.english))::bigint % 2000000000))::integer),
   'english',w.english,'hebrew',coalesce(w.hebrew,''),'arabic',coalesce(w.arabic,''),
   'level',CASE WHEN w.curriculum_word_id IS NULL THEN 'Custom' ELSE 'Set 1' END,'recProd','Prod'
 ) ORDER BY w.position) INTO snapshot
 FROM (SELECT * FROM public.vocabulary_set_words WHERE set_id=source.id ORDER BY position LIMIT 201) w;
 IF snapshot IS NULL OR jsonb_array_length(snapshot)>200 THEN RAISE EXCEPTION 'invalid_school_word_set'; END IF;
 INSERT INTO public.school_word_resources(school_id,source_set_id,published_by,title,grade_level,words)
 VALUES(school,source.id,auth.uid()::text,source.name,source.grade_level,snapshot)
 ON CONFLICT(school_id,source_set_id) DO UPDATE SET title=excluded.title,grade_level=excluded.grade_level,
   words=excluded.words,published_at=now()
 RETURNING id INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.school_workspace() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH viewer AS (
   SELECT public.billing_my_school(false) AS school,public.billing_my_school(true) IS NOT NULL AS manager,auth.uid()::text AS uid
 )
 SELECT jsonb_build_object(
   'manager',v.manager,
   'resources',coalesce((
     SELECT jsonb_agg(to_jsonb(r) ORDER BY r.published_at DESC)
     FROM (SELECT id,title,grade_level,published_at,jsonb_array_length(words) AS word_count
           FROM public.school_word_resources WHERE school_id=v.school ORDER BY published_at DESC LIMIT 100) r
   ),'[]'::jsonb),
   'classes',coalesce((
     SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'teacher',u.display_name) ORDER BY c.name,c.id)
     FROM public.classes c JOIN public.users u ON u.uid=c.teacher_uid
     WHERE c.archived_at IS NULL AND c.subject='english' AND u.school_id=v.school AND (v.manager OR c.teacher_uid=v.uid)
   ),'[]'::jsonb),
   'batches',coalesce((
     SELECT jsonb_agg(to_jsonb(b) ORDER BY b.created_at DESC) FROM (
       SELECT id,title,deadline,created_at FROM public.school_assignment_batches
       WHERE school_id=v.school AND v.manager ORDER BY created_at DESC LIMIT 50
     ) b
   ),'[]'::jsonb)
 ) FROM viewer v WHERE v.school IS NOT NULL
$$;

-- Assignments go through the same rows that the student app already reads.
-- The request ID makes a retry after an interrupted connection safe.
CREATE FUNCTION public.assign_school_words(p_request uuid,p_resource uuid,p_classes uuid[],p_title text,p_due text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE school uuid; is_manager boolean; selected uuid[]; resource public.school_word_resources;
  existing public.school_assignment_batches; class_id uuid; created uuid; ids integer[];
BEGIN
 school:=public.billing_my_school(false);
 is_manager:=public.billing_my_school(true) IS NOT NULL;
 IF school IS NULL THEN RAISE EXCEPTION 'school_license_required'; END IF;
 IF p_request IS NULL OR cardinality(p_classes) IS NULL OR cardinality(p_classes) NOT BETWEEN 1 AND 100
    OR char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 1 AND 100
    OR (p_due IS NOT NULL AND (p_due !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      OR p_due<to_char(now() AT TIME ZONE 'Asia/Jerusalem','YYYY-MM-DD')))
 THEN RAISE EXCEPTION 'invalid_school_assignment'; END IF;
 PERFORM public.billing_scope_lock(auth.uid()::text,school);
 SELECT * INTO resource FROM public.school_word_resources WHERE id=p_resource AND school_id=school FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'word_set_unavailable'; END IF;
 SELECT array_agg(c.id ORDER BY c.id) INTO selected
 FROM public.classes c JOIN public.users u ON u.uid=c.teacher_uid
 WHERE c.id=ANY(p_classes) AND c.archived_at IS NULL AND c.subject='english'
   AND u.school_id=school AND (is_manager OR c.teacher_uid=auth.uid()::text);
 IF cardinality(selected) IS DISTINCT FROM cardinality(p_classes) THEN RAISE EXCEPTION 'class_unavailable'; END IF;
 SELECT * INTO existing FROM public.school_assignment_batches WHERE id=p_request;
 IF FOUND THEN
   IF existing.school_id<>school OR existing.coordinator_uid IS DISTINCT FROM auth.uid()::text
      OR existing.resource_id IS DISTINCT FROM p_resource OR existing.requested_classes<>selected
      OR existing.title<>btrim(p_title) OR existing.deadline IS DISTINCT FROM p_due
   THEN RAISE EXCEPTION 'assignment_request_conflict'; END IF;
   RETURN existing.id;
 END IF;
 INSERT INTO public.school_assignment_batches(id,school_id,resource_id,coordinator_uid,title,requested_classes,deadline)
 VALUES(p_request,school,p_resource,auth.uid()::text,btrim(p_title),selected,p_due);
 SELECT array_agg(DISTINCT (word->>'id')::integer) INTO ids FROM jsonb_array_elements(resource.words) word
 WHERE (word->>'id')::integer>0;
 FOREACH class_id IN ARRAY selected LOOP
   INSERT INTO public.assignments(class_id,title,deadline,words,word_ids,allowed_modes,subject)
   VALUES(class_id,btrim(p_title),p_due,resource.words,coalesce(ids,'{}'),ARRAY['classic'],'english') RETURNING id INTO created;
   INSERT INTO public.school_assignment_deliveries(assignment_id,batch_id) VALUES(created,p_request);
 END LOOP;
 RETURN p_request;
END $$;

CREATE FUNCTION public.school_assignment_report(p_batch uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH scoped AS (
   SELECT b.id,b.title FROM public.school_assignment_batches b
   WHERE b.id=p_batch AND b.school_id=public.billing_my_school(true)
 ), assigned AS (
   SELECT a.id,c.code,c.name,u.display_name AS teacher
   FROM scoped b JOIN public.school_assignment_deliveries d ON d.batch_id=b.id
   JOIN public.assignments a ON a.id=d.assignment_id
   JOIN public.classes c ON c.id=a.class_id
   JOIN public.users u ON u.uid=c.teacher_uid AND u.school_id=public.billing_my_school(true)
 ), counts AS (
   SELECT s.id,s.name,s.teacher,count(DISTINCT coalesce(p.auth_uid,p.id)) AS enrolled,
     count(DISTINCT p.auth_uid) FILTER (WHERE EXISTS(
       SELECT FROM public.progress pr WHERE pr.assignment_id=s.id AND pr.class_code=s.code
           AND pr.student_uid=p.auth_uid::text AND pr.mode='classic'
     )) AS completed
   FROM assigned s LEFT JOIN public.student_profiles p ON p.class_code=s.code AND p.status IN ('approved','active')
   GROUP BY s.id,s.name,s.teacher
 )
 SELECT jsonb_build_object('title',b.title,'classes',coalesce((
   SELECT jsonb_agg(to_jsonb(c) ORDER BY c.name,c.id) FROM counts c
 ),'[]'::jsonb)) FROM scoped b
$$;

-- Personal Pro can assign a saved set to several of the teacher's classes.
-- Require ownership on every target and write all targets in one transaction.
CREATE FUNCTION public.assign_personal_word_set(p_request uuid,p_classes uuid[],p_title text,p_due text,p_words jsonb,p_word_ids integer[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid text:=auth.uid()::text; matched integer;
BEGIN
 IF coalesce(public.billing_entitlement(uid)->>'tier','free') NOT IN ('pro','school','trial')
   THEN RAISE EXCEPTION 'teacher_pro_required'; END IF;
 IF p_request IS NULL OR cardinality(p_classes) IS NULL OR cardinality(p_classes) NOT BETWEEN 2 AND 100
    OR char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 1 AND 100
    OR (p_due IS NOT NULL AND (p_due !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      OR p_due<to_char(now() AT TIME ZONE 'Asia/Jerusalem','YYYY-MM-DD')))
    OR jsonb_typeof(p_words) IS DISTINCT FROM 'array' OR octet_length(p_words::text)>1048576
    OR cardinality(p_word_ids)>200
 THEN RAISE EXCEPTION 'invalid_assignment'; END IF;
 IF jsonb_array_length(p_words) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid_assignment'; END IF;
 PERFORM c.id FROM public.classes c WHERE c.id=ANY(p_classes) AND c.teacher_uid=uid
   AND c.archived_at IS NULL AND c.subject='english' ORDER BY c.id FOR SHARE;
 GET DIAGNOSTICS matched=ROW_COUNT;
 IF matched<>cardinality(p_classes) THEN RAISE EXCEPTION 'class_unavailable'; END IF;
 INSERT INTO public.assignments(class_id,title,deadline,words,word_ids,subject,publish_request_id)
 SELECT c.id,btrim(p_title),p_due,p_words,p_word_ids,c.subject,p_request FROM public.classes c WHERE c.id=ANY(p_classes)
 ON CONFLICT(class_id,publish_request_id) WHERE publish_request_id IS NOT NULL DO NOTHING;
 RETURN matched;
END $$;

REVOKE ALL ON FUNCTION public.billing_check_assignment_limit(),public.billing_check_roster_limit(),
 public.billing_check_class_activation(),public.billing_check_school_staff(),
 public.billing_my_school(boolean),public.billing_use_work_quota(text),
 public.publish_school_word_set(uuid),public.school_workspace(),public.assign_school_words(uuid,uuid,uuid[],text,text),
 public.school_assignment_report(uuid),public.assign_personal_word_set(uuid,uuid[],text,text,jsonb,integer[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_use_work_quota(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_school_word_set(uuid),public.school_workspace(),public.assign_school_words(uuid,uuid,uuid[],text,text),
 public.school_assignment_report(uuid),public.assign_personal_word_set(uuid,uuid[],text,text,jsonb,integer[]) TO authenticated;

COMMIT;
