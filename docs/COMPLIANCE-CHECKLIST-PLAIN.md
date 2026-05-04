# Vocaband — What you actually need to do at 5 users (plain English)

> Six legal requirements apply even at 5 users.  This doc walks through
> each one in plain English: what it means, what's already done, what
> we actually verified in code, and what real action you need to take.
>
> **Update 2026-05-04:** I went through each task and verified against
> the source code.  The earlier "5 of 6 already done" was overly
> optimistic — there are real bugs and stale entries.  Verified status
> is reflected in each section below + summarised at the end.

> Last verified 2026-05-04 against `claude/moe-compliance-package` HEAD.

---

## Verification summary (verified, not assumed)

| Task | Theoretical status | **Verified status** | Real action item? |
|---|---|---|---|
| 1. Privacy policy | ✅ | 🟡 — content present but sub-processor list incomplete | YES — see Task 6 (same fix) |
| 2. Subject rights | ✅ | 🚨 — UI bypasses the official RPCs, **audit log not written, teacher delete leaves orphans** | **YES — code change needed** |
| 3. Security baseline | ✅ | 🟡 — npm audit clean, headers correct, BUT `unsafe-eval` still in CSP despite doc claiming removed | YES — minor reconcile |
| 4. Consent records | ✅ | ✅ — verified end-to-end | None |
| 5. Audit log + cleanup | ✅ | 🚨 — `logAudit()` doesn't exist in source, table effectively empty, cleanup not scheduled | **YES — multiple code changes** |
| 6. Sub-processors disclosure | 🟡 | 🚨 — three sources of truth, all out of sync, registry has stale entries (Render, Tesseract) and missing entries (Anthropic, Gemini, Cloudflare, Fly.io, Google Fonts) | **YES — registry refresh + page update + version bump** |

**Headline:** the technical baseline isn't 80% done.  It's more like 60%
done — solid on TLS, RLS, consent.  **But subject-rights flow, audit
logging, and sub-processor disclosure all have real bugs that need
fixing before serious compliance review.**

> All findings come from grep-and-read of `src/`, `supabase/migrations/`,
> and `public/_headers`.  Reproducible — each section below shows the
> commands I ran.

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

### Verified status (2026-05-04)

Walked through all 8 elements in `src/components/PublicPrivacyPage.tsx`:

| Element | Found? | Line ref |
|---|---|---|
| 1. Controller name | ✅ | line 89 |
| 2. Contact email | ✅ | lines 91, 442 |
| 3. Data list | ✅ | line 106 |
| 4. Purpose per category | ✅ | line 200+ table |
| 5. Sub-processors | 🚨 **Lists 4 of 7** | lines 287, 292, 297, 302 — missing Anthropic, Gemini, Google Fonts |
| 6. Retention | ✅ | line 311+ with specific durations |
| 7. User rights | ✅ | line 343+ |
| 8. Hosting region | ✅ | line 289 (EU/Frankfurt per service) |

**Plus**: there's a separate static `public/privacy.html` (English-only)
served at `/privacy.html`.  It has the same incomplete sub-processor
section.  It's not the page React serves at `/privacy`, but it's
crawlable — needs the same fix.

### Time required

- Self-review: 15 minutes.
- Lawyer review: 1 hour, ~1-2k NIS, on the clock you already booked.
- **Real fix:** see Task 6 — the same registry refresh closes Element 5.

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

### Verified status (2026-05-04)

🚨 **Real bugs found.**  The RPCs exist but the UI doesn't call them.

**Export (`PrivacySettingsView.tsx:33-43`):**
```ts
// What the UI actually does — client-side direct queries
const exportData = {
  exported_at: new Date().toISOString(),
  user: userResult.data,
  progress: progressResult.data ?? [],
};
```
**vs. what `export_my_data()` RPC returns:**
```sql
SELECT jsonb_build_object(
  'exported_at', now(),
  'user', ...,
  'classes_owned', ...,           -- ← missing from UI version
  'progress', ...,
  'consent_history', ...,         -- ← missing from UI version
  'assignments_created', ...      -- ← missing from UI version
)
-- And: INSERT INTO audit_log on every export    ← missing from UI version
```

**Delete (`PrivacySettingsView.tsx:64-65`):**
```ts
await supabase.from('progress').delete().eq('student_uid', user.uid);
await supabase.from('users').delete().eq('uid', user.uid);
```
**vs. what `delete_my_account()` RPC does:**
- Logs the deletion to `audit_log` BEFORE deleting (the UI version doesn't)
- Branches on role — teachers cascade to all owned classes, assignments, students.  The UI version leaves orphans.
- Cleans up `consent_log` entries.  The UI version doesn't.

**Real action items:**

1. Replace `PrivacySettingsView.tsx:33-50` (export) with:
   ```ts
   const { data, error } = await supabase.rpc('export_my_data');
   ```
2. Replace `PrivacySettingsView.tsx:60-72` (delete) with:
   ```ts
   const { data, error } = await supabase.rpc('delete_my_account');
   ```
3. Test end-to-end with a fresh teacher + class + assignment to confirm cascades + audit logs work.

### Time required

- 30 minutes to swap the two calls + remove the now-dead client-side queries.
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

### Verified status (2026-05-04)

Ran `npm audit --omit=dev` → **0 vulnerabilities**.  ✅
Read `public/_headers` directly — HSTS / X-Frame-Options DENY / X-Content-Type-Options nosniff / CSP all present.  ✅

🚨 **Real finding:** the CSP still includes `'unsafe-eval'`:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com ...
```

But `docs/SECURITY-OVERVIEW.md` line 27 claims:
> `CSP unsafe-eval removed | ✅ Fixed | Code (deploys with Render)`

Either the doc is wrong (eval was kept and reasoning was lost) or
this is a regression where eval got re-added after the fix.  Either
way it's documentation drift — fix the doc to match reality, or
remove the directive to match the doc.

**Real action item:**
- Decide: keep eval and update SECURITY-OVERVIEW.md to mark it as "kept, reason: <X>", OR remove it from `public/_headers` and re-deploy.

The pen-test script + SSL Labs + securityheaders.com checks I can't
run from this sandbox without `ANON_KEY` and external network — those
remain operator tasks, but they were already passing as of 2026-04-28.

### Time required

- 30 minutes today (operator: SSL Labs + securityheaders + pen-test script).
- 5 minutes (engineering: doc reconcile or eval removal).
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

### Verified status (2026-05-04)

✅ **Task 4 is the only one that's actually fully working as designed.**

- `consent_log` schema is correct (`010_privacy_compliance.sql:17-23`)
- RLS policies scope to own UID (`010_privacy_compliance.sql:32-36`)
- Accept event written from consent banner via `useConsent.recordConsent()` (`src/hooks/useConsent.ts:55-71`)
- Withdraw event written from `PrivacySettingsView.tsx:191-196`
- Both versions write to DB with correct schema

Minor observation: `terms_version` is set to the same value as
`policy_version` because there's a single shared `PRIVACY_POLICY_VERSION`
constant.  If you ever bump terms separately, you'll need a separate
`TERMS_VERSION`.  Not urgent.

### Time required

- 5 minutes for the SQL verification (operator).
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

### Verified status (2026-05-04)

🚨 **Major finding.**  The audit log table exists but is effectively
empty in production.  Three things are broken:

**1. `logAudit()` doesn't exist in source.** The PRIVACY_CHECKLIST
claims:
> `Teacher gradebook access logged | Done | src/App.tsx → fetchScores()
>  calls logAudit('view_gradebook', 'progress')`

I grepped every `.ts` and `.tsx` file in `src/` for `logAudit`,
`audit_log`, `log_audit`, `auditLog`.  Zero matches.  The function
**does not exist**.  The PRIVACY_CHECKLIST is lying.

**2. Audit log only gets written by RPCs.**  The only `INSERT INTO
audit_log` statements in the codebase are inside the SQL RPCs:
`export_my_data`, `delete_my_account`, `cleanup_expired_data`, and
the `on_class_deleted` trigger.

**3. Combined with the Task 2 finding** (UI bypasses the RPCs), this
means almost no events reach the audit log in real production usage.

**Plus** — the cleanup is **NOT scheduled.**  There's a separate
`pg_cron` job in `20260429_anon_user_cleanup_cron.sql` that handles
anonymous auth users, but it doesn't call `cleanup_expired_data`.
So even though the function exists, retention is currently
theoretical.  Old progress records, old audit entries — none get
trimmed.

**Real action items:**

1. **Create `src/utils/audit.ts`** with a `logAudit(action, dataCategory, target?, metadata?)` helper:
   ```ts
   import { supabase } from '../core/supabase';
   export async function logAudit(
     action: string,
     dataCategory: string,
     target?: string,
     metadata?: Record<string, unknown>,
   ) {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       await supabase.from('audit_log').insert({
         actor_uid: user.id,
         action,
         data_category: dataCategory,
         target_uid: target ?? null,
         metadata: metadata ?? null,
       });
     } catch { /* best-effort, never throw from logging */ }
   }
   ```
2. **Wire it into the actions that should be logged**: gradebook view, class delete, assignment delete, reward grant.
3. **Schedule `cleanup_expired_data` as a pg_cron job** (model on `20260429_anon_user_cleanup_cron.sql`):
   ```sql
   SELECT cron.schedule(
     'cleanup_expired_data_nightly',
     '0 3 * * *',
     $$ SELECT public.cleanup_expired_data(); $$
   );
   ```
   ⚠️ The function requires `is_admin()`. Either grant the cron's role admin status or wrap it in a permissive wrapper RPC.
4. **Fix `PRIVACY_CHECKLIST.md`** to stop claiming logAudit calls that don't exist.

### Time required

- 1 hour to write the helper + wire 4-5 call sites.
- 10 minutes to set up the cron migration.
- 5 minutes to fix the doc.

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

### Verified status (2026-05-04)

🚨 **Three sources of truth, all out of sync.**

**A. `THIRD_PARTY_REGISTRY` (privacy-config.ts):**
```
Supabase, Render, Google OAuth, Google Sheets, Tesseract.js, Google Favicon
```
- Has **Render** — not used anymore (replaced by Fly.io 2026-Q1)
- Has **Tesseract.js** — replaced by Gemini OCR
- **Missing**: Cloudflare, Fly.io, Anthropic, Google Gemini, Google Fonts

**B. Public privacy page (`PublicPrivacyPage.tsx` table):**
```
Supabase, Google OAuth, Fly.io, Cloudflare
```
- Has Fly.io and Cloudflare correctly (despite registry not having them)
- **Missing**: Anthropic, Gemini, Google Fonts

**C. The new `docs/SUBPROCESSORS.md` (this branch):**
```
Supabase, Fly.io, Cloudflare, Google OAuth, Anthropic, Gemini, Google Fonts
```
- This is the accurate one.

**Real action items:**

1. **Fix `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY`**:
   - Remove `Render`, `Tesseract.js`, `Google Sheets` (if no longer used), `Google Favicon`.
   - Add `Cloudflare`, `Fly.io`, `Anthropic`, `Google Cloud (Gemini)`, `Google Fonts`.
   - Source: copy from `docs/SUBPROCESSORS.md`.
2. **Fix `PublicPrivacyPage.tsx` table** at line 285+ to add the 3 missing entries (Anthropic, Gemini, Google Fonts).  Also fix the same in the static `public/privacy.html`.
3. **Bump `PRIVACY_POLICY_VERSION`** from `"2024-03-01"` to today's date (`"2026-05-04"`) so existing users get a fresh consent prompt covering the updated processor list.
4. **Add a CI check** that asserts `THIRD_PARTY_REGISTRY` matches the privacy page table — prevents future drift.

### Time required

- 1 hour to update all three sources of truth + bump version.
- 10 minutes to verify.

---

## Summary — verified action plan (2026-05-04)

In order of impact, after walking the actual code:

### Priority 1 — bugs that affect real users RIGHT NOW

| # | What | Where | Fix |
|---|---|---|---|
| P1.1 | **Delete-account leaves orphans for teachers** | `PrivacySettingsView.tsx:60-72` | Replace direct `DELETE` with `supabase.rpc('delete_my_account')` |
| P1.2 | **Export-my-data missing 3 categories + no audit entry** | `PrivacySettingsView.tsx:33-43` | Replace direct queries with `supabase.rpc('export_my_data')` |

### Priority 2 — compliance gaps

| # | What | Where | Fix |
|---|---|---|---|
| P2.1 | **Sub-processor list incomplete on privacy page** | `PublicPrivacyPage.tsx:285+` and `public/privacy.html` | Add Anthropic, Gemini, Google Fonts to the table |
| P2.2 | **`THIRD_PARTY_REGISTRY` is stale** | `src/config/privacy-config.ts:56` | Remove Render + Tesseract; add Cloudflare, Fly.io, Anthropic, Gemini, Google Fonts |
| P2.3 | **Bump `PRIVACY_POLICY_VERSION`** | `src/config/privacy-config.ts:25` | `"2024-03-01"` → today's date so consent re-prompts |

### Priority 3 — missing infrastructure

| # | What | Where | Fix |
|---|---|---|---|
| P3.1 | **`logAudit()` helper doesn't exist** | None — needs to be created | Add `src/utils/audit.ts` per the snippet in Task 5 |
| P3.2 | **Wire `logAudit()` into protected actions** | App.tsx + various | Call from `fetchScores`, class delete, assignment delete, reward grant |
| P3.3 | **`cleanup_expired_data` not scheduled** | None — needs new migration | Add a pg_cron migration similar to `20260429_anon_user_cleanup_cron.sql` |

### Priority 4 — doc drift

| # | What | Where | Fix |
|---|---|---|---|
| P4.1 | **Privacy checklist claims logAudit calls that don't exist** | `docs/PRIVACY_CHECKLIST.md:41-43` | Mark "view_gradebook logging" as TODO, not Done |
| P4.2 | **SECURITY-OVERVIEW says `unsafe-eval` removed; CSP still has it** | `docs/SECURITY-OVERVIEW.md:27` | Either remove from CSP, or update doc to say "kept, reason: …" |

### Estimated time

| Priority | Time |
|---|---|
| P1 (must-fix bugs) | 50 min |
| P2 (sub-processor refresh) | 1 hour |
| P3 (audit infra) | 1.5 hours |
| P4 (doc reconcile) | 15 min |
| **Total** | **~3.5-4 hours** |

This is real engineering work — not just verification.  Sequencing
recommendation: P1 first (touches actual users), then P2 (consent
re-prompt visible to all users on next login), then P3 (foundation
for future audits), then P4 (cleanup).

### Earlier "done" claims that turned out to be false

For an honest record:

- 🚨 PRIVACY_CHECKLIST.md claimed `logAudit()` called from `fetchScores`.  **It isn't called anywhere — the function doesn't exist.**
- 🚨 PRIVACY_CHECKLIST.md claimed cleanup runs.  **It does as a function but isn't scheduled.**
- 🚨 SECURITY-OVERVIEW.md claimed `unsafe-eval` removed.  **Still in CSP.**
- 🚨 PRIVACY_CHECKLIST.md claimed export + delete done.  **Code done in DB but UI bypasses the RPCs.**

Doc drift accumulates over time on every project.  The goal of this
verification pass is to **stop trusting status fields and re-verify
against code** before any external review.

---

## When you finish

Update `docs/MOE-REQUIREMENTS.md`:
- For each task you confirmed working, change status to ✅.
- Add today's date in the "Last verified" notes.
- Flag any gap you found that wasn't already tracked.

Then continue with the actual product roadmap.  Compliance done.
