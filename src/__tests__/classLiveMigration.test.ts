import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// An isolated PostgreSQL engine runs the real migration and real RLS roles.
// The four existing tables use their current ownership/membership SELECT rules.
const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const teacher = id(1), otherTeacher = id(2), student = id(3), otherStudent = id(4);
const classA = id(10), classB = id(11), foreignClass = id(12), hebrewClass = id(13);
const sessionA = id(20), sessionB = id(21), foreignSession = id(22), hebrewSession = id(23);
async function asUser(uid: string | null, query: string, role = 'authenticated') {
  await db.exec(`SET ROLE ${role};`);
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid ?? '']);
  try { return await db.query(query); } finally { await db.exec('RESET ROLE;'); }
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE users (uid text PRIMARY KEY, role text, class_code text);
    CREATE TABLE classes (id uuid PRIMARY KEY, name text, code text, teacher_uid text, subject text);
    CREATE TABLE student_profiles (id uuid PRIMARY KEY, auth_uid uuid, class_code text, status text);
    CREATE TABLE quick_play_sessions (id uuid PRIMARY KEY, session_code text, teacher_uid text,
      allowed_modes text[], is_active boolean, subject text);
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quick_play_sessions ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON users, classes, student_profiles, quick_play_sessions TO authenticated;
    GRANT SELECT, UPDATE ON quick_play_sessions TO authenticated, service_role;
    CREATE POLICY users_select ON users FOR SELECT TO authenticated USING (uid = auth.uid()::text);
    CREATE POLICY classes_select ON classes FOR SELECT TO authenticated USING
      (teacher_uid = auth.uid()::text OR code = (SELECT class_code FROM users WHERE uid = auth.uid()::text));
    CREATE POLICY profiles_select ON student_profiles FOR SELECT TO authenticated USING (auth_uid = auth.uid());
    CREATE POLICY sessions_select ON quick_play_sessions FOR SELECT TO authenticated USING (is_active OR teacher_uid = auth.uid()::text);
    CREATE POLICY sessions_update ON quick_play_sessions FOR UPDATE TO authenticated USING (teacher_uid = auth.uid()::text);
    CREATE PUBLICATION supabase_realtime;
    INSERT INTO users VALUES ('${teacher}', 'teacher', null), ('${otherTeacher}', 'teacher', null),
      ('${student}', 'student', 'CLASSAAA'), ('${otherStudent}', 'student', 'CLASSBBB');
    INSERT INTO classes VALUES ('${classA}', 'A', 'CLASSAAA', '${teacher}', 'english'),
      ('${classB}', 'B', 'CLASSBBB', '${teacher}', 'english'),
      ('${foreignClass}', 'Foreign', 'CLASSCCC', '${otherTeacher}', 'english'),
      ('${hebrewClass}', 'Hebrew', 'CLASSHEB', '${teacher}', 'hebrew');
    INSERT INTO student_profiles VALUES ('${id(30)}', '${student}', 'CLASSAAA', 'approved'),
      ('${id(31)}', '${otherStudent}', 'CLASSBBB', 'approved');
    INSERT INTO quick_play_sessions VALUES ('${sessionA}', 'ABCD23', '${teacher}', '{classic}', true, 'english'),
      ('${sessionB}', 'EFGH23', '${teacher}', '{speed-round}', true, 'english'),
      ('${foreignSession}', 'JKLM23', '${otherTeacher}', '{classic}', true, 'english'),
      ('${hebrewSession}', 'NPQR23', '${teacher}', '{niqqud}', true, 'hebrew');
  `);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261019175511_class_live_entry.sql', import.meta.url), 'utf8'));
}, 30_000);
afterAll(async () => { await db.close(); });

describe('class live entry RLS', () => {
  it('lets the owner publish and each student discover only their own class', async () => {
    await asUser(teacher, `SELECT set_class_live_session('${classA}', '${sessionA}')`);
    await asUser(teacher, `SELECT set_class_live_session('${classB}', '${sessionB}')`);
    expect((await asUser(student, 'SELECT * FROM get_my_live_class_session()')).rows).toMatchObject([{ class_id: classA, session_code: 'ABCD23' }]);
    expect((await asUser(otherStudent, 'SELECT * FROM get_my_live_class_session()')).rows).toMatchObject([{ class_id: classB, session_code: 'EFGH23' }]);
    expect((await asUser(student, 'SELECT class_id FROM class_live_sessions')).rows).toEqual([{ class_id: classA }]);
    expect((await asUser(teacher, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
  });
  it('rejects foreign classes, foreign sessions, subject mismatches and student publication', async () => {
    for (const [uid, cls, session] of [[teacher, foreignClass, sessionA], [teacher, classA, foreignSession],
      [teacher, hebrewClass, sessionA], [student, classA, sessionA]]) {
      await expect(asUser(uid, `SELECT set_class_live_session('${cls}', '${session}')`)).rejects.toThrow();
    }
    await expect(asUser(null, 'SELECT * FROM get_my_live_class_session()', 'anon')).rejects.toThrow(/permission denied/);
    expect((await asUser(null, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
    expect((await asUser(student, `UPDATE class_live_sessions SET is_open = false RETURNING class_id`)).rows).toEqual([]);
  });
  it('requires approved membership with matching server-owned affiliations', async () => {
    await db.exec(`UPDATE student_profiles SET status = 'pending_approval' WHERE auth_uid = '${student}'`);
    expect((await asUser(student, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
    await db.exec(`UPDATE student_profiles SET status = 'approved', class_code = 'CLASSBBB' WHERE auth_uid = '${student}'`);
    expect((await asUser(student, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
    await db.exec(`UPDATE student_profiles SET class_code = 'CLASSAAA' WHERE auth_uid = '${student}'`);
  });
  it('hides expired or closed lessons and invalidates class entry when the teacher ends a game', async () => {
    await db.exec(`UPDATE class_live_sessions SET opened_at = now() - interval '7 hours', expires_at = now() - interval '1 hour' WHERE class_id = '${classA}'`);
    expect((await asUser(student, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
    await asUser(teacher, `SELECT set_class_live_session('${classA}', '${sessionA}')`);
    await asUser(teacher, `UPDATE class_live_sessions SET is_open = false WHERE class_id = '${classA}'`);
    expect((await asUser(student, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
    await asUser(teacher, `SELECT set_class_live_session('${classA}', '${sessionA}')`);
    await asUser(teacher, `UPDATE quick_play_sessions SET is_active = false WHERE id = '${sessionA}'`);
    expect((await asUser(student, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
    expect((await asUser(teacher, `SELECT is_open FROM class_live_sessions WHERE class_id = '${classA}'`)).rows).toEqual([{ is_open: false }]);
    await expect(asUser(teacher, `SELECT set_class_live_session('${classA}', '${sessionA}')`)).rejects.toThrow();
    await asUser(null, `UPDATE quick_play_sessions SET is_active = false WHERE id = '${sessionB}'`, 'service_role');
    expect((await asUser(otherStudent, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
  });
  it('replaces a class game atomically and stops revealing it after class ownership changes', async () => {
    await db.exec(`INSERT INTO quick_play_sessions VALUES ('${id(24)}', 'STUV23', '${teacher}', '{classic}', true, 'english')`);
    await asUser(teacher, `SELECT set_class_live_session('${classA}', '${id(24)}')`);
    await db.exec(`UPDATE quick_play_sessions SET is_active = true WHERE id = '${sessionA}'`);
    await asUser(teacher, `SELECT set_class_live_session('${classB}', '${sessionA}')`);
    expect((await asUser(otherStudent, 'SELECT * FROM get_my_live_class_session()')).rows).toMatchObject([{ session_id: sessionA }]);
    await db.exec(`UPDATE classes SET teacher_uid = '${otherTeacher}' WHERE id = '${classB}'`);
    expect((await asUser(otherStudent, 'SELECT * FROM get_my_live_class_session()')).rows).toEqual([]);
    expect((await asUser(teacher, `SELECT class_id FROM class_live_sessions WHERE class_id = '${classB}'`)).rows).toEqual([]);
  });
});
