> ⚠️ **DRAFT — pending legal review.**
> This template was produced as an engineering starting point for the
> Vocaband 2026-05-22 edtech-compliance audit (C-5).  It must be reviewed
> and finalised by an Israeli privacy lawyer (and, for EU schools, an
> EU-qualified privacy counsel) before signing.  Placeholders are
> marked `<…>` throughout — fill them at signing.
>
> Authoritative language: English.  Hebrew / Arabic / Russian
> companion drafts are at `DPA-he.md`, `DPA-ar.md`, `DPA-ru.md` and
> are draft translations only — in case of conflict, this English
> text governs until the operator's lawyer designates otherwise in
> the executed agreement.
>
> Version: 2026-05-22 draft 1.

---

# Data Processing Agreement (DPA)

**Between:**

- **The School / Educational Institution** — `<full legal name>`,
  with registered address at `<address>`, represented by `<name and
  role>` (the **"Controller"**); **and**

- **Vocaband Educational Technologies** — Israel, contact
  `contact@vocaband.com`, represented by Waseem Abu Akel, Founder
  (the **"Processor"**).

The Controller and Processor are each a **"Party"** and together the
**"Parties"**.

---

## Recitals

(A) The Controller is an educational institution that uses the
    Vocaband platform (the **"Services"**, defined at §2) for the
    delivery of English-language vocabulary instruction to its
    students.

(B) In the course of providing the Services, the Processor will
    process personal data on behalf of the Controller, including
    personal data of minors (data subjects aged 9–15 typically;
    extended grades 1–12 in scope).

(C) The Parties wish to comply with their respective obligations
    under:

  1. **Israeli Privacy Protection Law, 5741-1981**, as amended by
     **Amendment 13** ("תיקון 13"), and the **Privacy Protection
     Regulations (Information Security), 5777-2017** ("תקנות הגנת
     הפרטיות (אבטחת מידע), תשע״ז-2017");

  2. The **EU General Data Protection Regulation (Regulation
     (EU) 2016/679)** ("GDPR") to the extent it applies to data
     subjects in the European Economic Area;

  3. Any applicable Israeli **Ministry of Education
     ("MoE", משרד החינוך)** circulars governing the procurement
     and use of digital services in schools, including but not
     limited to the relevant חוזרי מנכ"ל and the תקנון מנכ"ל
     provisions on student-data handling.

(D) This Agreement sets out the terms on which the Processor will
    process personal data on the Controller's behalf, and forms part
    of the wider service agreement between the Parties (the
    **"Principal Agreement"**).

---

## 1. Definitions

Unless otherwise defined, capitalised terms have the meanings given
in GDPR Art. 4 and in the Israeli Privacy Protection Law.

| Term | Meaning |
|---|---|
| **Controller** | The natural or legal person who alone or jointly determines the purposes and means of the processing of personal data (GDPR Art. 4(7); "מחזיק במאגר" / "בעל המאגר" under Israeli law as applicable). |
| **Processor** | The natural or legal person which processes personal data on behalf of the Controller (GDPR Art. 4(8); "מעבד" / "גורם מעבד" under Israeli law). |
| **Personal Data** | Any information relating to an identified or identifiable natural person (GDPR Art. 4(1); "מידע אישי" under Israeli law). |
| **Personal Data Breach** | A breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, Personal Data (GDPR Art. 4(12); "אירוע אבטחה" under the 2017 Regulations § 11(b)). |
| **Sub-processor** | Any natural or legal person engaged by the Processor to process Personal Data on behalf of the Controller. The Processor's list of approved Sub-processors is published at `docs/SUBPROCESSORS.md` and is updated with ≥30 days' prior notice (§7 below). |
| **Services** | The Vocaband educational platform as defined in the Principal Agreement, including the web application, server-side APIs, AI features (OCR, sentence generation, lesson builder, Bagrut), live-challenge socket server, and any documentation expressly forming part of it. |
| **DPO** | Data Protection Officer ("ממונה על הגנת הפרטיות") as defined under Amendment 13. The Processor's DPO is identified in `src/config/privacy-config.ts → DATA_PROTECTION_OFFICER` and reachable at `privacy@vocaband.com`. |

---

## 2. Subject matter, duration, and nature of processing

### 2.1 Subject matter

The Processor processes Personal Data of the Controller's students
and teaching staff for the purposes of delivering the Services.

### 2.2 Duration

This Agreement applies for the term of the Principal Agreement and
survives termination to the extent necessary for the Processor's
obligations under §13 (return and deletion of data).

### 2.3 Nature and purpose

Processing is **limited to** the purposes of:

  (a) creating and maintaining teacher and student accounts;
  (b) authenticating teacher login (Google OAuth or email + OTP);
  (c) authenticating student login (class code + PIN, or anonymous
      session keyed to the class code);
  (d) recording student progress, scores, and gamification metrics
      (XP, streaks, badges) for the Controller's gradebook;
  (e) facilitating live in-class challenges via the WebSocket server
      (in-memory only, never persisted to disk);
  (f) optional AI features triggered explicitly by a teacher:
      OCR of teacher-uploaded vocabulary lists, AI-generated example
      sentences, AI-generated lesson text, and Bagrut-style exercise
      generation;
  (g) security operations (rate limiting, authentication, audit
      logging, breach response).

Processing is **prohibited** for any purpose beyond the above,
including in particular: advertising, marketing to data subjects,
re-sale to third parties, training of AI/ML models on student data,
behavioural profiling for commercial purposes, or any combination of
Personal Data with data from outside the Services.

---

## 3. Types of Personal Data and categories of data subjects

### 3.1 Categories of data subjects

| # | Category | Approximate age | Notes |
|---|---|---|---|
| 1 | Students | 9–15 typically; full range 6–18 supported | Minors. Identified inside a class by display name; no email collected for default student accounts (synthetic placeholder address used internally — see Privacy Policy §3.1). |
| 2 | Teachers | Adults | Identified by Google email or school email + OTP. |
| 3 | School administrators | Adults | Procurement / DPO contact at the Controller; no platform account by default. |

### 3.2 Types of Personal Data

The full list is the authoritative `THIRD_PARTY_REGISTRY` plus
`DATA_COLLECTION_POINTS` arrays in `src/config/privacy-config.ts`
and the summary in `docs/SUBPROCESSORS.md`.  Categories include:

- Account-level: display name; avatar; class code; teacher email +
  OAuth refresh token; UUID-shaped opaque identifiers.
- Educational record: scores; mistakes per word; mode played;
  completed-at timestamp; gamification metrics.
- Technical: IP address (for security operations only; not retained
  long-term); User-Agent; session tokens (browser local storage).
- Optional / teacher-triggered: image bytes uploaded for OCR
  (discarded after the OCR API returns); vocabulary words sent to AI
  generation endpoints (zero-retention per the relevant
  sub-processors' DPAs).

### 3.3 No special-category data processed

The Processor does **not** request, store, or process any
special-category Personal Data within the meaning of GDPR Art. 9
(racial / ethnic origin, political opinions, religious / philosophical
beliefs, trade-union membership, genetic / biometric / health data,
sex life / sexual orientation).  Where such data could appear
incidentally (e.g. inside a free-text display name), the Controller
shall not solicit it and the Processor shall treat any incidental
appearance as a Personal Data Breach if disclosed.

---

## 4. Processor obligations under GDPR Art. 28(3)

### 4.1 Documented instructions (Art. 28(3)(a))

The Processor will process Personal Data only on documented
instructions from the Controller.  This Agreement, the Principal
Agreement, the Privacy Policy (`public/privacy.html`), and the
in-app Privacy Settings (`/settings/privacy`) together constitute
those documented instructions.

If the Processor is required by law to process Personal Data beyond
those instructions, the Processor shall inform the Controller
before such processing unless prohibited from doing so on
important grounds of public interest.

### 4.2 Confidentiality (Art. 28(3)(b))

The Processor warrants that any natural person it authorises to
process Personal Data is bound by an enforceable confidentiality
undertaking.  At the time of signing, that comprises Vocaband's
sole founder + DPO under written acknowledgement of Amendment 13
duties; if additional staff are engaged the Processor will update
this clause within 30 days.

### 4.3 Security measures (Art. 28(3)(c), Art. 32, Reg 2017 § 4–7)

The Processor implements appropriate technical and organisational
measures to ensure a level of security appropriate to the risk.
Detailed controls are described in:

- `docs/INFORMATION-SECURITY-POLICY.md` (operational policy)
- `docs/SECURITY-OVERVIEW.md` (architectural summary)
- `docs/SUBPROCESSORS.md` (per-sub-processor safeguards)
- `docs/RISK-REGISTER.md` (risk register per Reg 2017 § 6)
- `scripts/security-pen-test.sh` (executable pen-test suite)

Summary of key controls:

  (a) **Encryption.** TLS 1.3 in transit for every endpoint;
      AES-256-equivalent encryption at rest in Supabase (PostgreSQL).
  (b) **Authentication.** Teachers via Google OAuth (DPF-certified)
      or email + one-time code; students via class code + PIN or
      anonymous session.  Multi-factor authentication for the
      operator's Supabase / Fly.io / Cloudflare administrative
      consoles.
  (c) **Authorisation.** Row-Level Security (RLS) policies on every
      Personal Data table; tenant-scoped (per-class) reads enforced
      by the policy described in `supabase/schema.sql → classes_select`.
  (d) **Audit logging.** Append-only audit log (`public.audit_log`)
      with database-level immutability triggers
      (migration `20260518120000_audit_log_immutability.sql`)
      records data-subject-rights actions and admin operations.
  (e) **PII scrubbing.** All log output and Sentry events pass
      through `src/utils/scrubPii.ts` to strip emails, JWTs,
      bearer tokens, and Supabase secrets before write.
  (f) **Rate limiting.** Per-IP and per-uid rate limits on
      pre-auth endpoints (class lookup, login).
  (g) **Cookie consent.** Defaults-off non-essential cookies with
      symmetric Accept / Reject controls per EDPB Guidelines 03/2022.
  (h) **Backups.** Supabase platform backups (≤30 days) plus
      encrypted off-site weekly `pg_dump` in Cloudflare R2 (≤365 days)
      — see `RETENTION_PERIODS.backupOffsiteR2Days`.

### 4.4 Sub-processors (Art. 28(2), Art. 28(3)(d))

See **§7** below.

### 4.5 Data-subject rights assistance (Art. 28(3)(e), Art. 12–22)

The Processor provides in-product mechanisms for:

  (a) **Access (Art. 15).** Subject access export via the
      `export_my_data` SECURITY DEFINER RPC, surfaced in Privacy
      Settings as "Download My Data".  Returns a versioned JSON
      bundle including the user row, profile row, classes /
      assignments owned (teacher), progress, consent history,
      audit log entries the user is actor or target of, and AI
      usage counters.  See migration
      `20260522020000_expand_export_and_delete.sql`.
  (b) **Rectification (Art. 16).** Display name editable in
      Privacy Settings; other fields editable via the Controller's
      admin teacher in the platform.
  (c) **Erasure (Art. 17).** Account-deletion via the
      `delete_my_account` RPC, surfaced as "Delete My Account".
      Deletes `public.users`, `student_profiles` / `teacher_profiles`,
      classes (teacher) cascading to assignments and AI usage
      counters, and `auth.users`.  Audit-log entries are retained
      under the Art. 17(3)(b)/(e) legal-retention exemption and
      age out at 730 days via `cleanup_expired_data`.
  (d) **Restriction (Art. 18) / Objection (Art. 21).** Handled
      out-of-product by email to `privacy@vocaband.com` with the
      SLA at §11.5.
  (e) **Portability (Art. 20).** The Art. 15 export is a structured,
      commonly-used, machine-readable JSON format and satisfies
      Art. 20.

### 4.6 Breach notification (Art. 28(3)(f), Art. 33)

See **§9** below and `docs/INCIDENT-RESPONSE.md`.

### 4.7 DPIA assistance (Art. 28(3)(f), Art. 35–36)

The Processor has prepared a technical DPIA template at
`docs/DPIA-TECHNICAL.md` and an executive summary at
`docs/legal/DPIA-EXECUTIVE-SUMMARY-en.md` (plus HE / AR / RU
translations).  The Controller may, on reasonable request and at
its own cost, request additional DPIA assistance from the
Processor.

### 4.8 Return / deletion (Art. 28(3)(g))

See **§13** below.

### 4.9 Audit cooperation (Art. 28(3)(h))

See **§12** below.

---

## 5. Children's data — additional protections

Because the platform is designed for use by minors, the Processor
applies the following additional measures beyond Art. 28:

  (a) **Data minimisation.** Default student accounts collect no
      email, no real name, no government ID, no photograph, no
      location.  Synthetic internal email is used solely to satisfy
      authentication-system uniqueness constraints.
  (b) **No behavioural advertising.** The Services contain no
      third-party advertising networks, no marketing pixels, no
      behavioural-analytics SDKs.
  (c) **No public profiles.** Student progress and identity are
      visible only within the student's own class, to the class
      teacher, and to the school's administrator if appointed.
  (d) **Parental rights.** Parents or legal guardians may exercise
      data-subject rights on behalf of their child by emailing
      `privacy@vocaband.com` with reasonable verification of
      guardianship.  The forthcoming parental-rights surface
      (audit item C-1+C-8) will give parents a direct in-product
      channel; the Processor will notify the Controller when that
      surface ships.
  (e) **AI safety.** AI features that produce text consumed by
      minors run with safety filters consistent with the AI
      sub-processors' published children-safety guidance.

---

## 6. International transfers (GDPR Chapter V)

### 6.1 Default residency

All persistent Personal Data is stored in the EU.  The Services are
hosted at:

| Sub-processor | Region |
|---|---|
| Supabase (database, auth, storage) | EU — Frankfurt, `eu-central-1` |
| Fly.io (application server) | EU — Amsterdam, `ams` |
| Sentry (error tracking) | EU — Germany (`*.ingest.de.sentry.io`) |

Israel is recognised by the European Commission as providing an
adequate level of protection; transfers between Israel and the EEA
require no further safeguards.

### 6.2 Transit-only transfers outside the EEA

Some transit-only transfers outside the EEA occur on explicit user
or teacher action.  Each is documented at `docs/SUBPROCESSORS.md →
"International transfer register"` with:

  (a) destination jurisdiction;
  (b) lawful transfer mechanism (EU-US Data Privacy Framework
      certification, EU adequacy, Standard Contractual Clauses,
      or "not required" for no-Personal-Data payloads);
  (c) verifiable URL for the certification;
  (d) link to the sub-processor's Data Processing Agreement;
  (e) the Processor's Transfer Impact Assessment outcome;
  (f) date of last review.

### 6.3 Change-notification

The Processor will notify the Controller ≥30 days before adding,
removing, or materially changing a sub-processor that processes
Personal Data, via the public mailing list documented at
`docs/SUBPROCESSORS.md → "Subscribe to subprocessor changes"`.

---

## 7. Sub-processors (Art. 28(2)–(4))

### 7.1 Approved list

The Controller grants the Processor general written authorisation
to engage the sub-processors listed at `docs/SUBPROCESSORS.md`.
That list is the authoritative source and includes for each
sub-processor: name, purpose, data categories, hosting region,
endpoint, transfer mechanism, DPA URL, and Transfer Impact
Assessment outcome.  A printable snapshot is appended to this
Agreement at signing as **Annex A**.

### 7.2 New or replacement sub-processors

For any addition or replacement, the Processor will:

  (a) update `THIRD_PARTY_REGISTRY` in source and bump
      `PRIVACY_POLICY_VERSION`;
  (b) append a row to `SUBPROCESSOR_CHANGELOG`;
  (c) send the ≥30-day notice to the Controller (and to the
      `privacy@vocaband.com` subscriber list) BEFORE the new
      sub-processor goes live.

The Controller may object on reasonable grounds within the
30-day window.  If the objection cannot be reasonably resolved,
the Controller may terminate the Principal Agreement for cause
without penalty.

### 7.3 Processor remains liable

The Processor remains fully liable to the Controller for the
performance of any sub-processor's obligations.

---

## 8. Confidentiality (Art. 28(3)(b))

The Processor and its personnel will keep Personal Data
confidential and will not disclose it to any third party except:

  (a) to sub-processors as permitted under §7;
  (b) as required by enforceable judicial or regulatory order
      (with notice to the Controller unless legally prohibited);
  (c) as expressly authorised by the Controller in writing.

---

## 9. Personal Data Breach (Art. 28(3)(f), Art. 33)

### 9.1 Notification SLA

The Processor will notify the Controller of any confirmed Personal
Data Breach affecting the Controller's data **without undue delay
and in any event within 24 hours** of the Processor becoming aware
of the breach.  Notification will include the categories of data,
approximate number of data subjects affected, likely consequences,
and the measures taken or proposed to address the breach.

### 9.2 PPA and MoE notification

Where the breach meets the trigger conditions under the Israeli
Privacy Protection Regulations 2017 § 11(b), the Processor will
file the required notification to the Israeli Privacy Protection
Authority within 72 hours.  For MoE-approved schools, the
Processor will additionally notify the MoE Information Security
desk.  The procedural details are in
`docs/INCIDENT-RESPONSE.md → "Privacy Protection Authority
notification"` and `docs/INCIDENT-RESPONSE.md → "MoE notification"`.

### 9.3 Cooperation

The Processor will reasonably assist the Controller in fulfilling
its own breach-notification obligations to its supervisory
authority and to affected data subjects.

---

## 10. Liability and indemnification

The liability of each Party arising from or in connection with
this Agreement is governed by the Principal Agreement.  Nothing in
this Agreement limits or excludes a Party's liability for:

  (a) gross negligence or wilful misconduct;
  (b) personal injury or death caused by negligence;
  (c) any liability which cannot lawfully be limited or excluded
      under applicable mandatory law (including but not limited
      to the Israeli Privacy Protection Law and GDPR).

---

## 11. Data-subject requests

### 11.1 Direct requests to the Processor

If the Processor receives a data-subject request directed at
Personal Data processed on the Controller's behalf, the Processor
will:

  (a) forward the request to the Controller within 5 business
      days; and
  (b) not respond substantively to the request unless authorised
      by the Controller, except to confirm receipt and identify
      the Controller as the data controller.

### 11.2 In-product self-service

Data subjects may exercise Art. 15 (export), Art. 16 (rectification
of display name), and Art. 17 (erasure) directly through the
in-product Privacy Settings without involving the Controller.
The Processor will inform the Controller on request of the
existence of these mechanisms.

### 11.3 Response SLA

For requests not satisfiable through self-service, the Processor
will assist the Controller in responding within the regulatory
deadlines (30 days for GDPR Art. 12(3); equivalent under Israeli
law) and provide its DPO contact at `privacy@vocaband.com` for
direct cooperation.

---

## 12. Audits (Art. 28(3)(h))

### 12.1 Information provided on request

The Processor will, on the Controller's reasonable written
request and at no charge, provide:

  (a) the published documents at `docs/SUBPROCESSORS.md`,
      `docs/INFORMATION-SECURITY-POLICY.md`, `docs/DPIA-TECHNICAL.md`,
      `docs/RISK-REGISTER.md`, `docs/INCIDENT-RESPONSE.md`, and
      the public Privacy Policy at `public/privacy.html`;
  (b) the latest output of `scripts/security-pen-test.sh` when
      asked, redacting any cell that would itself disclose
      Personal Data;
  (c) any independent security or privacy assessments commissioned
      by the Processor (when available).

### 12.2 Inspections

The Controller may, on 30 days' written notice, conduct or
commission an on-site or virtual inspection of the Processor's
security controls in respect of the Services, not more than once
per calendar year, at the Controller's own cost.  Inspection scope
is limited to what is reasonably necessary to verify compliance
with this Agreement and may not require disclosure of any other
controller's data.

---

## 13. Return / deletion at end of services (Art. 28(3)(g))

### 13.1 At Controller's choice

On termination of the Principal Agreement, the Controller may
choose, by written notice within 30 days:

  (a) **Export** — the Processor will make available a structured,
      machine-readable export of the Controller's data via the
      same mechanisms as Art. 15 / Art. 20 self-service, plus an
      operator-assisted bulk export of the Controller's entire
      tenant on request;

  (b) **Deletion** — the Processor will delete all Personal Data
      processed on the Controller's behalf, subject to the
      retention windows in §13.2 below.

### 13.2 Residual retention

The following retention windows apply notwithstanding §13.1(b):

  (a) **Backups.** Personal Data may remain in encrypted backups
      until those backups expire on their natural rotation:
      Supabase platform backups (≤30 days) and the off-site
      Cloudflare R2 weekly `pg_dump` (≤365 days).  See
      `RETENTION_PERIODS` in `src/config/privacy-config.ts`.

  (b) **Audit log.** Audit-log entries identifying actions
      involving the Controller's data are retained under
      GDPR Art. 17(3)(b)/(e) and Israeli Privacy Protection
      Regulations 2017 § 8 (audit retention) for the configured
      period (730 days at the time of signing) and then deleted
      by `cleanup_expired_data`.

  (c) **Consent log.** Consent records are retained for 10 years
      (`RETENTION_PERIODS.consentLogDays`) as a legal-obligation
      retention.

  (d) **Statutory holds.** Any data subject to a lawful preservation
      order or to legitimate ongoing legal claim defence is
      retained until the hold expires.

### 13.3 Certification of deletion

On request, the Processor will provide a written certification of
deletion identifying the categories of data deleted, the date of
deletion, and the residual retention items per §13.2.

---

## 14. Governing law and jurisdiction

This Agreement is governed by **Israeli law**.  The courts of
**Tel Aviv – Jaffa** have exclusive jurisdiction over any dispute
arising from or in connection with this Agreement, subject to
any mandatory provision of the EU GDPR conferring jurisdiction
on a data subject's home Member State for actions brought by
that data subject.

---

## 15. Order of precedence

In the event of conflict between this Agreement and the Principal
Agreement on the subject of data protection, this Agreement
prevails.

---

## 16. Annexes

- **Annex A — Sub-processor snapshot.**  Printable extract from
  `docs/SUBPROCESSORS.md` at the date of signing.
- **Annex B — Security measures.**  Printable extract from
  `docs/INFORMATION-SECURITY-POLICY.md` at the date of signing.
- **Annex C — Categories of data subjects and types of Personal
  Data.**  Printable extract from `src/config/privacy-config.ts →
  DATA_COLLECTION_POINTS` at the date of signing.

---

## 17. Signatures

| Role | Name | Signature | Date |
|---|---|---|---|
| **Controller** — `<School name>`, represented by `<role>` | `<name>` |   |   |
| **Processor** — Vocaband Educational Technologies, represented by Founder + DPO | Waseem Abu Akel |   |   |

*Two signed counterparts; one retained by each Party.*
