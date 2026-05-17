# Parent Weekly Digest — operator setup

How to wire up the Friday parent-email feature in production. This is
the runbook for the Edge Function that ships with PR #720+. Follow
once when first turning the feature on; thereafter it's hands-off.

Status across phases:

| Phase | What | Where |
|---|---|---|
| **P1** | DB columns on `users` + opt-in UI behind `VITE_PARENT_DIGEST` | merged |
| **P2** | `send_parent_digest` Edge Function + `digest_send_log` table | this doc |
| **P3** | pg_cron Friday 16:00 IL schedule looping over opted-in students | future PR |

---

## Prerequisites

- `supabase` CLI installed locally (`npm i -g supabase` or homebrew)
- Logged in: `supabase login`
- Project linked: `supabase link --project-ref ilbeskwldyrleltnxyrp`
- Migration `20260612000000_parent_digest_optin.sql` already applied (P1 — done in prod 2026-05-16)
- Migration `20260613000000_digest_send_log.sql` applied (P2 — apply via `supabase db push` or the Supabase MCP)

---

## Step 1 — Procure a Resend API key for application sends

Re-using the auth-SMTP key (the one in `RESEND-SMTP-SETUP.md` step 3)
would technically work but conflates blast radius — if either key
leaks you'd have to rotate both flows. Create a second key dedicated
to the digest:

1. Resend dashboard → **API Keys** → **Create API Key**
2. Name: `vocaband-parent-digest`
3. Permission: **Sending access**
4. Domain restriction: select `vocaband.com` (NOT "All domains")
5. **Copy the key** (starts with `re_`) — you'll see it once

---

## Step 2 — Set the function secrets

Edge Functions read env via `Deno.env.get(...)`. Two secrets are
needed beyond what Supabase auto-injects:

```sh
supabase secrets set RESEND_API_KEY=re_your_key_from_step_1
supabase secrets set DIGEST_FROM_EMAIL="Vocaband <noreply@vocaband.com>"
```

`DIGEST_FROM_EMAIL` defaults to `Vocaband <noreply@vocaband.com>` if
unset; only override if the verified Resend domain changes.

Verify with `supabase secrets list` — should include both rows.

---

## Step 3 — Deploy the function

From the repo root:

```sh
supabase functions deploy send_parent_digest
```

JWT verification stays ON (the default). The function itself also
verifies the bearer token matches the service role key as a
belt-and-braces second check — see the `auth` block in `index.ts`.

Confirm deploy with:

```sh
supabase functions list
```

`send_parent_digest` should appear with `verify_jwt: true`.

---

## Step 4 — Smoke test against a single student

Pick a real student with a `parent_email` already set (use Supabase
Studio's table editor to insert one for testing if needed — or flip
`VITE_PARENT_DIGEST=true` in dev and save your own email through the
opt-in card on Privacy Settings).

```sh
SERVICE_KEY=$(supabase secrets list --output json | jq -r '.[] | select(.name=="SUPABASE_SERVICE_ROLE_KEY").value')
PROJECT_REF=ilbeskwldyrleltnxyrp

curl -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"student_uid": "<UID HERE>"}' \
  "https://${PROJECT_REF}.supabase.co/functions/v1/send_parent_digest"
```

Expected response shapes:

| Response | What it means |
|---|---|
| `{ok: true, resend_id: "..."}` | Email queued at Resend — check your inbox |
| `{ok: true, reason: "already_sent"}` | Idempotency win — already sent this week |
| `{ok: false, reason: "no_parent_email"}` | Student hasn't opted in (still 200 so cron treats as "skip") |
| `{ok: false, reason: "missing_resend_key"}` | Step 2 didn't take — re-run `supabase secrets set` |
| `{ok: false, reason: "resend_error", error: "..."}` | Resend returned non-200 — read `error` for cause |

Check Resend dashboard → Logs to see the outbound delivery.

---

## Step 5 — Verify in `digest_send_log`

```sql
SELECT student_uid, week_start_date, parent_email, sent_at, resend_email_id
FROM public.digest_send_log
ORDER BY sent_at DESC
LIMIT 10;
```

Each successful send leaves a row. A re-fire for the same student in
the same week-of returns `already_sent` and DOES NOT add a duplicate
row (UNIQUE constraint).

---

## Step 6 — Roll forward to Phase 3

Once Step 4 succeeds end-to-end (real email arrives in a real inbox,
formatted correctly in the parent's locale), the next PR adds the
pg_cron schedule that loops the function over every opted-in student
every Friday at 16:00 IL. Until then, the function exists but is only
invoked manually.

To temporarily run the loop by hand (e.g. for a backfill):

```sql
SELECT
  uid,
  net.http_post(
    url     := 'https://ilbeskwldyrleltnxyrp.supabase.co/functions/v1/send_parent_digest',
    body    := jsonb_build_object('student_uid', uid),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )
FROM public.users
WHERE parent_email IS NOT NULL
  AND role = 'student';
```

(Requires the `pg_net` extension; will fail with "function net.http_post does not exist" if not enabled — `CREATE EXTENSION pg_net;` first.)

---

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| 401 unauthorized on smoke test | Used anon key instead of service role | Re-pull the service role key from Supabase Project Settings → API |
| `missing_resend_key` even after Step 2 | Function hasn't picked up the new secret | Redeploy the function — secrets are loaded at cold start |
| Email arrives in spam | New sending key, no warm-up | Add `noreply@vocaband.com` to recipient contacts; spam reputation improves over days of consistent sending |
| `bad_week_start_date` | Override passed wrong format | Use ISO 8601 `YYYY-MM-DD` |
| Resend says "domain not verified" | DKIM records dropped for vocaband.com | Re-verify in Resend dashboard → Domains; see `RESEND-SMTP-SETUP.md` Step 2 |

---

## Rolling back

The function is independent of the application — disabling it has
zero user-facing effect (the opt-in card still works, the column
still populates, no emails get sent). Two paths:

1. **Soft disable**: `supabase secrets unset RESEND_API_KEY` →
   subsequent invocations return `missing_resend_key` and roll back
   their idempotency row, so no half-state.
2. **Hard disable**: `supabase functions delete send_parent_digest` →
   the function URL 404s. Cron (when wired) will log errors but the
   data layer is untouched.
