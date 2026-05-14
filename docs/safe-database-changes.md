# Safe database changes — checklist

> Read this before writing any migration in `supabase/migrations/`.
> The rule of thumb: **old code must keep working through every step.**

A bad migration during a live class can lock kids out of an assignment, blank a leaderboard, or corrupt progress for an entire school. Almost every "I broke production" story below could have been prevented with the checklist on this page.

---

## The one rule that prevents 95% of disasters

> **Add first, deploy code, then clean up later. Never in one shot.**

The trap: you change a column name, deploy in one commit, and for ~30 seconds during the deploy some users are running OLD code against the NEW schema. Old code crashes. A teacher's screen goes white. They email you angrily.

The fix: split every "rename" / "remove" / "type change" into **two deploys** with at least 24 hours between them.

---

## Safe-change patterns

### ➕ Adding a column

**SAFE.** Old code ignores the new column. New code uses it. Deploy in any order.

```sql
ALTER TABLE public.users ADD COLUMN new_thing text;
```

✅ Ship it.

---

### ❌ Removing a column

**NOT safe in one shot.** Old code still reads `old_thing` — if you drop it before old code is gone, every old client crashes.

**Two-deploy pattern:**

**Deploy 1 (today):**
- Update the code to stop reading/writing `old_thing`
- Ship it. Old column still exists; new code just ignores it.

**Deploy 2 (next week, after all CDN caches expire):**
- Run the migration that drops the column:
  ```sql
  ALTER TABLE public.users DROP COLUMN old_thing;
  ```

If you're unsure whether old clients are still out there, check Sentry for the past week — any "column does not exist" errors? If yes, wait longer. If no, drop.

---

### 🔄 Renaming a column

**NOT safe.** Same problem as removing — old code reads the old name.

**Three-deploy pattern:**

**Deploy 1:** Add the new column. Backfill from old column.
```sql
ALTER TABLE public.users ADD COLUMN display_name_v2 text;
UPDATE public.users SET display_name_v2 = display_name WHERE display_name_v2 IS NULL;
```

**Deploy 2:** Update code to:
- Write to both columns (keeps old code working)
- Read from new column

**Deploy 3 (next week):** Drop the old column.

For a small app like Vocaband, you can usually compress this into "rename it in the migration but keep both columns sync'd via a trigger for a week." Either works.

---

### 🔁 Changing a column type

**NOT safe.** Same trap.

**Two-deploy pattern:**

**Deploy 1:** Add a new column of the new type. Backfill. Code reads/writes both.
**Deploy 2 (next week):** Drop the old column. Code now only uses the new column.

---

### 📋 Adding a NOT NULL constraint

**NOT safe in one shot** if the table has existing rows that might be NULL — the migration errors out and aborts.

**Safe pattern:**

```sql
-- 1. Add nullable first
ALTER TABLE public.users ADD COLUMN required_thing text;

-- 2. Backfill every row with a sensible default
UPDATE public.users SET required_thing = 'default' WHERE required_thing IS NULL;

-- 3. NOW add the constraint
ALTER TABLE public.users ALTER COLUMN required_thing SET NOT NULL;
```

---

### 🗂️ Adding an index on a large table

**Use `CONCURRENTLY`** so the index build doesn't lock the table.

```sql
CREATE INDEX CONCURRENTLY idx_progress_student_uid ON public.progress(student_uid);
```

`CONCURRENTLY` can't run inside a transaction — so it can't sit inside a `BEGIN; ... COMMIT;` block. Either put it in its own migration file or split it out.

---

### 🔐 Changing an RLS policy

**Safe if the new policy is at least as permissive as the old one.** Risky if you tighten — old reads/writes that worked yesterday start failing.

**Pattern for tightening:**

1. Add a SECURITY DEFINER function that bundles the check (so you can update it without changing every policy)
2. Update the policy WITH CHECK / USING clauses
3. Test against a real authenticated session in the SQL editor: `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO 'some-uid';` then run the query

If you don't test, you're guessing. RLS bugs are usually silent — the query returns 0 rows instead of throwing — so users see "empty class" instead of "permission denied."

---

## The pre-merge checklist

Before opening a PR that touches `supabase/migrations/`, confirm:

- [ ] **Reversible:** does my migration have a documented rollback plan in the trailing comments? (Look at `20260606_f3_progress_score_cap.sql` for the format.)
- [ ] **Old code still works:** if I deploy this migration WITHOUT shipping new code, do any pages crash? (If yes, you're doing a destructive change — split it.)
- [ ] **No giant locks:** for big tables (`progress`, `word_attempts`, `users`), did I use `CONCURRENTLY` on indexes and avoid `ALTER TABLE ... ALTER COLUMN ... TYPE`? Both lock the entire table.
- [ ] **Idempotent:** `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `ON CONFLICT DO NOTHING` for seeds. So re-running the migration doesn't break.
- [ ] **Verification queries:** the file's trailing comments include 1–3 manual SQL queries the operator can run after `apply_migration` to confirm the change took effect.
- [ ] **RLS tested:** if RLS policies changed, I tested with `SET LOCAL ROLE authenticated` in the SQL editor against at least one realistic UID.
- [ ] **Feature-flagged if possible:** if the new column or table powers a new feature, the code reading it is wrapped in `isFlagOn('feature_name')` so it stays invisible until I flip the switch.

---

## The deploy-day checklist

When you're actually applying the migration to production:

1. **Off-hours.** Push migrations outside Israeli school hours: before 06:00 or after 15:00 Asia/Jerusalem, Sun–Thu. Fri/Sat are also fine.
2. **Check Sentry first.** Any unresolved issues in the last hour? Don't push on top of an active fire.
3. **Apply, then verify.** Run the verification queries from the migration's trailing comments. Don't trust "success: true" alone — run a `SELECT` against the new column / new policy.
4. **Watch Sentry for 30 minutes.** If error rate spikes, roll back (rollback plan is in the migration's trailing comments — that's why you wrote it).
5. **Then deploy the code that uses the new schema.** Migration first, code second, never in parallel.

---

## When things go wrong — the rollback ladder

In order of preference:

1. **Feature flag off.** If the broken feature is behind `isFlagOn(...)`, flip the flag to false. Effect: ~60 seconds.
2. **Revert the code deploy.** Fly.io: `fly releases --app vocaband` → `fly deploy --image <previous-image>`. Cloudflare Worker: `wrangler rollback`. Effect: ~30 seconds. Migration stays.
3. **Apply a reverse migration.** Only as a last resort, since schema rollbacks can lose data. Use the rollback plan in the migration's trailing comments.
4. **Restore from PITR.** Supabase Pro keeps point-in-time backups. Nuclear option — only when data has been corrupted.

---

## See also

- `docs/supabase-patterns.md` — cost-conscious query patterns
- `supabase/migrations/20260606_f3_progress_score_cap.sql` — example of a well-documented migration (rationale, verification, rollback)
- `supabase/migrations/20260514_feature_flags.sql` — the feature flag table that enables safe gradual rollouts
