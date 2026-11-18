BEGIN;

-- Existing orders can still be reconciled. New orders snapshot their plan,
-- seats and full-term price so catalog changes cannot alter a paid term.
ALTER TABLE public.teacher_billing_orders
 ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
 ADD COLUMN seat_limit integer,
 ADD COLUMN full_term_agorot integer,
 ADD COLUMN prerequisite_orders uuid[] NOT NULL DEFAULT '{}',
 ADD COLUMN coverage_from timestamptz,
 ADD COLUMN coverage_until timestamptz,
 DROP CONSTRAINT teacher_billing_orders_student_count_check,
 ADD CHECK (student_count >= 0);
CREATE INDEX teacher_billing_by_school ON public.teacher_billing_orders(school_id,created_at DESC)
 WHERE school_id IS NOT NULL;

CREATE FUNCTION public.billing_plan_catalog()
RETURNS TABLE(code text,tier text,months integer,capacity integer,staff integer,price integer)
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 VALUES ('teacher_monthly','teacher',1,60,NULL::integer,1200),
        ('teacher_annual','teacher',12,60,NULL,9900),
        ('pro_monthly','pro',1,150,NULL,1900),
        ('pro_annual','pro',12,150,NULL,16900),
        ('school_pilot','school',1,400,2,59000),
        ('school_annual','school',12,400,6,249000)
$$;

CREATE VIEW public.billing_valid_terms AS
 SELECT o.*,p.paid_at AS term_paid_at,p.valid_until
 FROM public.teacher_billing_orders o
 JOIN public.teacher_billing_payments p ON p.order_id=o.id AND p.accepted
 WHERE coalesce((
   SELECT sum(c.amount_agorot) FROM public.teacher_billing_credits c
   WHERE c.original_document_id=p.document_id AND c.customer_id=o.customer_id
 ),0)<p.amount_agorot
 AND NOT EXISTS (
   SELECT FROM unnest(o.prerequisite_orders) required(id)
   WHERE NOT EXISTS (
     SELECT FROM public.teacher_billing_payments paid
     JOIN public.teacher_billing_orders parent ON parent.id=paid.order_id
     WHERE paid.order_id=required.id AND paid.accepted
       AND coalesce((
         SELECT sum(c.amount_agorot) FROM public.teacher_billing_credits c
         WHERE c.original_document_id=paid.document_id AND c.customer_id=parent.customer_id
       ),0)<paid.amount_agorot
   )
 );
REVOKE ALL ON public.billing_valid_terms FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.billing_valid_terms TO service_role;

CREATE FUNCTION public.billing_school_seats(p_school uuid) RETURNS integer
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce((SELECT CASE WHEN t.offer='school_pilot' THEN 2 ELSE 6 END
 FROM public.billing_valid_terms t
 WHERE t.school_id=p_school AND t.valid_until>now()
 ORDER BY t.months DESC,t.valid_until DESC LIMIT 1),0)
$$;

CREATE OR REPLACE FUNCTION public.billing_access_until(p_teacher text) RETURNS timestamptz
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT max(t.valid_until)
 FROM public.users u JOIN public.billing_valid_terms t
   ON (t.school_id IS NULL AND t.teacher_uid=u.uid) OR t.school_id=u.school_id
 WHERE u.uid=p_teacher AND u.role IN ('teacher','manager')
$$;

CREATE FUNCTION public.billing_entitlement(p_uid text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE
 WHEN u.role='admin' THEN jsonb_build_object('tier','pro')
 WHEN u.role NOT IN ('teacher','manager') THEN jsonb_build_object('tier','free')
 WHEN s.plan='school' THEN jsonb_build_object('tier','school')
 WHEN inst.valid_until IS NOT NULL
   THEN jsonb_build_object('tier','school','until',inst.valid_until,'capacity',inst.seat_limit)
 WHEN s.trial_ends_at>now() THEN jsonb_build_object('tier','school','until',s.trial_ends_at)
 WHEN u.role='manager' THEN jsonb_build_object('tier','free')
 WHEN u.plan='school' THEN jsonb_build_object('tier','school')
 WHEN u.plan='pro' OR lower(u.email)='wasya92@gmail.com' THEN jsonb_build_object('tier','pro')
 WHEN personal.valid_until IS NOT NULL
   THEN jsonb_build_object('tier',CASE WHEN personal.offer LIKE 'teacher_%' THEN 'teacher' ELSE 'pro' END,
     'until',personal.valid_until,'capacity',personal.seat_limit,'months',personal.months)
 WHEN u.trial_ends_at>now() THEN jsonb_build_object('tier','trial','until',u.trial_ends_at)
 ELSE jsonb_build_object('tier','free','capacity',30)
 END
 FROM public.users u LEFT JOIN public.schools s ON s.id=u.school_id
 LEFT JOIN LATERAL (
   SELECT t.valid_until,t.seat_limit FROM public.billing_valid_terms t
   WHERE t.school_id=u.school_id AND t.valid_until>now()
   ORDER BY t.months DESC,t.valid_until DESC LIMIT 1
 ) inst ON true
 LEFT JOIN LATERAL (
   SELECT t.offer,t.valid_until,t.seat_limit,t.months FROM public.billing_valid_terms t
   WHERE t.teacher_uid=u.uid AND t.school_id IS NULL AND t.valid_until>now()
   ORDER BY t.full_term_agorot DESC NULLS LAST,t.valid_until DESC,t.term_paid_at DESC LIMIT 1
 ) personal ON true
 WHERE u.uid=p_uid
$$;

CREATE FUNCTION public.billing_my_plan() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.billing_entitlement(auth.uid()::text)
$$;
CREATE OR REPLACE FUNCTION public.is_pro_or_trialing() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(public.billing_entitlement(auth.uid()::text)->>'tier' <> 'free',false)
$$;

-- The same roster definition is used for quotes and for admission.
CREATE FUNCTION public.billing_roster_size(p_teacher text,p_school uuid,p_class text DEFAULT NULL)
RETURNS integer LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT count(DISTINCT coalesce(sp.auth_uid,sp.id))::integer
 FROM public.classes c
 JOIN public.student_profiles sp ON sp.class_code=c.code
 JOIN public.users u ON u.uid=c.teacher_uid
 WHERE c.archived_at IS NULL AND sp.status IN ('approved','active')
   AND (p_class IS NULL OR c.code=p_class)
   AND ((p_school IS NOT NULL AND u.school_id=p_school) OR c.teacher_uid=p_teacher)
$$;

CREATE FUNCTION public.billing_plan_quotes(p_uid text,p_extra integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE
 u public.users;
 s public.schools;
 term public.billing_valid_terms;
 plan record;
 roster integer;
 staff_count integer;
 blocks integer;
 full_price integer;
 capacity integer;
 due integer;
 credit integer := 0;
 pilot_used boolean := false;
 covered boolean := false;
 upgrading boolean;
 remaining numeric;
 offers jsonb := '[]'::jsonb;
BEGIN
 SELECT * INTO u FROM public.users WHERE uid=p_uid AND role IN ('teacher','manager','admin');
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.schools WHERE id=u.school_id;
 IF u.role='manager' THEN
   IF s.id IS NULL THEN RETURN NULL; END IF;
   roster:=public.billing_roster_size(NULL,s.id);
   SELECT count(*)::integer INTO staff_count FROM public.users WHERE school_id=s.id AND role='teacher';
   SELECT * INTO term FROM public.billing_valid_terms WHERE school_id=s.id AND valid_until>now()
     ORDER BY months DESC,valid_until DESC LIMIT 1;
   SELECT EXISTS(SELECT FROM public.billing_valid_terms WHERE school_id=s.id AND offer='school_pilot')
   INTO pilot_used;
   IF pilot_used AND NOT EXISTS(
     SELECT FROM public.billing_valid_terms WHERE school_id=s.id AND offer='school_annual'
   ) THEN credit:=59000; END IF;
   covered:=s.plan='school' OR coalesce(term.offer='school_annual',false);
 ELSE
   roster:=public.billing_roster_size(u.uid,NULL);
   SELECT * INTO term FROM public.billing_valid_terms WHERE teacher_uid=u.uid AND school_id IS NULL AND valid_until>now()
     ORDER BY full_term_agorot DESC NULLS LAST,valid_until DESC,term_paid_at DESC LIMIT 1;
   covered:=u.role='admin' OR u.plan IN ('pro','school') OR lower(coalesce(u.email,''))='wasya92@gmail.com'
     OR coalesce(s.plan='school' OR s.trial_ends_at>now(),false)
     OR public.billing_school_seats(s.id)>0
     OR (term.id IS NOT NULL AND term.full_term_agorot IS NULL)
     OR EXISTS(SELECT FROM public.teacher_billing_orders
       WHERE teacher_uid=u.uid AND recurring AND paid_at IS NOT NULL AND canceled_at IS NULL);
 END IF;

 blocks:=greatest(0,p_extra,ceil((greatest(roster,coalesce(term.seat_limit,0))-150)/50.0)::integer);
 remaining:=CASE WHEN term.valid_until>now() THEN least(1,
   ceil(extract(epoch FROM (term.valid_until-now()))/86400) /
   greatest(1,ceil(extract(epoch FROM (term.valid_until-coalesce(term.coverage_from,term.term_paid_at)))/86400))
 ) ELSE 1 END;

 FOR plan IN SELECT * FROM public.billing_plan_catalog() LOOP
   IF (u.role='manager') IS DISTINCT FROM (plan.tier='school') THEN CONTINUE; END IF;
   capacity:=plan.capacity;
   full_price:=plan.price;
   IF plan.tier='pro' THEN
     capacity:=capacity+blocks*50;
     full_price:=full_price+blocks*CASE WHEN plan.months=12 THEN 4900 ELSE 600 END;
   END IF;
   upgrading:=u.role<>'manager' AND term.id IS NOT NULL;
   due:=CASE WHEN plan.code='school_annual' THEN full_price-credit
        WHEN upgrading THEN ceil(greatest(0,full_price-coalesce(term.full_term_agorot,full_price))*remaining)::integer
        ELSE full_price END;
   offers:=offers || jsonb_build_array(jsonb_build_object(
     'code',plan.code,'tier',plan.tier,'months',plan.months,'seatLimit',capacity,
     'staffLimit',plan.staff,'amount',due,'fullAmount',full_price,'upgrade',upgrading,
     'credit',CASE WHEN plan.code='school_annual' THEN credit ELSE 0 END,
     'available', NOT covered AND due>0 AND capacity>=roster
       AND (plan.staff IS NULL OR plan.staff>=staff_count)
       AND (plan.code<>'school_pilot' OR NOT pilot_used)
       AND (NOT upgrading OR (plan.months=term.months AND capacity>term.seat_limit
         AND term.valid_until>now()+interval '65 minutes'))
       AND (u.role='manager' OR u.trial_ends_at IS NULL OR u.trial_ends_at<=now())
   ));
 END LOOP;
 RETURN jsonb_build_object('students',roster,'staff',staff_count,'blocks',blocks,
   'schoolId',CASE WHEN u.role='manager' THEN s.id END,
   'schoolName',CASE WHEN u.role='manager' THEN s.name END,'covered',covered,
   'until',term.valid_until,'capacity',term.seat_limit,'offers',offers,
   'trialEndsAt',CASE WHEN u.role='teacher' THEN u.trial_ends_at END,
   'entitlement',public.billing_entitlement(p_uid));
END $$;

-- Lock on the buyer's scope so different managers cannot reserve two school
-- checkouts or spend the same pilot credit. Order and receipt share that lock.
CREATE FUNCTION public.billing_scope_lock(p_uid text,p_school uuid) RETURNS void
LANGUAGE sql SET search_path='' AS $$
 SELECT pg_advisory_xact_lock(hashtextextended(
   CASE WHEN p_school IS NULL THEN 'billing/teacher/'||p_uid ELSE 'billing/school/'||p_school END,0))
$$;

DROP FUNCTION public.billing_open_order(text,text,bigint,integer,integer);
DROP FUNCTION public.billing_teacher_quote(text);
CREATE FUNCTION public.billing_open_order(p_uid text,p_offer text,p_item bigint,p_students integer,p_amount integer,p_extra integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 quote jsonb;
 offer jsonb;
 buyer public.users;
 school uuid;
 existing public.teacher_billing_orders;
 term public.billing_valid_terms;
 prerequisites uuid[] := '{}';
 attempt uuid := gen_random_uuid();
BEGIN
 SELECT * INTO buyer FROM public.users WHERE uid=p_uid AND role IN ('teacher','manager') FOR SHARE;
 IF NOT FOUND OR p_item<=0 OR p_extra NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Offer unavailable'; END IF;
 school:=CASE WHEN buyer.role='manager' THEN buyer.school_id END;
 PERFORM public.billing_scope_lock(p_uid,school);
 quote:=public.billing_plan_quotes(p_uid,p_extra);
 SELECT pkg INTO offer FROM jsonb_array_elements(quote->'offers') AS pkg WHERE pkg->>'code'=p_offer;
 IF offer IS NULL OR (offer->>'available')::boolean IS DISTINCT FROM true
   THEN RAISE EXCEPTION 'Offer unavailable'; END IF;
 IF p_students IS DISTINCT FROM (quote->>'students')::integer OR p_amount IS DISTINCT FROM (offer->>'amount')::integer
   THEN RAISE EXCEPTION 'Quote changed'; END IF;

 SELECT * INTO existing FROM public.teacher_billing_orders
 WHERE ((school IS NULL AND school_id IS NULL AND teacher_uid=p_uid) OR school_id=school)
   AND paid_at IS NULL AND pending_until>now()
 ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
   IF existing.teacher_uid<>p_uid OR existing.offer<>p_offer OR existing.item_id<>p_item
     OR existing.amount_agorot<>p_amount OR existing.student_count IS DISTINCT FROM p_students
     OR existing.seat_limit IS DISTINCT FROM (offer->>'seatLimit')::integer
   THEN RAISE EXCEPTION 'Different checkout pending'; END IF;
   IF existing.checkout_url IS NOT NULL THEN RETURN jsonb_build_object('url',existing.checkout_url); END IF;
   IF existing.checkout_lease_until>now() THEN RAISE EXCEPTION 'Checkout being prepared'; END IF;
   UPDATE public.teacher_billing_orders
   SET checkout_attempt=attempt,checkout_lease_until=now()+interval '45 seconds',
       pending_until=now()+interval '1 minute'
   WHERE id=existing.id;
 ELSE
   IF (offer->>'upgrade')::boolean THEN
     SELECT * INTO STRICT term FROM public.billing_valid_terms WHERE teacher_uid=p_uid AND school_id IS NULL AND valid_until>now()
     ORDER BY full_term_agorot DESC NULLS LAST,valid_until DESC,term_paid_at DESC LIMIT 1;
     prerequisites:=term.prerequisite_orders||term.id;
   ELSIF (offer->>'credit')::integer>0 THEN
     SELECT ARRAY[t.id] INTO STRICT prerequisites FROM public.billing_valid_terms t WHERE t.school_id=school AND t.offer='school_pilot'
       ORDER BY term_paid_at DESC LIMIT 1;
   END IF;
   INSERT INTO public.teacher_billing_orders(teacher_uid,school_id,offer,item_id,amount_agorot,student_count,
     seat_limit,full_term_agorot,prerequisite_orders,months,recurring,coverage_from,coverage_until,
     pending_until,checkout_attempt,checkout_lease_until)
   VALUES(p_uid,school,p_offer,p_item,p_amount,p_students,(offer->>'seatLimit')::integer,(offer->>'fullAmount')::integer,prerequisites,
     (offer->>'months')::integer,false,coalesce(term.coverage_from,term.term_paid_at),term.valid_until,
     now()+interval '1 minute',attempt,now()+interval '45 seconds')
   RETURNING * INTO existing;
 END IF;
 RETURN jsonb_build_object('id',existing.id,'attempt',attempt,'schoolId',school,'schoolName',quote->>'schoolName');
END $$;

CREATE OR REPLACE FUNCTION public.billing_apply_payment(p_payment bigint,p_document bigint,p_order uuid,p_customer bigint,p_recurring bigint,
 p_item bigint,p_amount integer,p_at timestamptz,p_accepted boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.teacher_billing_orders; existing public.teacher_billing_payments; until_at timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(p_payment);
 SELECT * INTO existing FROM public.teacher_billing_payments WHERE payment_id=p_payment;
 IF FOUND THEN
   IF existing.document_id<>p_document OR (p_order IS NOT NULL AND existing.order_id<>p_order) THEN RETURN false; END IF;
   IF NOT p_accepted THEN UPDATE public.teacher_billing_payments SET accepted=false WHERE payment_id=p_payment; END IF;
   RETURN existing.accepted AND p_accepted;
 END IF;
 SELECT * INTO o FROM public.teacher_billing_orders WHERE
   (p_order IS NOT NULL AND id=p_order) OR
   (p_order IS NULL AND p_recurring IS NOT NULL AND recurring_id=p_recurring AND customer_id=p_customer);
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM public.billing_scope_lock(o.teacher_uid,o.school_id);
 SELECT * INTO o FROM public.teacher_billing_orders WHERE id=o.id FOR UPDATE;
 IF NOT FOUND OR o.item_id<>p_item OR o.amount_agorot<>p_amount OR p_customer IS NULL
   OR NOT p_accepted OR p_at IS NULL OR p_at>now()+interval '10 minutes'
   OR p_at<o.created_at-interval '10 minutes'
   OR (o.student_count IS NOT NULL AND (o.checkout_url IS NULL OR p_at>o.pending_until))
   OR (o.customer_id IS NOT NULL AND o.customer_id<>p_customer)
   OR (o.recurring_id IS NOT NULL AND p_recurring IS NOT NULL AND o.recurring_id<>p_recurring)
   OR (o.paid_at IS NOT NULL AND o.recurring AND p_recurring IS NULL)
   OR p_document IS NULL OR p_document<=0
   OR (NOT o.recurring AND (p_recurring IS NOT NULL OR o.paid_at IS NOT NULL))
   OR (o.offer IN ('school_pilot','school_annual') AND o.school_id IS NULL)
 THEN RETURN false; END IF;
 until_at:=coalesce(o.coverage_until,p_at+CASE WHEN o.offer='school_pilot' THEN interval '42 days' ELSE make_interval(months=>o.months) END);
 IF until_at<=p_at THEN RETURN false; END IF;
 UPDATE public.teacher_billing_orders SET customer_id=p_customer,recurring_id=coalesce(recurring_id,p_recurring),
   paid_at=coalesce(paid_at,p_at) WHERE id=o.id;
 INSERT INTO public.teacher_billing_payments(payment_id,document_id,order_id,paid_at,valid_until,accepted,amount_agorot)
 VALUES(p_payment,p_document,o.id,p_at,until_at,true,p_amount);
 RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.billing_plan_catalog(),public.billing_school_seats(uuid),public.billing_entitlement(text),
 public.billing_roster_size(text,uuid,text),public.billing_plan_quotes(text,integer),public.billing_scope_lock(text,uuid),
 public.billing_open_order(text,text,bigint,integer,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_plan_catalog(),public.billing_entitlement(text),
 public.billing_plan_quotes(text,integer),public.billing_open_order(text,text,bigint,integer,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION public.billing_my_plan() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.billing_my_plan() TO authenticated;

COMMIT;
