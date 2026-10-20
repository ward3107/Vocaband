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

test('does not apply a pending release when a client role can bypass RLS', async () => {
  const db = new PGlite();
  try {
    await db.exec(fixture);
    await db.exec('ALTER ROLE authenticated BYPASSRLS');
    let writes = 0;
    const request = async body => { if (!body.read_only) writes++; return (await db.query(body.query)).rows; };
    await assert.rejects(releaseClassEntry({ request, sql, apply: true }), /Client roles can bypass/);
    assert.equal(writes, 0);
    assert.equal((await db.query("SELECT to_regclass('public.class_live_sessions') IS NULL AS absent")).rows[0].absent, true);
  } finally { await db.close(); }
});

test('rejects changed schema, function, policy and privilege contracts before reporting an applied release', async t => {
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
      ['no-op publisher body', `CREATE OR REPLACE FUNCTION public.set_class_live_session(p_class_id uuid, p_session_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$ BEGIN RETURN; END; $$`],
      ['changed function configuration', 'ALTER FUNCTION public.get_my_live_class_session() SET search_path = public'],
      ['changed function return type', `DROP FUNCTION public.get_my_live_class_session(); CREATE FUNCTION public.get_my_live_class_session() RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$ SELECT 1 $$; REVOKE ALL ON FUNCTION public.get_my_live_class_session() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.get_my_live_class_session() TO authenticated`],
      ['revoked authenticated RPC access', 'REVOKE EXECUTE ON FUNCTION public.get_my_live_class_session() FROM authenticated'],
      ['revoked authenticated table INSERT', 'REVOKE INSERT ON public.class_live_sessions FROM authenticated'],
      ['revoked service table DELETE', 'REVOKE DELETE ON public.class_live_sessions FROM service_role'],
      ['anonymous write grant', 'GRANT INSERT ON public.class_live_sessions TO anon'],
      ['removed expiry constraint', 'ALTER TABLE public.class_live_sessions DROP CONSTRAINT class_live_sessions_check'],
      ['removed session ownership reference', 'ALTER TABLE public.class_live_sessions DROP CONSTRAINT class_live_sessions_session_id_fkey'],
      ['removed uniqueness index', 'DROP INDEX public.class_live_one_open_class_per_session'],
      ['nullable owner column', 'ALTER TABLE public.class_live_sessions ALTER COLUMN teacher_uid DROP NOT NULL'],
      ['changed expiry default', 'ALTER TABLE public.class_live_sessions ALTER COLUMN expires_at SET DEFAULT now()'],
      ['disabled closing trigger', 'ALTER TABLE public.quick_play_sessions DISABLE TRIGGER close_class_entry_on_session_end'],
      ['additional RPC overload', `CREATE FUNCTION public.set_class_live_session(p_class_id uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END; $$`],
      ['additional closing trigger', 'CREATE TRIGGER unexpected_close AFTER UPDATE ON public.quick_play_sessions FOR EACH ROW EXECUTE FUNCTION public.close_class_entry_on_session_end()'],
      ['client owns the bridge', 'ALTER TABLE public.class_live_sessions OWNER TO authenticated'],
      ['client inherits bridge ownership', 'CREATE ROLE class_entry_owner; GRANT class_entry_owner TO authenticated; ALTER TABLE public.class_live_sessions OWNER TO class_entry_owner'],
      ['client owns a release function', 'ALTER FUNCTION public.get_my_live_class_session() OWNER TO authenticated'],
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
