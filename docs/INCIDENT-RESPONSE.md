# Vocaband — Incident response runbook

> What to do when something goes wrong.  Optimized for clarity under
> pressure: at 2am, when something is on fire, this doc tells the
> on-call exactly what to do without thinking.

> Last updated 2026-05-22.

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
| 5-10 | **CAPTURE EVIDENCE.** Screenshots of the error, copy of relevant logs, list of affected user IDs, timestamps. Save everything to `incidents/<date>-<short-name>/` (private repo or Drive). **Run logs through `scrubPii` before sharing outside the on-call group** — the same redactor the server uses in `installScrubbingConsole` (see `src/utils/scrubPii.ts` + `src/utils/serverLog.ts`) strips emails, JWTs, bearer tokens, and Supabase keys.  This keeps an incident-response export from itself becoming a secondary data breach. | On-call | Logs older than 7 days are gone (Fly.io default) — copy them NOW |
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

All templates below sent from `privacy@vocaband.com`. Pick the right
one for the audience.

#### Template A — Teacher (full notification, English)

```
Subject: Security update — Vocaband — action may be required

Hello [teacher name],

We are writing to inform you of a security incident affecting Vocaband.

What happened:
   [one factual sentence — e.g. "Between 14:00 and 14:30 IL time on
    2026-05-04, a configuration error allowed students in another class
    to view your class's word-list assignments — but not student names
    or progress."]

Whose data was affected:
   [data categories — e.g. "Your class's word-list assignment titles
    and instructions. No student names, emails, or progress data were
    accessed."]

What we did:
   [containment + permanent fix — e.g. "We closed the exposure at
    14:32 IL by reverting the configuration change, then shipped a
    permanent fix in version 2026.05.04a deployed at 16:00 IL the
    same day."]

What you need to do:
   [usually nothing; sometimes "change your Vocaband password" or
    "review your class roster for any unfamiliar entries"]

How we are following up:
   • Internal post-mortem completed on [date].
   • Notification to the Israeli Privacy Protection Authority filed
     on [date], reference number [if assigned].
   • [Notification to the MoE Information Security desk on [date],
      if applicable.]

Questions: reply to this email or write to privacy@vocaband.com.

[DPO name]
Data Protection Officer
Vocaband Educational Technologies
```

#### Template A — Teacher (full notification, Hebrew)

```
נושא: עדכון בנושא אבטחת מידע — Vocaband — ייתכן ונדרשת פעולה

שלום [שם המורה],

אנו פונים אליך כדי לעדכן על אירוע אבטחת מידע שאירע ב-Vocaband.

מה קרה:
   [משפט עובדתי אחד — לדוגמה: "בין השעות 14:00 ל-14:30 ב-04/05/2026,
    שגיאת תצורה אפשרה לתלמידים בכיתה אחרת לצפות במטלות אוצר המילים
    שיצרת — אך לא בשמות תלמידים או בנתוני התקדמות."]

איזה מידע הושפע:
   [קטגוריות — לדוגמה: "כותרות והוראות של מטלות אוצר המילים שלך.
    שמות תלמידים, כתובות אימייל ונתוני התקדמות לא נחשפו."]

מה עשינו:
   [פעולת חסימה + תיקון קבוע — לדוגמה: "סגרנו את החשיפה בשעה 14:32
    על ידי החזרת התצורה למצב קודם, ואז שחררנו תיקון קבוע בגרסה
    2026.05.04a שעלתה לאוויר בשעה 16:00 באותו היום."]

מה עליך לעשות:
   [בדרך כלל כלום; לעיתים: "החליפי סיסמה" או "בדקי את רשימת
    התלמידים בכיתתך"]

איך אנו ממשיכים:
   • דו"ח פנימי הושלם בתאריך [תאריך].
   • דיווח לרשות להגנת הפרטיות בוצע בתאריך [תאריך],
     מספר הפניה [אם הוקצה].
   • [דיווח לאגף אבטחת מידע במשרד החינוך בתאריך [תאריך],
      אם רלוונטי.]

שאלות: ניתן להשיב לאימייל זה או לפנות אל privacy@vocaband.com.

[שם הממונה על הגנת הפרטיות]
ממונה הגנת הפרטיות
Vocaband Educational Technologies
```

#### Template B — School principal / IT (escalation, Hebrew)

```
לכבוד מנהל/ת בית הספר [שם],
לידיעת רכז/ת המחשוב,

נושא: עדכון בנושא אבטחת מידע ב-Vocaband — דיווח לפי תקנות הגנת
       הפרטיות (אבטחת מידע) התשע"ז-2017 § 11

ביום [תאריך] בשעה [שעה] נרשם אירוע אבטחת מידע במערכת Vocaband
המשרתת את בית ספרכם.

סיכום עובדתי: [פסקה אחת]
היקף ההשפעה: [מספר משתמשים, סוגי נתונים]
פעולות חסימה: [מה נעשה מיידית]
תיקון קבוע: [מה נעשה במשך 24 השעות הראשונות]
דיווח לרשות: [תאריך + מספר פניה אם הוקצה]
דיווח למשרד החינוך: [תאריך, אם רלוונטי]

נציגנו לכל שאלה: [שם הממונה], privacy@vocaband.com, [טלפון].

אנו מציעים שיחה טלפונית עם הצוות הטכני בבית הספר במהלך 48 השעות
הקרובות. ניתן לקבוע במייל חוזר.

בכבוד רב,
[שם הממונה]
ממונה הגנת הפרטיות, Vocaband
```

#### Template C — Holding statement (initial, when full facts not yet known)

Use when you've confirmed an incident is real but you're still
within the first hour of containment and don't yet have full facts.
Buys time without being silent.

```
Subject: Vocaband — service notice
נושא: Vocaband — הודעת שירות

Hello — we are investigating a possible issue affecting some Vocaband
accounts as of [time]. We will follow up with a detailed update within
24 hours. If you have urgent questions, write to
privacy@vocaband.com.

שלום, אנו בודקים כעת אירוע אפשרי המשפיע על חלק מחשבונות Vocaband
החל מ-[שעה]. נעדכן בפרטים מלאים במהלך 24 השעות הקרובות. לשאלות
דחופות: privacy@vocaband.com.

— Vocaband Privacy Team / צוות פרטיות Vocaband
```

#### Template D — Quick Play guest (no email — notify teacher instead)

Quick Play guests have no registered email. The teacher of the
affected QP session is notified using Template A above, with an
explicit ask to relay to students who joined.

#### Delivery channels

| Audience | Channel | Notes |
|---|---|---|
| Teachers | Direct email to registered address | Sent via Supabase Auth's mailer or Resend (`docs/RESEND-SMTP-SETUP.md`) |
| Students with email | Same | Rare — students mostly join via class code only |
| Students without email | Notified through their teacher (Template A relay) | Teacher confirms relay back to `privacy@vocaband.com` |
| School principal / IT | Template B sent to school's published address | Phone follow-up offered |
| Privacy Protection Authority | Form ר"ה — see § "PPA notification" | Different from user notification |
| MoE Information Security desk | Email `security@education.gov.il` — see § "MoE notification" | Only if MoE-school affected |

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

## Specialised playbooks

### Subprocessor / supply-chain breach

A subprocessor on `docs/SUBPROCESSORS.md` (Supabase, Fly.io, Cloudflare,
Anthropic, Google Cloud, Sentry, Google OAuth, Google Fonts) discloses
a security incident affecting their service.

1. **Classify.**  Could the breach have exposed any of OUR data given
   the vendor's role?  Use the data categories in
   `THIRD_PARTY_REGISTRY` entries — the categories define our blast
   radius if they got popped.  Examples:
   - Supabase breach → C4 (children's educational records) + auth tokens — **SEV-1**.
   - Anthropic breach → vocabulary words only, zero-retention API — likely **SEV-3**.
   - Sentry breach → scrubbed error events, no PII (PII scrubber runs pre-send) — **SEV-3**.
2. **Get the vendor's disclosure in writing.**  Save their advisory
   PDF / blog post to `incidents/<date>-<vendor>/vendor-advisory.pdf`.
3. **Rotate any shared secrets.**  API keys, service-role keys,
   webhook signing secrets — even if the vendor says rotation isn't
   required.  Cheap insurance.
4. **Trace usage in our logs.**  Run the blast-radius queries against
   the vendor's exposure window.  If we used the affected feature in
   that window, we're a downstream victim — full SEV-1 path applies.
5. **Append to `SUBPROCESSOR_CHANGELOG`** (in `src/config/privacy-config.ts`)
   with a `mechanism_changed` row if the vendor changes their transfer
   mechanism in response, or `removed` if we decide to drop them.
6. **Notify schools** via the privacy@ subscriber list (≥30-day
   advance notice as promised in `docs/SUBPROCESSORS.md`) if the
   incident causes us to add a replacement subprocessor.

### Service-role key / Supabase secret compromise

The Supabase service-role key OR the GOOGLE_AI_API_KEY OR the
ANTHROPIC_API_KEY OR the SENTRY_DSN has been observed outside the
intended scope (git history, accidentally pasted in a PR review, a
screenshot, a public Slack channel, a public Sentry event).

1. **Within 5 minutes — rotate the key.**
   - Supabase service-role: Dashboard → Settings → API → "Roll service role secret" → copy the new value into `fly secrets set SUPABASE_SERVICE_ROLE_KEY=…` → trigger a deploy so workers pick up the new value.
   - Google Cloud (Gemini + TTS): Console → APIs & Services → Credentials → restrict the leaked key to a denylist immediately, then create a new key and rotate via `fly secrets set GOOGLE_AI_API_KEY=…`.
   - Anthropic: dashboard → API keys → revoke the leaked key, create a new one, rotate via `fly secrets set ANTHROPIC_API_KEY=…`.
   - Sentry DSN: rotate in dashboard → Project Settings → Client Keys; update env on Fly + redeploy.
2. **Within 30 minutes — invalidate live sessions** if the
   service-role key was leaked: rotate Supabase JWT secret too (forces
   logout of every teacher + student).  Painful but correct.
3. **Within 1 hour — audit usage.**  Pull Cloudflare access logs and
   Fly.io request logs covering the window from "first possible
   exposure" → "key rotation completed".  Look for callers outside
   our infrastructure.
4. **Append a `git-secrets`-style pre-commit hook** if the leak was
   via a commit, so the same class of mistake fails fast next time.
   Until that's in place, raise the on-call paranoia level.
5. **Notify Supabase + the affected vendor** if you have ANY reason
   to believe the key was exploited (not just exposed).  Most
   vendors have a "report a leaked key" form — use it.
6. **Add to post-mortem action items**: was the key kept in
   localStorage / a frontend bundle / a config file in the repo?
   Move it to env vars + secrets manager if so.

---

| Role | Person | Contact | Backup |
|---|---|---|---|
| **Founder / DPO** | See `DATA_PROTECTION_OFFICER.name` in `src/config/privacy-config.ts` | `DATA_PROTECTION_OFFICER.email` + operator-stored phone (vault: `Vocaband Production` → `INCIDENT.md` one-pager) | Emergency-access contact on the 1Password vault |
| **On-call engineer** | <rotation> | Slack alert | <backup person> |
| **Privacy lawyer** | <retainer firm> | <email> | <fallback firm> |
| **Pen-test contact** | <firm> | <email> | n/a |

> ⚠️ The "Person / Contact" cells with `<…>` placeholders must be
> filled in BEFORE the first incident.  Empty rows are themselves a
> SEV-2 finding at the next quarterly review.  The DPO row is
> intentionally kept in sync with `privacy-config.ts` instead of
> hard-coded here so the public privacy page and this runbook can't
> drift.

---

## Quarterly tabletop exercise

Every quarter, walk through this runbook against a hypothetical.
Mix tabletops that exercise the standard SEV path with ones that
exercise the specialised playbooks above (subprocessor breach,
key compromise).  Rotate through the list below or invent new ones
based on the past quarter's near-misses:

- A teacher reports they can see another teacher's class roster (RLS regression).
- A student's progress is visible at a public URL (auth/share-link bug).
- Supabase service-role key was committed to a public gist (use the **Service-role key compromise** playbook).
- Cloudflare reports a sustained DDoS and the origin is dropping requests.
- **Anthropic** discloses an API-key leak that may include zero-retention prompts from our org (use the **Subprocessor / supply-chain breach** playbook).
- **Sentry** discloses an incident affecting EU project data (use the same playbook; verify scrubPii was active for the affected window).
- A teacher account is taken over via credential-stuffing — no MFA today (containment via JWT-secret rotation + targeted password reset).

Time it.  If first 30 minutes take > 30 minutes, the runbook needs work.

---

## Maintenance

- After every real incident, edit this doc with anything that was unclear or wrong under pressure.
- Bump the "Last updated" timestamp.
- Re-run the table-top quarterly to keep muscle memory.
