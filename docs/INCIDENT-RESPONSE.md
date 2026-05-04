# Vocaband — Incident response runbook

> What to do when something goes wrong.  Optimized for clarity under
> pressure: at 2am, when something is on fire, this doc tells the
> on-call exactly what to do without thinking.

> Last updated 2026-05-04.

---

## Severity scale (decide first)

| Sev | Definition | Examples | Page DPO? | Notify users? | Notify PPA / MoE? |
|---|---|---|---|---|---|
| **SEV-1** | Personal data exposed externally; account takeover; system-wide outage during school hours | Leaked database dump, credential stuffing succeeds, total Supabase outage during 8-15:00 IL time | **YES** | **YES, within 24h** | **YES, within 72h** |
| **SEV-2** | Limited data exposure (≤10 users) OR partial outage during off-hours | Bug let teacher A see one item from teacher B's class for 30 min before fix; Fly.io down at 22:00 | YES | Affected users only, within 72h | Discretion + lawyer call |
| **SEV-3** | No data exposure, normal operational issue | CI failing, deploy reverted, single-user bug | No | No | No |

**When in doubt, escalate up one level.**  Over-disclosing is recoverable; under-disclosing isn't.

---

## SEV-1 / SEV-2 — first 30 minutes

| Minute | Action | Who | Verify |
|---|---|---|---|
| 0-5 | **STOP THE BLEEDING.** Whatever caused the incident must be made impossible to repeat right now. Examples: rotate the leaked key, take the buggy endpoint offline, force-logout all sessions. | On-call | Confirm action via curl / DB query |
| 5-10 | **CAPTURE EVIDENCE.** Screenshots of the error, copy of relevant logs, list of affected user IDs, timestamps. Save everything to `incidents/<date>-<short-name>/` (private repo or Drive). | On-call | Logs older than 7 days are gone (Fly.io default) — copy them NOW |
| 10-15 | **NOTIFY DPO.** WhatsApp + email + phone if needed. | On-call → DPO | DPO acknowledges within 5 min |
| 15-30 | **ASSESS BLAST RADIUS.** Run the queries below to count affected users. Form a one-paragraph factual summary: what, when, who, how. | DPO + On-call | Numbers match audit log |

### Blast-radius queries (paste into Supabase SQL editor as admin)

```sql
-- 1. Who accessed what during the incident window?
--    Replace timestamps with the actual incident window.
SELECT actor_uid, action, data_category, target_id, created_at
FROM public.audit_log
WHERE created_at BETWEEN '2026-05-04 14:00:00+03'
                     AND '2026-05-04 14:30:00+03'
ORDER BY created_at;

-- 2. Active sessions during the incident
--    Useful when you suspect a stolen token is being used.
SELECT u.email, u.role, s.created_at, s.user_agent
FROM auth.sessions s
JOIN public.users u ON u.uid = s.user_id::text
WHERE s.created_at BETWEEN '2026-05-04 14:00:00+03'
                       AND '2026-05-04 14:30:00+03'
ORDER BY s.created_at;

-- 3. Force-logout every session (use with caution — logs out every teacher + student)
DELETE FROM auth.sessions WHERE created_at < NOW();
-- Then bump JWT secret in Supabase Dashboard → Settings → JWT Settings.
```

---

## SEV-1 / SEV-2 — hour 1 to hour 24

### Hour 1 — Containment confirmed
- [ ] Stop-the-bleeding action verified to actually work (re-test).
- [ ] Affected user list finalised — exact UIDs, exact data categories.
- [ ] Internal Slack / WhatsApp post: "Incident <date>-<name>, SEV-X, contained.  Investigating."

### Hours 2-12 — Root cause + remediation
- [ ] **Root-cause analysis.** Write a mini post-mortem: timeline, what failed, why the controls didn't catch it.
- [ ] **Permanent fix shipped.** A code fix, a migration, an env-var change — whatever closes the underlying gap. The temporary stop-the-bleeding action might still be in place; that's OK.
- [ ] **Audit log entry** for the remediation action so it shows up in future incident timelines.

### Hours 12-24 — User notification (if SEV-1 or SEV-2 with affected users)
Email template (Hebrew + English) sent from `privacy@vocaband.com`:

```
נושא: עדכון בנושא אבטחת מידע — Vocaband
Subject: Security update — Vocaband

שלום,

ב-<date> ב-<time> נרשם אירוע אבטחת מידע ב-Vocaband.
מה קרה: <one factual sentence>
איזה מידע מושפע: <data categories>
מה עשינו: <containment + permanent fix, factually>
מה אתם צריכים לעשות: <usually nothing; sometimes "change password">

אם יש לכם שאלות, פנו אלינו ב-privacy@vocaband.com.
דיווח לרשות להגנת הפרטיות בוצע ב-<date>.
```

Delivery channel: email to the affected user's registered email.  For students who joined via Quick Play (no email), notify the teacher of their class.

---

## SEV-1 — Privacy Protection Authority (PPA) notification

**Required within 72 hours** under the Privacy Protection Regulations 2017 § 11(b) for any incident affecting personal data.

### What to send
1. **Form ר"ה — דיווח על אירוע אבטחה** at https://www.gov.il/he/service/security_incident_report
2. **Attach:**
   - Incident summary (the one-paragraph version)
   - Affected user count by category
   - Containment timeline
   - Permanent fix description
   - Whether and when you notified affected users

### What NOT to send
- Personal data of affected users (they want counts, not identities).
- Internal architecture beyond what's necessary.
- Any speculation about who attacked you.

---

## SEV-1 — MoE notification

If the incident affects students of an MoE-approved school, the MoE
Information Security desk must also be notified.

- Email: `security@education.gov.il` (verify current address with MoE before incident — addresses change)
- Reference: vendor agreement number + MoE database registration ID.
- Same factual summary as the PPA report.

---

## SEV-3 — Light-touch process

For non-data-exposure operational issues:
1. Open a GitHub issue tagged `incident:sev-3`.
2. Ship the fix as a normal PR with a `fix:` commit.
3. Note in `docs/open-issues.md` if the underlying class of bug deserves a follow-up.
4. No DPO page, no user notification, no PPA report.

---

## Post-incident — within 7 days

Even for SEV-3, write up a short post-mortem in `docs/postmortems/<date>-<name>.md`:

```md
# <Date> — <Short title>

## Severity
SEV-X

## Timeline
- HH:MM — <event>
- HH:MM — <event>

## Root cause
<one paragraph>

## What worked
<list>

## What didn't
<list>

## Action items
- [ ] <prevent recurrence — owner — due date>
```

Read the post-mortem at the next team checkpoint.  Do NOT attribute
blame to individuals — focus on the failed control.

---

## Roles + contact

| Role | Person | Contact | Backup |
|---|---|---|---|
| **Founder / DPO** | <fill in name> | <fill in email + phone> | n/a |
| **On-call engineer** | <rotation> | Slack alert | <backup person> |
| **Privacy lawyer** | <retainer firm> | <email> | <fallback firm> |
| **Pen-test contact** | <firm> | <email> | n/a |

> ⚠️ This table must be filled in BEFORE the first incident.  Empty
> rows are themselves a SEV-2 finding at the next quarterly review.

---

## Quarterly tabletop exercise

Every quarter, walk through this runbook against a hypothetical:

- Q1: A teacher reports they can see another teacher's class roster.
- Q2: A student's progress is visible at a public URL.
- Q3: Supabase service-role key was committed to a public gist.
- Q4: Cloudflare reports a sustained DDoS and the origin is dropping requests.

Time it.  If first 30 minutes take > 30 minutes, the runbook needs work.

---

## Maintenance

- After every real incident, edit this doc with anything that was unclear or wrong under pressure.
- Bump the "Last updated" timestamp.
- Re-run the table-top quarterly to keep muscle memory.
