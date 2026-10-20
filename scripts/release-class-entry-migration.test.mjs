import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { migrationUrl, migrationTransaction, migrationState, releaseClassEntry, statusQuery, version } from './release-class-entry-migration.mjs';

const sql = await readFile(migrationUrl, 'utf8');
const fixture = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT null::uuid $$;
CREATE TABLE public.classes (id uuid PRIMARY KEY, name text, code text, teacher_uid text, subject text);
CREATE TABLE public.users (uid text, role text, class_code text);
CREATE TABLE public.student_profiles (auth_uid uuid, class_code text, status text);
CREATE TABLE public.quick_play_sessions (id uuid PRIMARY KEY, session_code text, teacher_uid text, allowed_modes text[], is_active boolean, subject text);
CREATE PUBLICATION supabase_realtime;
CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations (version text PRIMARY KEY, name text, statements text[]);
`;

test('applies the approved SQL with the original history version and verifies real PostgreSQL objects', async () => {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    const request = async body => (body.query === statusQuery ? (await db.query(body.query)).rows : (await db.exec(body.query), []));
    assert.equal(await releaseClassEntry({ request, sql, apply: false }), 'pending');
    assert.equal(await releaseClassEntry({ request, sql, apply: true }), 'applied');
    assert.deepEqual((await db.query('SELECT version, name, statements FROM supabase_migrations.schema_migrations')).rows,
      [{ version, name: 'class_live_entry', statements: [sql] }]);
    // A retry is read-only and cannot duplicate history or re-run CREATE TABLE.
    assert.equal(await releaseClassEntry({ request, sql, apply: true }), 'applied');
  } finally { await db.close(); }
});

test('rolls schema changes back when history cannot be committed', async () => {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    await db.exec(`ALTER TABLE supabase_migrations.schema_migrations ADD CONSTRAINT history_rejection CHECK (name != 'class_live_entry')`);
    await assert.rejects(db.exec(migrationTransaction(sql)), /history_rejection/);
    await db.exec('ROLLBACK');
    assert.equal(migrationState((await db.query(statusQuery)).rows[0]), 'pending');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations')).rows[0].n, 0);
  } finally { await db.close(); }
});

test('rejects schema/history disagreement before any write', async () => {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    await db.exec(sql);
    let writes = 0;
    const request = async body => { if (!body.read_only) writes++; return (await db.query(body.query)).rows; };
    await assert.rejects(releaseClassEntry({ request, sql, apply: true }), /disagree/);
    assert.equal(writes, 0);
  } finally { await db.close(); }
});

test('rejects modified migration SQL before producing a transaction', () => {
  assert.throws(() => migrationTransaction(sql + '\n-- modified'), /differs from the approved/);
});

test('propagates denied Management API authorization without attempting an apply', async () => {
  let calls = 0;
  await assert.rejects(releaseClassEntry({ sql, apply: true, request: async () => { calls++; throw new Error('HTTP 403'); } }), /HTTP 403/);
  assert.equal(calls, 1);
});

test('rejects changed policy definitions and extra policies before reporting an applied release', async t => {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    await db.exec(migrationTransaction(sql));
    const baseline = (await db.query(statusQuery)).rows[0];
    const student = baseline.policy_definitions.find(policy => policy.policyname === 'class_live_student');
    const cases = [
      ['changed roles', 'ALTER POLICY class_live_student ON public.class_live_sessions TO anon'],
      ['changed SELECT predicate', 'ALTER POLICY class_live_student ON public.class_live_sessions USING (true)'],
      ['changed write predicate', 'ALTER POLICY class_live_owner ON public.class_live_sessions WITH CHECK (true)'],
      ['changed command', `DROP POLICY class_live_student ON public.class_live_sessions; CREATE POLICY class_live_student ON public.class_live_sessions FOR ALL TO authenticated USING (${student.qual})`],
      ['changed permissiveness', `DROP POLICY class_live_student ON public.class_live_sessions; CREATE POLICY class_live_student ON public.class_live_sessions AS RESTRICTIVE FOR SELECT TO authenticated USING (${student.qual})`],
      ['additional permissive policy', 'CREATE POLICY extra_access ON public.class_live_sessions FOR SELECT TO authenticated USING (true)'],
      ['whitespace inside a literal', `ALTER POLICY class_live_student ON public.class_live_sessions USING (${student.qual.replace("'approved'::text", "'app roved'::text")})`],
    ];
    for (const [name, change] of cases) {
      await t.test(name, async () => {
        await db.exec('BEGIN');
        try {
          await db.exec(change);
          let writes = 0;
          const request = async body => { if (!body.read_only) writes++; return (await db.query(body.query)).rows; };
          await assert.rejects(releaseClassEntry({ request, sql, apply: true }), /disagree/);
          assert.equal(writes, 0);
        } finally { await db.exec('ROLLBACK'); }
      });
    }
    assert.equal(migrationState((await db.query(statusQuery)).rows[0]), 'applied');
  } finally { await db.close(); }
});
