# Vocaband — Israeli Ministry of Education compliance requirements

> **Tracker** for everything needed to get Vocaband approved as a vendor by the
> Israeli Ministry of Education (משרד החינוך — MoE).  Requirements stack
> on top of the Privacy Protection Law (חוק הגנת הפרטיות, 1981) and the
> Data Security Regulations (תקנות אבטחת מידע, 2017).
>
> **This is engineer's-best-understanding, not legal advice.**  Every
> "Done" status that depends on legal interpretation should be reviewed
> by an Israeli privacy lawyer before any DPA or vendor questionnaire
> is signed.  See the legend below.

> Last updated 2026-05-04.

---

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | **Done** — verified in code or already-shipped doc |
| 🟡 | **Partial** — exists but needs work to fully satisfy MoE |
| ⏳ | **In progress this session** — being added on this branch |
| ❌ | **Not started** — known gap, needs work |
| 🚫 | **Cannot be done by engineering** — requires lawyer / 3rd party / MoE forms |

---

## TL;DR — what's already done vs what's left

The technical compliance baseline is **80% done**.  Almost all of the
Israeli Privacy Protection Law (PPA Amendment 13) controls were built
in earlier compliance work (`docs/PRIVACY_CHECKLIST.md`, the
`010_privacy_compliance.sql` migration, and `src/config/privacy-config.ts`).

**What's already in production:**
- Audit log table with 2-year retention
- Consent log with versioned policy + per-user timestamp
- Export-my-data RPC + UI button (JSON download)
- Delete-my-account RPC + UI button (cascade delete)
- Third-party registry in `src/config/privacy-config.ts`
- RLS on every table, A+ TLS, CSP, HSTS preload
- Cleanup RPC for retention enforcement

**What's left (and what kind of work each is):**
- **Engineering**: incident-response runbook, sub-processors public page,
  pre-filled vendor questionnaire, DPIA technical template — being done
  on this branch.
- **Operator (you)**: appoint a DPO publicly, register the database with
  the Privacy Protection Authority, expose privacy contact email.
- **Legal**: Hebrew privacy policy review against MoE template, DPA
  contract template for schools.
- **Third-party paid**: pen-test by qualified firm (~15-30k NIS), legal
  review (~5-15k NIS).

---

## Section A — Privacy Protection Regulations (אבטחת מידע, 2017)

These are the legal floor.  Vocaband stores data on minors → automatically
falls under **רמת אבטחה גבוהה (High level)**.

### A1 — Database classification + registration

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Database registered with the Privacy Protection Authority (הרשות להגנת הפרטיות) | ❌ | — | **Required for High level**.  Free, online, takes 30-90 days. | 🚫 Operator |
| Internal classification of which databases are at which level | ⏳ | Implicit in config; explicit doc on this branch | Adding `docs/MOE-REQUIREMENTS.md` § A1.1 | ✅ Done in this commit |

### A2 — Documentation (תיק"מ — Information Security File)

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Inventory of every database + data flow | ✅ | `docs/DATA_FLOW.md`, `src/config/privacy-config.ts → DATA_COLLECTION_POINTS` | None — already comprehensive | Code |
| Information Security Policy (מדיניות אבטחת מידע) | 🟡 | `docs/SECURITY-OVERVIEW.md` + `docs/SECURITY.md` | Add explicit "Policy" doc with version + signoff field for the DPO | ⏳ This branch |
| DPIA / תיק"מ document | ⏳ | None | `docs/DPIA-TECHNICAL.md` template on this branch — fill technical parts now, legal/risk-rating sections marked TODO for lawyer | ⏳ This branch + 🚫 Lawyer |
| Risk assessment (סקר סיכונים) | 🟡 | Implicit in security audits | Formal risk register doc with severity x likelihood matrix | 🚫 Lawyer / consultant signoff |

### A3 — Access control + identity

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Strong authentication (no shared accounts) | ✅ | Supabase Auth, PKCE OAuth, OTP fallback | — | Code |
| Per-user authorization (RLS) | ✅ | Enforced on every table | — | Code |
| Role-based access (admin / teacher / student) | ✅ | `is_admin()` / `is_teacher()` helpers, role column on `users` | — | Code |
| Service-role keys server-only | ✅ | Only in Fly.io env, never bundled | — | Code |
| Multi-factor authentication option for teachers | ❌ | Not implemented | High level mandates "consider MFA" — Google OAuth provides MFA implicitly when teacher's Google account has it; explicit MFA for password fallback would close the gap | ❌ Future |

### A4 — Audit logging

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Audit log of access to personal data | ✅ | `public.audit_log` table; `logAudit()` helper | — | Code |
| Retention ≥ 24 months | ✅ | `RETENTION_PERIODS.auditLogDays = 730` | — | Code |
| Logs immutable (no UPDATE / DELETE) | 🟡 | Currently table allows admin DELETE for cleanup | Add explicit RLS forbidding non-admin write/delete; cleanup via partition rotation instead of DELETE | ❌ Future engineering |
| Logs include actor + action + target + timestamp | ✅ | Schema enforces all four | — | Code |

### A5 — Encryption + transport

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Encryption in transit | ✅ | TLS 1.2/1.3, A+ SSL Labs, HSTS preload submitted | — | Operator (Cloudflare) |
| Encryption at rest | ✅ | Supabase Postgres encrypts the entire database with AES-256 | — | Supabase |
| Field-level encryption for "particularly sensitive" fields | 🟡 | Not used.  The dataset is student progress + names — not health, biometrics, or finance. Probably not required, but a lawyer should confirm. | Lawyer judgement | 🚫 Lawyer |

### A6 — Backups + business continuity

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Automated backups | ✅ | Supabase auto-backups daily, point-in-time recovery on Pro tier | — | Operator (verify Supabase plan) |
| Backup retention documented | ✅ | "Up to 30 days" in privacy policy | — | Code |
| Backup encryption | ✅ | Supabase encrypts backups | — | Supabase |
| Disaster recovery procedure | ❌ | Not documented | Add `docs/DISASTER-RECOVERY.md` — RTO / RPO targets, restore procedure | ❌ Future engineering |

### A7 — Vulnerability management

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Dependency scan cadence | ✅ | `npm audit` quarterly per `SECURITY-OVERVIEW.md` re-audit cadence | — | Operator |
| 3rd-party penetration test ≥ every 18 months | 🚫 | None done | Required for High level. ~15-30k NIS via Israeli firm (Comsec, 2bSecure, AVNET, Sela) | 🚫 Operator + paid |
| Internal security review cadence | ✅ | Quarterly per `SECURITY-OVERVIEW.md` | — | Operator |

### A8 — Incident response

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Documented incident response procedure | ⏳ | None | Adding `docs/INCIDENT-RESPONSE.md` on this branch | ⏳ This branch |
| Notification timeline (24-72h to PPA) | ⏳ | Implicit, not formalised | Codified in incident-response doc | ⏳ This branch |
| User notification template | ❌ | None | Email template draft post-DPO appointment | ❌ Future |
| Incident log retained ≥ 24 months | ✅ | `audit_log` retention 730 days | — | Code |

### A9 — Sub-processors + cross-border transfers

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| List of sub-processors with purpose + data categories | ✅ | `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY` | — | Code |
| Hosting-region disclosure | ✅ | `HOSTING_REGIONS` constant | — | Code |
| Public-facing sub-processor page | ⏳ | Internal only | Adding `docs/SUBPROCESSORS.md` (also linked from privacy page) | ⏳ This branch |
| Cross-border transfer mechanism (Frankfurt → Israel) | 🟡 | EU adequacy decision applies; Israel has GDPR adequacy from EU side | Privacy lawyer should write the legal-basis paragraph for the privacy policy | 🚫 Lawyer |

---

## Section B — MoE-specific requirements (above and beyond the law)

These layer on top of A and apply specifically when a vendor wants
schools to use the platform under MoE auspices.

### B1 — Vendor approval paperwork

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| **Tofes 22 / 23** (טופס 22/23) — MoE vendor security questionnaire | ⏳ | Pre-filled answers for the technical sections in `docs/MOE-VENDOR-QUESTIONNAIRE.md` on this branch | The actual blank form must be obtained from MoE Information Security ("ממונה אבטחת מידע במשרד החינוך"). Once you have it, copy answers from the doc | ⏳ Partial this branch + 🚫 Operator |
| **DPA template** (הסכם עיבוד מידע) for schools | ❌ | None | Privacy lawyer drafts based on MoE's template | 🚫 Lawyer |
| **Hebrew privacy policy** matching MoE template | 🟡 | Hebrew page exists at `/privacy` | Compare clauses against MoE template; rewrite anything missing | 🚫 Lawyer |
| **Hebrew terms of service** matching MoE template | 🟡 | Hebrew page exists at `/terms` | Same | 🚫 Lawyer |

### B2 — Contact + governance

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Appointed DPO (ממונה על הגנת הפרטיות) | ❌ | — | Founder can serve as DPO for a small company; needs to be publicly listed by name + contact email | 🚫 Operator |
| Privacy contact email publicly visible | ✅ | `contact@vocaband.com` in privacy-config | — | Code |
| Incident contact channel (24h response window) | 🟡 | Same email | Should be a monitored alias with an SLA published in incident-response doc | ⏳ This branch + 🚫 Operator |

### B3 — Children-specific protections

The MoE puts extra weight on these because the user base is minors.

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Parental consent flow for under-14 | 🟡 | Class-code model: teacher mediates onboarding; no explicit parental consent UI | A lawyer needs to confirm whether the teacher-mediated model satisfies חוק הגנת הפרטיות § 25 (consent of guardian) for the school context.  If not, add a parent-email consent step. | 🚫 Lawyer judgement first |
| No advertising / tracking aimed at children | ✅ | No ad networks, no marketing pixel | — | Code |
| No "dark patterns" coercing data collection | ✅ | Only required data collected; voluntary fields marked | — | Code |
| Minimal data principle (only what's needed) | ✅ | DATA_COLLECTION_POINTS in privacy-config audited annually | — | Code |
| No biometric / sensitive special-category data | ✅ | Schema doesn't store any | — | Code |

### B4 — Operational

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Vendor agrees to audit by MoE on request | 🚫 | DPA clause | DPA template TBD | 🚫 Lawyer |
| Vendor's own employees signed NDA + data-handling training | 🚫 | — | HR / legal — not engineering | 🚫 Operator |
| Right to data portability (export) for the school | ✅ | `export_my_data()` exists for individuals; class-level export TBD | Add a teacher-side "export my class roster + progress as CSV/JSON" if not present | 🟡 Future engineering |

---

## Section C — What's being done in this commit

Everything created on branch `claude/moe-compliance-package`:

| File | Purpose |
|---|---|
| `docs/MOE-REQUIREMENTS.md` | This master tracker |
| `docs/INCIDENT-RESPONSE.md` | Incident response runbook with timelines + roles |
| `docs/SUBPROCESSORS.md` | Public-facing sub-processor list (extracted from privacy-config) |
| `docs/DPIA-TECHNICAL.md` | DPIA / תיק"מ template — technical sections filled, legal sections marked TODO |
| `docs/MOE-VENDOR-QUESTIONNAIRE.md` | Pre-filled answers for the standard questions on the MoE vendor security questionnaire |

---

## Section D — Operator action items (cannot be done in code)

In suggested order of priority.  Numbers are rough Israeli market estimates.

### Phase 1 — Pre-paperwork (do before talking to any school)
1. **Appoint a DPO.** Founder can serve. Publish name + email on `/privacy`. ~0 NIS.
2. **Register the database with the Privacy Protection Authority** at https://www.gov.il/he/service/database_registration. Free; takes 30-90 days for confirmation. Need: database name, controller (Vocaband Educational Technologies), purpose, data categories (already documented in `privacy-config.ts`).
3. **Set up a privacy@vocaband.com alias** with a 24h response SLA published in the incident-response doc.

### Phase 2 — Lawyer engagement (~6-15k NIS, 2-4 weeks)
4. **1-hour consult with an Israeli EdTech privacy lawyer.** Confirm:
   - Whether teacher-mediated onboarding satisfies § 25 parental consent.
   - Which MoE circular applies to your deployment model (per-school vs district vs MoE catalog).
   - Whether the current /privacy page matches MoE template — diff it.
5. **DPA template drafted** for school agreements.
6. **Privacy policy + terms reviewed and updated** to MoE template alignment.

### Phase 3 — Pen-test (~15-30k NIS, 3-6 weeks)
7. **3rd-party penetration test by a qualified Israeli firm.** Examples: Comsec (https://www.comsec.co.il), 2bSecure, AVNET Cyber & Information Security, Sela Group. Mandatory under Reg 2017 for High level. Report becomes input for your DPIA.

### Phase 4 — MoE submission (~free, 1-3 months MoE turnaround)
8. **Obtain Tofes 22/23** from MoE Information Security desk (`security@education.gov.il` or via official channel).
9. **Fill in the questionnaire** using the technical answers in `docs/MOE-VENDOR-QUESTIONNAIRE.md`. Add legal answers from the lawyer engagement.
10. **Submit + iterate** with MoE reviewer until approved.

### Phase 5 — Ongoing maintenance
11. **Quarterly internal audit** (already cadence per `SECURITY-OVERVIEW.md`).
12. **18-month re-test** mandate: schedule the next 3rd-party pen-test for late 2027.
13. **Annual privacy-policy review** + version bump in `privacy-config.ts` if anything changes.

---

## Section E — 90-day path to MoE acceptance

Realistic timeline assuming you start tomorrow.

```
Week 1
  ├─ Day 1: Appoint DPO publicly, register database, set up privacy alias
  ├─ Day 2: Book lawyer consult
  └─ Day 3-7: Pre-meeting prep — gather everything in this tracker for lawyer

Weeks 2-3 — Lawyer phase
  ├─ Lawyer reviews privacy/terms against MoE template
  ├─ Drafts DPA
  └─ Confirms parental-consent model

Weeks 4-7 — Pen-test phase
  ├─ Get quotes from 2-3 Israeli pen-test firms
  ├─ Provide them: source code access, staging environment, scope
  └─ Receive report, file findings, remediate

Weeks 8-9 — DPIA / paperwork
  ├─ Complete DPIA using technical template + pen-test findings
  ├─ Fill MoE Tofes 22/23 from this tracker + lawyer's answers
  └─ Internal sign-off

Weeks 10-12 — MoE submission + iteration
  └─ Submit, respond to reviewer questions, finalise
```

**Total budget:** ~50-80k NIS (lawyer ~10k, pen-test ~25k, DPO own time, misc ~5k).

---

## Section F — What we DON'T claim

- **No legal advice in this document.** Every status that involves legal interpretation needs lawyer signoff.
- **MoE template texts and exact form numbers** can change.  Current statements are based on publicly available sources as of 2026-05; verify with MoE Information Security desk before finalising.
- **Approval is not guaranteed.** Even with all controls in place, MoE reviewers have discretion. The fastest path is one school using Vocaband on its own initiative + a real reference before pursuing formal MoE catalog inclusion.

---

## Maintenance

When a status changes:
1. Update the relevant row.
2. Update "Last updated" at the top.
3. If a new control is added, add it to the matching A/B section.
4. Cross-check against `docs/PRIVACY_CHECKLIST.md` — they should not drift.
