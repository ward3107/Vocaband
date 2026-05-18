# Vocaband — Operator playbook for MoE compliance

> Everything **you** (the founder / operator) need to do that **cannot
> be done in code**. Tasks are ordered by priority + dependency. Each
> has: what to do, how to do it, what tools/URLs, when, time + cost,
> and what "done" looks like.
>
> Companion: `docs/LAWYER-BRIEF-MOE.md` is the detailed list of
> questions to bring to your privacy lawyer.
>
> Last updated 2026-05-18.

---

## Reading guide

Each task is one section. The section header has a `STATUS` line:

- ⏰ **Now** — do this week, no dependencies.
- 📅 **At ~1,000 users** — defer until you have ~1,000 registered users OR a school formally asks.
- 📅 **At ~5,000 users** — defer further.
- 📅 **At first school formally adopts** — defer until then.
- ♻️ **Ongoing** — recurring task.

If a task says "blocks task #N" it means #N can't start until this is done.

---

## Task 1 — Apply the new audit-log immutability migration

**STATUS:** ⏰ Now (10 minutes)
**WHY:** Closes the last technical gap flagged in `docs/MOE-REQUIREMENTS.md` § A4 (audit-log immutability). Pen-test checks #17 and #18 verify it.

**HOW:**
1. Open Supabase Dashboard → your project (`auth.vocaband.com`) → SQL Editor.
2. Open `supabase/migrations/20260518120000_audit_log_immutability.sql` from the repo.
3. Paste the entire file into the SQL editor.
4. Click "Run". Should return "Success. No rows returned."
5. Paste each of the three verification queries at the bottom of the migration file (`-- a)`, `-- b)`, `-- c)`).
   - (a) UPDATE should ERROR with `audit_log is append-only (UPDATE forbidden)`.
   - (b) DELETE should ERROR with `audit_log is append-only (DELETE forbidden outside retention purge)`.
   - (c) `SELECT public.cleanup_expired_data(365, 90, 730)` should succeed and return a JSONB with `deleted_audit`.

**TOOLS:** Supabase Dashboard.
**COST:** 0.
**DONE LOOKS LIKE:** Verification queries (a) and (b) error as expected; (c) succeeds; a new `scheduled_cleanup` audit row is visible.

---

## Task 2 — Run the pen-test script against production

**STATUS:** ⏰ Now, immediately after Task 1 (5 minutes)
**WHY:** Confirms all 18 gates pass live. This script is what you'll run quarterly forever.

**HOW:**

On Mac / Linux:
```bash
SUPABASE_URL="https://auth.vocaband.com" \
ANON_KEY="sb_publishable_<your-publishable-key>" \
APP_URL="https://www.vocaband.com" \
./scripts/security-pen-test.sh
```

On Windows:
```powershell
$env:SUPABASE_URL = "https://auth.vocaband.com"
$env:ANON_KEY     = "sb_publishable_<your-publishable-key>"
$env:APP_URL      = "https://www.vocaband.com"
./scripts/security-pen-test.ps1
```

Get the publishable key from Supabase Dashboard → Settings → API → "Project API keys" → "anon / public".

**TOOLS:** Terminal + curl.
**COST:** 0.
**DONE LOOKS LIKE:** Output ends with `Results: 17 passed, 0 failed.` Save the output to `docs/postmortems/2026-05-18-pentest-pre-MoE.md` for the MoE file.

---

## Task 3 — Appoint a Data Protection Officer (DPO)

**STATUS:** ⏰ Now (15 minutes)
**WHY:** MoE + Reg 2017 both require a named DPO with public contact details. At your scale, the founder serves as DPO. Without this, you can't sign the Information Security Policy (`docs/INFORMATION-SECURITY-POLICY.md` § 16).

**HOW:**
1. Decide who is DPO. Recommended: you (the founder).
2. Fill in `docs/INFORMATION-SECURITY-POLICY.md` § 16 signature block with name + signature + date.
3. Fill in `docs/INCIDENT-RESPONSE.md` § "Roles + contact" table.
4. Fill in the `<fill in current count>` placeholders in `docs/DPIA-TECHNICAL.md` § 1.3 with current student/teacher counts.
5. Publish the DPO name + email on the public `/privacy` page (already wired to `privacy-config.ts`; if not currently shown, add a line "Data Protection Officer: [Name], privacy@vocaband.com").

**TOOLS:** Editor for the docs; whoever maintains the public privacy page.
**COST:** 0.
**DONE LOOKS LIKE:** Three docs (policy + incident-response + DPIA) carry a real name and contact; `/privacy` displays it publicly.

---

## Task 4 — Set up `privacy@vocaband.com` alias with 24h response SLA

**STATUS:** ⏰ Now (30 minutes)
**WHY:** MoE + Reg 2017 require a monitored contact for privacy enquiries and breach notifications. This is the address quoted in every breach-notification template.

**HOW:**
1. In your domain DNS (Cloudflare → DNS), add an MX or email-forwarding rule that routes `privacy@vocaband.com` to your personal email.
2. (Recommended) Configure Cloudflare Email Routing — free — to forward `privacy@vocaband.com` → your address with a "+privacy" tag for filtering.
3. Set up a filter / label in your mailbox so messages to that address show up in a dedicated folder.
4. Reply-test it: send yourself a message to `privacy@vocaband.com` and confirm receipt.
5. Document the response SLA inline in `docs/INFORMATION-SECURITY-POLICY.md` if not already there ("Privacy enquiries answered within 24 hours on business days; within 72 hours on weekends + Israeli holidays").

**TOOLS:** Cloudflare DNS dashboard.
**COST:** 0.
**DONE LOOKS LIKE:** Mail sent to `privacy@vocaband.com` reaches your inbox within 1 minute; a folder/label is configured.

---

## Task 5 — Schedule the lawyer consult (1 hour)

**STATUS:** ⏰ Now — book the slot; the consult itself happens 2-4 weeks out
**WHY:** Several MoE-compliance items are blocked on legal judgement (parental consent under § 25, DPA template, privacy-policy diff against MoE template, cross-border transfer wording, Risk Register ratification). One 1-hour consult unblocks all of them. Cost ₪1-2k.

**HOW:**
1. Identify 2-3 Israeli EdTech / Privacy lawyers. Reference candidates:
   - **Pearl Cohen** (mid-size, EdTech experience)
   - **Herzog Fox & Neeman — Privacy practice** (top-tier, more expensive)
   - **Yigal Arnon — Tech & Privacy** (mid-size)
   - **Goldfarb Seligman — Privacy** (mid-size)
   - **Heskel Cohen** (boutique, founder-friendly rates)
2. Read each firm's "EdTech / minors data" page; pick one whose recent work clearly covers schools or Israeli minor-data scenarios.
3. Email them with `docs/LAWYER-BRIEF-MOE.md` attached. Ask for a 1-hour scoping consult, fixed-fee.
4. Compare quotes. Pick.
5. Book the consult. Send `docs/LAWYER-BRIEF-MOE.md` + `docs/DPIA-TECHNICAL.md` + `docs/RISK-REGISTER.md` + `docs/MOE-REQUIREMENTS.md` 48h before the meeting.

**TOOLS:** Email; the four docs above.
**COST:** ₪1-2k for the consult.
**TIME WALL-CLOCK:** 2-4 weeks from email to booked consult.
**DONE LOOKS LIKE:** Consult booked, lawyer has read the brief.

After the consult: see Task 8 (post-lawyer follow-ups).

---

## Task 6 — Off-Supabase backup (closes Risk R12 + DR Scenario E)

**STATUS:** ⏰ Now (90 minutes to script, then runs forever via Fly cron)
**WHY:** Currently if Supabase loses our project entirely (account closure, billing dispute, region failure), our backups are also gone. The MoE questionnaire will notice — `docs/DISASTER-RECOVERY.md` § 5 honestly discloses this gap.

**HOW (you do this with your engineer, or ask me to write it next):**
1. In Supabase Dashboard → Settings → Database → "Connection string" → copy the URI (postgres://...).
2. Store it as a Fly secret: `fly secrets set SUPABASE_DB_URL="postgres://..." -a vocaband`.
3. Add a weekly cron job in `fly.toml` that runs `pg_dump --no-owner --schema=public --file=/tmp/backup.sql "$SUPABASE_DB_URL"` and uploads the result to your existing Cloudflare R2 bucket (`mirror-supabase-to-r2.ts` is the pattern).
4. Set R2 lifecycle: keep weekly dumps for 12 months, move to Archive class after 30 days.
5. **Verify** by downloading the first dump + grep-checking for known table names. File the verification in `docs/postmortems/2026-05-25-offsite-backup-drill.md`.

I (Claude) can write the script + cron config in a follow-up session — just ask. Estimated 90 min of my time + 5 min of yours to deploy.

**TOOLS:** Fly CLI, Cloudflare R2 dashboard, existing R2 bucket.
**COST:** ~$0.50/month in R2 storage at our scale.
**DONE LOOKS LIKE:** First weekly dump visible in R2 bucket; restore drill into staging Supabase succeeds.

---

## Task 7 — Calendar reminders

**STATUS:** ⏰ Now (5 minutes)
**WHY:** Several MoE tasks are threshold-gated. Without calendar nudges you'll miss the trigger.

**HOW:** Set these in whatever calendar you use:

| Reminder | When | What to do |
|---|---|---|
| "Pen-test re-quote" | At 1,000 users OR every 12 months | Re-engage the firm from Task 11; quote refresh |
| "PPA database registration" | At 5,000 users OR 18 months from now (whichever first) | Start Task 10 with 30-90 day lead time |
| "Quarterly internal audit" | First Monday of every quarter | Run Tasks 2 + 14 |
| "External pen-test mandatory" | 18 months from the first external pen-test | Re-engage firm per Reg 2017 cadence |
| "Annual policy review" | 2027-05-18 | Re-read `docs/INFORMATION-SECURITY-POLICY.md` + bump version if needed |
| "SSL Labs / HSTS check" | First Monday of every quarter | `https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com` should still be A+; `https://hstspreload.org/?domain=vocaband.com` should say Preloaded |
| "DR tabletop" | Once per quarter — pick scenario per `docs/DISASTER-RECOVERY.md` § 3 | 30-min walk-through, file postmortem |

**TOOLS:** Google Calendar / Apple Calendar / whichever.
**COST:** 0.
**DONE LOOKS LIKE:** Seven recurring events appear in your calendar.

---

## Task 8 — Post-lawyer follow-ups

**STATUS:** 📅 Immediately after Task 5 consult
**WHY:** The consult outputs a list of items only the lawyer can write. Don't lose them.

**HOW (depending on lawyer outputs):**

1. **If lawyer confirms teacher-mediated consent satisfies § 25:**
   - Lawyer drafts a 1-paragraph "school as data controller" addendum to `/privacy`.
   - Engineering (me) adds it to the Hebrew + English privacy pages.

2. **If lawyer says explicit parental consent is required:**
   - Lawyer specifies what wording must appear, and to whom (parent email).
   - Engineering (me) builds a parent-email consent flow (~3-5 days work; not trivial).
   - Block onboarding for new students under that age until parent consent is recorded in `consent_log`.

3. **Lawyer marks up `/privacy` and `/terms`:**
   - Engineering (me) applies edits + bumps `consent_policy_version` so existing users re-consent on next login.

4. **Lawyer ratifies / overrides Risk Register scores:**
   - Update `docs/RISK-REGISTER.md` headers from "draft" to "ratified" with lawyer name + date.
   - Fill R13.

5. **Lawyer writes the cross-border transfer paragraph:**
   - Append to `/privacy` (Hebrew + English).
   - Reference in `docs/INFORMATION-SECURITY-POLICY.md` § 5.

6. **Lawyer drafts DPA template for schools** (defer until a school actually asks):
   - File at `docs/dpa-templates/2026-<lawyer-firm>-DPA.docx`.
   - Re-use per school with name + signature swap.

**TOOLS:** Email back-and-forth with the lawyer; me (engineering) for any code edits.
**COST:** Often included in the consult fee; specific deliverables (DPA template, policy markup) may add ₪3-8k. Confirm in the engagement letter.
**DONE LOOKS LIKE:** All five sub-items either applied or filed for future use.

---

## Task 9 — Self-pentest deep dive

**STATUS:** 📅 Before Task 11 (cheaper to find issues yourself first)
**WHY:** Pen-test firms charge ₪30-60k. If they find hygiene issues, you paid them to find what `scripts/security-pen-test.sh` would have caught. Run the deep DIY pass first to reduce the cost-per-genuine-finding.

**HOW:**
1. Run `docs/SELF-PENTEST-GUIDE-HE.md` end-to-end (Hebrew DIY guide).
2. Run OWASP ZAP against staging Supabase (free; download from https://www.zaproxy.org/).
3. Run Nuclei templates against staging (`nuclei -u https://staging.vocaband.com` — free).
4. Walk the threat-model checklist in `docs/PENTEST-SOW.md` § 2 manually as both a student and a teacher account.
5. File findings in `docs/diy-pentest-2026-<MM-DD>.md`.
6. Patch the easy wins; defer the rest to the external pen-test.

**TOOLS:** OWASP ZAP, Nuclei, browser dev tools, staging Supabase.
**COST:** 0 + your time (~8 hours).
**DONE LOOKS LIKE:** A new diy-pentest doc with findings + patches.

---

## Task 10 — Privacy Protection Authority database registration

**STATUS:** 📅 At ~5,000 users OR if lawyer advises sooner
**WHY:** Once you cross 10,000 data subjects, registration becomes legally mandatory. 30-90 day lead time for confirmation, so start at 5,000.

**HOW:**
1. Go to https://www.gov.il/he/service/database_registration
2. Fill in the form. Field-by-field guidance:
   - **שם מאגר** (Database name): "Vocaband — Educational Vocabulary Platform"
   - **בעלים** (Owner): Vocaband Educational Technologies — your full company name
   - **מחזיק המאגר** (Database holder): Same
   - **מטרה** (Purpose): "Operating an English-vocabulary learning platform for primary and middle-school students in Israel; recording student progress for educational feedback"
   - **קטגוריות מידע** (Data categories): copy from `src/config/privacy-config.ts` DATA_COLLECTION_POINTS (export it via Task 8 if you want; lawyer-readable)
   - **קבלת המידע** (Source of data): "Directly from data subjects (teachers + students) on platform signup and use"
   - **העברות לחו"ל** (Cross-border transfers): "EU (Frankfurt / Amsterdam) for hosting under EU-Israel adequacy decision; US for OAuth handshake (Google) under EU-US DPF"
3. Pay the registration fee (currently free for the first-tier database).
4. Wait 30-90 days for confirmation.
5. File the confirmation certificate at `docs/regulatory/2026-<MM>-PPA-registration.pdf`.

**TOOLS:** https://www.gov.il/he/service/database_registration; lawyer if any clause is unclear.
**COST:** 0 (free) — possibly ₪500-1500 to lawyer for review-before-submit.
**TIME WALL-CLOCK:** 30-90 days.
**DONE LOOKS LIKE:** Registration certificate on file.

---

## Task 11 — External penetration test

**STATUS:** 📅 At ~1,000 users OR when first school asks
**WHY:** Reg 2017 mandates 18-month cadence for High-level databases. MoE questionnaire asks for a report dated within last 12 months. `docs/PENTEST-SOW.md` is the SoW you give the firm.

**HOW:**
1. Email 3 firms from `docs/PENTEST-SOW.md` § 7.1 with the SoW attached. Ask for:
   - Tier 2 scope (5-7 days, ≥60% manual).
   - Re-test included.
   - Lead tester's LinkedIn.
   - Sample report from comparable engagement.
   - Fixed price.
2. Compare quotes. Pick. Sign NDA + authorization letter (template in `docs/PENTEST-SOW.md` § 8.1).
3. Provision staging Supabase + staging Fly + 3 test accounts (checklist in PENTEST-SOW § 8).
4. Run the test. ~1 week active testing.
5. Receive draft report (5 business days), then final report (10 business days).
6. Open 1 GitHub issue per Critical/High/Medium finding. Patch within 30 days.
7. Run re-test (included in price). Confirm zero open Critical/High.
8. Receive letter of attestation from the firm — this is what goes into the MoE file.
9. File final report (encrypted) at `docs/pentest-reports/2026-<MM-DD>-<firm>.pdf` — **do NOT commit to git; file outside the repo.**
10. Update `docs/SECURITY-OVERVIEW.md` § "What we audited and when".
11. Diary the next pen-test 18 months out.

**TOOLS:** Email; pen-test firm; Fly + Supabase staging; PGP / Signal / 1Password Share for report transfer.
**COST:** ₪30-60k (Tier 2). Target ₪40k.
**TIME WALL-CLOCK:** ~10 weeks end-to-end (quote → contract → testing → report → re-test → attestation).
**DONE LOOKS LIKE:** Signed attestation letter on file; zero open Critical/High findings.

---

## Task 12 — Lawyer drafts DPA template for schools

**STATUS:** 📅 At first school formally asks
**WHY:** Each school needs to sign a Data Processing Agreement with you. The template needs to match MoE expectations.

**HOW:**
1. Ask the lawyer from Task 5 to draft the template. They base it on:
   - `docs/DPIA-TECHNICAL.md`
   - `docs/SUBPROCESSORS.md`
   - `docs/INFORMATION-SECURITY-POLICY.md`
   - MoE's published DPA template (the lawyer has it).
2. Receive draft.
3. File at `docs/dpa-templates/2026-<lawyer-firm>-DPA-v1.docx`.
4. For each new school: copy template, fill in school name + signature, exchange signed copies, file.

**TOOLS:** Lawyer; Word / Google Docs.
**COST:** ₪3-8k for the template (one-time); free per re-use.
**DONE LOOKS LIKE:** Template on file; first school's signed copy on file.

---

## Task 13 — MoE submission (Tofes 22/23)

**STATUS:** 📅 After Tasks 5, 8, 10, 11, 12 are all done
**WHY:** This is the formal MoE vendor approval. You need the lawyer outputs + the pen-test attestation + the PPA registration + at least one school using you for it to land well.

**HOW:**
1. Email `security@education.gov.il` (verify current address) and request the blank Tofes 22/23 vendor security questionnaire.
2. Receive form. Fill in using:
   - `docs/MOE-VENDOR-QUESTIONNAIRE.md` for the technical answers.
   - Lawyer outputs from Task 8 for the legal answers.
   - Attestation letter from Task 11 attached.
   - PPA registration certificate from Task 10 attached.
   - Hebrew privacy policy + ToS from Task 8 attached.
3. Submit through the MoE channel they specify.
4. Iterate with MoE reviewer until approved. Typical: 1-3 months.
5. Once approved, you're on the MoE vendor list — schools can adopt you under official MoE auspices.

**TOOLS:** Email; MoE form; everything from Tasks 5-12.
**COST:** 0 in fees; possibly ₪2-5k of lawyer time to review the filled form before submission.
**TIME WALL-CLOCK:** 1-3 months MoE turnaround.
**DONE LOOKS LIKE:** MoE approval letter on file.

---

## Task 14 — Quarterly internal audit (recurring)

**STATUS:** ♻️ Every quarter forever
**WHY:** Catches drift before drift becomes a finding.

**HOW (30 min):**
1. Run `npm audit` in the repo. Patch any HIGH/CRITICAL dependency findings.
2. Run `scripts/security-pen-test.sh` against production. Expect `Results: 19 passed, 0 failed` (after Task 1 is applied).
3. Run the audit-log immutability verification queries from `supabase/migrations/20260518120000_audit_log_immutability.sql`.
4. Rescan SSL Labs at https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com — must still be A+.
5. Check HSTS preload status at https://hstspreload.org/?domain=vocaband.com — must say "Preloaded".
6. Check `docs/open-issues.md` for any security-related issue ageing past 90 days.
7. Do a DR tabletop exercise (one scenario per quarter — see `docs/DISASTER-RECOVERY.md` § 3).
8. File results in `docs/quarterly-audit-<YYYY-Q?>.md`.

**TOOLS:** All the in-repo scripts + the two web checks.
**COST:** 0.
**DONE LOOKS LIKE:** Audit doc filed; any drift items become GitHub issues.

---

## Task 15 — Subscribe to regulator + MoE update mailing lists

**STATUS:** ⏰ Now (10 minutes)
**WHY:** Reg 2017 + PPA Amendment 13 + MoE circulars all change occasionally. Surprise updates that break compliance are easier to handle if you see them coming.

**HOW:**
1. Subscribe to the Privacy Protection Authority newsletter at https://www.gov.il/he/departments/the_privacy_protection_authority — usually a footer email signup.
2. Subscribe to "חוזרי מנכ"ל משרד החינוך" — the MoE circular list at https://apps.education.gov.il/Mankal/.
3. Add both feeds to your daily reading flow (RSS reader, or just a calendar reminder to skim quarterly).

**TOOLS:** Browser.
**COST:** 0.
**DONE LOOKS LIKE:** Two confirmation emails in your inbox.

---

## Priority order — what to do in the next 7 days

Do these THIS WEEK in this order:

1. **Task 1** — apply audit-log immutability migration (10 min).
2. **Task 2** — run pen-test script, save output (5 min).
3. **Task 3** — appoint DPO + fill in name in 3 docs (15 min).
4. **Task 4** — `privacy@vocaband.com` alias (30 min).
5. **Task 7** — calendar reminders (5 min).
6. **Task 15** — subscribe to PPA + MoE newsletters (10 min).
7. **Task 5** — email 3 lawyers, attach `docs/LAWYER-BRIEF-MOE.md`, ask for quotes (45 min).

Total: ~2 hours of your time this week. Total this-week spend: ₪0.

Then the calendar runs the rest.

---

## Quick reference — total cost spread over 12-18 months

| Phase | When | Cost |
|---|---|---|
| This week (Tasks 1-7, 15) | Now | ₪0 |
| Lawyer consult (Task 5) | 2-4 weeks | ₪1-2k |
| Lawyer follow-ups (Task 8) | After consult | ₪3-8k |
| Off-Supabase backup (Task 6) | Now or next month | ₪0 ongoing (R2 storage <$1/mo) |
| External pen-test (Task 11) | At ~1k users | ₪30-60k |
| DPA template (Task 12) | First school | ₪3-8k (often bundled with Task 8) |
| PPA registration (Task 10) | At ~5k users | ₪0 |
| MoE submission (Task 13) | After above | ₪2-5k lawyer review |
| Quarterly audits (Task 14) | Forever | ₪0 |
| **Total to MoE acceptance** | **12-18 months** | **₪40-80k** |

---

## What to do if something blocks

| If… | Then… |
|---|---|
| The Task 1 migration verification query fails | Open `docs/MOE-REQUIREMENTS.md`, find row A4. Comment on this in a new Claude Code session and ask to debug. |
| A lawyer quote comes back at >₪15k for the consult alone | Politely decline, try the next firm. Founder-friendly firms charge ₪1-2k for the scoping consult. |
| A pen-test firm quotes <₪15k | Reject — they're automated-only. Won't satisfy MoE. |
| A school asks for paperwork you don't have yet | Send `docs/INFORMATION-SECURITY-POLICY.md` + `docs/SECURITY-OVERVIEW.md` + `docs/SUBPROCESSORS.md` as an interim. Pull in the lawyer to negotiate a partial DPA. |
| MoE asks for something not covered here | Ask the reviewer for the specific clause number. Then come back to this playbook and update it. |

---

## Maintenance

Update this playbook every time a task is completed (mark with date) or a new
task surfaces. Keep it short — the MOE-REQUIREMENTS.md tracker is for
detailed status; this doc is for "what do I do tomorrow morning?"
