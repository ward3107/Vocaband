# Granting Teacher Access — Three Independent Gates

Three separate Supabase tables/columns gate what a teacher can do. You have to set them all for full feature access. All edits go in **Supabase Dashboard → SQL Editor**.

---

## The three gates

| Gate | Table / column | What it controls |
|---|---|---|
| Sign-up eligibility | `public.teacher_allowlist` (email) | Whether someone can sign up as teacher. RLS on `public.users` insert calls `is_teacher_allowed(email)`. |
| Role flag | `public.users.role = 'teacher'` | Set automatically on first sign-up if email is in `teacher_allowlist`. **OCR access is gated on this alone — no separate OCR allowlist.** |
| AI sentences | `public.ai_allowlist` (email) | Extra gate on top of `role='teacher'`. Controls AI Sentence Builder button in assignment wizard Step 3. |

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
-- AI only (keep them as teacher)
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
