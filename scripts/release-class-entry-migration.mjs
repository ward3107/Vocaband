import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const version = '20261019175511';
export const migrationUrl = new URL(`../supabase/migrations/${version}_class_live_entry.sql`, import.meta.url);
const approvedHash = '6f271c87a5655e2bf4d2f24b434a80e37cc2fed2d0a5cfc2a3866fb754e8d185';

// Only metadata is returned; this release never reads student or teacher rows.
export const statusQuery = `SELECT
  (SELECT count(*) = 3 FROM information_schema.columns WHERE table_schema = 'supabase_migrations'
    AND table_name = 'schema_migrations' AND column_name IN ('version', 'name', 'statements'))
    AND (SELECT count(*) = 4 FROM information_schema.tables WHERE table_schema = 'public'
      AND table_name IN ('classes', 'users', 'student_profiles', 'quick_play_sessions'))
    AND EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AS prerequisites_ready,
  EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '${version}') AS recorded,
  to_regclass('public.class_live_sessions') IS NOT NULL AS bridge_table,
  EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.class_live_sessions') AND relrowsecurity) AS rls,
  EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.set_class_live_session(uuid,uuid)') AND NOT prosecdef) AS publish_invoker,
  EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.get_my_live_class_session()') AND NOT prosecdef) AS discover_invoker,
  EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.close_class_entry_on_session_end()') AND NOT prosecdef) AS close_invoker,
  (SELECT count(*) = 2 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'class_live_sessions'
    AND policyname IN ('class_live_owner', 'class_live_student')) AS policies,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.quick_play_sessions')
    AND tgname = 'close_class_entry_on_session_end' AND NOT tgisinternal AND tgenabled != 'D') AS close_trigger,
  EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public' AND tablename = 'class_live_sessions') AS realtime,
  NOT coalesce(has_table_privilege('anon', to_regclass('public.class_live_sessions'), 'SELECT'), false)
    AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.get_my_live_class_session()'), 'EXECUTE'), false)
    AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.set_class_live_session(uuid,uuid)'), 'EXECUTE'), false) AS anon_blocked`;

const schemaChecks = ['bridge_table', 'rls', 'publish_invoker', 'discover_invoker', 'close_invoker', 'policies', 'close_trigger', 'realtime'];

export function migrationState(row) {
  if (!row || row.prerequisites_ready !== true) throw new Error('Required database objects or migration history are unavailable.');
  if (row.recorded === true && row.anon_blocked === true && schemaChecks.every(key => row[key] === true)) return 'applied';
  if (row.recorded === false && schemaChecks.every(key => row[key] === false)) return 'pending';
  throw new Error('Class entry schema and migration history disagree; stopping without changing either.');
}

export function migrationTransaction(sql) {
  if (createHash('sha256').update(sql).digest('hex') !== approvedHash) {
    throw new Error('The class entry migration differs from the approved release.');
  }
  const sourceTag = '$vocaband_class_entry_source$';
  if (sql.includes(sourceTag) || !sql.includes('\nBEGIN;') || !/\nCOMMIT;\s*$/.test(sql)) {
    throw new Error('Unexpected migration transaction format.');
  }
  // The exact approved SQL and its original version commit together. A failed
  // statement cannot leave the schema marked as applied or partially created.
  return sql.replace('\nBEGIN;', `\nBEGIN;\nSET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '45s';\nSELECT pg_advisory_xact_lock(20261019, 175511);`)
    .replace(/\nCOMMIT;\s*$/, () => `\nINSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('${version}', 'class_live_entry', ARRAY[${sourceTag}${sql}${sourceTag}]);\nCOMMIT;\n`);
}

export async function releaseClassEntry({ request, sql, apply = false }) {
  const before = migrationState((await request({ query: statusQuery, read_only: true }))[0]);
  if (!apply || before === 'applied') return before;
  await request({ query: migrationTransaction(sql), read_only: false });
  const after = migrationState((await request({ query: statusQuery, read_only: true }))[0]);
  if (after !== 'applied') throw new Error('The class entry migration did not pass its post-release checks.');
  return after;
}

async function main() {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!/^[a-z0-9]{20}$/.test(ref ?? '') || !token) throw new Error('Existing Supabase project ref and Management API token are required.');
  const mode = process.env.CLASS_ENTRY_RELEASE_MODE ?? 'check';
  if (!['check', 'apply'].includes(mode)) throw new Error('Choose check or apply.');
  if (process.env.GITHUB_REF !== 'refs/heads/main' || !['push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) {
    throw new Error('Production database access is limited to the main-branch release workflow.');
  }
  const sql = await readFile(migrationUrl, 'utf8');
  // Verify the reviewed source before making even the read-only request.
  migrationTransaction(sql);
  const request = async body => {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = (await response.text()).replaceAll(token, '[redacted]').replaceAll(ref, '[project]').slice(0, 500);
      throw new Error(`Supabase Management API HTTP ${response.status}: ${detail}`);
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Unexpected Supabase database response.');
    return rows;
  };
  const state = await releaseClassEntry({ request, sql, apply: mode === 'apply' });
  console.log(`Class entry migration ${version}: ${state}.`);
  if (state === 'applied') console.log('Verified history, RLS, invoker functions, ownership/membership policies, close trigger, Realtime and anonymous-access denial.');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
