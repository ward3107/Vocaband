# Vocaband — Data Protection Impact Assessment (DPIA) — technical template

> **תיק"מ — Technical sections.**  This is the engineering input to a
> full DPIA.  The risk-rating, mitigations-vs-residual-risk decisions,
> and legal-basis paragraphs are intentionally LEFT BLANK — those need
> a privacy lawyer's signoff.  An engineer can fill in everything
> below the line "FOR LAWYER" markers.
>
> Purpose: hand this to the lawyer doing the formal DPIA so they don't
> have to re-extract architecture facts from source code.

> Last updated 2026-05-04.

---

## 0. Document control

| Field | Value |
|---|---|
| Version | 1.0 |
| Author (technical) | Engineering |
| Author (legal) | **TODO — privacy lawyer** |
| Reviewer (DPO) | **TODO — DPO appointment pending** |
| Approval date | **TODO** |
| Next review | Annual + on any material change to data flows |

---

## 1. Context of the processing

### 1.1 Who is the controller?

**Vocaband Educational Technologies** (Israel).  Contact:
`contact@vocaband.com`.  Data controller for all personal data of
teachers and students using the platform.

### 1.2 What is the processing activity?

Operating an English-vocabulary learning platform for Israeli school
students (grades 4-9 primary use case, extensible to grades 1-12).
Teachers create classes and assignments; students log in and play
game-mode exercises that record progress; teachers see aggregate
progress in a gradebook.

### 1.3 Who are the data subjects?

| Group | Approx. count | Notes |
|---|---|---|
| Students (minors, ages 9-15 typically) | <fill in current count> | Identified by class code + display name; no email collected for student accounts |
| Teachers (adults) | <fill in current count> | Identified by Google or email + OTP |
| Quick-Play guests (anonymous, ephemeral) | Variable | Identified by anonymous Supabase auth UID + nickname; data deleted after session ends |

### 1.4 Legal basis

**FOR LAWYER:**  Document the legal basis under חוק הגנת הפרטיות
§ 11 for each data category.  Likely:
- **Teacher data**: consent (active sign-up).
- **Student data**: educational legitimate interest + teacher-mediated parental authority via the school context.  Lawyer should confirm whether explicit parental consent is required under § 25.
- **Quick-Play guest data**: consent (active join).

---

## 2. Description of the processing

### 2.1 Data categories collected

| Category | Source | Purpose | Retention | Mandatory |
|---|---|---|---|---|
| Email (teacher) | Google OAuth or email-OTP signup | Auth + account recovery | Until account deletion | Yes |
| Display name (teacher + student) | User input | UI personalisation, gradebook display | Until account deletion | Yes |
| Class code | Teacher input on class creation | Routing students to assignments | Until class deletion | Yes |
| Assignments (word lists) | Teacher input | Define what each student practises | Until class deletion or 90 days post-class-deletion | Yes |
| Progress records (score, mode, mistakes, timestamp) | Recorded by client on game completion | Gradebook + adaptive features (pet evolution, SRS scheduling) | 365 days default (configurable in `RETENTION_PERIODS.progressRecordsDays`) | Yes for app function |
| Avatar choice | User input | Personalisation | Until account deletion | No |
| Audit log (actor, action, target, timestamp) | Server-side on every protected action | Security forensics + Reg 2017 compliance | 730 days (`auditLogDays`) | Yes for compliance |
| Consent log (user, version, timestamp, action) | Server-side on every consent event | Demonstrating consent under Amendment 13 | Indefinite | Yes for compliance |

### 2.2 Data NOT collected (intentional minimisation)

- No phone numbers.
- No physical addresses.
- No health, biometric, religious, or political data.
- No payment information (platform is currently free).
- No precise geolocation (only country-level via Cloudflare for routing).
- No browsing history outside Vocaband.
- No third-party advertising identifiers.

### 2.3 Sources of data

| Source | Direct or indirect? | Data |
|---|---|---|
| Teacher signup | Direct (subject themselves) | Email, display name |
| Student signup | Direct (student types) | Display name |
| Google OAuth | Indirect (Google passes it) | Email, display name |
| Class creation | Direct (teacher) | Class code, name |
| Assignment creation | Direct (teacher) | Word lists, instructions |
| Game play | Direct (student) | Progress scores |
| Server-side telemetry | System-generated | Audit log entries, request IPs (Cloudflare logs only) |

### 2.4 Recipients (sub-processors)

See `docs/SUBPROCESSORS.md` — full list with hosting region, data
categories, and DPA references.

### 2.5 Cross-border transfers

| Source | Destination | Mechanism | Data |
|---|---|---|---|
| Israel | EU (Frankfurt — Supabase) | EU-Israel adequacy decision (mutual) | All persistent data |
| Israel | EU (Amsterdam — Fly.io) | Same | Request handling, in-memory only |
| Israel | US (Anthropic) | EU SCCs via Anthropic's standard contract | Vocabulary words on AI feature use only |
| Israel | US (Google OAuth) | EU-US Data Privacy Framework | Auth handshake only |

---

## 3. Necessity and proportionality assessment

**FOR LAWYER:**  For each data category in 2.1, document:
- Is collection necessary for the stated purpose?  Yes/No + justification.
- Is the retention period proportionate?
- Are there less-intrusive alternatives that achieve the same purpose?

Engineering view: every category in 2.1 was added because a feature
needed it.  None is collected "in case we want it later."

---

## 4. Risk assessment

**FOR LAWYER:**  Complete the risk register below.  Engineering provides
the threat list and current mitigations; severity / likelihood scoring
is the lawyer's domain.

| # | Threat | Affected data | Current mitigations | Severity | Likelihood | Residual risk |
|---|---|---|---|---|---|---|
| R1 | Unauthorized access to student progress by another student | Progress records | RLS policy on `progress` table scopes to student UID; pen-test verified 2026-04-28 | TODO | TODO | TODO |
| R2 | Unauthorized access to one teacher's class data by another teacher | Class data + student progress | RLS scopes to `teacher_uid`; verification SQL in `SECURITY-OVERVIEW.md` | TODO | TODO | TODO |
| R3 | XP / score forgery by client-side manipulation | Progress records | `save_student_progress` RPC re-validates auth + per-student scope; `award_reward` clamps XP to ±1000 | TODO | TODO | TODO |
| R4 | Account takeover via stolen JWT | All data accessible to that user | TLS 1.2/1.3 only, JWT TTL 1 hour, refresh token revocable from dashboard, no cookies (no CSRF surface) | TODO | TODO | TODO |
| R5 | Service-role key leak | Whole database | Key only on Fly.io secrets, never in `src/`, never in repo, rotated 2026-04-28; new rotation cadence semi-annual | TODO | TODO | TODO |
| R6 | XSS via malicious word list | Whole client of affected teacher | React auto-escapes; CSP `'unsafe-eval'` blocked; OCR output cleaned before display | TODO | TODO | TODO |
| R7 | Anonymous QP guest enumeration of session codes | QP session metadata | Session codes random 6-char alphanumeric (~2^31 keyspace); rate limiting 60/min/IP on lookup endpoint; only is_active=true rows returned | TODO | TODO | TODO |
| R8 | DDoS / availability | Service availability | Cloudflare absorbs at edge; Fly.io auto-scales; degraded modes have offline-cached fallback (PWA SW) | TODO | TODO | TODO |
| R9 | Vendor sub-processor breach (Supabase / Fly / Cloudflare) | Whatever they hold | DPA in place with each; monitoring of their security advisories; quarterly review | TODO | TODO | TODO |
| R10 | Insider misuse by Vocaband staff | All data | Two-person access to production secrets; audit log records every admin action | TODO | TODO | TODO |
| R11 | Rights-of-data-subject not honoured | Compliance | `export_my_data()` + `delete_my_account()` self-service in privacy settings; lawyer reviewed flow on <date> | TODO | TODO | TODO |
| R12 | Loss of data integrity (silent corruption) | All data | Supabase daily backup + 30-day retention; no manual destructive operations on production | TODO | TODO | TODO |

---

## 5. Measures planned to address the risks

**FOR LAWYER:**  For each risk in section 4, document mitigation
adequacy + any additional measures needed before the residual risk is
acceptable.  Engineering can implement once the lawyer flags what to
prioritize.

Measures already in place are documented in:
- `docs/SECURITY-OVERVIEW.md` — overall security posture
- `docs/SECURITY-LEVELS.md` — defence-in-depth layer map
- `docs/PRIVACY_CHECKLIST.md` — Israeli PPA Amendment 13 controls
- `docs/INCIDENT-RESPONSE.md` — incident handling
- `docs/SUBPROCESSORS.md` — third-party processors

---

## 6. Consultation

| Stakeholder | Date | Notes |
|---|---|---|
| DPO | TODO | Pending DPO appointment |
| Data subjects (teachers / parents — sample) | TODO | Recommended: pilot-school feedback survey |
| Privacy Protection Authority (RJDP) | Optional | Available on request for sensitive cases |

---

## 7. Conclusion

**FOR LAWYER + DPO:**  After completing sections 3-6, render an overall
conclusion:
- Is the processing lawful?
- Are residual risks acceptable?
- What conditions / monitoring is required?
- What triggers re-running the DPIA?

---

## 8. Annexes

- **A1**: System architecture diagram — see `docs/DATA_FLOW.md`
- **A2**: RLS policy reference — see `docs/SECURITY.md`
- **A3**: Sub-processor list — see `docs/SUBPROCESSORS.md`
- **A4**: Privacy Checklist (PPA Amendment 13 mapping) — see `docs/PRIVACY_CHECKLIST.md`
- **A5**: Incident response runbook — see `docs/INCIDENT-RESPONSE.md`
- **A6**: MoE vendor questionnaire pre-fill — see `docs/MOE-VENDOR-QUESTIONNAIRE.md`
- **A7**: 3rd-party penetration test report — TODO (after pen-test contracted)

---

## 9. Maintenance

This DPIA must be reviewed:
- Annually.
- On any material change to data flows (new sub-processor, new data category, change in legal basis).
- After any SEV-1 / SEV-2 incident.
- On any change to applicable law (PPA amendment, MoE circular update).

After review, bump version + date at top.
