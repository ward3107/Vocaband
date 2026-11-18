BEGIN;

-- Opening Add students authorizes a short classroom enrollment session.
-- A group invitation identifies the session. Only a pupil's private nonce
-- and the relevant teacher approval can release an existing roster PIN.
CREATE TABLE public.class_pin_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL UNIQUE REFERENCES public.classes(id) ON DELETE CASCADE,
  owner_uid text NOT NULL,
  ends_at timestamptz NOT NULL
);
CREATE INDEX class_pin_windows_expiry ON public.class_pin_windows(ends_at);
CREATE TABLE public.class_pin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES public.class_pin_windows(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  is_new boolean NOT NULL,
  device_hash bytea NOT NULL UNIQUE,
  match_code text NOT NULL,
  -- Only the PIN for a new, still-uncreated account is kept until approval.
  proposed_pin text,
  state text NOT NULL DEFAULT 'waiting' CHECK (state IN ('waiting','ready','declined','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX class_pin_requests_window ON public.class_pin_requests(window_id,state);
ALTER TABLE public.class_pin_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_pin_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.class_pin_windows, public.class_pin_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT,DELETE ON public.class_pin_windows, public.class_pin_requests TO service_role;

CREATE FUNCTION public.teacher_open_pin_window(p_class text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.classes; w public.class_pin_windows;
BEGIN
 SELECT * INTO c FROM public.classes WHERE code=p_class AND teacher_uid=auth.uid()::text AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
 DELETE FROM public.class_pin_windows WHERE ends_at<=now() OR (class_id=c.id AND owner_uid<>c.teacher_uid);
 INSERT INTO public.class_pin_windows(class_id,owner_uid,ends_at) VALUES(c.id,c.teacher_uid,now()+interval '20 minutes')
 ON CONFLICT (class_id) DO NOTHING;
 SELECT * INTO STRICT w FROM public.class_pin_windows WHERE class_id=c.id;
 RETURN jsonb_build_object('id',w.id,'ends_at',w.ends_at);
END $$;

-- Shared links and printed posters keep their existing URL. A currently
-- open window permits a request; ownership of the class still governs approval.
CREATE FUNCTION public.class_pin_availability(p_class text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',w.id,'can_add',NOT EXISTS(SELECT FROM public.student_profiles p WHERE p.class_code=c.code AND p.anon_seq IS NOT NULL))
 FROM public.class_pin_windows w JOIN public.classes c ON c.id=w.class_id WHERE c.code=p_class AND c.teacher_uid=w.owner_uid AND c.archived_at IS NULL AND w.ends_at>now()
$$;
REVOKE ALL ON FUNCTION public.class_pin_availability(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.class_pin_availability(text) TO anon,authenticated;

CREATE FUNCTION public.start_class_pin_request(p_class text,p_window uuid,p_student uuid,p_alias text,p_device uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.class_pin_windows; r public.class_pin_requests; label text; digest bytea;
BEGIN
 IF p_device IS NULL THEN RAISE EXCEPTION 'Unavailable'; END IF;
 SELECT wi.* INTO w FROM public.class_pin_windows wi JOIN public.classes c ON c.id=wi.class_id
 WHERE wi.id=p_window AND c.code=p_class AND c.archived_at IS NULL AND c.teacher_uid=wi.owner_uid AND wi.ends_at>now()
 FOR UPDATE OF wi;
 IF NOT FOUND THEN RAISE EXCEPTION 'window_expired'; END IF;
 digest:=sha256(convert_to(p_device::text,'UTF8'));
 SELECT * INTO r FROM public.class_pin_requests WHERE device_hash=digest;
 IF FOUND THEN
   IF r.window_id<>w.id THEN RAISE EXCEPTION 'Unavailable'; END IF;
 ELSE
   IF (SELECT count(*) FROM public.class_pin_requests WHERE window_id=w.id)>=120 THEN RAISE EXCEPTION 'window_full'; END IF;
   IF p_student IS NOT NULL THEN
     SELECT display_name INTO label FROM public.student_profiles WHERE id=p_student AND class_code=p_class
       AND roster_created AND roster_pin IS NOT NULL AND status IN ('approved','active');
     IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
     IF (SELECT count(*) FROM public.class_pin_requests WHERE window_id=w.id AND student_id=p_student AND state='waiting')>=3 THEN RAISE EXCEPTION 'window_full'; END IF;
   ELSE
     label:=btrim(regexp_replace(coalesce(p_alias,''),'[[:space:]]+',' ','g'));
     IF char_length(label) NOT BETWEEN 2 AND 30 OR label~'[[:cntrl:]@]' THEN RAISE EXCEPTION 'invalid_alias'; END IF;
     IF EXISTS(SELECT FROM public.student_profiles WHERE class_code=p_class AND anon_seq IS NOT NULL) THEN RAISE EXCEPTION 'coded_class'; END IF;
     IF EXISTS(SELECT FROM public.student_profiles WHERE class_code=p_class AND lower(display_name)=lower(label))
       OR EXISTS(SELECT FROM public.class_pin_requests WHERE window_id=w.id AND lower(display_name)=lower(label) AND state='waiting')
       THEN RAISE EXCEPTION 'alias_taken'; END IF;
   END IF;
   INSERT INTO public.class_pin_requests(window_id,student_id,display_name,is_new,device_hash,match_code,proposed_pin)
   VALUES(w.id,p_student,label,p_student IS NULL,digest,
     lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,7))::bit(28)::integer)%1000000)::text,6,'0'),
     CASE WHEN p_student IS NULL THEN public.generate_roster_pin() END)
   RETURNING * INTO r;
 END IF;
 RETURN jsonb_build_object('id',r.id,'state',r.state,'challenge',CASE WHEN NOT r.is_new THEN r.match_code END,'pin',r.proposed_pin);
END $$;

CREATE FUNCTION public.teacher_pending_pin_requests(p_window uuid)
RETURNS TABLE(id uuid,display_name text,is_new boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.id,r.display_name,r.is_new FROM public.class_pin_requests r JOIN public.class_pin_windows w ON w.id=r.window_id
 JOIN public.classes c ON c.id=w.class_id WHERE w.id=p_window AND w.owner_uid=auth.uid()::text AND c.teacher_uid=w.owner_uid
 AND c.archived_at IS NULL AND w.ends_at>now() AND r.state='waiting' ORDER BY r.created_at
$$;

CREATE FUNCTION public.teacher_decide_pin_request(p_id uuid,p_approve boolean,p_challenge text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.class_pin_requests; c public.classes; target uuid;
BEGIN
 SELECT cl.* INTO c FROM public.classes cl JOIN public.class_pin_windows w ON w.class_id=cl.id
 JOIN public.class_pin_requests req ON req.window_id=w.id WHERE req.id=p_id AND cl.teacher_uid=auth.uid()::text
 AND w.owner_uid=cl.teacher_uid AND cl.archived_at IS NULL AND w.ends_at>now() FOR UPDATE OF cl;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
 SELECT * INTO STRICT r FROM public.class_pin_requests WHERE id=p_id FOR UPDATE;
 IF r.state<>'waiting' THEN RETURN; END IF;
 IF p_approve IS DISTINCT FROM true THEN
   UPDATE public.class_pin_requests SET state='declined',proposed_pin=null WHERE id=r.id; RETURN;
 END IF;
 IF r.is_new THEN
   IF EXISTS(SELECT FROM public.student_profiles WHERE class_code=c.code AND (lower(display_name)=lower(r.display_name) OR anon_seq IS NOT NULL))
     THEN RAISE EXCEPTION 'alias_taken'; END IF;
   IF NOT public.is_pro_or_trialing() AND (SELECT count(*) FROM public.student_profiles WHERE class_code=c.code AND status IN ('active','approved'))>=30
     THEN RAISE EXCEPTION 'free_tier_student_cap'; END IF;
   SELECT a.id INTO STRICT target FROM public.teacher_create_roster_student(c.code,r.display_name,r.proposed_pin,'🦊') a;
 ELSE
   IF r.match_code IS DISTINCT FROM p_challenge THEN RAISE EXCEPTION 'wrong_challenge'; END IF;
   SELECT id INTO STRICT target FROM public.student_profiles WHERE id=r.student_id AND class_code=c.code
    AND roster_created AND roster_pin IS NOT NULL AND status IN ('approved','active');
 END IF;
 UPDATE public.class_pin_requests SET state='ready',student_id=target,proposed_pin=null WHERE id=r.id;
END $$;

-- The phone acknowledges only after it has the response. A dropped reply can
-- be retried by the same device without issuing a second account or credential.
CREATE FUNCTION public.read_class_pin_request(p_id uuid,p_device uuid,p_ack boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.class_pin_requests; code text; student public.student_profiles;
BEGIN
 SELECT req.* INTO r FROM public.class_pin_requests req JOIN public.class_pin_windows w ON w.id=req.window_id
 JOIN public.classes c ON c.id=w.class_id WHERE req.id=p_id AND req.device_hash=sha256(convert_to(p_device::text,'UTF8'))
 AND c.teacher_uid=w.owner_uid AND c.archived_at IS NULL AND w.ends_at>now() FOR UPDATE OF req;
 IF NOT FOUND THEN RETURN jsonb_build_object('state','expired'); END IF;
 IF p_ack AND r.state='waiting' THEN
   UPDATE public.class_pin_requests SET state='declined',proposed_pin=null WHERE id=r.id;
   RETURN jsonb_build_object('state','declined');
 END IF;
 IF r.state<>'ready' THEN RETURN jsonb_build_object('state',r.state); END IF;
 IF p_ack THEN UPDATE public.class_pin_requests SET state='done' WHERE id=r.id; RETURN jsonb_build_object('state','done'); END IF;
 SELECT c.code INTO code FROM public.classes c JOIN public.class_pin_windows w ON w.class_id=c.id WHERE w.id=r.window_id;
 SELECT p.* INTO student FROM public.student_profiles p WHERE p.id=r.student_id AND p.class_code=code AND p.roster_created
 AND p.roster_pin IS NOT NULL AND p.status IN ('approved','active');
 IF NOT FOUND THEN RETURN jsonb_build_object('state','expired'); END IF;
 RETURN jsonb_build_object('state','ready','id',student.id,'displayName',student.display_name,'email',student.email,'avatar',student.avatar,'pin',student.roster_pin);
END $$;
REVOKE ALL ON FUNCTION public.teacher_open_pin_window(text),public.teacher_pending_pin_requests(uuid),public.teacher_decide_pin_request(uuid,boolean,text),
 public.start_class_pin_request(text,uuid,uuid,text,uuid),public.read_class_pin_request(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_open_pin_window(text),public.teacher_pending_pin_requests(uuid),public.teacher_decide_pin_request(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_class_pin_request(text,uuid,uuid,text,uuid),public.read_class_pin_request(uuid,uuid,boolean) TO anon,authenticated;
COMMIT;
