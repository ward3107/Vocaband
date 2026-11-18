BEGIN;

-- The existing users.plan retains staff-granted and school licenses. Money
-- received through the payment processor grants a separate dated entitlement.
CREATE TABLE public.teacher_billing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  offer text NOT NULL,
  item_id bigint NOT NULL,
  amount_agorot integer NOT NULL CHECK (amount_agorot > 0),
  student_count integer CHECK (student_count > 0),
  months integer NOT NULL CHECK (months IN (1,12)),
  recurring boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  pending_until timestamptz NOT NULL,
  checkout_url text,
  checkout_attempt uuid,
  checkout_lease_until timestamptz,
  customer_id bigint,
  recurring_id bigint,
  paid_at timestamptz,
  cancel_requested_at timestamptz,
  canceled_at timestamptz,
  UNIQUE (recurring_id)
);
CREATE INDEX teacher_orders_by_uid ON public.teacher_billing_orders(teacher_uid,created_at DESC);

CREATE TABLE public.teacher_billing_payments (
  payment_id bigint PRIMARY KEY,
  document_id bigint NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.teacher_billing_orders(id) ON DELETE CASCADE,
  paid_at timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  accepted boolean NOT NULL,
  amount_agorot integer NOT NULL
);
CREATE INDEX teacher_payment_period ON public.teacher_billing_payments(order_id,valid_until) WHERE accepted;
-- Credits can arrive before their original payment in a paginated reconciliation.
CREATE TABLE public.teacher_billing_credits (
  payment_id bigint PRIMARY KEY,
  original_document_id bigint NOT NULL,
  customer_id bigint NOT NULL,
  amount_agorot integer NOT NULL CHECK (amount_agorot > 0)
);
CREATE INDEX teacher_credits_by_original ON public.teacher_billing_credits(original_document_id,customer_id);
CREATE TABLE public.teacher_billing_review (
  payment_id bigint PRIMARY KEY,
  reason text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.teacher_billing_sync (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  checked_through timestamptz NOT NULL DEFAULT now() - interval '1 day'
);
INSERT INTO public.teacher_billing_sync DEFAULT VALUES;
CREATE TABLE public.teacher_mail_preferences (
  teacher_uid text PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  language text NOT NULL CHECK(language IN ('he','ar','en')),
  offers boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  unsubscribe_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()
);
CREATE TABLE public.teacher_mail_consent_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  offers boolean NOT NULL,
  language text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION public.record_teacher_mail_consent() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.offers IS DISTINCT FROM OLD.offers OR NEW.language IS DISTINCT FROM OLD.language THEN
   INSERT INTO public.teacher_mail_consent_history(teacher_uid,offers,language) VALUES(NEW.teacher_uid,NEW.offers,NEW.language);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER teacher_mail_consent AFTER INSERT OR UPDATE ON public.teacher_mail_preferences
 FOR EACH ROW EXECUTE FUNCTION public.record_teacher_mail_consent();
REVOKE ALL ON FUNCTION public.record_teacher_mail_consent() FROM PUBLIC,anon,authenticated;
ALTER TABLE public.teacher_mail_consent_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_mail_consent_history FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.teacher_mail_consent_history TO service_role;

CREATE TABLE public.teacher_mail_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('trial_ending','trial_ended','news')),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  first_attempt_at timestamptz,
  lease_until timestamptz,
  sent_at timestamptz,
  UNIQUE(teacher_uid,kind,source)
);
ALTER TABLE public.teacher_billing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_billing_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_billing_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_billing_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_mail_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_mail_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_billing_orders, public.teacher_billing_payments, public.teacher_billing_sync,
 public.teacher_billing_credits, public.teacher_billing_review, public.teacher_mail_preferences, public.teacher_mail_queue FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.teacher_billing_orders, public.teacher_billing_payments,
 public.teacher_billing_credits,public.teacher_billing_review,public.teacher_billing_sync,public.teacher_mail_preferences,public.teacher_mail_queue TO service_role;

CREATE FUNCTION public.billing_access_until(p_teacher text) RETURNS timestamptz
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT max(p.valid_until) FROM public.teacher_billing_payments p
 JOIN public.teacher_billing_orders o ON o.id=p.order_id WHERE o.teacher_uid=p_teacher AND p.accepted
 AND coalesce((SELECT sum(c.amount_agorot) FROM public.teacher_billing_credits c
   WHERE c.original_document_id=p.document_id AND c.customer_id=o.customer_id),0)<p.amount_agorot
$$;
REVOKE ALL ON FUNCTION public.billing_access_until(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_access_until(text) TO service_role;

-- Extend the existing school, trial and staff entitlement in place so current RLS policies keep its OID.
CREATE OR REPLACE FUNCTION public.is_pro_or_trialing()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text
      AND (
        u.plan IN ('pro', 'school')
        OR (u.role='teacher' AND public.billing_access_until(u.uid)>now())
        OR (u.trial_ends_at IS NOT NULL AND u.trial_ends_at > now())
        OR u.role = 'admin'
        OR LOWER(u.email) IN ('wasya92@gmail.com')
        -- Whole-school license: a member of a paid (or school-trialing)
        -- school inherits Pro. A NULL school_id never matches a schools row.
        OR EXISTS (
          SELECT 1 FROM public.schools s
          WHERE s.id = u.school_id
            AND (
              s.plan = 'school'
              OR (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now())
            )
        )
      )
  );
$$;

CREATE FUNCTION public.billing_my_access_until() RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT public.billing_access_until(auth.uid()::text) $$;
REVOKE ALL ON FUNCTION public.billing_my_access_until() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.billing_my_access_until() TO authenticated;

-- Count approved accounts once across the teacher's active classrooms. A
-- pending enrollment, archived class or class owned by someone else is not billed.
CREATE FUNCTION public.billing_teacher_quote(p_teacher text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
   'students', student_count,
   'monthlyAgorot', student_count*50,
   'annualAgorot', least(student_count*200,6900),
   'monthlyUnitAgorot', 50,
   'annualUnitAgorot', 200,
   'annualCapAgorot', 6900
 )
 FROM (
   SELECT count(DISTINCT coalesce(s.auth_uid,s.id)) AS student_count
   FROM public.classes c
   JOIN public.student_profiles s ON s.class_code=c.code
   WHERE c.teacher_uid=p_teacher AND c.archived_at IS NULL
     AND s.status IN ('approved','active')
 ) AS roster
$$;
REVOKE ALL ON FUNCTION public.billing_teacher_quote(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_teacher_quote(text) TO service_role;

-- Only one live checkout link per teacher. A short lease lets the server retry
-- provider outages without handing the browser two payable links.
CREATE FUNCTION public.billing_open_order(p_teacher text,p_offer text,p_item bigint,p_students integer,p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  quote jsonb;
  expected integer;
  trial_end timestamptz;
  existing public.teacher_billing_orders;
  attempt uuid := gen_random_uuid();
BEGIN
 SELECT trial_ends_at INTO trial_end FROM public.users WHERE uid=p_teacher AND role='teacher' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Teacher required'; END IF;
 IF trial_end>now() THEN RAISE EXCEPTION 'Trial is active'; END IF;
 IF EXISTS(SELECT FROM public.users u LEFT JOIN public.schools s ON s.id=u.school_id WHERE u.uid=p_teacher
  AND (u.plan IN ('pro','school') OR s.plan='school' OR s.trial_ends_at>now()))
  OR public.billing_access_until(p_teacher)>now() OR EXISTS(SELECT FROM public.teacher_billing_orders
  WHERE teacher_uid=p_teacher AND recurring AND paid_at IS NOT NULL AND canceled_at IS NULL)
 THEN RAISE EXCEPTION 'Already covered'; END IF;
 IF p_offer IS NULL OR p_offer NOT IN ('monthly','annual') OR p_item IS NULL OR p_item<=0
   THEN RAISE EXCEPTION 'Offer unavailable'; END IF;
 quote:=public.billing_teacher_quote(p_teacher);
 expected:=(quote->>CASE WHEN p_offer='annual' THEN 'annualAgorot' ELSE 'monthlyAgorot' END)::integer;
 IF expected<=0 OR p_students IS DISTINCT FROM (quote->>'students')::integer OR p_amount IS DISTINCT FROM expected
   THEN RAISE EXCEPTION 'Student count changed'; END IF;
 SELECT * INTO existing FROM public.teacher_billing_orders WHERE teacher_uid=p_teacher
   AND paid_at IS NULL AND pending_until>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
   IF existing.offer<>p_offer OR existing.item_id<>p_item OR existing.amount_agorot<>p_amount
     OR existing.student_count IS DISTINCT FROM p_students OR existing.recurring
   THEN RAISE EXCEPTION 'Different checkout pending'; END IF;
   IF existing.checkout_url IS NOT NULL THEN RETURN jsonb_build_object('url',existing.checkout_url); END IF;
   IF existing.checkout_lease_until>now() THEN RAISE EXCEPTION 'Checkout being prepared'; END IF;
   UPDATE public.teacher_billing_orders
   SET checkout_attempt=attempt,checkout_lease_until=now()+interval '45 seconds'
   WHERE id=existing.id;
 ELSE
   INSERT INTO public.teacher_billing_orders(teacher_uid,offer,item_id,amount_agorot,student_count,months,recurring,
     pending_until,checkout_attempt,checkout_lease_until)
   VALUES(p_teacher,p_offer,p_item,expected,p_students,CASE WHEN p_offer='annual' THEN 12 ELSE 1 END,false,
     now()+interval '1 minute',attempt,now()+interval '45 seconds')
   RETURNING * INTO existing;
 END IF;
 RETURN jsonb_build_object('id',existing.id,'attempt',attempt);
END $$;

CREATE FUNCTION public.billing_store_checkout(p_id uuid,p_attempt uuid,p_url text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.teacher_billing_orders
 SET checkout_url=p_url,
     pending_until=CASE WHEN p_url IS NULL THEN now() ELSE now()+interval '65 minutes' END,
     checkout_attempt=null,checkout_lease_until=null
 WHERE id=p_id AND checkout_attempt=p_attempt AND checkout_lease_until>now()
   AND checkout_url IS NULL AND paid_at IS NULL;
 RETURN FOUND;
END $$;

-- Called only after checking the merchant's payment and accounting document
-- using the secret API key. The browser return is never proof of payment.
CREATE FUNCTION public.billing_apply_payment(p_payment bigint,p_document bigint,p_order uuid,p_customer bigint,p_recurring bigint,
 p_item bigint,p_amount integer,p_at timestamptz,p_accepted boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.teacher_billing_orders; existing public.teacher_billing_payments;
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
   (p_order IS NULL AND p_recurring IS NOT NULL AND recurring_id=p_recurring AND customer_id=p_customer)
   FOR UPDATE;
 IF NOT FOUND OR o.item_id<>p_item OR o.amount_agorot<>p_amount OR p_customer IS NULL
   OR NOT p_accepted OR p_at IS NULL OR p_at>now()+interval '10 minutes'
   OR p_at<o.created_at-interval '10 minutes'
   OR (o.student_count IS NOT NULL AND (o.checkout_url IS NULL OR p_at>o.pending_until))
   OR (o.customer_id IS NOT NULL AND o.customer_id<>p_customer)
   OR (o.recurring_id IS NOT NULL AND p_recurring IS NOT NULL AND o.recurring_id<>p_recurring)
   OR (o.paid_at IS NOT NULL AND o.recurring AND p_recurring IS NULL)
   OR p_document IS NULL OR p_document<=0
   OR (NOT o.recurring AND (p_recurring IS NOT NULL OR o.paid_at IS NOT NULL))
 THEN RETURN false; END IF;
 UPDATE public.teacher_billing_orders SET customer_id=p_customer,recurring_id=coalesce(recurring_id,p_recurring),
   paid_at=coalesce(paid_at,p_at) WHERE id=o.id;
 INSERT INTO public.teacher_billing_payments(payment_id,document_id,order_id,paid_at,valid_until,accepted,amount_agorot) VALUES(p_payment,p_document,o.id,p_at,p_at+make_interval(months=>o.months),true,p_amount)
 ON CONFLICT(payment_id) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.billing_open_order(text,text,bigint,integer,integer),public.billing_store_checkout(uuid,uuid,text),
 public.billing_apply_payment(bigint,bigint,uuid,bigint,bigint,bigint,integer,timestamptz,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_open_order(text,text,bigint,integer,integer),public.billing_store_checkout(uuid,uuid,text),
 public.billing_apply_payment(bigint,bigint,uuid,bigint,bigint,bigint,integer,timestamptz,boolean) TO service_role;

CREATE FUNCTION public.claim_teacher_lifecycle_mail() RETURNS TABLE(
 id uuid,kind text,email text,language text,unsubscribe_id uuid,title text,message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.teacher_mail_queue(teacher_uid,kind,source,expires_at)
 SELECT u.uid,CASE WHEN u.trial_ends_at>now() THEN 'trial_ending' ELSE 'trial_ended' END,
 u.trial_ends_at::text,CASE WHEN u.trial_ends_at>now() THEN u.trial_ends_at ELSE u.trial_ends_at+interval '2 days' END
 FROM public.users u JOIN public.teacher_mail_preferences pref ON pref.teacher_uid=u.uid
 LEFT JOIN public.schools s ON s.id=u.school_id WHERE u.role='teacher' AND u.plan='free' AND pref.offers
 AND u.trial_ends_at BETWEEN now()-interval '2 days' AND now()+interval '3 days'
 AND coalesce(s.plan,'free')<>'school' AND coalesce(s.trial_ends_at,'-infinity')<now()
 AND coalesce(public.billing_access_until(u.uid),'-infinity')<=now() ON CONFLICT DO NOTHING;
 INSERT INTO public.teacher_mail_queue(teacher_uid,kind,source,expires_at)
 SELECT p.teacher_uid,'news',a.id::text,least(a.starts_at+interval '2 days',coalesce(a.ends_at,'infinity'))
 FROM public.teacher_mail_preferences p JOIN public.users u ON u.uid=p.teacher_uid
 CROSS JOIN public.announcements a WHERE p.offers AND u.role='teacher' AND a.audience='teachers'
 AND a.starts_at BETWEEN greatest(p.updated_at,now()-interval '2 days') AND now()
 AND coalesce(a.ends_at,'infinity')>now() ON CONFLICT DO NOTHING;
 RETURN QUERY
 WITH due AS (
   SELECT q.id FROM public.teacher_mail_queue q JOIN public.teacher_mail_preferences p ON p.teacher_uid=q.teacher_uid
   JOIN public.users u ON u.uid=q.teacher_uid JOIN auth.users a ON a.id::text=u.uid
   LEFT JOIN public.schools s ON s.id=u.school_id
   WHERE q.sent_at IS NULL AND q.expires_at>now() AND coalesce(q.lease_until,'-infinity')<=now()
   AND (q.first_attempt_at IS NULL OR q.first_attempt_at>now()-interval '23 hours')
   AND p.offers AND u.role='teacher' AND a.email_confirmed_at IS NOT NULL AND a.email IS NOT NULL
   AND (q.kind='news' OR (u.plan='free' AND u.trial_ends_at::text=q.source AND coalesce(s.plan,'free')<>'school'
     AND coalesce(s.trial_ends_at,'-infinity')<=now() AND coalesce(public.billing_access_until(u.uid),'-infinity')<=now()))
   ORDER BY q.created_at,q.id LIMIT 30 FOR UPDATE OF q SKIP LOCKED
 ), claimed AS (
   UPDATE public.teacher_mail_queue q SET first_attempt_at=coalesce(q.first_attempt_at,now()),lease_until=now()+interval '20 minutes' FROM due WHERE q.id=due.id RETURNING q.*
 )
 SELECT q.id,q.kind,a.email::text,p.language,p.unsubscribe_id,ann.title,ann.message
 FROM claimed q JOIN public.teacher_mail_preferences p ON p.teacher_uid=q.teacher_uid
 JOIN auth.users a ON a.id::text=q.teacher_uid LEFT JOIN public.announcements ann ON q.kind='news' AND ann.id::text=q.source
 WHERE q.kind<>'news' OR (ann.audience='teachers' AND ann.starts_at<=now() AND coalesce(ann.ends_at,'infinity')>now());
END $$;
REVOKE ALL ON FUNCTION public.claim_teacher_lifecycle_mail() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_teacher_lifecycle_mail() TO service_role;
COMMIT;
