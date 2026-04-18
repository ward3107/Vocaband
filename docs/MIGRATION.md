# Tokyo → Frankfurt Supabase migration runbook

This is a one-shot migration to move the Vocaband production database from
the Tokyo region (ap-northeast-1, ~250 ms from Israel) to Frankfurt
(eu-central-1, ~70 ms from Israel). You only do this once; delete this
doc after the migration is verified.

## Prereqs on your laptop

```bash
brew install supabase/tap/supabase    # Supabase CLI
brew install postgresql@16            # pg_dump + psql
node --version                        # ≥ 20
```

If you're on Windows, use WSL — the `migrate-db.sh` script is bash.

## Values you need before starting

| From | Where to find it |
|---|---|
| **Tokyo DB password** | You saved it when creating the Tokyo project. If lost: Tokyo dashboard → Project Settings → Database → Reset database password |
| **Tokyo service_role key** | Tokyo dashboard → Project Settings → API → service_role → Reveal |
| **Tokyo project ref** | The 20-char string in the Tokyo dashboard URL |
| **Frankfurt DB password** | What you saved when creating the Frankfurt project |
| **Frankfurt service_role key** | Frankfurt dashboard → Project Settings → API → service_role → Reveal |

## Step 1 — Write `.env.migrate`

```bash
cp .env.migrate.example .env.migrate
# Edit .env.migrate and fill in all six values.
# The file is git-ignored, but delete it after the migration anyway.
```

## Step 2 — Migrate database

```bash
./scripts/migrate-db.sh
```

This runs `pg_dump` against Tokyo, pipes into `psql` on Frankfurt, then
compares row counts per table. A clean run ends with:

```
✓ Database migration complete. Tables match.
```

If row counts don't match, re-read `migrate-dumps/restore-<timestamp>.log`
for errors and fix before continuing.

## Step 3 — Migrate storage

```bash
npx tsx scripts/migrate-storage.ts
```

This mirrors every bucket (`sound`, `motivational`, etc.) from Tokyo to
Frankfurt. ~9 000 audio files takes ~5 minutes on a decent connection.

## Step 4 — Smoke test Frankfurt in isolation

**Don't flip any env vars yet.** Instead, open Frankfurt's SQL editor
and run a few manual checks:

```sql
SELECT COUNT(*) FROM public.users;                 -- should match Tokyo
SELECT COUNT(*) FROM public.assignments;
SELECT COUNT(*) FROM public.progress;
SELECT COUNT(*) FROM auth.users;
```

Also try signing in to the Supabase dashboard's Authentication → Users
panel — you should see all the Tokyo users.

## Step 5 — Cutover (the risky ~10-minute window)

Do this during low-traffic hours (late evening Israel time). No demo in
progress.

1. **Remove custom domain from Tokyo.** Supabase dashboard → Tokyo →
   Settings → Custom Domains → **Delete** `auth.vocaband.com`.
2. **Activate custom domain on Frankfurt.** Supabase dashboard →
   Frankfurt → Settings → Custom Domains → Activate → enter
   `auth.vocaband.com`. It'll show a CNAME verification.
3. **Update Cloudflare DNS.** Cloudflare dashboard → `vocaband.com` →
   DNS → find the existing CNAME for `auth` → edit the target to
   `<your-frankfurt-ref>.supabase.co` (the new project's raw URL, which
   you can see in the Frankfurt dashboard → Project Settings → API).
   Keep "Proxy status" as **DNS only** (grey cloud).
4. **Wait 3–5 min** for Supabase to verify the CNAME and issue a TLS
   cert. The custom domain status flips to "Active".
5. **Update env vars** (all six, using the custom domain not the raw
   URL):
   - **Render**
     - `SUPABASE_URL` = `https://auth.vocaband.com`
     - `SUPABASE_SERVICE_ROLE_KEY` = Frankfurt's service_role
   - **Cloudflare Workers** (Settings → Variables and Secrets)
     - `VITE_SUPABASE_URL` = `https://auth.vocaband.com`
     - `VITE_SUPABASE_ANON_KEY` = Frankfurt's anon
   - **GitHub Actions** (Settings → Secrets → Actions)
     - `SUPABASE_PROJECT_REF` = the new Frankfurt project's ref (20-char string in the dashboard URL)
     - `SUPABASE_DB_PASSWORD` = Frankfurt's DB password
6. **Redeploy** — Render auto-redeploys on env change; Cloudflare needs
   one manual redeploy (Workers → Deployments → Redeploy last commit).
7. **Smoke test production:** open the site in an incognito window,
   sign in, create a test class, create a test assignment, log in as a
   student, play one round. If anything fails, check the browser
   console + Render logs.

## Step 6 — Lock down Tokyo

Once Frankfurt has been running cleanly for 24 hours:

1. Supabase dashboard → Tokyo → Project Settings → General → **Pause
   project.** Doesn't delete it; just freezes it so nothing writes.
2. Wait a full week.
3. If everything still looks good on Frankfurt, delete the Tokyo
   project.

## Rollback

If anything goes catastrophically wrong mid-cutover:

1. Cloudflare DNS → revert the `auth` CNAME target to the Tokyo raw
   URL.
2. Supabase: re-attach custom domain to Tokyo, remove from Frankfurt.
3. Render / Cloudflare env vars → revert to Tokyo values.
4. Tokyo is still the source of truth (we never wrote to it), so no
   data loss.

## Clean up

After you're happy with Frankfurt:

```bash
rm .env.migrate
rm -rf migrate-dumps/   # the SQL dumps contain user data — delete them
```
