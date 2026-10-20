import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const version = '20261019175511';
export const migrationUrl = new URL(`../supabase/migrations/${version}_class_live_entry.sql`, import.meta.url);
const approvedHash = '6f271c87a5655e2bf4d2f24b434a80e37cc2fed2d0a5cfc2a3866fb754e8d185';
const approvedSchema = JSON.parse(readFileSync(new URL('./class-entry-approved-schema.json', import.meta.url), 'utf8'));

// Canonical PostgreSQL definitions generated from the checksum-pinned SQL.
// Roles, commands, permissiveness and both predicates must all match; an
// additional permissive policy would otherwise widen access despite RLS.
const approvedPolicies = [
  {
    "policyname": "class_live_owner",
    "permissive": "PERMISSIVE",
    "roles": [
      "authenticated"
    ],
    "cmd": "ALL",
    "qual": "((teacher_uid = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1\n   FROM classes c\n  WHERE ((c.id = class_live_sessions.class_id) AND (c.teacher_uid = (( SELECT auth.uid() AS uid))::text)))) AND (EXISTS ( SELECT 1\n   FROM quick_play_sessions s\n  WHERE ((s.id = class_live_sessions.session_id) AND (s.teacher_uid = (( SELECT auth.uid() AS uid))::text)))))",
    "with_check": "((teacher_uid = (( SELECT auth.uid() AS uid))::text) AND (opened_at <= (now() + '00:01:00'::interval)) AND (expires_at <= (now() + '06:00:00'::interval)) AND (EXISTS ( SELECT 1\n   FROM (classes c\n     JOIN quick_play_sessions s ON ((s.teacher_uid = c.teacher_uid)))\n  WHERE ((c.id = class_live_sessions.class_id) AND (s.id = class_live_sessions.session_id) AND (c.teacher_uid = (( SELECT auth.uid() AS uid))::text) AND ((NOT class_live_sessions.is_open) OR ((COALESCE(c.subject, 'english'::text) = COALESCE(s.subject, 'english'::text)) AND (s.is_active = true)))))))"
  },
  {
    "policyname": "class_live_student",
    "permissive": "PERMISSIVE",
    "roles": [
      "authenticated"
    ],
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM ((classes c\n     JOIN users u ON ((u.class_code = c.code)))\n     JOIN student_profiles p ON ((((p.auth_uid)::text = u.uid) AND (p.class_code = c.code) AND (p.status = 'approved'::text))))\n  WHERE ((c.id = class_live_sessions.class_id) AND (c.teacher_uid = class_live_sessions.teacher_uid) AND (u.uid = (( SELECT auth.uid() AS uid))::text) AND (u.role = 'student'::text))))",
    "with_check": null
  }
];

// Only metadata is returned; this release never reads student or teacher rows.
// Nullability is checked through pg_attribute, since PostgreSQL 18 also adds
// NOT NULL entries to pg_constraint that older production versions omit.
export const statusQuery = `SELECT
  (SELECT count(*) = 3 FROM information_schema.columns WHERE table_schema = 'supabase_migrations'
    AND table_name = 'schema_migrations' AND column_name IN ('version', 'name', 'statements'))
    AND (SELECT count(*) = 4 FROM information_schema.tables WHERE table_schema = 'public'
      AND table_name IN ('classes', 'users', 'student_profiles', 'quick_play_sessions'))
    AND EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AS prerequisites_ready,
  EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '${version}') AS recorded,
  to_regclass('public.class_live_sessions') IS NOT NULL AS bridge_table,
  EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.class_live_sessions') AND relrowsecurity) AS rls,
  EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.class_live_sessions')
    AND NOT pg_has_role('authenticated', relowner, 'MEMBER') AND NOT pg_has_role('anon', relowner, 'MEMBER'))
    AND NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname IN ('set_class_live_session', 'get_my_live_class_session', 'close_class_entry_on_session_end')
      AND (pg_has_role('authenticated', p.proowner, 'MEMBER') OR pg_has_role('anon', p.proowner, 'MEMBER'))) AS client_ownership_safe,
  NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('authenticated', 'anon') AND (rolsuper OR rolbypassrls)) AS client_roles_safe,
  EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.set_class_live_session(uuid,uuid)') AND NOT prosecdef) AS publish_invoker,
  EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.get_my_live_class_session()') AND NOT prosecdef) AS discover_invoker,
  EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.close_class_entry_on_session_end()') AND NOT prosecdef) AS close_invoker,
  (SELECT count(*) = 2 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'class_live_sessions'
    AND policyname IN ('class_live_owner', 'class_live_student')) AS policies,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('policyname', policyname, 'permissive', permissive,
    'roles', roles, 'cmd', cmd, 'qual', qual, 'with_check', with_check) ORDER BY policyname), '[]'::jsonb)
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'class_live_sessions') AS policy_definitions,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.quick_play_sessions')
    AND tgname = 'close_class_entry_on_session_end' AND NOT tgisinternal AND tgenabled != 'D') AS close_trigger,
  EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public' AND tablename = 'class_live_sessions') AS realtime,
  jsonb_build_object(
    'functions', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname, 'language', l.lanname, 'body', p.prosrc,
      'arguments', pg_get_function_identity_arguments(p.oid), 'returns', pg_get_function_result(p.oid),
      'config', p.proconfig, 'security_definer', p.prosecdef, 'volatility', p.provolatile,
      'strict', p.proisstrict, 'leakproof', p.proleakproof, 'parallel', p.proparallel, 'kind', p.prokind
    ) ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::jsonb)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public' AND p.proname IN ('set_class_live_session', 'get_my_live_class_session', 'close_class_entry_on_session_end')),
    'columns', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull,
      'identity', a.attidentity, 'generated', a.attgenerated, 'definition', pg_get_expr(d.adbin, d.adrelid)
    ) ORDER BY a.attnum), '[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = to_regclass('public.class_live_sessions') AND a.attnum > 0 AND NOT a.attisdropped),
    'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', c.conname, 'type', c.contype, 'validated', c.convalidated, 'deferrable', c.condeferrable,
      'deferred', c.condeferred, 'definition', pg_get_constraintdef(c.oid)
    ) ORDER BY c.conname), '[]'::jsonb) FROM pg_constraint c WHERE c.conrelid = to_regclass('public.class_live_sessions') AND c.contype != 'n'),
    'indexes', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', r.relname, 'valid', i.indisvalid, 'ready', i.indisready, 'definition', pg_get_indexdef(i.indexrelid)
    ) ORDER BY r.relname), '[]'::jsonb) FROM pg_index i JOIN pg_class r ON r.oid = i.indexrelid
    WHERE i.indrelid = to_regclass('public.class_live_sessions')),
    'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid)
    ) ORDER BY t.tgname), '[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid = to_regclass('public.quick_play_sessions')
    AND NOT t.tgisinternal AND (t.tgname = 'close_class_entry_on_session_end'
      OR t.tgfoid = to_regprocedure('public.close_class_entry_on_session_end()')))
  ) AS schema_definition,
  (SELECT bool_and(coalesce(has_table_privilege('authenticated', to_regclass('public.class_live_sessions'), privilege), false))
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS privilege)
    AND coalesce(has_function_privilege('authenticated', to_regprocedure('public.get_my_live_class_session()'), 'EXECUTE'), false)
    AND coalesce(has_function_privilege('authenticated', to_regprocedure('public.set_class_live_session(uuid,uuid)'), 'EXECUTE'), false)
    AND NOT coalesce(has_function_privilege('authenticated', to_regprocedure('public.close_class_entry_on_session_end()'), 'EXECUTE'), false) AS authenticated_allowed,
  (SELECT bool_and(coalesce(has_table_privilege('service_role', to_regclass('public.class_live_sessions'), privilege), false))
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS privilege) AS service_allowed,
  (SELECT NOT bool_or(coalesce(has_table_privilege('anon', to_regclass('public.class_live_sessions'), privilege), false))
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS privilege)
    AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.get_my_live_class_session()'), 'EXECUTE'), false)
    AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.set_class_live_session(uuid,uuid)'), 'EXECUTE'), false)
    AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.close_class_entry_on_session_end()'), 'EXECUTE'), false) AS anon_blocked`;

const schemaChecks = ['bridge_table', 'rls', 'publish_invoker', 'discover_invoker', 'close_invoker', 'policies', 'close_trigger', 'realtime'];

function predicateTokens(value) {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  // Ignore formatting outside quoted strings while retaining parentheses,
  // operators and literal contents, including whitespace inside literals.
  return value.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|[a-zA-Z_][a-zA-Z_0-9$]*|::|<=|>=|<>|!=|[^\s]/g)
    ?.map(token => /^["']/.test(token) ? token : token.toLowerCase()).join(' ');
}

function policiesMatch(actual) {
  if (!Array.isArray(actual) || actual.length !== approvedPolicies.length) return false;
  return approvedPolicies.every(expected => {
    const policy = actual.find(item => item.policyname === expected.policyname);
    return policy && policy.permissive === expected.permissive && policy.cmd === expected.cmd
      && Array.isArray(policy.roles) && policy.roles.length === 1 && policy.roles[0] === 'authenticated'
      && predicateTokens(policy.qual) === predicateTokens(expected.qual)
      && predicateTokens(policy.with_check) === predicateTokens(expected.with_check);
  });
}

function canonicalSchema(value, key) {
  if (['definition', 'arguments', 'returns'].includes(key) && typeof value === 'string') return predicateTokens(value);
  if (Array.isArray(value)) return value.map(item => canonicalSchema(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(name => [name, canonicalSchema(value[name], name)]));
  return value;
}

export function migrationState(row) {
  if (!row || row.prerequisites_ready !== true) throw new Error('Required database objects or migration history are unavailable.');
  if (row.client_roles_safe !== true) throw new Error('Client roles can bypass row security; stopping before applying the release.');
  if (row.recorded === true && row.anon_blocked === true && row.authenticated_allowed === true && row.client_ownership_safe === true
    && row.service_allowed === true && schemaChecks.every(key => row[key] === true)
    && policiesMatch(row.policy_definitions)
    && JSON.stringify(canonicalSchema(row.schema_definition)) === JSON.stringify(canonicalSchema(approvedSchema))) return 'applied';
  if (row.recorded === false && schemaChecks.every(key => row[key] === false)
    && Array.isArray(row.policy_definitions) && row.policy_definitions.length === 0
    && row.schema_definition && Object.keys(approvedSchema).every(key => Array.isArray(row.schema_definition[key]) && row.schema_definition[key].length === 0)) return 'pending';
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
  if (state === 'applied') console.log('Verified history, RLS, complete function and policy definitions, columns, constraints, indexes, close trigger, Realtime, authenticated/service privileges and anonymous-access denial.');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
