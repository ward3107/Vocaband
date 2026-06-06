# Granting Teacher Access — Three Independent Gates

Three separate Supabase tables/columns gate what a teacher can do. You have to set them all for full feature access. All edits go in **Supabase Dashboard → SQL Editor**.

---

## The three gates

| Gate | Table / column | What it controls |
|---|---|---|
| Sign-up eligibility | `public.teacher_allowlist` (email) | Whether someone can sign up as teacher. RLS on `public.users` insert calls `is_teacher_allowed(email)`. |
| Role flag | `public.users.role = 'teacher'` | Set automatically on first sign-up if email is in `teacher_allowlist`. **OCR access is gated on this alone — no separate OCR allowlist.** |
| Vocabagrut | `public.ai_allowlist` (email) | Extra opt-in gate for the **Vocabagrut** mock-exam generator only. The main AI features (sentence generation, OCR, worksheets) are gated by plan/trial, **not** this table. |

> **Per-teacher AI kill-switch.** `public.users.ai_disabled` (boolean, default
> `false`) is an admin override that turns **all** AI off for one teacher —
> including a teacher mid-14-day-trial — regardless of plan/trial or
> `ai_allowlist`. Flip it from the **Developer Dashboard → Database →
> Entitlements** panel (the green/rose **AI on/off** button), or via the
> `admin_set_ai_disabled(p_uid, p_disabled)` RPC. It is pinned against
> self-edit, so a blocked teacher cannot clear it from DevTools.

---

## Standard onboarding (do BEFORE teacher first signs in)

```sql
-- Replace teacher@school.edu with real email; keep lowercase
INSERT INTO public.teacher_allowlist (email)
VALUES (lower('teacher@school.edu')) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.ai_allowlist (email)
VALUES (lower('teacher@school.edu')) ON CONFLICT (email) DO NOTHING;
```

After both rows exist, teacher signs in with Google → role set to `teacher` automatically → OCR + AI both work.

---

## Bulk add

```sql
INSERT INTO public.teacher_allowlist (email) VALUES
  (lower('alice@school.edu')),
  (lower('bob@school.edu')),
  (lower('carol@school.edu'))
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.ai_allowlist (email) VALUES
  (lower('alice@school.edu')),
  (lower('bob@school.edu')),
  (lower('carol@school.edu'))
ON CONFLICT (email) DO NOTHING;
```

---

## Promoting an already-signed-up student to teacher

If user OAuth'd in before being allowlisted, they got auto-routed to `role='student'`. Promote them:

```sql
-- 1. Add email to both allowlists (as above).
-- 2. Update existing users row.
UPDATE public.users
SET role = 'teacher'
WHERE lower(email) = lower('teacher@school.edu');
```

They need to sign out and back in for JWT to refresh with new role claim.

---

## Verifying access

```sql
-- All three should return one row for a fully-onboarded teacher
SELECT email FROM public.teacher_allowlist WHERE lower(email) = lower('teacher@school.edu');
SELECT email FROM public.ai_allowlist        WHERE lower(email) = lower('teacher@school.edu');
SELECT id, email, role FROM public.users     WHERE lower(email) = lower('teacher@school.edu');
```

After sign-in, confirm AI works by opening assignment wizard and watching Fly logs:

```
[features] aiSentences=true for teacher@school.edu
```

If you see `aiSentences=false: <email> is not in ai_allowlist`, you missed step 2.

---

## Revoking access

```sql
-- Kill all AI for one teacher (keep their plan/trial intact). Reverse with false.
-- Prefer the Developer Dashboard button; this is the SQL equivalent.
SELECT public.admin_set_ai_disabled(
  (SELECT uid FROM public.users WHERE lower(email) = lower('teacher@school.edu')),
  true
);

-- Vocabagrut only (keep them as teacher)
DELETE FROM public.ai_allowlist WHERE lower(email) = lower('teacher@school.edu');

-- Block future sign-ups (does NOT touch existing accounts)
DELETE FROM public.teacher_allowlist WHERE lower(email) = lower('teacher@school.edu');

-- Demote existing teacher back to student
UPDATE public.users SET role = 'student'
WHERE lower(email) = lower('teacher@school.edu');
```

---

## Common gotchas

- **Email casing.** Both tables are plain TEXT — `Teacher@School.edu` ≠ `teacher@school.edu`. Always `lower(...)`.
- **OCR has no separate allowlist.** If teacher's role is correct, OCR works. No additional row.
- **`ai_allowlist` table missing?** Migration is `20260417120000_ai_sentence_builder.sql`. Run it first.

---

## Granting school-manager (principal) access

A **manager** is a read-only overseer of one school: they see every teacher,
class, student, and engagement metric *in their own school only* — distinct
from `admin`, which sees the whole app. Schema lives in migration
`20260623000000_school_manager.sql` (`schools` table + `users.school_id` +
`role='manager'` + school-scoped RLS). There is **no self-serve school
onboarding** — the operator provisions everything below.

```sql
-- 1. Create the school (note the returned id).
INSERT INTO public.schools (name) VALUES ('Example High') RETURNING id;

-- 2. Allowlist the principal's email so they can sign in via the teacher login.
INSERT INTO public.teacher_allowlist (email)
VALUES (lower('head@example.com')) ON CONFLICT (email) DO NOTHING;

-- 3. Principal signs in once with Google/OTP. This mints a role='teacher' row
--    (and lands them on the teacher dashboard for that one session).

-- 4. Flip them to manager and attach the school.
UPDATE public.users
SET role = 'manager', school_id = '<school-uuid-from-step-1>'
WHERE lower(email) = lower('head@example.com');

-- 5. Attach the school's teachers (a class's school is derived from its
--    teacher, so you only set school_id on teacher rows, never on classes).
UPDATE public.users
SET school_id = '<school-uuid-from-step-1>'
WHERE lower(email) IN (lower('alice@example.com'), lower('bob@example.com'));
```

The principal signs out/in once more after step 4 to refresh their JWT, then
lands on the **Principal dashboard** (`manager-dashboard` view). All data is
served by the `manager_overview()` RPC, which self-scopes to their school.

**Gotchas**

- **First login is always a teacher.** A `public.users` row can't exist before
  the user's first auth (uid must match `auth.uid()`), so the role flip in
  step 4 happens *after* their first sign-in. Expected, not a bug.
- **Managers are read-only (v1).** No write policies — they can't edit a
  teacher's classes or assignments. Promote/demote is just the `role` column.
- **Privacy.** Never give a real principal `role='admin'` as a shortcut — admin
  reads *every* school. Use `manager` so RLS confines them to their own.
