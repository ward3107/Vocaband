import { createHash } from 'node:crypto';

export const scanPinVersion = '20261118020000';
export const scanPinMigrationUrl = new URL(`../supabase/migrations/${scanPinVersion}_class_scan_pins.sql`, import.meta.url);
const approvedHash = '6d1f34b629e841c4ef1048c5fd4066893b281828d26cbb54e6a5a0dfa11d43bf';
const functions = [
  ['teacher_open_pin_window(text)', false],
  ['class_pin_availability(text)', true],
  ['start_class_pin_request(text,uuid,uuid,text,uuid)', true],
  ['teacher_pending_pin_requests(uuid)', false],
  ['teacher_decide_pin_request(uuid,boolean,text)', false],
  ['read_class_pin_request(uuid,uuid,boolean)', true],
];

export const scanPinStatusQuery = `
  WITH expected(signature, allow_anon) AS (VALUES
    ${functions.map(([signature, allowed]) => `('public.${signature}', ${allowed})`).join(',\n    ')}
  ), present_functions AS (
    SELECT e.signature, p.prosrc AS body,
      (p.prosecdef AND p.proconfig @> ARRAY['search_path=""']
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND has_function_privilege('anon', p.oid, 'EXECUTE') = e.allow_anon
        AND NOT pg_has_role('authenticated', p.proowner, 'MEMBER')
        AND NOT pg_has_role('anon', p.proowner, 'MEMBER')) AS safe
    FROM expected e JOIN pg_proc p ON p.oid = to_regprocedure(e.signature)
  ), present_tables AS (
    SELECT c.oid, c.relrowsecurity AND c.relkind = 'r'
      AND NOT has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      AND NOT has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      AND NOT pg_has_role('anon', c.relowner, 'MEMBER')
      AND NOT pg_has_role('authenticated', c.relowner, 'MEMBER') AS safe
    FROM pg_class c
    WHERE c.oid IN (to_regclass('public.class_pin_windows'), to_regclass('public.class_pin_requests'))
  )
  SELECT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '${scanPinVersion}') AS recorded,
    (SELECT count(*)::int FROM present_tables) AS tables_present,
    (SELECT bool_and(safe) FROM present_tables) AS tables_safe,
    COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM present_functions f), '[]'::jsonb) AS functions,
    (SELECT count(*) = 2 AND NOT bool_or(rolsuper OR rolbypassrls)
      FROM pg_roles WHERE rolname IN ('anon', 'authenticated')) AS client_roles_safe,
    (to_regclass('public.classes') IS NOT NULL AND to_regclass('public.student_profiles') IS NOT NULL
      AND to_regprocedure('public.teacher_create_roster_student(text,text,text,text)') IS NOT NULL
      AND to_regprocedure('public.is_pro_or_trialing()') IS NOT NULL) AS prerequisites_ready`;

function scanPinState(row, sql) {
  if (!row?.prerequisites_ready || !row.client_roles_safe || !Array.isArray(row.functions)) {
    throw new Error('The classroom PIN migration prerequisites could not be verified.');
  }
  if (row.recorded === false && row.tables_present === 0 && row.functions.length === 0) return 'pending';

  const bodies = new Map(Array.from(sql.matchAll(/CREATE FUNCTION public\.(\w+)\([\s\S]*? AS \$\$([\s\S]*?)\$\$;/g),
    ([, name, body]) => [`public.${name}`, body]));
  if (row.recorded === true && row.tables_present === 2 && row.tables_safe === true
    && row.functions.length === functions.length
    && row.functions.every(f => f.safe === true && bodies.get(f.signature.split('(')[0]) === f.body)) return 'applied';

  throw new Error('The classroom PIN schema or permission checks do not match the reviewed migration.');
}

export function scanPinTransaction(sql) {
  if (createHash('sha256').update(sql).digest('hex') !== approvedHash) {
    throw new Error('The classroom PIN migration differs from the reviewed release.');
  }
  const sourceTag = '$vocaband_scan_pin_source$';
  return sql.replace(/^BEGIN;/, "BEGIN;\nSET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '45s';\nSELECT pg_advisory_xact_lock(20261118, 20000);")
    .replace(/\nCOMMIT;\s*$/, () => `\nINSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('${scanPinVersion}', 'class_scan_pins', ARRAY[${sourceTag}${sql}${sourceTag}]);\nCOMMIT;\n`);
}

export async function releaseScanPins({ request, sql, apply = false }) {
  const transaction = scanPinTransaction(sql);
  const check = async () => scanPinState((await request({ query: scanPinStatusQuery, read_only: true }))[0], sql);
  const before = await check();
  if (!apply || before === 'applied') return before;
  await request({ query: transaction, read_only: false });
  const after = await check();
  if (after !== 'applied') throw new Error('The classroom PIN migration did not pass verification.');
  return after;
}
