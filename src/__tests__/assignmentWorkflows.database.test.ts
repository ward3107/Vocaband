import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const id = (i: number) => '10000000-0000-4000-8000-' + String(i).padStart(12, '0');
const teacher = id(1),
  classId = id(10),
  work = id(20),
  emptyWork = id(21);
async function as(uid: string, sql: string, args: unknown[] = []) {
  await db.exec('SET ROLE authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  try {
    return (await db.query<Record<string, any>>(sql, args)).rows;
  } finally {
    await db.exec('RESET ROLE');
  }
}
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon;
    CREATE FUNCTION public.is_teacher() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT auth.uid()='${teacher}'$$;
    CREATE TABLE classes(id uuid PRIMARY KEY,teacher_uid text,code text);
    GRANT SELECT ON classes TO authenticated;
    CREATE TABLE assignments(id uuid PRIMARY KEY,class_id uuid,title text,created_at timestamptz DEFAULT now());
    CREATE TABLE student_profiles(id uuid PRIMARY KEY,auth_uid uuid,unique_id text,display_name text,class_code text,status text,avatar text);
    CREATE TABLE progress(id uuid PRIMARY KEY,student_uid text,student_name text,assignment_id uuid,class_code text,play_count integer,mistakes integer[],completed_at timestamptz,score integer);
    CREATE TABLE word_attempts(progress_id uuid,word_id integer,is_correct boolean);
    INSERT INTO classes VALUES('${classId}','${teacher}','TEACH1');
    INSERT INTO assignments(id,class_id,title) VALUES('${work}','${classId}','Fruit'),('${emptyWork}','${classId}','Seasons');
    INSERT INTO student_profiles VALUES
      ('${id(30)}','${id(40)}','profile-a','New name','TEACH1','approved',NULL),
      ('${id(31)}','${id(41)}','profile-b','Sam','TEACH1','approved',NULL),
      ('${id(32)}',NULL,'profile-c','Sam','TEACH1','approved',NULL),
      ('${id(33)}','${id(43)}','other','Pending','TEACH1','pending_approval',NULL);
    INSERT INTO progress VALUES('${id(50)}','${id(40)}','Old name','${work}','TEACH1',2,ARRAY[3],now()-interval '95 days',10);
    INSERT INTO word_attempts VALUES('${id(50)}',1,true),('${id(50)}',3,false);
  `);
  await db.exec(
    readFileSync('supabase/migrations/20261118000000_assignment_workflows.sql', 'utf8')
  );
}, 30000);
afterAll(() => db.close());
describe('assignment workflows', () => {
  it('counts approved members and historical plays, including assignments with zero results', async () => {
    const overview = await as(teacher, 'SELECT * FROM teacher_assignment_report($1)', [classId]);
    expect(overview.find((r) => r.assignment_id === work)).toMatchObject({
      expected: 3,
      participated: 1,
      attempts: 2,
    });
    expect(overview.find((r) => r.assignment_id === emptyWork)).toMatchObject({
      expected: 3,
      participated: 0,
    });
    const [detail] = await as(teacher, 'SELECT * FROM teacher_assignment_report($1,$2)', [
      classId,
      work,
    ]);
    expect(detail.students.find((s: { id: string }) => s.id === id(30))).toMatchObject({
      name: 'New name',
      accuracy: 50,
      best_points: 10,
      missed: [3],
    });
    expect(await as(id(2), 'SELECT * FROM teacher_assignment_report($1)', [classId])).toHaveLength(
      0
    );
  });
  it('delivers once to each eligible profile, including a student linking their PIN later', async () => {
    const args = [work, 'reminder', [id(30), id(31), id(32)]];
    const send = 'SELECT send_assignment_followup($1,$2,$3::uuid[]) AS delivered';
    expect(await as(teacher, send, args)).toEqual([{ delivered: 2 }]);
    expect(await as(teacher, send, args)).toEqual([{ delivered: 0 }]);
    expect(await as(teacher, send, [work, 'practice', [id(30), id(31)]])).toEqual([
      { delivered: 1 },
    ]);
    const inbox = "SELECT * FROM my_assignment_followups('TEACH1')";
    expect(await as(id(40), inbox)).toEqual([
      { assignment_id: work, kind: 'practice', word_ids: [3], profile_id: id(30) },
    ]);
    expect(await as(id(41), inbox)).toEqual([
      { assignment_id: work, kind: 'reminder', word_ids: [], profile_id: id(31) },
    ]);
    await db.query('UPDATE student_profiles SET auth_uid=$1 WHERE id=$2', [id(42), id(32)]);
    expect(await as(id(42), inbox)).toHaveLength(1);
    await db.query('UPDATE progress SET completed_at=now() WHERE id=$1', [id(50)]);
    expect(await as(id(40), inbox)).toHaveLength(1);
    expect(
      await as(id(40), 'SELECT complete_assignment_practice($1,$2) AS ok', [work, id(30)])
    ).toEqual([{ ok: true }]);
    expect(await as(id(40), inbox)).toHaveLength(0);
  });
  it('restores drafts for the owner, preserves newer edits and cannot resurrect a cleared revision', async () => {
    const save = "SELECT save_assignment_draft($1,'new',$2,$3,$4::jsonb) AS ok";
    expect(await as(teacher, save, [classId, null, id(60), '{"step":2}'])).toEqual([{ ok: true }]);
    expect(await as(teacher, 'SELECT payload FROM assignment_drafts')).toEqual([
      { payload: { step: 2 } },
    ]);
    expect(await as(id(2), 'SELECT payload FROM assignment_drafts')).toEqual([]);
    expect(await as(teacher, save, [classId, null, id(61), '{"step":1}'])).toEqual([{ ok: false }]);
    expect(await as(teacher, save, [classId, id(60), id(62), null])).toEqual([{ ok: true }]);
    expect(await as(teacher, save, [classId, id(60), id(63), '{"step":3}'])).toEqual([
      { ok: false },
    ]);
  });
  it('syncs templates between devices without restoring a deleted local template', async () => {
    const task = { id: 'legacy', title: 'Fruit', wordIds: [1, 3], pinned: false, timesUsed: 0 };
    const sync = (op: string) =>
      as(teacher, 'SELECT sync_activity_templates($1::jsonb) AS task', [
        JSON.stringify([{ task, op, stamp: 12 }]),
      ]);
    expect(await sync('save')).toEqual([{ task }]);
    expect(await as(teacher, "SELECT sync_activity_templates('[]') AS task")).toEqual([{ task }]);
    expect(await sync('remove')).toEqual([]);
    expect(await sync('save')).toEqual([]);
  });
});
