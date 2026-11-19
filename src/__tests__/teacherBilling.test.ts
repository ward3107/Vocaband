import { describe, expect, it, vi } from 'vitest';
import type { Express, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerTeacherBilling } from '../../server/billing/routes';
import { deliverTeacherMail } from '../../server/billing/teacherMail';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  checkoutCatalog,
  confirmedCredit,
  confirmedPayment,
  merchantApi,
} from '../../server/billing/sumit';
import { getEffectivePlan } from '../core/plan';
import type { AppUser } from '../core/supabase';

const uid = '11111111-1111-4111-8111-111111111111';
const merchant = {
  SUMIT_COMPANY_ID: '1',
  SUMIT_API_KEY: 'sandbox',
  SUMIT_MONTHLY_ITEM_ID: '344',
  SUMIT_ANNUAL_ITEM_ID: '345',
  VOCABAND_CHECKOUT_ENABLED: 'true',
  VOCABAND_BILLING_ORIGIN: 'https://staging.example.test',
};
const payment = {
  ID: 123,
  CustomerID: 234,
  DocumentID: 456,
  Amount: 290,
  Currency: 0,
  Date: '2026-11-18T12:00:00Z',
  ValidPayment: true,
  ExternalIdentifier: uid,
  RecurringCustomerItemIDs: [888],
};
const doc = {
  DocumentID: 456,
  Document: { IsDraft: false, Type: 1 },
  Items: [{ Item: { ID: 345 }, Quantity: 1 }],
};

describe('teacher billing', () => {
  it('requires checkout configuration and creates a one-time SUMIT link for the exact verified total', async () => {
    expect(checkoutCatalog({})).toBeNull();
    expect(checkoutCatalog({ ...merchant, VOCABAND_CHECKOUT_ENABLED: 'false' })).toBeNull();
    expect(checkoutCatalog({ ...merchant, SUMIT_MONTHLY_ITEM_ID: '345' })).toBeNull();
    expect(checkoutCatalog(merchant)).toEqual({ monthly: 344, annual: 345 });
    let host = 'https://pay.sumit.co.il';
    const transport = vi.fn(
      async (_url: string | Request | URL, _options?: RequestInit) =>
        new Response(JSON.stringify({ Status: 0, Data: { RedirectURL: host + '/checkout' } }))
    );
    const api = merchantApi(merchant, transport);
    const order = {
      id: uid,
      teacher: 'teacher-1',
      name: 'Test Teacher',
      email: 'teacher@example.test',
      term: 'annual' as const,
      item: 345,
      students: 60,
      amount: 6900,
    };
    await expect(api.beginCheckout(order)).resolves.toBe('https://pay.sumit.co.il/checkout');
    const [url, payload] = transport.mock.calls[0];
    expect(url).toBe('https://api.sumit.co.il/billing/payments/beginredirect/');
    expect(JSON.parse(String(payload?.body))).toMatchObject({
      Items: [{ Item: { ID: 345 }, Quantity: 1, UnitPrice: 69, Currency: 0 }],
      VATIncluded: true,
      ExternalIdentifier: uid,
      ExpirationHours: 1,
      PreventSavingPaymentMethod: true,
      RedirectURL: 'https://staging.example.test/?billing=1',
    });
    host = 'https://pay.sumit.co.il.example.test';
    await expect(api.beginCheckout(order)).rejects.toThrow('Invalid merchant payment page');
  });
  it('reads payment data from the merchant and requires a real invoice item and ILS', async () => {
    const transport = vi.fn(
      async () => new Response(JSON.stringify({ Status: 0, Data: { Payment: payment } }))
    );
    const api = merchantApi({ SUMIT_COMPANY_ID: '12', SUMIT_API_KEY: 'sandbox' }, transport);
    await expect(api.get(123)).resolves.toMatchObject({ Amount: 290 });
    await expect(api.get(124)).rejects.toThrow();
    expect(confirmedPayment(payment, doc)).toMatchObject({
      p_amount: 29000,
      p_item: 345,
      p_recurring: 888,
    });
    expect(confirmedPayment({ ...payment, Currency: 1 }, doc)).toBeNull();
    expect(confirmedPayment(payment, { ...doc, Document: { IsDraft: true } })).toBeNull();
    expect(confirmedPayment(payment, { Items: doc.Items })).toBeNull();
    expect(confirmedPayment(payment, { ...doc, DocumentID: 987 })).toBeNull();
    expect(confirmedPayment(payment, { ...doc, Document: { IsDraft: false, Type: 8 } })).toBeNull();
    expect(
      confirmedCredit(
        { ...payment, Amount: -29 },
        { DocumentID: 456, Document: { IsDraft: false, Type: 7, OriginalDocumentID: 654 } }
      )
    ).toMatchObject({ amount_agorot: 2900, original_document_id: 654 });
    expect(confirmedCredit({ ...payment, Amount: -29 }, doc)).toBeNull();
  });
  it('requires an owned order and independently verifies the returned payment before granting Pro', async () => {
    const handlers = new Map<
      string,
      (req: ExpressRequest, res: ExpressResponse) => Promise<void>
    >();
    const app = {
      get: vi.fn(),
      post: (path: string, handler: (req: ExpressRequest, res: ExpressResponse) => Promise<void>) =>
        handlers.set(path, handler),
    };
    let owner = uid;
    const db = {
      from: () => {
        const filters = new Map<string, unknown>();
        const query = {
          select: () => query,
          delete: () => query,
          eq: (k: string, v: unknown) => {
            filters.set(k, v);
            return query;
          },
          limit: () => query,
          maybeSingle: async () => ({
            data:
              filters.has('teacher_uid') && filters.get('teacher_uid') !== owner
                ? null
                : { id: uid, recurring: true, recurring_id: 888 },
          }),
        };
        return query;
      },
      rpc: vi.fn(async () => ({ data: true })),
    };
    const fetcher = vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify({
            Status: 0,
            Data: url.endsWith('/billing/payments/get/') ? { Payment: payment } : doc,
          })
        )
    );
    vi.stubGlobal('fetch', fetcher);
    vi.stubEnv('SUMIT_API_KEY', 'sandbox');
    vi.stubEnv('SUMIT_COMPANY_ID', '123');
    try {
      registerTeacherBilling(
        app as unknown as Express,
        db as unknown as SupabaseClient,
        async () => ({ uid })
      );
      const response = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
        sendStatus: vi.fn(),
      };
      const confirm = handlers.get('/api/teacher/billing/confirm')!;
      const request = {
        body: { order: uid, payment: 123, amount: 1, months: 1200 },
      } as ExpressRequest;
      owner = 'another-account';
      await confirm(request, response as unknown as ExpressResponse);
      expect(response.sendStatus).toHaveBeenCalledWith(404);
      expect(fetcher).not.toHaveBeenCalled();
      owner = uid;
      await confirm(request, response as unknown as ExpressResponse);
      expect(db.rpc).toHaveBeenCalledWith(
        'billing_apply_payment',
        expect.objectContaining({ p_payment: 123, p_document: 456, p_amount: 29000 })
      );
      expect(response.json).toHaveBeenCalledWith({ state: 'confirmed' });
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
  it('skips a revoked consent at delivery and retries accepted email with the same provider key', async () => {
    let optedIn = false;
    const recipient = 'teacher@example.test';
    const db = {
      rpc: vi.fn(async () => ({
        data: [
          { id: uid, kind: 'trial_ending', email: recipient, language: 'he', unsubscribe_id: uid },
        ],
      })),
      from: () => {
        const q = {
          select: () => q,
          eq: () => q,
          update: () => q,
          maybeSingle: async () => ({ data: { offers: optedIn } }),
        };
        return q;
      },
    } as unknown as SupabaseClient;
    const transport = vi.fn(
      async (_url: unknown, _init?: RequestInit) => new globalThis.Response('{}')
    );
    const env = {
      VOCABAND_TEACHER_EMAIL_ENABLED: 'true',
      RESEND_API_KEY: 'test',
      VOCABAND_MAIL_FROM: 'test@example.test',
      VOCABAND_MAIL_BUSINESS_IDENTITY: 'Test School',
    };
    await deliverTeacherMail(db, env, transport);
    expect(transport).not.toHaveBeenCalled();
    optedIn = true;
    await deliverTeacherMail(db, env, transport);
    await deliverTeacherMail(db, env, transport);
    for (const [, init] of transport.mock.calls) {
      expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('teacher-mail/' + uid);
      const payload = JSON.parse(String(init?.body));
      expect(payload.to).toEqual([recipient]);
      expect(payload.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
      expect(payload.text).toContain('/unsubscribe/' + uid);
    }
  });
  it('keeps school and manually granted Pro independent of processor expiry', () => {
    expect(
      getEffectivePlan({ role: 'teacher', plan: 'pro', billingPaidUntil: '2000-01-01' } as AppUser)
    ).toBe('pro');
    expect(
      getEffectivePlan({ role: 'teacher', plan: 'free', billingPaidUntil: '2099-01-01' } as AppUser)
    ).toBe('pro');
    expect(getEffectivePlan({ role: 'student', billingPaidUntil: '2099-01-01' } as AppUser)).toBe(
      'free'
    );
  });
  it('grants a single paid period for a verified order, restores missed renewal and limits teacher email to opt-ins', async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${uid}'::uuid$$;
      CREATE TABLE public.schools(id uuid primary key, plan text,trial_ends_at timestamptz);
      CREATE TABLE public.users(uid text primary key,role text,email text,plan text,school_id uuid,trial_ends_at timestamptz);
      CREATE TABLE public.classes(code text primary key,teacher_uid text,archived_at timestamptz);
      CREATE TABLE public.student_profiles(id uuid primary key DEFAULT gen_random_uuid(),auth_uid uuid,class_code text,status text);
      CREATE TABLE public.announcements(id uuid primary key,title text,message text,audience text,starts_at timestamptz,ends_at timestamptz);
      CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      INSERT INTO public.users VALUES('${uid}','teacher','school@example.test','free',null,now()+interval '2 days');
      INSERT INTO auth.users VALUES('${uid}','school@example.test',now());`);
      await db.exec(readFileSync('supabase/migrations/20261118010000_teacher_billing.sql', 'utf8'));
      const get = async (sql: string, args: unknown[] = []) =>
        Object.values((await db.query<Record<string, unknown>>(sql, args)).rows[0])[0];
      expect((await db.query('SELECT * FROM claim_teacher_lifecycle_mail()')).rows).toHaveLength(0);
      await db.query(
        "INSERT INTO teacher_mail_preferences(teacher_uid,language,offers) VALUES($1,'he',true)",
        [uid]
      );
      expect((await db.query('SELECT * FROM claim_teacher_lifecycle_mail()')).rows).toHaveLength(1);
      expect((await db.query('SELECT * FROM claim_teacher_lifecycle_mail()')).rows).toHaveLength(0);
      const order = await get(
        `INSERT INTO teacher_billing_orders(teacher_uid,offer,item_id,amount_agorot,months,recurring,
          created_at,pending_until) VALUES($1,'monthly',345,2900,1,true,now()-interval '29 days',now()+interval '1 hour')
          RETURNING id`,
        [uid]
      );
      const write = (id: number, ref: unknown, standing: number | null, value: number) =>
        get(
          "SELECT billing_apply_payment($1,$2,$3,234,$4,345,$5,now()-CASE WHEN $1::bigint=1 THEN interval '28 days' ELSE interval '0 days' END,true)",
          [id, id + 500, ref, standing, value]
        );
      expect(await write(1, order, 888, 999)).toBe(false);
      expect(await write(1, order, 888, 2900)).toBe(true);
      expect(await write(1, order, 888, 2900)).toBe(true);
      const firstEnd = await get(
        'SELECT extract(epoch FROM billing_my_access_until())::double precision'
      );
      expect(await write(2, null, 887, 2900)).toBe(false);
      expect(await write(2, null, 888, 2900)).toBe(true);
      expect(
        await get('SELECT extract(epoch FROM billing_my_access_until())::double precision')
      ).toBeGreaterThan(Number(firstEnd));
      expect(await get('SELECT count(*)::int FROM teacher_billing_payments')).toBe(2);
      expect(await get('SELECT billing_my_access_until()>now()')).toBe(true);
      await db.exec('UPDATE teacher_mail_queue SET lease_until=null');
      expect((await db.query('SELECT * FROM claim_teacher_lifecycle_mail()')).rows).toHaveLength(0);
      await db.exec(
        'INSERT INTO teacher_billing_credits VALUES (100,501,234,2900),(101,502,999,2900),(102,502,234,100)'
      );
      expect(await get('SELECT billing_my_access_until()>now()')).toBe(true);
      await db.exec('INSERT INTO teacher_billing_credits VALUES (103,502,234,2800)');
      expect(await get('SELECT billing_my_access_until()')).toBe(null);
      await db.exec('UPDATE teacher_mail_preferences SET offers=false');
      expect((await db.query('SELECT * FROM claim_teacher_lifecycle_mail()')).rows).toHaveLength(0);
      await db.query('UPDATE teacher_billing_orders SET canceled_at=now() WHERE id=$1', [order]);
      const next = await get(
        `INSERT INTO teacher_billing_orders(teacher_uid,offer,item_id,amount_agorot,months,recurring,pending_until)
          VALUES($1,'monthly',345,2900,1,true,now()+interval '1 hour') RETURNING id`,
        [uid]
      );
      expect(await write(6, next, null, 2900)).toBe(true);
      expect(await get('SELECT billing_my_access_until()>now()')).toBe(true);
      expect(await write(7, null, 999, 2900)).toBe(false);
      expect(await write(7, next, 999, 2900)).toBe(true);
      await db.exec('SET ROLE authenticated');
      await expect(db.query('SELECT * FROM teacher_billing_orders')).rejects.toThrow();
      await expect(
        db.query('SELECT billing_apply_payment(3,503,null,2,8,4,100,now(),true)')
      ).rejects.toThrow();
    } finally {
      await db.close();
    }
  }, 20000);
  it('charges only approved seats, caps the annual total per teacher and reserves a single checkout', async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT null::uuid$$;
        CREATE TABLE schools(id uuid,plan text,trial_ends_at timestamptz);
        CREATE TABLE users(uid text PRIMARY KEY,role text,email text,plan text,school_id uuid,trial_ends_at timestamptz);
        CREATE TABLE announcements(id uuid,title text,message text,audience text,starts_at timestamptz,ends_at timestamptz);
        CREATE TABLE auth.users(id uuid,email text,email_confirmed_at timestamptz);
        CREATE TABLE classes(code text PRIMARY KEY,teacher_uid text,archived_at timestamptz);
        CREATE TABLE student_profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),auth_uid uuid,class_code text,status text);
        INSERT INTO users VALUES ('teacher-a','teacher','teacher@example.test','free',null,now()+interval '1 day');
        INSERT INTO classes VALUES
          ('first','teacher-a',null),('second','teacher-a',null),('archived','teacher-a',now()),
          ('other','teacher-b',null);
        INSERT INTO student_profiles(auth_uid,class_code,status) VALUES
          ('${uid}','first','approved'),('${uid}','second','active'),
          (null,'first','pending_approval'),(null,'archived','approved'),(null,'other','approved');`);
      await db.exec(readFileSync('supabase/migrations/20261118010000_teacher_billing.sql', 'utf8'));
      async function quote() {
        return (
          await db.query<{
            quote: { students: number; monthlyAgorot: number; annualAgorot: number };
          }>("SELECT billing_teacher_quote('teacher-a') AS quote")
        ).rows[0].quote;
      }
      const reserve = (offer: string, count: number, amount: number) =>
        db.query<{ order: { id?: string; attempt?: string; url?: string } }>(
          "SELECT billing_open_order('teacher-a',$1,345,$2,$3) AS order",
          [offer, count, amount]
        );
      expect(await quote()).toMatchObject({ students: 1, monthlyAgorot: 50, annualAgorot: 200 });
      await expect(reserve('annual', 1, 200)).rejects.toThrow('Trial is active');
      await db.exec("UPDATE users SET trial_ends_at=now()-interval '1 second'");
      await db.exec(
        "INSERT INTO student_profiles(class_code,status) SELECT 'second','approved' FROM generate_series(1,29)"
      );
      expect(await quote()).toMatchObject({
        students: 30,
        monthlyAgorot: 1500,
        annualAgorot: 6000,
      });
      await expect(reserve('annual', 1, 200)).rejects.toThrow('Student count changed');
      await db.exec(
        "INSERT INTO student_profiles(class_code,status) SELECT 'first','active' FROM generate_series(1,4)"
      );
      expect((await quote()).annualAgorot).toBe(6800);
      await db.exec("INSERT INTO student_profiles(class_code,status) VALUES ('first','approved')");
      expect(await quote()).toMatchObject({
        students: 35,
        monthlyAgorot: 1750,
        annualAgorot: 6900,
      });
      await expect(reserve('annual', 35, 6800)).rejects.toThrow('Student count changed');
      const { id, attempt } = (await reserve('annual', 35, 6900)).rows[0].order;
      expect(id).toBeTruthy();
      await expect(reserve('annual', 35, 6900)).rejects.toThrow('Checkout being prepared');
      await expect(reserve('monthly', 35, 1750)).rejects.toThrow('Different checkout pending');
      await db.exec(
        `UPDATE teacher_billing_orders SET checkout_lease_until=now()-interval '1 second',
          pending_until=now()+interval '5 seconds'`
      );
      const retry = (await reserve('annual', 35, 6900)).rows[0].order;
      expect(retry.id).toBe(id);
      expect(retry.attempt).not.toBe(attempt);
      expect(
        (
          await db.query(
            'SELECT pending_until>checkout_lease_until AS reserved FROM teacher_billing_orders'
          )
        ).rows[0]
      ).toEqual({ reserved: true });
      const url = 'https://pay.sumit.co.il/example';
      const save = (token: string | undefined) =>
        db.query<{ saved: boolean }>('SELECT billing_store_checkout($1,$2,$3) AS saved', [
          id,
          token,
          url,
        ]);
      expect((await save(attempt)).rows[0].saved).toBe(false);
      expect((await save(retry.attempt)).rows[0].saved).toBe(true);
      expect((await reserve('annual', 35, 6900)).rows[0].order).toEqual({ url });
      const post = (amount: number) =>
        db.query<{ accepted: boolean }>(
          'SELECT billing_apply_payment(41,42,$1,2,null,345,$2,now(),true) AS accepted',
          [id, amount]
        );
      expect((await post(6800)).rows[0].accepted).toBe(false);
      expect((await post(6900)).rows[0].accepted).toBe(true);
      const period = await db.query<{ valid: boolean }>(
        "SELECT billing_access_until('teacher-a')>now()+interval '11 months' AS valid"
      );
      expect(period.rows[0].valid).toBe(true);
      await db.exec('SET ROLE authenticated');
      await expect(quote()).rejects.toThrow();
    } finally {
      await db.close();
    }
  }, 20000);
});
