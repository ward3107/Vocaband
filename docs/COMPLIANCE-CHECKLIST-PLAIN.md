# Vocaband — What you actually need to do at 5 users (plain English)

> Six legal requirements apply even at 5 users.  This doc walks through
> each one in plain English: what it means, what's already done, and
> what concrete action you (or no one) need to take.
>
> **Good news:** Vocaband already implements 5 of the 6 in code.  Most
> rows are "verify it works" or "no action needed."  Only #1 (privacy
> policy) genuinely needs human attention this week.

> Last updated 2026-05-04.

---

## How to use this doc

Each task has four sections:

1. **What it means** — plain English, no legal jargon.
2. **Why the law cares** — the specific legal hook.
3. **What we already have** — pointer to existing code / docs.
4. **What you need to do** — concrete steps with copy-pasteable commands or links.

Work through them top to bottom.  Total time: about **2 hours** for tasks 1+6.  The other 4 are "verify and move on."

---

## Task 1 — Privacy policy in Hebrew at /privacy

### What it means

A clear, written explanation of what data you collect, how you use it, who sees it, and how a user can ask for it back / get it deleted.  Must be **in Hebrew**, must be **accessible** (linked from the app), and must be **truthful** (matches what the app actually does).

### Why the law cares

חוק הגנת הפרטיות § 11 — "informational duty."  Anyone collecting personal data has to tell the data subject in advance.  No scale threshold; applies even at 1 user.

### What we already have

- `vocaband.com/privacy` is live with a Hebrew + English + Arabic privacy policy.
- Source: `src/components/PublicPrivacyPage.tsx`.
- Versioned: `src/config/privacy-config.ts → PRIVACY_POLICY_VERSION = "2024-03-01"`.
- Mentions all sub-processors (Supabase, Cloudflare, etc.) and data categories.

### What you need to do

**Step 1.** Open https://vocaband.com/privacy in your browser. Read it from top to bottom in **Hebrew**, then in **English**, then in **Arabic** if you can (or at least skim — checking it loads correctly).

**Step 2.** Look for these 8 things — they should all be there:

- [ ] Who is the data controller (Vocaband Educational Technologies, Israel)
- [ ] Contact email for privacy questions (`contact@vocaband.com` or `privacy@vocaband.com`)
- [ ] What data is collected (email, display name, progress, etc.)
- [ ] Why each data category is collected (purpose)
- [ ] Who else sees the data (list of sub-processors)
- [ ] How long data is kept (retention)
- [ ] Your rights as a user (access, deletion, correction)
- [ ] Where the data lives physically (Frankfurt, Germany — EU)

**Step 3.** If anything is missing or unclear, fix it in `src/components/PublicPrivacyPage.tsx` (or its Hebrew/Arabic versions) and bump `PRIVACY_POLICY_VERSION` to today's date in `src/config/privacy-config.ts`.

**Step 4.** When you do the 1-hour lawyer consult, ask them:
> "Can you read the Hebrew privacy policy at vocaband.com/privacy and tell me if anything legal is missing or wrong?"

Lawyer review is the only way to be **certain**.  Until then, you have a defensible policy that covers the basics.

### Time required

- Self-review: 15 minutes.
- Lawyer review: 1 hour, ~1-2k NIS, on the clock you already booked.

---

## Task 2 — Honor data-subject rights (export, delete, rectify)

### What it means

Any user must be able to:
- **Export** all their data as a downloadable file ("show me what you have on me").
- **Delete** their account and all related data ("forget me").
- **Rectify** anything wrong (e.g. fix a misspelled name).

### Why the law cares

חוק הגנת הפרטיות §§ 13-14 — "right of access, right of correction."  Plus תיקון 13 (2025) — "right to erasure" formally codified.  No scale threshold.

### What we already have

All three are **fully implemented**.

| Right | Where in the app | Backend |
|---|---|---|
| Export | Privacy Settings → "Download my data" button | `public.export_my_data()` RPC returns full JSON |
| Delete | Privacy Settings → "Delete my account" button | `public.delete_my_account()` RPC cascades to all related data |
| Rectify | Privacy Settings → name edit inline; Teacher Dashboard → class name edit | Direct `UPDATE` via RLS-protected query |
| Withdraw consent | Privacy Settings → "Withdraw Consent" button | Logs `consent_log` + signs out |

### What you need to do

**Step 1.** Test each one, end-to-end, with a throwaway account:

1. Sign up as a new teacher (use a personal email).
2. Create a class, create one assignment.
3. Go to Privacy Settings (gear icon → Privacy).
4. Click **"Download my data"** → confirm a JSON file downloads with your data in it.
5. Click **"Edit name"** → change it → confirm it saves.
6. Click **"Delete my account"** → confirm it actually deletes (try logging in again — should fail).

**Step 2.** If any step fails, file a bug.  Otherwise: **done, no further action needed**.

**Step 3.** Document in your operator notes that you verified this on `<date>`.  When the lawyer asks, you can say "tested end-to-end on `<date>`, all four flows work."

### Time required

- 20 minutes to test end-to-end.

---

## Task 3 — Reasonable security (RLS, TLS, etc.)

### What it means

You took reasonable steps to protect the data.  This is intentionally vague in the law; "reasonable" depends on data sensitivity, user count, and industry norms.  At 5 users with student data, the baseline is roughly: encrypted in transit, encrypted at rest, every query authenticated and authorized, no obviously dumb leaks.

### Why the law cares

תקנות אבטחת מידע 2017 § 5 — "appropriate security measures" required for any database.  Higher levels (medium / high) add specific controls; baseline applies always.

### What we already have

Strong baseline, all already in production:

| Control | What it does | Status |
|---|---|---|
| TLS 1.2 / 1.3 | Encrypted transport, A+ SSL Labs | ✅ Verified 2026-04-28 |
| Encryption at rest | AES-256 by Supabase on the whole DB | ✅ Always on |
| Row-Level Security (RLS) | Per-user data scoping at the DB layer | ✅ Every table |
| Auth via Supabase | Google OAuth + email OTP | ✅ |
| HSTS preload | Browser hard-codes "HTTPS only" | ✅ Submitted |
| CSP | Browser blocks unauthorized scripts | ✅ |
| Rate limiting | Caps abuse at endpoint level | ✅ |
| Audit logging | Every protected action recorded | ✅ |

### What you need to do

**Step 1.** Run the existing pen-test script to verify nothing has drifted:

```bash
SUPABASE_URL="https://auth.vocaband.com" \
ANON_KEY="sb_publishable_O1immSThDxWWI6PNXPNi1w__27CAThD" \
./scripts/security-pen-test.sh
```

Expected output:
```
Results: 4 passed, 0 failed.
```

If it fails: `docs/SECURITY-OVERVIEW.md` § "Verification queries" tells you which migration to apply.

**Step 2.** Run SSL Labs to confirm A+:
- Go to https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com
- Wait ~3 minutes.
- Confirm grade is **A+**.

**Step 3.** Run security headers check:
- Go to https://securityheaders.com/?q=vocaband.com
- Confirm grade is **A** or higher.

**Step 4.** Run `npm audit`:

```bash
cd /path/to/vocaband
npm audit --production
```

Expected: `found 0 vulnerabilities`.  If anything found: `npm audit fix` and commit the lockfile.

**Step 5.** Set a calendar reminder for **3 months from today** to repeat steps 1-4.  Quarterly cadence per `SECURITY-OVERVIEW.md`.

### Time required

- 30 minutes today.
- 30 minutes every quarter.

---

## Task 4 — Consent records

### What it means

For every user, you keep a permanent record of:
- When they accepted the privacy policy.
- Which version of the policy they accepted.
- When they withdrew consent (if ever).
- What action triggered each consent event (signup, policy update, etc.).

This is more than just "they ticked a box once."  Every change must be timestamped.

### Why the law cares

תיקון 13 (2025) — "accountability principle."  The controller has to be able to **prove** that consent was given, when, and on what version.  No scale threshold.

### What we already have

**Fully implemented**, two pieces:

| Layer | What | Where |
|---|---|---|
| Per-user state | `consent_given_at`, `consent_policy_version`, `first_seen_at` columns on `public.users` | `010_privacy_compliance.sql` migration |
| Append-only log | Every accept / withdraw event logged with timestamp + version | `public.consent_log` table |

The consent UI (modal that pops when policy version changes) is wired into `src/App.tsx` and triggers automatically when `PRIVACY_POLICY_VERSION` is bumped in `privacy-config.ts`.

### What you need to do

**Step 1.** Verify the consent log is recording events.  Open Supabase SQL editor and run:

```sql
SELECT user_uid, action, policy_version, created_at
FROM public.consent_log
ORDER BY created_at DESC
LIMIT 20;
```

If you see entries: ✅ working.  If empty: 🚨 the consent flow isn't firing — debug.

**Step 2.** Test a consent flow yourself:
1. Bump `PRIVACY_POLICY_VERSION` in `src/config/privacy-config.ts` to today's date in a feature branch.
2. Deploy to a staging URL or run locally.
3. Log in — you should see the consent modal.
4. Accept it.
5. Re-run the SQL above — confirm a new row appears.
6. **Don't merge the version bump unless you also actually changed the policy text.**  Otherwise users see a pointless re-prompt.

**Step 3.** Document in your operator notes that consent log is verified working on `<date>`.

### Time required

- 5 minutes for the SQL verification.
- 30 minutes for the end-to-end test (optional but recommended once a year).

---

## Task 5 — Process the audit log table

### What it means

You keep a permanent record of every "interesting" action — who did what, on whose data, when.  Useful for:
- Forensics after a security incident ("who accessed this student's progress 5 minutes before the leak?")
- Demonstrating to a regulator that you actually monitor the system.
- Detecting insider misuse early.

### Why the law cares

תקנות אבטחת מידע 2017 § 7 — "monitoring and recording."  For a high-level database (us), retention must be at least **24 months**.  No scale threshold.

### What we already have

**Fully implemented and configured.**

| Element | Status | Where |
|---|---|---|
| `public.audit_log` table | ✅ Exists | `010_privacy_compliance.sql` |
| Schema: actor / action / data_category / target / timestamp | ✅ Enforced | Same migration |
| `logAudit()` helper called on every protected action | ✅ Wired | `src/App.tsx` and various RPCs |
| Retention 730 days (= 2 years) | ✅ Configured | `RETENTION_PERIODS.auditLogDays` in privacy-config |
| Cleanup RPC for retention enforcement | ✅ Exists | `public.cleanup_expired_data()` |

### What you need to do

**Step 1.** Verify the audit log is recording events.  Open Supabase SQL editor:

```sql
SELECT actor_uid, action, data_category, created_at
FROM public.audit_log
ORDER BY created_at DESC
LIMIT 20;
```

Expected: a list of recent events (login, view_gradebook, etc.).  If empty after using the app: the helper isn't being called — bug.

**Step 2.** Set up a Supabase scheduled job to run cleanup nightly (so old entries actually get deleted at the 2-year mark):

1. Go to Supabase Dashboard → Database → **Scheduled jobs** (Cron).
2. Create a new job:
   - **Name:** `cleanup_expired_data`
   - **Schedule:** `0 3 * * *` (every day at 3am)
   - **SQL:** `SELECT public.cleanup_expired_data();`
3. Save.

This is the only **action item** in Task 5.  Without the scheduled job, audit log grows forever and eventually breaks retention compliance the other way (keeping data **too long** is also a violation).

**Step 3.** Verify the job runs by checking logs in 2 days:

```sql
SELECT MAX(created_at), COUNT(*)
FROM public.audit_log
WHERE created_at < NOW() - INTERVAL '730 days';
```

Expected: `0` rows older than 730 days.  If you see entries: cleanup job didn't run.

### Time required

- 10 minutes to set up the scheduled job.
- 5 minutes to verify two days later.

---

## Task 6 — Disclose sub-processors

### What it means

A "sub-processor" is any other company that touches your users' data — Supabase (the database), Cloudflare (CDN), Google (OAuth), Anthropic (AI features), etc.  Users have the right to know who's involved.

You must:
- Maintain a current list.
- Make it accessible to users (linked from privacy page).
- Notify users when the list changes (a new sub-processor was added).

### Why the law cares

תיקון 13 (2025) — "transparency principle."  Plus DPA expectations: users contracting with you have a right to know who else gets the data.  No scale threshold.

### What we already have

| Layer | What | Where |
|---|---|---|
| Internal source of truth | Full registry with hosting region, data categories, DPA references | `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY` |
| Public-facing list | Just landed in this branch | `docs/SUBPROCESSORS.md` |
| Re-consent on change | Bumping `PRIVACY_POLICY_VERSION` triggers consent re-prompt | `src/App.tsx` consent modal |

### What you need to do

**Step 1.** Make the sub-processor list accessible to users.  Two options:

**Option A (preferred):** Add a section to the privacy page that lists sub-processors directly.
1. Open `src/components/PublicPrivacyPage.tsx`.
2. Find the existing "Third Parties" or "Data Processors" section.
3. Confirm every entry from `THIRD_PARTY_REGISTRY` is listed (Supabase, Cloudflare, Fly.io, Google OAuth, Anthropic, Google Gemini, Google Fonts).
4. If anything is missing: add it.

**Option B (faster):** Add a link from the privacy page to the new `SUBPROCESSORS.md` doc.
1. Push the current `claude/moe-compliance-package` branch live (which contains `SUBPROCESSORS.md`).
2. Add a sentence to the privacy page: "For a full list of sub-processors, see [link]."

**Step 2.** Set a rule for yourself:

> **Whenever I add a new external service (any new SDK, API, or third party that touches user data), I will:**
> 1. Add it to `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY`.
> 2. Add a row to `docs/SUBPROCESSORS.md`.
> 3. Bump `PRIVACY_POLICY_VERSION` so users see the updated consent modal.
> 4. Update `src/components/PublicPrivacyPage.tsx` if the change is material.

**Step 3.** Verify the current list matches reality:

```bash
# What origins does the client bundle actually talk to?
grep -ohE 'https?://[a-z0-9.-]+\.(com|co|io|cloud|app)' \
  src/**/*.ts src/**/*.tsx 2>/dev/null \
  | sort -u
```

Cross-reference the output with `THIRD_PARTY_REGISTRY`.  Anything in the bundle not in the registry = undisclosed sub-processor = compliance gap.

### Time required

- 30 minutes to verify and link.
- 5 minutes per future change.

---

## Summary — your concrete to-do list this week

In order of urgency:

| # | Task | Action | Time | Already done? |
|---|---|---|---|---|
| 1 | Privacy policy | Read it on `/privacy`, confirm 8 things present, ask lawyer to review | 15 min + lawyer hour | 🟡 Done, lawyer review pending |
| 2 | Subject rights | End-to-end test with throwaway account | 20 min | ✅ Code done, just verify |
| 3 | Reasonable security | Run pen-test script + SSL Labs + npm audit | 30 min | ✅ Done quarterly |
| 4 | Consent records | Run SQL query to verify entries | 5 min | ✅ Done, just verify |
| 5 | Audit log | **Set up Supabase scheduled job for cleanup_expired_data** | 10 min | 🟡 Table exists, cron not yet scheduled |
| 6 | Sub-processors | Confirm privacy page lists every entry in registry | 30 min | 🟡 Internal list complete, public page may need a refresh |

**Total time required this week:** ~2 hours.  
**Total cost this week:** 0 NIS (lawyer consult separate, ~1-2k NIS).

Most of the work is already done — you're mostly verifying.  The two genuine action items are:

1. **Set up the Supabase cleanup cron** (Task 5, Step 2) — 10 minutes.
2. **Refresh the privacy page** to ensure it lists every current sub-processor (Task 6, Step 1) — 30 minutes.

Everything else: read, confirm, move on.

---

## When you finish

Update `docs/MOE-REQUIREMENTS.md`:
- For each task you confirmed working, change status to ✅.
- Add today's date in the "Last verified" notes.
- Flag any gap you found that wasn't already tracked.

Then continue with the actual product roadmap.  Compliance done.
