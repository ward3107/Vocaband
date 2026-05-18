# Vocaband — Information Security Policy (מדיניות אבטחת מידע)

> Required by תקנות הגנת הפרטיות (אבטחת מידע) התשע"ז-2017 § 5
> ("Documented information security policy"). This is the **public**
> policy document — a school IT auditor or the MoE reviewer can read
> it without source-code access.
>
> Internal technical reference: `docs/SECURITY-OVERVIEW.md` +
> `docs/SECURITY-LEVELS.md`. Risk-rating reference:
> `docs/RISK-REGISTER.md`. Incident process: `docs/INCIDENT-RESPONSE.md`.

---

## 0. Document control

| Field | Value |
|---|---|
| Version | 1.0 (initial publication) |
| Effective date | 2026-05-18 |
| Approved by | **TODO — DPO signoff once appointed** |
| Owner | DPO (currently: founder) |
| Next review | 2027-05-18 (annual) + on any material change |
| Distribution | Public via `docs/`; internal reference in CLAUDE.md |

**Change log:**
- 2026-05-18 — Initial version. Builds on the controls already shipped in `docs/SECURITY-OVERVIEW.md` Phases 1-6 (April-May 2026) plus the audit-log immutability migration (20260518120000).

---

## 1. Scope

This policy covers all information systems operated by Vocaband
Educational Technologies for the purpose of delivering the Vocaband
English-vocabulary learning platform to Israeli schools.

In scope:
- The web application served at `vocaband.com` (Cloudflare Pages + Worker).
- The Fly.io application server (`server.ts`).
- The Supabase project (database, authentication, storage) at `auth.vocaband.com`.
- All third-party processors listed in `docs/SUBPROCESSORS.md`.

Out of scope:
- End-users' devices (browsers, school computers, school networks).
- Schools' internal LMS / SIS systems.
- Any external party not listed in `docs/SUBPROCESSORS.md`.

---

## 2. Classification

Per תקנות אבטחת מידע 2017, Vocaband's databases hold **personal data
of minors** and are therefore classified as **High Security Level
(רמת אבטחה גבוהה)**. All controls in this document are scoped to that
level.

Data categories handled — see `docs/DPIA-TECHNICAL.md § 2.1`.

---

## 3. Governance

### 3.1 Roles

| Role | Responsibility |
|---|---|
| **Data Protection Officer (DPO)** | Owns this policy; approves changes; is the contact for the Privacy Protection Authority and the MoE; chairs the incident response. |
| **On-call engineer** | Executes the technical playbook during incidents; runs quarterly audits. |
| **External auditor** | Independent pen-test firm engaged at the cadence defined in §10. |
| **Sub-processors** | Each is governed by its own DPA; see `docs/SUBPROCESSORS.md`. |

### 3.2 Decision authority

- DPO approves: policy changes, sub-processor changes, breach notifications, regulator submissions.
- On-call engineer can act unilaterally during the first 30 min of an incident (stop-the-bleeding scope).
- Anything else: PR-reviewed change on `main`.

---

## 4. Access control

### 4.1 Principle of least privilege

- **Students** see only their own progress.
- **Teachers** see only their own classes, students, and assignments.
- **Admins** can read all data; admin role is granted manually via the `teacher_allowlist` mechanism.
- **The `service_role` Supabase key** is server-only (Fly.io secret store), used by Express endpoints that intentionally bypass RLS. Never bundled into the browser. Rotated semi-annually + on any suspected leak.

### 4.2 Authentication

- Teachers: Google OAuth (PKCE) primary; email + 6-digit OTP fallback.
- Students: class-code-based onboarding mediated by the teacher; no email collected.
- Quick-Play guests: anonymous Supabase auth; data deleted at session end.
- All sessions use JWTs signed by Supabase. Tokens live in `Authorization: Bearer` headers — never cookies — so CSRF is structurally impossible.
- Session TTL: 1 hour with refresh token valid up to 7 days. Refresh tokens are revocable from the Supabase dashboard.

### 4.3 Multi-factor authentication

- **Teachers using Google OAuth**: MFA enforced by Google when the teacher's Google account has it. Vocaband does not configure it.
- **Teachers using email-OTP**: each login is itself a one-time code, providing MFA-equivalent assurance for that single session.
- **Students**: MFA not applied (account is low-trust by design; teacher mediates).

### 4.4 Authorization

Enforced at the database layer via PostgreSQL Row-Level Security on
every table. Policies are documented in `docs/SECURITY.md` and verified
by the in-repo `scripts/security-pen-test.sh`. See
`docs/SECURITY-LEVELS.md` § Layer 5 for the model.

---

## 5. Encryption

| Domain | Standard |
|---|---|
| Transport | TLS 1.2 + 1.3 only. TLS 1.0/1.1 disabled at Cloudflare. SSL Labs A+ as of 2026-04-28; re-verified quarterly. |
| At-rest (database) | AES-256 via Supabase platform. |
| At-rest (object storage) | AES-256 via Cloudflare R2 + Supabase Storage. |
| Backups | Encrypted by Supabase. |
| Secrets | Stored only in Fly.io's encrypted secret store + Supabase Dashboard; never in source, never in browser bundles. |

Field-level encryption (for "particularly sensitive" categories per Reg
2017) is not in use because Vocaband does not store health, biometric,
financial, or other particularly-sensitive categories. The DPIA
confirms this.

---

## 6. Audit logging

- The `public.audit_log` table records actor / action / target / timestamp / metadata for every protected operation.
- Retention: **730 days (24 months)** per Reg 2017 minimum.
- **Immutability**: as of migration 20260518120000 the audit log is append-only at the database level — UPDATE is forbidden by trigger; DELETE is forbidden except via the controlled retention purge inside `cleanup_expired_data`, which itself logs its own purge action.
- Logs are reviewable by admins via Supabase SQL editor.
- Logs are part of the encrypted backup stream.

---

## 7. Backup and business continuity

- Supabase daily automated backups, 30-day retention.
- RTO / RPO targets and the restore procedure are documented in `docs/DISASTER-RECOVERY.md`.
- Quarterly backup-verification + restore-drill cadence; results filed in `docs/postmortems/`.

---

## 8. Vulnerability management

| Activity | Cadence |
|---|---|
| Dependency scan (`npm audit`) | Quarterly + on every `package.json` change |
| Internal pen-test (`scripts/security-pen-test.sh`) | Quarterly + on every security-relevant change |
| External pen-test by qualified third party | Every 18 months minimum + after major architecture changes (per Reg 2017) |
| RLS verification SQL | Quarterly |
| SSL Labs scan | Quarterly |
| HSTS preload status check | Quarterly |
| Sub-processor advisory review | Quarterly |

Results are tracked in `docs/SECURITY-OVERVIEW.md` § "What we audited
and when".

---

## 9. Incident management

`docs/INCIDENT-RESPONSE.md` is the runbook. Headline commitments:

- **SEV-1** (mass PII or account takeover): DPO paged immediately; user notification within 24 h; PPA notification within 72 h; MoE notification (if MoE-school affected) within 72 h.
- **SEV-2** (limited exposure or partial outage off-hours): DPO paged; affected user notification within 72 h.
- **SEV-3** (no PII exposure): logged via GitHub issue, no external notification.
- Every incident, regardless of severity, gets a post-mortem within 7 days, filed in `docs/postmortems/`.
- Quarterly tabletop exercise to keep the runbook real.

---

## 10. Third-party penetration testing

- Externally tested by a qualified Israeli firm at least every 18 months for the duration the database remains at High Security Level.
- Statement of Work template: `docs/PENTEST-SOW.md`.
- Findings drive the Risk Register (`docs/RISK-REGISTER.md`).
- Each finding tracked as a GitHub issue, tagged `security-pentest-<YYYY>`.
- A re-test confirms zero open Critical/High findings before any external attestation is issued.

---

## 11. Data subject rights

Implemented and enforced in code:

- **Access (§ 13)**: `export_my_data()` RPC returns a JSON export of everything we hold about the calling user.
- **Rectification (§ 14)**: users edit their own display name, avatar, etc. directly; admin tools handle edge cases.
- **Deletion (Amendment 13)**: `delete_my_account()` RPC cascade-deletes the user + their progress, with audit-log retention of the deletion event itself.
- **Consent log**: every consent grant is timestamped + versioned in `public.consent_log`.

UI surfaces these in the privacy settings screen of the SPA.

---

## 12. Sub-processors

Listed in `docs/SUBPROCESSORS.md` with purpose, data categories, and
hosting region for each. DPAs in place with each. Quarterly review of
their security advisories. Public-facing list updated whenever the
roster changes; old versions retained for audit.

---

## 13. Compliance and change management

- Annual review of this policy by the DPO.
- Material changes (new data category, new sub-processor, change in legal basis, regulatory amendment) trigger an off-cycle review.
- Every change is version-stamped in the change log above.
- Re-publication of the policy notifies users via the next privacy-policy version bump.

---

## 14. Enforcement

- Engineering: PR review gate on `main` for any code touching `supabase/migrations/`, `src/core/`, `server.ts`, `worker/index.ts`, or `public/_headers`.
- Operator: quarterly checklist in `docs/operator-tasks.md`.
- DPO: annual sign-off on this document.

---

## 15. References

| Document | Purpose |
|---|---|
| `docs/SECURITY-OVERVIEW.md` | Technical posture summary |
| `docs/SECURITY-LEVELS.md` | Defence-in-depth layer map |
| `docs/SECURITY.md` | RLS policy reference |
| `docs/PRIVACY_CHECKLIST.md` | PPA Amendment 13 mapping |
| `docs/MOE-REQUIREMENTS.md` | Master MoE-compliance tracker |
| `docs/DPIA-TECHNICAL.md` | DPIA technical input |
| `docs/RISK-REGISTER.md` | Risk-rating register |
| `docs/INCIDENT-RESPONSE.md` | Incident handling runbook |
| `docs/DISASTER-RECOVERY.md` | DR/BC plan |
| `docs/SUBPROCESSORS.md` | Third-party processor list |
| `docs/PENTEST-SOW.md` | External pen-test scope template |
| `docs/MOE-VENDOR-QUESTIONNAIRE.md` | Pre-filled MoE vendor answers |

---

## 16. DPO signoff

```
I, [DPO name], acting as the Data Protection Officer of Vocaband
Educational Technologies, hereby approve version 1.0 of the Information
Security Policy effective 2026-05-18, and confirm that the controls
described herein are implemented and operate as documented to the best
of my knowledge.

Signature: __________________________
Name:      __________________________
Date:      __________________________
```
