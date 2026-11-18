import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
const db = new PGlite({ extensions: { pgcrypto } });
const id = (i: number) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
const teacher = id(1),
  foreign = id(2),
  cl = id(10),
  device = id(33),
  otherDevice = id(34);
async function act(uid: string | null, sql: string, args: unknown[] = []) {
  await db.exec(uid ? 'SET ROLE authenticated' : 'SET ROLE anon');
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid ?? '']);
    return (await db.query(sql, args)).rows;
  } finally {
    await db.exec('RESET ROLE');
  }
}
async function call(uid: string | null, sql: string, args: unknown[] = []) {
  const rows = await act(uid, sql, args);
  return Object.values(rows[0] ?? {})[0] as {
    id: string;
    state: string;
    pin: string;
    challenge: string;
    can_add: boolean;
    displayName: string;
  };
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
 CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE classes(id uuid PRIMARY KEY,code text UNIQUE,teacher_uid text, archived_at timestamptz);
 CREATE TABLE public.users(uid text PRIMARY KEY,email text,role text,display_name text,class_code text,avatar text);
 CREATE TABLE auth.users(id uuid PRIMARY KEY,instance_id uuid,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,confirmation_token text,recovery_token text,email_change text,email_change_token_new text,email_change_token_current text,reauthentication_token text,phone_change text,phone_change_token text,created_at timestamptz,updated_at timestamptz);
 CREATE TABLE auth.identities(id uuid PRIMARY KEY,user_id uuid,provider text,provider_id text,identity_data jsonb,last_sign_in_at timestamptz,created_at timestamptz,updated_at timestamptz);
 CREATE TABLE student_profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),unique_id text UNIQUE,display_name text,class_code text,email text,status text,auth_uid uuid,avatar text,roster_created boolean,roster_pin text,approved_at timestamptz,approved_by uuid,anon_seq int);
 CREATE FUNCTION public.is_pro_or_trialing() RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 INSERT INTO classes VALUES ('${cl}','CLASS01','${teacher}',null),('${id(11)}','CLASS02','${foreign}',null);`);
  await db.exec(
    readFileSync('supabase/migrations/20260610_roster_student_auth_hardening.sql', 'utf8')
  );
  const code = readFileSync(
    'supabase/migrations/20260710000000_anonymous_coded_classrooms.sql',
    'utf8'
  );
  await db.exec(
    code.slice(
      code.indexOf('CREATE OR REPLACE FUNCTION public.generate_roster_pin()'),
      code.indexOf('$$;', code.indexOf('CREATE OR REPLACE FUNCTION public.generate_roster_pin()')) +
        3
    )
  );
  await db.exec(readFileSync('supabase/migrations/20261118020000_class_scan_pins.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
describe('PIN delivery during a teacher-opened class session', () => {
  it('issues a new PIN to the requesting phone, then activates exactly one real roster login on approval', async () => {
    expect(await call(null, "SELECT class_pin_availability('CLASS01')")).toBeNull();
    const w = await call(teacher, "SELECT teacher_open_pin_window('CLASS01')");
    const open = await call(null, "SELECT class_pin_availability('CLASS01')");
    expect(open.id).toBe(w.id);
    expect(await call(teacher, "SELECT teacher_open_pin_window('CLASS01')")).toMatchObject({
      id: w.id,
    });
    await expect(call(foreign, "SELECT teacher_open_pin_window('CLASS01')")).rejects.toThrow();
    const request = "SELECT start_class_pin_request('CLASS01',$1,null,'Mint Fox',$2)";
    const first = await call(null, request, [w.id, device]);
    expect(first.pin).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
    expect(await call(null, request, [w.id, device])).toMatchObject({
      id: first.id,
      pin: first.pin,
    });
    await expect(call(null, request, [w.id, otherDevice])).rejects.toThrow('alias_taken');
    expect((await db.query('SELECT id FROM auth.users')).rows).toHaveLength(0);
    const pending = await act(teacher, 'SELECT * FROM teacher_pending_pin_requests($1)', [w.id]);
    expect(pending).toEqual([{ id: first.id, display_name: 'Mint Fox', is_new: true }]);
    await expect(act(null, 'SELECT * FROM class_pin_requests')).rejects.toThrow();
    await expect(
      act(null, 'SELECT teacher_decide_pin_request($1,true,null)', [first.id])
    ).rejects.toThrow();
    await expect(
      act(foreign, 'SELECT teacher_decide_pin_request($1,true,null)', [first.id])
    ).rejects.toThrow();
    await act(teacher, 'SELECT teacher_decide_pin_request($1,true,null)', [first.id]);
    await act(teacher, 'SELECT teacher_decide_pin_request($1,true,null)', [first.id]);
    const read = 'SELECT read_class_pin_request($1,$2,$3)';
    expect(await call(null, read, [first.id, otherDevice, false])).toEqual({ state: 'expired' });
    const ready = await call(null, read, [first.id, device, false]);
    expect(ready).toMatchObject({ state: 'ready', displayName: 'Mint Fox', pin: first.pin });
    expect(
      (
        await db.query(
          'SELECT id FROM auth.users WHERE extensions.crypt($1,encrypted_password)=encrypted_password',
          [first.pin]
        )
      ).rows
    ).toHaveLength(1);
    await call(null, read, [first.id, device, true]);
    expect(await call(null, read, [first.id, device, false])).toEqual({ state: 'done' });
  });
  it('requires the matching phone number before sharing an existing PIN and invalidates grants on transfer or expiry', async () => {
    const w = await call(teacher, "SELECT teacher_open_pin_window('CLASS01')");
    const profile = (
      await db.query<{ id: string }>(
        "SELECT id FROM student_profiles WHERE display_name='Mint Fox'"
      )
    ).rows[0];
    const start = "SELECT start_class_pin_request('CLASS01',$1,$2,null,$3)";
    const r = await call(null, start, [w.id, profile.id, id(44)]);
    expect(r.pin).toBeNull();
    expect(r.challenge).toMatch(/^\d{6}$/);
    const read = 'SELECT read_class_pin_request($1,$2,false)';
    expect(await call(null, read, [r.id, id(44)])).toEqual({ state: 'waiting' });
    await expect(
      call(teacher, 'SELECT teacher_decide_pin_request($1,true,$2)', [r.id, 'wrong'])
    ).rejects.toThrow('wrong_challenge');
    await call(teacher, 'SELECT teacher_decide_pin_request($1,true,$2)', [r.id, r.challenge]);
    expect(await call(null, read, [r.id, id(45)])).toEqual({ state: 'expired' });
    expect(await call(null, read, [r.id, id(44)])).toMatchObject({
      state: 'ready',
      id: profile.id,
    });
    await db.query('UPDATE classes SET teacher_uid=$1 WHERE id=$2', [foreign, cl]);
    expect(await call(null, read, [r.id, id(44)])).toEqual({ state: 'expired' });
    await db.query('UPDATE classes SET teacher_uid=$1 WHERE id=$2', [teacher, cl]);
    await db.query("UPDATE class_pin_windows SET ends_at=now()-interval '1 second' WHERE id=$1", [
      w.id,
    ]);
    expect(await call(null, read, [r.id, id(44)])).toEqual({ state: 'expired' });
    expect(await call(null, "SELECT class_pin_availability('CLASS01')")).toBeNull();
  });
  it('preserves coded classrooms, existing names, withdrawn requests and the free class limit', async () => {
    const w = await call(teacher, "SELECT teacher_open_pin_window('CLASS01')");
    const request = "SELECT start_class_pin_request('CLASS01',$1,null,$2,$3)";
    await expect(call(null, request, [w.id, 'Mint Fox', id(50)])).rejects.toThrow('alias_taken');
    await db.exec("UPDATE student_profiles SET anon_seq=1 WHERE display_name='Mint Fox'");
    expect(await call(null, "SELECT class_pin_availability('CLASS01')")).toMatchObject({
      can_add: false,
    });
    await expect(call(null, request, [w.id, 'New Student', id(52)])).rejects.toThrow('coded_class');
    await db.exec('UPDATE student_profiles SET anon_seq=null');
    const withdrawn = await call(null, request, [w.id, 'River', id(51)]);
    expect(
      await call(null, 'SELECT read_class_pin_request($1,$2,true)', [withdrawn.id, id(51)])
    ).toEqual({ state: 'declined' });
    const fresh = await call(null, request, [w.id, 'River', id(52)]);
    await db.exec(
      "INSERT INTO student_profiles(display_name,class_code,status) SELECT 'S'||i,'CLASS01','approved' FROM generate_series(1,29) i"
    );
    await expect(
      call(teacher, 'SELECT teacher_decide_pin_request($1,true,null)', [fresh.id])
    ).rejects.toThrow('free_tier_student_cap');
  });
});
