# Vocaband — MoE vendor security questionnaire (pre-filled answers)

> The Israeli Ministry of Education's Information Security desk
> (ממונה אבטחת מידע במשרד החינוך) sends every prospective vendor a
> security questionnaire — commonly referenced as "Tofes 22 / 23"
> (טופס 22/23) — covering ~80-120 questions across data handling,
> hosting, encryption, access control, incident response, and
> sub-processors.
>
> This doc pre-fills the technical answers in EN + HE so when you
> receive the actual blank form, copy/paste is fast.  Some questions
> require legal-style answers (DPA references, privacy-policy
> excerpts) which a lawyer needs to provide; those are marked
> **TODO LAWYER**.

> Last updated 2026-05-04.  Update this doc whenever the answer to
> any question changes (new sub-processor, new feature, etc.) so a
> future fill is just copy-paste.

---

## How to use this doc

1. When MoE sends you the actual form, find the matching question by
   topic (sections below mirror the standard form structure).
2. Copy the answer from the **EN** or **HE** column as required.
3. For **TODO LAWYER** rows, ask your privacy lawyer for the
   official answer text and add it to that row in this doc so it's
   reusable next time.

---

## Section 1 — Vendor identification

| Q | Question | Answer |
|---|---|---|
| 1.1 | Vendor legal name | Vocaband Educational Technologies |
| 1.2 | Country of incorporation | Israel |
| 1.3 | Privacy contact | `privacy@vocaband.com` (set up Phase 1; see `MOE-REQUIREMENTS.md`) |
| 1.4 | DPO name + email | **TODO operator — appoint DPO** |
| 1.5 | Years in operation | **TODO operator — fill exact** |
| 1.6 | Other school customers | **TODO operator — list current** |

---

## Section 2 — Database registration + classification

| Q | Question | Answer |
|---|---|---|
| 2.1 | מספר רישום מאגר (Database registration number with Privacy Protection Authority) | **TODO operator — register first; takes 30-90 days** |
| 2.2 | Database security level under Reg 2017 | רמה גבוהה (High) — because subjects include minors |
| 2.3 | Approximate number of data subjects | **TODO operator — fill exact (teachers + students)** |
| 2.4 | Date of last formal risk assessment | **TODO** — pending DPIA completion (`docs/DPIA-TECHNICAL.md`) |

---

## Section 3 — Data hosting + cross-border transfers

| Q | Question | Answer |
|---|---|---|
| 3.1 | Where is personal data stored physically? | EU — Frankfurt, Germany (Supabase eu-central-1).  All persistent personal data lives there. |
| 3.2 | Are there cross-border transfers? | Yes, Israel ↔ EU (covered by mutual adequacy decision).  Optional: Israel ↔ US for AI features (Anthropic SCCs) and Google OAuth (EU-US Data Privacy Framework). |
| 3.3 | List of all sub-processors | See `docs/SUBPROCESSORS.md` (also published at vocaband.com/privacy if requested by reviewer). |
| 3.4 | Is each sub-processor under a written DPA? | Yes — Supabase, Fly.io, Cloudflare, Google all have signed DPAs.  References in `SUBPROCESSORS.md`. |
| 3.5 | Are sub-processor changes notified? | Yes — `PRIVACY_POLICY_VERSION` bump triggers re-consent prompt to all users. |

---

## Section 4 — Encryption

| Q | Question | Answer |
|---|---|---|
| 4.1 | Encryption in transit | TLS 1.2 + 1.3 only.  TLS 1.0/1.1 disabled.  All cipher suites offer Forward Secrecy.  SSL Labs grade A+ (verified 2026-04-28; re-verified quarterly). |
| 4.2 | Encryption at rest | AES-256 — applied by Supabase to entire database, all backups, and Storage objects. |
| 4.3 | Key management | Encryption keys managed by Supabase; service-role API key managed by Vocaband (rotated semi-annually + after any suspected leak; last rotated 2026-04-28). |
| 4.4 | HSTS / forced HTTPS | Yes.  HSTS header `max-age=31536000; includeSubDomains; preload`.  Submitted to Chrome / Firefox / Edge HSTS preload list. |
| 4.5 | Field-level encryption for special categories | Not in use — no special-category data is collected (no health, biometric, financial, etc.). |

---

## Section 5 — Authentication + access control

| Q | Question | Answer |
|---|---|---|
| 5.1 | Authentication mechanism for teachers | Supabase Auth.  Two paths: (a) Google OAuth with PKCE, (b) email + 6-digit OTP for shared-computer scenarios. |
| 5.2 | Authentication mechanism for students | Two paths: (a) account-based (Google OAuth), (b) class-code + display-name + anonymous Supabase auth (most common — minimises data on under-14s). |
| 5.3 | MFA available? | Implicitly via Google OAuth (if teacher's Google account has MFA).  Explicit MFA for the OTP path is on the roadmap. |
| 5.4 | How is authorization enforced? | PostgreSQL Row-Level Security on every table, plus per-user scope checks inside SECURITY DEFINER RPCs (e.g. `save_student_progress` re-validates the auth UID matches the row's student UID). |
| 5.5 | Are admin actions logged? | Yes — `public.audit_log` table records actor, action, data category, target, timestamp.  Retention 730 days (2 years). |
| 5.6 | Service-role / admin keys | One service-role key, server-only (Fly.io secrets), never in client code, never committed.  Two-person knowledge (founder + 1 engineer). |
| 5.7 | Privileged-access cadence | Service-role key rotated semi-annually; quarterly access review of who has Supabase / Fly.io / Cloudflare dashboard access. |

---

## Section 6 — Application security

| Q | Question | Answer |
|---|---|---|
| 6.1 | Input validation | Server-side validation on every endpoint (`src/server-utils` helpers like `isValidClassCode`, `isValidName`).  Client-side validation is for UX only — never trusted by the server. |
| 6.2 | Output encoding / XSS prevention | React's auto-escaping by default; CSP `'unsafe-eval'` blocked; `script-src` restricted to `'self'` + named CDN origins. |
| 6.3 | CSRF protection | N/A by design — JWT bearer tokens in `Authorization` header, not cookies.  No implicit credentials cross-origin. |
| 6.4 | SQL injection | Supabase REST + RPC layer parametrises all queries; service-role queries on the server use the same parametrising client. |
| 6.5 | Rate limiting | Yes — `express-rate-limit` per token + per IP.  Limits documented in `server.ts` and `docs/SECURITY-OVERVIEW.md`. |
| 6.6 | Dependency vulnerability scanning | `npm audit` quarterly.  Last clean 2026-04-28. |
| 6.7 | Secret scanning in repo | `.gitignore` audited; no committed secrets verified manually 2026-04-28. |
| 6.8 | CSP / security headers | Yes — full CSP, HSTS, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin.  See `public/_headers`. |

---

## Section 7 — Audit logging + monitoring

| Q | Question | Answer |
|---|---|---|
| 7.1 | What is logged? | Every protected action: login, data access, account changes, data export, account deletion, admin operations.  Schema: actor, action, data_category, target, timestamp. |
| 7.2 | Log retention | 730 days (2 years) — meets Reg 2017 minimum. |
| 7.3 | Log immutability | Read-only for all roles except admin (admin retained for cleanup-by-retention only).  Future: rotate to append-only partitions. |
| 7.4 | Log monitoring / alerting | Cloudflare Insights for client-side errors; Fly.io stdout logs streamed; Supabase dashboard for auth events.  Anomaly detection — manual review at quarterly checkpoint. |
| 7.5 | Time synchronisation | NTP — managed by Supabase / Fly.io / Cloudflare infrastructure. |

---

## Section 8 — Incident response

| Q | Question | Answer |
|---|---|---|
| 8.1 | Documented incident-response procedure? | Yes — `docs/INCIDENT-RESPONSE.md`.  Severity scale, 30-min playbook, blast-radius queries, PPA + MoE notification templates. |
| 8.2 | Incident notification window | 24 hours (internal + DPO + affected users) for SEV-1; 72 hours to PPA + MoE per Reg 2017 § 11(b). |
| 8.3 | Tabletop exercise cadence | Quarterly — see `INCIDENT-RESPONSE.md` § Quarterly tabletop. |
| 8.4 | Most recent incident | **TODO operator — fill (use "none reportable to date" if true)** |

---

## Section 9 — Data subject rights

| Q | Question | Answer |
|---|---|---|
| 9.1 | Right to access | Yes — Privacy Settings page → "Download my data" button → `public.export_my_data()` RPC returns full JSON of user's records. |
| 9.2 | Right to rectification | Yes — display name editable in Privacy Settings; other fields editable from teacher dashboard. |
| 9.3 | Right to erasure | Yes — Privacy Settings page → "Delete my account" → `public.delete_my_account()` RPC cascades to all related data (progress, classes if teacher). |
| 9.4 | Right to data portability | Yes — JSON export from Privacy Settings.  Class-level CSV export for teachers planned. |
| 9.5 | Right to withdraw consent | Yes — Privacy Settings page → "Withdraw Consent" → logs out + flags consent withdrawn. |
| 9.6 | Response SLA | 30 days max (legal floor); typically same-day for self-service actions. |

---

## Section 10 — Children-specific protections

| Q | Question | Answer |
|---|---|---|
| 10.1 | Are users under 14? | Yes — typical primary user base is grades 4-9 (ages 9-15). |
| 10.2 | Consent model for under-14 | Teacher-mediated via the school context.  Teacher creates the class and shares the class code; students join with display name + class code (no email collected for students under the class-code path).  **TODO LAWYER**: confirm this satisfies חוק הגנת הפרטיות § 25 in the school context. |
| 10.3 | Advertising / behavioural tracking aimed at children? | None.  No ad networks, no marketing pixel, no behavioural profiling. |
| 10.4 | Special-category data on children? | None.  No health, biometric, religious, political. |
| 10.5 | Data minimisation for children? | Yes — student account stores: anonymous UID, class code, display name, avatar choice, progress records.  No email, no phone, no location. |

---

## Section 11 — Backup + business continuity

| Q | Question | Answer |
|---|---|---|
| 11.1 | Backup frequency | Daily automated backups by Supabase. |
| 11.2 | Backup retention | 30 days rolling. |
| 11.3 | Point-in-time recovery | Yes (Supabase Pro tier). |
| 11.4 | Backup encryption | AES-256 (same as primary DB). |
| 11.5 | Disaster recovery RTO / RPO | RTO ~4 hours (re-deploy to fresh Supabase project from backup); RPO ~24 hours (daily snapshots). **TODO**: formal DR runbook in `docs/DISASTER-RECOVERY.md` planned. |
| 11.6 | Business continuity plan | Cloudflare absorbs DDoS; Fly.io auto-scales; PWA offline cache lets users finish in-progress games during brief outages. |

---

## Section 12 — Vendor-of-vendor (sub-processor) chain

| Q | Question | Answer |
|---|---|---|
| 12.1 | Sub-processor change notification | Yes — `PRIVACY_POLICY_VERSION` bump fires consent re-prompt. |
| 12.2 | Sub-processor list public? | Yes — `docs/SUBPROCESSORS.md`; published at vocaband.com/privacy. |
| 12.3 | Sub-processor SOC2 / ISO27001 / equivalent | Supabase: SOC 2 Type II.  Fly.io: SOC 2 Type II.  Cloudflare: ISO 27001 + SOC 2 Type II.  Google: ISO 27001/27017/27018.  Anthropic: SOC 2 Type II (zero-retention API tier). |

---

## Section 13 — Penetration testing

| Q | Question | Answer |
|---|---|---|
| 13.1 | Frequency | At least every 18 months (Reg 2017 floor). |
| 13.2 | Most recent pen-test | **TODO operator — pen-test not yet contracted; see `MOE-REQUIREMENTS.md` Phase 3** |
| 13.3 | Pen-test firm | **TODO** |
| 13.4 | Findings + remediation summary | **TODO** — once first pen-test completes, attach summary here. |
| 13.5 | Internal RLS pen-test | Yes — `scripts/security-pen-test.sh` runs targeted RLS checks against the live DB.  Last green: 2026-04-28. |

---

## Section 14 — Compliance + legal

| Q | Question | Answer |
|---|---|---|
| 14.1 | Compliance with Privacy Protection Law (1981) | Yes — see `docs/PRIVACY_CHECKLIST.md` for control-by-control mapping. |
| 14.2 | Compliance with Privacy Protection Regulations (2017) | Yes for all technical controls; database registration with PPA pending (`MOE-REQUIREMENTS.md` Phase 1). |
| 14.3 | Compliance with Amendment 13 (2025) | Yes — see `docs/PRIVACY_CHECKLIST.md` (the doc was specifically built around Amendment 13). |
| 14.4 | GDPR? | Vocaband processes EU data via Supabase Frankfurt; GDPR compliance applies.  Technical controls overlap heavily with PPA Amendment 13.  Formal certification not pursued. |
| 14.5 | COPPA? | Vocaband is not currently marketed in the US.  Class-code model would need parent-consent-on-file extension if US users were targeted. |
| 14.6 | Bug-bounty program? | No formal program.  Responsible disclosure email: `security@vocaband.com`. |

---

## Section 15 — Operational

| Q | Question | Answer |
|---|---|---|
| 15.1 | Number of staff with access to production data | 2 (founder + 1 engineer). |
| 15.2 | Background checks for staff with PII access | **TODO operator — small team, currently informal.  Reg 2017 § 8 requires "appropriate" measures; document as: "founder is sole director; second engineer signed NDA + data-handling commitment".** |
| 15.3 | Onboarding / offboarding procedure | All access tied to per-person dashboard accounts; revoke all tokens + remove dashboard access on offboarding day. |
| 15.4 | Security training cadence | Annual self-directed (review of PRIVACY_CHECKLIST + INCIDENT-RESPONSE). |

---

## Section 16 — Termination + data return

| Q | Question | Answer |
|---|---|---|
| 16.1 | What happens to data if a school stops using Vocaband? | Class + student data deleted on teacher's request via `delete_my_account()`.  Default retention 90 days for orphaned student records (`RETENTION_PERIODS.orphanedStudentDays`) before automatic cleanup. |
| 16.2 | What happens to data if Vocaband shuts down? | **TODO LAWYER** — should be documented in DPA: 30-day notice + opportunity for school to export class data before deletion. |
| 16.3 | Data export format on termination | JSON for individual users; CSV for class rosters (planned feature). |

---

## Maintenance

After each MoE submission:
- Update each row with the actual question number from the form
  received (forms vary slightly between editions).
- Mark **TODO** rows as filled-in with the lawyer's text once
  available.
- Bump "Last updated" at top.
- Confirm no answer drifted from the source code (sub-processors,
  retention values, audit log fields).
