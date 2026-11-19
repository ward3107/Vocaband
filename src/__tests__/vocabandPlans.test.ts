import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  OFFER_IDS, PERSONAL_BILLING, SCHOOL_BILLING, FREE_OPEN_ASSIGNMENTS, MONTHLY_WORK_QUOTA,
  type BillingQuote, type OfferId,
} from '../core/billingCatalog';

const db = new PGlite();
const uuid = (n: number) => ('00000000-0000-4000-8000-' + String(n).padStart(12, '0'));
const [personal, free, manager, teacherA, teacherB, outsideManager, student, pilotManager] =
  [1, 2, 3, 4, 5, 6, 7, 8].map(uuid);
const [campus, outside, pilotCampus] = [31, 32, 33].map(uuid);
const [first, second, foreignClass, freeClass, personalClass] = [101, 102, 103, 104, 105].map(uuid);
const source = uuid(201);
let payment = 1000;

async function scalar<T = unknown>(sql: string, args: unknown[] = []) {
  return (await db.query<{ value: T }>(sql, args)).rows[0].value;
}
const quote = (uid: string, extra = 0) =>
  scalar<BillingQuote>('SELECT billing_plan_quotes($1,$2) AS value', [uid, extra]);
async function asUser<T>(uid: string, run: () => Promise<T>) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await db.exec('SET ROLE authenticated');
  try {
    return await run();
  } finally {
    await db.exec('RESET ROLE');
  }
}
async function pay(uid: string, code: OfferId, extra = 0) {
  const calculated = await quote(uid, extra);
  const offer = calculated.offers.find((candidate) => candidate.code === code)!;
  expect(offer.available).toBe(true);
  const opened = await scalar<{ id: string; attempt: string }>(
    'SELECT billing_open_order($1,$2,40,$3,$4,$5) AS value',
    [uid, code, calculated.students, offer.amount, extra]
  );
  expect(await scalar('SELECT billing_store_checkout($1,$2,$3) AS value', [
    opened.id, opened.attempt, 'https://pay.sumit.co.il/test',
  ])).toBe(true);
  const id = ++payment;
  expect(await scalar('SELECT billing_apply_payment($1,$2,$3,3,null,40,$4,now(),true) AS value',
    [id, id + 10000, opened.id, offer.amount])).toBe(true);
  // Retrying a merchant notification must not grant an extra term.
  expect(await scalar('SELECT billing_apply_payment($1,$2,$3,3,null,40,$4,now(),true) AS value',
    [id, id + 10000, opened.id, offer.amount])).toBe(true);
  return { ...opened, offer, paymentId: id };
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
    CREATE TABLE public.schools(id uuid PRIMARY KEY,name text,plan text,trial_ends_at timestamptz);
    CREATE TABLE public.users(uid text PRIMARY KEY,role text,display_name text,email text,plan text,school_id uuid,trial_ends_at timestamptz,class_code text);
    CREATE TABLE public.classes(id uuid PRIMARY KEY,code text UNIQUE,name text,teacher_uid text,archived_at timestamptz,subject text);
    CREATE TABLE public.student_profiles(
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),auth_uid uuid,class_code text,status text
    );
    CREATE TABLE public.assignments(
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid REFERENCES classes(id),title text,words jsonb,word_ids integer[],
       allowed_modes text[],deadline text,subject text,sentences text[],sentence_difficulty smallint,created_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.progress(
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),assignment_id uuid REFERENCES assignments(id),class_code text,student_uid text,mode text,completed_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.vocabulary_collections(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),teacher_uid text);
    ALTER TABLE public.vocabulary_collections ENABLE ROW LEVEL SECURITY;
    CREATE POLICY test_collections ON public.vocabulary_collections FOR INSERT TO authenticated WITH CHECK (teacher_uid=auth.uid()::text);
    GRANT INSERT ON public.vocabulary_collections TO authenticated;
    CREATE TABLE public.vocabulary_sets(id uuid PRIMARY KEY,teacher_uid text,name text,grade_level int,is_archived bool DEFAULT false);
    CREATE TABLE public.vocabulary_set_words(set_id uuid,position int,english text,hebrew text,arabic text,curriculum_word_id int);
    CREATE TABLE public.announcements(id uuid PRIMARY KEY,title text,message text,audience text,starts_at timestamptz,ends_at timestamptz);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$;
    CREATE FUNCTION public.manager_classes() RETURNS TABLE(id uuid) LANGUAGE sql STABLE AS $$SELECT id FROM classes WHERE false$$;
    INSERT INTO schools VALUES ('${campus}','Example school','free',null),('${outside}','Other school','school',null),
      ('${pilotCampus}','Small school','free',null);
    INSERT INTO users(uid,role,display_name,email,plan,school_id,class_code) VALUES
      ('${personal}','teacher','Personal','p@example.test','free',null,null),
      ('${free}','teacher','Free','f@example.test','free',null,null),
      ('${manager}','manager','Coordinator','c@example.test','free','${campus}',null),
      ('${teacherA}','teacher','Teacher A','a@example.test','free','${campus}',null),
      ('${teacherB}','teacher','Teacher B','b@example.test','free','${campus}',null),
      ('${outsideManager}','manager','Other coordinator','o@example.test','free','${outside}',null),
      ('${student}','student','Synthetic learner',null,'free',null,'FREE001'),
      ('${pilotManager}','manager','Pilot manager','pm@example.test','free','${pilotCampus}',null);
    INSERT INTO classes VALUES
      ('${first}','CLASS01','Grade 7A','${teacherA}',null,'english'),
      ('${second}','CLASS02','Grade 7B','${teacherB}',null,'english'),
      ('${foreignClass}','CLASS03','Other class','${outsideManager}',null,'english'),
      ('${freeClass}','FREE001','Free class','${free}',null,'english'),
      ('${personalClass}','PAID001','Personal class','${personal}',null,'english');
    INSERT INTO student_profiles(auth_uid,class_code,status) VALUES ('${student}','FREE001','approved');
    INSERT INTO student_profiles(class_code,status) SELECT 'PAID001','approved' FROM generate_series(1,60);
    INSERT INTO vocabulary_sets VALUES('${source}','${teacherA}','Weather',7,false);
    INSERT INTO vocabulary_set_words VALUES ('${source}',1,'rain','גשם','مطر',null);
    GRANT USAGE ON SCHEMA auth TO authenticated;
  `);
  for (const file of [
    '20261118010000_teacher_billing.sql', '20261118030000_vocaband_subscription_plans.sql',
    '20261118040000_vocaband_school_workspace.sql', '20261119010000_plan_usage_and_school_week.sql',
  ]) await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
}, 30000);
afterAll(() => db.close());

describe('Vocaband subscription plans and school workspace', () => {
  it('keeps the displayed monthly and annual prices aligned with the authoritative offers', async () => {
    const { offers } = await quote(personal);
    expect(offers.map((offer) => [offer.code, offer.fullAmount, offer.seatLimit])).toEqual([
      ['teacher_monthly', PERSONAL_BILLING.teacher.monthly, 60],
      ['teacher_annual', PERSONAL_BILLING.teacher.annual, 60],
      ['pro_monthly', PERSONAL_BILLING.pro.monthly, 150],
      ['pro_annual', PERSONAL_BILLING.pro.annual, 150],
    ]);
    const extended = await quote(personal, 1);
    expect(extended.offers.find((offer) => offer.code === 'pro_annual')).toMatchObject({
      amount: 21800, seatLimit: 200,
    });
    expect(OFFER_IDS).toHaveLength(6);
    await expect(scalar(
      "SELECT billing_open_order($1,'teacher_annual',40,60,50,0) AS value", [personal]
    )).rejects.toThrow('Quote changed');
    await expect(scalar(
      "SELECT billing_open_order($1,'school_annual',40,60,249000,0) AS value", [personal]
    )).rejects.toThrow('Offer unavailable');
  });

  it('limits admissions, charges a prorated upgrade and meters monthly AI atomically', async () => {
    const original = await pay(personal, 'teacher_annual');
    expect(await scalar('SELECT billing_entitlement($1) AS value', [personal])).toMatchObject({
      tier: 'teacher', capacity: 60,
    });
    await expect(db.exec("INSERT INTO student_profiles(class_code,status) VALUES ('PAID001','approved')"))
      .rejects.toThrow('plan_student_cap');
    expect(await scalar('SELECT billing_use_work_quota($1) AS value', [personal])).toBe(false);
    await db.query("UPDATE teacher_billing_payments SET paid_at=now()-interval '6 months',valid_until=now()+interval '6 months' WHERE order_id=$1", [original.id]);
    const upgraded = await pay(personal, 'pro_annual');
    expect(upgraded.offer.amount).toBeGreaterThan(3000);
    expect(upgraded.offer.amount).toBeLessThan(4000);
    const until = (await db.query<{ valid_until: string }>(
      'SELECT valid_until FROM teacher_billing_payments WHERE order_id IN ($1,$2)', [original.id, upgraded.id]
    )).rows;
    expect(until[0].valid_until).toEqual(until[1].valid_until);
    for (let i = 0; i < MONTHLY_WORK_QUOTA; i++) {
      expect(await scalar('SELECT billing_use_work_quota($1) AS value', [personal])).toBe(true);
    }
    expect(await scalar('SELECT billing_use_work_quota($1) AS value', [personal])).toBe(false);
  });

  it('starts a six-week pilot, credits it once and inherits the annual license', async () => {
    const options = await quote(manager);
    expect(options.offers.map((o) => [o.code, o.amount, o.staffLimit])).toEqual([
      ['school_pilot', SCHOOL_BILLING.pilot, 2], ['school_annual', SCHOOL_BILLING.annual, 6],
    ]);
    const pilot = await pay(manager, 'school_pilot');
    expect(await scalar(
      "SELECT valid_until-paid_at=interval '42 days' AS value FROM teacher_billing_payments WHERE order_id=$1", [pilot.id]
    )).toBe(true);
    const active = await quote(manager);
    expect(active.offers.find((offer) => offer.code === 'school_pilot')?.available).toBe(false);
    expect(active.offers.find((offer) => offer.code === 'school_annual')).toMatchObject({ amount: 190000, credit: 59000 });
    await pay(manager, 'school_annual');
    expect((await quote(manager)).covered).toBe(true);
    expect(await scalar('SELECT billing_entitlement($1) AS value', [teacherA])).toMatchObject({
      tier: 'school', capacity: 400,
    });
    expect((await quote(manager)).offers.find((offer) => offer.code === 'school_annual')?.credit).toBe(0);
    expect((await quote(pilotManager)).offers.find((offer) => offer.code === 'school_annual')?.credit).toBe(0);
  });

  it('shares only published words and assigns and reports across authorized classes once', async () => {
    const resource = await asUser(teacherA, () =>
      scalar<string>('SELECT publish_school_word_set($1) AS value', [source])
    );
    await expect(asUser(teacherB, () => scalar('SELECT publish_school_word_set($1) AS value', [source])))
      .rejects.toThrow('word_set_unavailable');
    await expect(asUser(outsideManager, () => db.query('SELECT * FROM school_word_resources')))
      .rejects.toThrow();
    const request = uuid(420);
    const distribute = (actor: string, targets: string[]) => asUser(actor, () =>
      scalar("SELECT assign_school_words($1,$2,$3,'Weather practice',null) AS value", [request, resource, targets])
    );
    await expect(distribute(teacherA, [first, second])).rejects.toThrow('class_unavailable');
    await expect(distribute(manager, [first, foreignClass])).rejects.toThrow('class_unavailable');
    await expect(distribute(outsideManager, [foreignClass])).rejects.toThrow('word_set_unavailable');
    expect(await distribute(manager, [first, second])).toBe(request);
    expect(await distribute(manager, [second, first])).toBe(request);
    expect(await scalar('SELECT count(*)::integer AS value FROM school_assignment_deliveries')).toBe(2);
    await db.query("INSERT INTO student_profiles(auth_uid,class_code,status) VALUES ($1,'CLASS01','approved')", [student]);
    await db.query(
      "INSERT INTO progress(assignment_id,class_code,student_uid,mode) SELECT id,'CLASS01',$1,'classic' FROM assignments WHERE class_id=$2",
      [student, first]
    );
    const report = (actor: string) => asUser(actor, () =>
      scalar('SELECT school_assignment_report($1) AS value', [request])
    );
    expect(await report(manager)).toMatchObject({
      classes: [{ name: 'Grade 7A', enrolled: 1, completed: 1 }, { name: 'Grade 7B', completed: 0 }],
    });
    expect(await report(teacherA)).toBeNull();
    expect(await report(outsideManager)).toBeNull();
  });

  it('enforces paid library and reports at the data boundary and prevents opening a second free class', async () => {
    const newCollection = (actor: string) => asUser(actor, () =>
      db.query('INSERT INTO vocabulary_collections(teacher_uid) VALUES ($1)', [actor])
    );
    await expect(newCollection(free)).rejects.toThrow('row-level security');
    await expect(newCollection(personal)).resolves.toBeDefined();
    await expect(asUser(free, () => db.query("SELECT * FROM get_teacher_class_analytics(ARRAY['FREE001'],now())")))
      .rejects.toThrow('teacher_plan_required');
    await db.query("INSERT INTO classes(id,code,teacher_uid,archived_at) VALUES($1,'ARCHIVE',$2,now())", [uuid(805), free]);
    await expect(db.query('UPDATE classes SET archived_at=null WHERE id=$1', [uuid(805)]))
      .rejects.toThrow('free_tier_class_cap');
    await expect(db.query("INSERT INTO classes(id,code,teacher_uid) VALUES($1,'EXTRA',$2)", [uuid(806), free]))
      .rejects.toThrow('free_tier_class_cap');
  });

  it('closes a free assignment to release a slot without deleting its results', async () => {
    for (let n = 0; n < FREE_OPEN_ASSIGNMENTS; n++) {
      await db.query("INSERT INTO assignments(id,class_id,title) VALUES($1,$2,'Test')", [uuid(500+n), freeClass]);
    }
    const insert = () => db.query("INSERT INTO assignments(class_id,title) VALUES($1,'Next')", [freeClass]);
    await expect(insert()).rejects.toThrow('free_tier_assignment_cap');
    expect(await asUser(teacherA, () => scalar('SELECT close_my_assignment($1) AS value', [uuid(500)]))).toBe(false);
    expect(await asUser(free, () => scalar('SELECT close_my_assignment($1) AS value', [uuid(500)]))).toBe(true);
    await insert();
    expect((await asUser(student, () => db.query('SELECT * FROM get_assignments_for_class($1)', [freeClass]))).rows)
      .toHaveLength(3);
    expect((await asUser(free, () => db.query('SELECT * FROM get_assignments_for_class($1)', [freeClass]))).rows)
      .toHaveLength(4);
  });

  it('returns only the signed-in teacher’s seat count and licensed school totals', async () => {
    expect(await asUser(free, () => scalar('SELECT billing_my_usage() AS value')))
      .toEqual({ scope: 'teacher', used: 1, capacity: 30 });
    const pooled = await asUser(teacherA, () => scalar('SELECT billing_my_usage() AS value'));
    expect(pooled).toMatchObject({ scope: 'school', used: 1, capacity: 400 });
    expect(await asUser(student, () => scalar('SELECT billing_my_usage() AS value'))).toBeNull();
  });

  it('counts students once, requires every assigned mode and restricts weekly summaries to the current school', async () => {
    const otherStudent = uuid(852);
    await db.query("INSERT INTO student_profiles(auth_uid,class_code,status) VALUES ($1,'CLASS01','approved')", [otherStudent]);
    const assignment = uuid(853);
    await db.query("INSERT INTO assignments(id,class_id,title,allowed_modes) VALUES ($1,$2,'Two game modes',ARRAY['spelling','listening'])", [assignment, first]);
    await db.query(`INSERT INTO progress(assignment_id,class_code,student_uid,mode)
      VALUES ($1,'CLASS01',$2,'spelling'), ($1,'CLASS01',$2,'spelling')`, [assignment, otherStudent]);
    const week = (uid: string, previous = false) => asUser(uid, () =>
      scalar('SELECT school_weekly_activity($1) AS value', [previous])
    );
    expect(await week(manager)).toMatchObject({ classesPracticed: 1, studentsCompleted: 1,
      classes: [{ name: 'Grade 7A', practiced: 2, completed: 1 }, { name: 'Grade 7B', practiced: 0 } ],
    });
    await db.query("INSERT INTO progress(assignment_id,class_code,student_uid,mode) VALUES ($1,'CLASS01',$2,'listening')", [assignment, otherStudent]);
    expect(await week(manager)).toMatchObject({ studentsCompleted: 2 });
    expect(await week(manager, true)).toMatchObject({ classesPracticed: 0, studentsCompleted: 0 });
    expect(await week(outsideManager)).toMatchObject({ classes: [] });
    expect(await week(teacherA)).toBeNull();
    expect(await week(student)).toBeNull();
  });

});
