import { createHash, timingSafeEqual } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  checkoutUrl,
  confirmedCredit,
  confirmedPayment,
  loadOffers,
  merchantApi,
  publicOffer,
  uuid,
} from './sumit';
import { deliverTeacherMail } from './teacherMail';

type Auth = (req: Request, res: Response) => Promise<{ uid: string } | null>;
const positive = (v: unknown) => Number.isSafeInteger(Number(v)) && Number(v) > 0;
const secretMatches = (a: string, b: string | undefined) =>
  !!b &&
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export function registerTeacherBilling(
  app: Express,
  db: SupabaseClient | null,
  authenticate: Auth
) {
  const env = process.env;
  type Task = (uid: string, req: Request, res: Response, db: SupabaseClient) => Promise<void>;
  const teacher = (task: Task) => async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const who = await authenticate(req, res);
    if (!who) return;
    if (!db) {
      res.sendStatus(503);
      return;
    }
    try {
      await task(who.uid, req, res, db);
    } catch {
      res.status(503).json({ error: 'Billing is temporarily unavailable' });
    }
  };
  app.get(
    '/api/teacher/billing',
    teacher(async (uid, _req, res, db) => {
      const [profile, access, preference, active] = await Promise.all([
        db
          .from('users')
          .select('role,plan,trial_ends_at,schools(plan,trial_ends_at)')
          .eq('uid', uid)
          .single(),
        db.rpc('billing_access_until', { p_teacher: uid }),
        db
          .from('teacher_mail_preferences')
          .select('offers,language')
          .eq('teacher_uid', uid)
          .maybeSingle(),
        db
          .from('teacher_billing_orders')
          .select('recurring,paid_at,cancel_requested_at,canceled_at,months')
          .eq('teacher_uid', uid)
          .not('paid_at', 'is', null)
          .order('paid_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (profile.error || access.error || preference.error || active.error)
        throw new Error('Account unavailable');
      const school = Array.isArray(profile.data.schools)
        ? profile.data.schools[0]
        : profile.data.schools;
      const institutional =
        profile.data.role !== 'teacher' ||
        ['school', 'pro'].includes(profile.data.plan) ||
        school?.plan === 'school' ||
        Date.parse(school?.trial_ends_at) > Date.now();
      res.json({
        offers: institutional ? [] : loadOffers(env).map(publicOffer),
        covered: institutional,
        until: access.data,
        trialEndsAt: profile.data.trial_ends_at,
        subscription: active.data,
        emailEnabled: preference.data?.offers ?? false,
        language: preference.data?.language ?? null,
      });
    })
  );
  app.post(
    '/api/teacher/billing/checkout',
    teacher(async (uid, req, res, db) => {
      const offer = loadOffers(env).find((v) => v.code === req.body?.offer);
      if (!offer) {
        res.status(409).json({ error: 'Offer unavailable' });
        return;
      }
      const result = await db.rpc('billing_open_order', {
        p_teacher: uid,
        p_offer: offer.code,
        p_item: offer.itemId,
        p_amount: offer.agorot,
        p_months: offer.months,
        p_recurring: offer.recurring,
        p_end: offer.endsAt,
      });
      if (result.error?.message.includes('Different checkout pending')) {
        res.status(409).json({ error: 'Other checkout pending' });
        return;
      }
      if (result.error?.message.includes('Already covered')) {
        res.status(409).json({ error: 'Already covered' });
        return;
      }
      if (result.error || !uuid.test(result.data)) throw new Error('Order unavailable');
      res.json({ url: checkoutUrl(offer, result.data) });
    })
  );
  app.post(
    '/api/teacher/billing/preferences',
    teacher(async (uid, req, res, db) => {
      const { enabled, language } = req.body ?? {};
      if (typeof enabled !== 'boolean' || !['he', 'ar', 'en'].includes(language)) {
        res.sendStatus(400);
        return;
      }
      const result = await db
        .from('teacher_mail_preferences')
        .upsert({
          teacher_uid: uid,
          language,
          offers: enabled,
          updated_at: new Date().toISOString(),
        });
      if (result.error) throw result.error;
      res.sendStatus(204);
    })
  );
  app.post(
    '/api/teacher/billing/cancel',
    teacher(async (uid, _req, res, db) => {
      const order = await db
        .from('teacher_billing_orders')
        .select('id,customer_id,recurring_id,cancel_requested_at')
        .eq('teacher_uid', uid)
        .eq('recurring', true)
        .not('paid_at', 'is', null)
        .is('canceled_at', null)
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (order.error) throw order.error;
      if (!order.data) {
        res.sendStatus(204);
        return;
      }
      if (!order.data.cancel_requested_at) {
        const saved = await db
          .from('teacher_billing_orders')
          .update({ cancel_requested_at: new Date().toISOString() })
          .eq('id', order.data.id)
          .is('cancel_requested_at', null);
        if (saved.error) throw saved.error;
      }
      try {
        if (await stopRenewal(db, merchantApi(env), order.data)) {
          res.sendStatus(204);
          return;
        }
      } catch {
        /* The stored request is retried by the scheduler. */
      }
      res.status(202).json({ state: 'pending' });
    })
  );

  // The supplied order and payment IDs are only routing hints. Identify the
  // order owner from the DB and read the actual amount and item from SUMIT.
  app.post(
    '/api/teacher/billing/confirm',
    teacher(async (uid, req, res, db) => {
      const { order, payment } = req.body ?? {};
      if (!uuid.test(String(order)) || !positive(payment)) {
        res.sendStatus(400);
        return;
      }
      const found = await db
        .from('teacher_billing_orders')
        .select('id')
        .eq('id', order)
        .eq('teacher_uid', uid)
        .maybeSingle();
      if (found.error) throw found.error;
      if (!found.data) {
        res.sendStatus(404);
        return;
      }
      const api = merchantApi(env);
      const info = await api.get(Number(payment));
      if (info.ExternalIdentifier !== order) {
        res.status(409).json({ state: 'pending' });
        return;
      }
      const applied = await apply(db, api, info);
      res.status(applied ? 200 : 202).json({ state: applied ? 'confirmed' : 'pending' });
    })
  );

  // GET is safe for mail scanners. The confirmation form and the
  // List-Unsubscribe-Post header both use POST to record a real opt-out.
  app.get('/api/teacher/mail/unsubscribe/:token', (req, res) => {
    if (!uuid.test(String(req.params.token))) {
      res.sendStatus(404);
      return;
    }
    res
      .set('Cache-Control', 'no-store')
      .set('Referrer-Policy', 'no-referrer')
      .type('html')
      .send(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Vocaband</title><form method="post"><button>הסרה מהדיוור · إلغاء الاشتراك · Unsubscribe</button></form>'
      );
  });
  app.post('/api/teacher/mail/unsubscribe/:token', async (req, res) => {
    if (!uuid.test(String(req.params.token)) || !db) {
      res.sendStatus(404);
      return;
    }
    const r = await db
      .from('teacher_mail_preferences')
      .update({ offers: false, updated_at: new Date().toISOString() })
      .eq('unsubscribe_id', req.params.token);
    if (r.error) {
      res.sendStatus(503);
      return;
    }
    res
      .set('Cache-Control', 'no-store')
      .type('text')
      .send('הוסרת מרשימת הדיוור · تم إلغاء الاشتراك · Unsubscribed');
  });

  // A stable server-side cursor survives Fly scale-to-zero, restarts and a missed scheduler run.
  app.post('/api/teacher/billing/run', async (req, res) => {
    if (
      !secretMatches(
        req.get('authorization') ?? '',
        env.VOCABAND_LIFECYCLE_TOKEN ? 'Bearer ' + env.VOCABAND_LIFECYCLE_TOKEN : undefined
      )
    ) {
      res.sendStatus(403);
      return;
    }
    if (!db) {
      res.sendStatus(503);
      return;
    }
    const results = await Promise.allSettled([
      env.SUMIT_COMPANY_ID && env.SUMIT_API_KEY
        ? reconcile(db, merchantApi(env))
        : Promise.resolve(),
      env.SUMIT_COMPANY_ID && env.SUMIT_API_KEY
        ? retryCancellations(db, merchantApi(env))
        : Promise.resolve(),
      deliverTeacherMail(db, env),
    ]);
    res.sendStatus(results.some((v) => v.status === 'rejected') ? 503 : 204);
  });
}
type Api = ReturnType<typeof merchantApi>;
type Payment = Awaited<ReturnType<Api['get']>>;
type StandingOrder = { id: string; customer_id: number | null; recurring_id: number | null };
async function stopRenewal(db: SupabaseClient, api: Api, order: StandingOrder) {
  if (!order.customer_id || !order.recurring_id) return false;
  const schedules = await api.schedules(order.customer_id);
  const record = schedules.RecurringItems?.find((s) => s.ID === order.recurring_id);
  if (!record) return false;
  // SUMIT includes inactive schedules. A repeat after a successful remote
  // cancellation can finish the local write without canceling a second time.
  if (![1, 9, 13].includes(record.Status)) await api.cancel(order.customer_id, order.recurring_id);
  const saved = await db
    .from('teacher_billing_orders')
    .update({ canceled_at: new Date().toISOString() })
    .eq('id', order.id);
  if (saved.error) throw saved.error;
  return true;
}
async function retryCancellations(db: SupabaseClient, api: Api) {
  const rows = await db
    .from('teacher_billing_orders')
    .select('id,customer_id,recurring_id')
    .not('cancel_requested_at', 'is', null)
    .is('canceled_at', null)
    .not('recurring_id', 'is', null)
    .order('cancel_requested_at')
    .limit(25);
  if (rows.error) throw rows.error;
  let failed = false;
  for (const order of rows.data) {
    try {
      if (!(await stopRenewal(db, api, order))) failed = true;
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error('Pending cancellation requires review');
}
async function review(db: SupabaseClient, id: number, reason: string) {
  const saved = await db
    .from('teacher_billing_review')
    .upsert({ payment_id: id, reason }, { onConflict: 'payment_id' });
  if (saved.error) throw saved.error;
  return false;
}
async function apply(db: SupabaseClient, api: Api, info: Payment): Promise<boolean> {
  if (!positive(info.ID) || !positive(info.CustomerID)) return false;
  if (info.ValidPayment === false) {
    const changed = await db
      .from('teacher_billing_payments')
      .update({ accepted: false })
      .eq('payment_id', info.ID);
    if (changed.error) throw changed.error;
    return false;
  }
  if (info.ValidPayment !== true) return false;
  const order = uuid.test(info.ExternalIdentifier ?? '') ? info.ExternalIdentifier : null;
  const recurring = info.RecurringCustomerItemIDs?.[0];
  const credit = info.Amount < 0;
  let query = db.from('teacher_billing_orders').select('id,recurring,recurring_id');
  if (order && !credit) query = query.eq('id', order);
  else if (recurring && !credit)
    query = query.eq('recurring_id', recurring).eq('customer_id', info.CustomerID);
  else query = query.eq('customer_id', info.CustomerID);
  const found = await query.limit(1).maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) {
    if (recurring && !order) {
      const existing = await db
        .from('teacher_billing_orders')
        .select('id')
        .eq('customer_id', info.CustomerID)
        .limit(1)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return review(db, info.ID, 'Unbound standing order');
    }
    return false;
  }
  if (!positive(info.DocumentID)) return review(db, info.ID, 'Missing accounting document');
  const document = await api.document(info.DocumentID);
  if (credit) {
    const details = confirmedCredit(info, document);
    if (!details) return review(db, info.ID, 'Credit requires original receipt review');
    const result = await db
      .from('teacher_billing_credits')
      .upsert(details, { onConflict: 'payment_id', ignoreDuplicates: true });
    if (result.error) throw result.error;
    return false;
  }
  if (!recurring && !order) return review(db, info.ID, 'Missing order reference');
  const details = confirmedPayment(info, document);
  if (!details) return review(db, info.ID, 'Unverified payment document');
  const result = await db.rpc('billing_apply_payment', details);
  if (result.error) throw result.error;
  if (result.data !== true)
    return review(db, info.ID, 'Item, amount or standing order requires review');
  if (found.data.recurring && !recurring && !found.data.recurring_id)
    await review(db, info.ID, 'First period paid, link verified SUMIT standing order');
  else {
    const clear = await db.from('teacher_billing_review').delete().eq('payment_id', info.ID);
    if (clear.error) throw clear.error;
  }
  return true;
}
async function reconcile(db: SupabaseClient, api: Api) {
  const cursor = await db
    .from('teacher_billing_sync')
    .select('checked_through')
    .eq('id', true)
    .single();
  if (cursor.error) throw cursor.error;
  const before = cursor.data.checked_through;
  const end = new Date(Math.min(Date.now(), Date.parse(before) + 7 * 86400000)).toISOString();
  const start = new Date(Date.parse(before) - 2 * 86400000).toISOString();
  let offset = 0;
  for (;;) {
    const page = await api.list(start, end, offset);
    if (!Array.isArray(page?.Payments)) throw new Error('Unexpected payment list');
    for (const p of page.Payments) await apply(db, api, p);
    if (!page.HasNextPage) break;
    if (!page.Payments.length) throw new Error('Empty merchant page');
    offset += page.Payments.length;
  }
  const done = await db
    .from('teacher_billing_sync')
    .update({ checked_through: end })
    .eq('id', true)
    .eq('checked_through', before);
  if (done.error) throw done.error;
}
