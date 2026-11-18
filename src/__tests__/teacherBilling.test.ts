import { describe, expect, it, vi } from 'vitest';
import type { Express, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerTeacherBilling } from '../../server/billing/routes';
import { deliverTeacherMail } from '../../server/billing/teacherMail';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  checkoutUrl,
  confirmedCredit,
  confirmedPayment,
  loadOffers,
  merchantApi,
} from '../../server/billing/sumit';
import { getEffectivePlan } from '../core/plan';
import type { AppUser } from '../core/supabase';

const uid = '11111111-1111-4111-8111-111111111111';
const offer = {
  code: 'annual',
  months: 12 as const,
  agorot: 29000,
  recurring: true,
  itemId: 345,
  page: 'https://pay.sumit.co.il/example',
  endsAt: null,
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
  it('serves only configured offers in their enrollment window and sends an opaque order reference', () => {
    const config = {
      SUMIT_COMPANY_ID: '1',
      SUMIT_API_KEY: 'test',
      VOCABAND_CHECKOUT_ENABLED: 'true',
      VOCABAND_BILLING_OFFERS: JSON.stringify([
        offer,
        { ...offer, code: 'closed', endsAt: '2025-01-01' },
      ]),
    };
    expect(loadOffers({})).toEqual([]);
    expect(loadOffers(config)).toEqual([offer]);
    const url = new URL(checkoutUrl(offer, uid));
    expect([...url.searchParams]).toEqual([['externalidentifier', uid]]);
    expect(() =>
      loadOffers({
        ...config,
        VOCABAND_BILLING_OFFERS: JSON.stringify([
          { ...offer, page: 'https://example.org/checkout' },
        ]),
      })
    ).toThrow();
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
      const order = await get("SELECT billing_open_order($1,'monthly',345,2900,1,true,null)", [
        uid,
      ]);
      expect(await get("SELECT billing_open_order($1,'monthly',345,2900,1,true,null)", [uid])).toBe(
        order
      );
      await db.query(
        "UPDATE teacher_billing_orders SET created_at=now()-interval '29 days' WHERE id=$1",
        [order]
      );
      const write = (id: number, ref: unknown, standing: number | null, value: number) =>
        get(
          "SELECT billing_apply_payment($1,$2,$3,234,$4,345,$5,now()-CASE WHEN $1::bigint=1 THEN interval '28 days' ELSE interval '0 days' END,true)",
          [id, id + 500, ref, standing, value]
        );
      await expect(
        get("SELECT billing_open_order($1,'annual',346,29000,12,true,null)", [uid])
      ).rejects.toThrow('Different checkout pending');
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
      const next = await get("SELECT billing_open_order($1,'monthly',345,2900,1,true,null)", [uid]);
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
});
