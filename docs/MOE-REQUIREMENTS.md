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
- **Operator NOW** (do at any user count): appoint a DPO publicly, set up
  privacy email alias.
- **Operator LATER** (threshold-gated): database registration with the
  Privacy Protection Authority — only mandatory once you cross specific
  thresholds (≥10,000 users, sensitive-data category, etc.; see § A1
  below).  At <1,000 users, defer.
- **Legal**: Hebrew privacy policy review against MoE template, DPA
  contract template for schools — do as soon as time + budget allow,
  not user-count gated.
- **Third-party paid**: pen-test by qualified firm (~15-30k NIS) —
  defer until ~1,000 users or first school formally asks; legal
  review (~5-15k NIS) — anytime.

> **What this means at 5 users:** appoint DPO + book lawyer consult +
> launch publicly via the teacher-discovers-it channel.  Skip the
> registration / pen-test / DPIA / MoE submission for now.  Re-evaluate
> at ~1,000 users.  See `docs/LAUNCH-STRATEGY-HE.md` for the full
> rationale.

---

## Section A — Privacy Protection Regulations (אבטחת מידע, 2017)

These are the legal floor.  Vocaband stores data on minors → automatically
falls under **רמת אבטחה גבוהה (High level)**.

### A1 — Database classification + registration

| Requirement | Status | What we have | Gap | Owner |
|---|---|---|---|---|
| Database registered with the Privacy Protection Authority (הרשות להגנת הפרטיות) | 🟡 **Threshold-gated — not yet required** | — | Registration only becomes **mandatory** once any of these hit: (1) ≥10,000 data subjects, (2) ≥100,000 records, (3) processing "sensitive data" (medical / biometric / criminal records / religion / sexual — Vocaband collects none of these), (4) used for direct marketing, (5) data not collected directly from the subject, (6) operated by a public body. **At <10,000 users none apply.** Set a calendar reminder at ~5,000 users to start (30-90 day lead time). | 🚫 Operator (when threshold approached) |
| Internal classification of which databases are at which level | ⏳ | Implicit in config; explicit doc on this branch | Adding `docs/MOE-REQUIREMENTS.md` § A1.1 | ✅ Done in this commit |

> **Why not just register now anyway?** Argument for waiting: it's not legally required, enforcement focuses on large violations not 5-user startups, and your time at this stage is better spent on growth. Argument for doing it now: it's free, takes ~1 hour, signals professionalism, and removes a future to-do. Either is defensible — the recommendation here is **defer** unless a specific school's IT / a lawyer advises otherwise.

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

### Phase 1 — Pre-paperwork (now, at any user count)
1. **Appoint a DPO.** Founder can serve. Publish name + email on `/privacy`. ~0 NIS.
2. **Set up a privacy@vocaband.com alias** with a 24h response SLA published in the incident-response doc.
3. **Set calendar reminders for the threshold triggers:**
   - At **~1,000 users**: revisit pen-test scheduling (no longer just "5 users — too early").
   - At **~5,000 users**: start database registration with the Privacy Protection Authority — 30-90 day lead time so the certificate is in hand before crossing 10,000.
   - At **first school formally adopting**: pull in the lawyer for the DPA + the MoE submission track.

### Phase 2 — Lawyer engagement (~6-15k NIS, 2-4 weeks) — when to do it
**Do this as soon as your time + budget allows; it's not user-count gated.**  Even at 5 users the policy review is useful and a privacy lawyer's read on the parental-consent question is a one-time investment that derisks the whole roadmap.

4. **1-hour consult with an Israeli EdTech privacy lawyer.** Confirm:
   - Whether teacher-mediated onboarding satisfies § 25 parental consent.
   - Which MoE circular applies to your deployment model (per-school vs district vs MoE catalog).
   - Whether the current /privacy page matches MoE template — diff it.
   - **Confirm the registration thresholds** — the rules change.  If the lawyer says register now anyway, do it.
5. **DPA template drafted** for school agreements (defer until first school formally asks).
6. **Privacy policy + terms reviewed and updated** to MoE template alignment.

### Phase 3 — Database registration (deferred — trigger-gated)
7. **Register with the Privacy Protection Authority** at https://www.gov.il/he/service/database_registration once any threshold trigger applies (see § A1).  Free; 30-90 days for confirmation.  Have prepared: database name, controller (Vocaband Educational Technologies), purpose, data categories (already documented in `privacy-config.ts`).

### Phase 4 — Pen-test (~15-30k NIS, 3-6 weeks) — when to do it
**Defer until either:** (a) you have ~1,000+ users, OR (b) the first school formally asks for a pen-test report in writing, OR (c) you cross the registration threshold (above 10,000 users) — at that point Reg 2017 makes the 18-month cadence mandatory.

8. **3rd-party penetration test by a qualified Israeli firm.** Examples: Comsec (https://www.comsec.co.il), 2bSecure, AVNET Cyber & Information Security, Sela Group. Report becomes input for your DPIA.
9. **Self-pentest first** using `docs/SELF-PENTEST-GUIDE-HE.md` to find and fix the easy issues before paying.

### Phase 5 — MoE submission (~free, 1-3 months MoE turnaround) — when to do it
**Defer until you have 5+ schools using the platform organically.** A formal submission without references is weak; with references it's much stronger.

10. **Obtain Tofes 22/23** from MoE Information Security desk (`security@education.gov.il` or via official channel).
11. **Fill in the questionnaire** using the technical answers in `docs/MOE-VENDOR-QUESTIONNAIRE.md`. Add legal answers from the lawyer engagement.
12. **Submit + iterate** with MoE reviewer until approved.

### Phase 6 — Ongoing maintenance (continuous)
13. **Quarterly internal audit** (already cadence per `SECURITY-OVERVIEW.md`).
14. **18-month re-test** cadence kicks in *only after first formal pen-test* — so this becomes mandatory the day Phase 4 happens.
15. **Annual privacy-policy review** + version bump in `privacy-config.ts` if anything changes.

---

## Section E — Realistic timeline by user count

The earlier version of this doc proposed a 90-day all-in-one MoE
sprint.  That makes sense **only after you have a school formally
asking for MoE-approved status**.  At pre-traction stages, sequencing
the work to actual triggers saves ~50k NIS of upfront cost on
work that wouldn't matter yet.

```
NOW (5-1,000 users) — total cost ~1-2k NIS
  ├─ Day 1: Appoint DPO publicly + set up privacy@ alias
  ├─ Day 1: Stand up staging (free Supabase + free Fly.io)
  ├─ Week 1: Run self-pentest per docs/SELF-PENTEST-GUIDE-HE.md
  ├─ Week 2-3: Book + complete 1-hour lawyer consult (~1-2k NIS)
  └─ Continuous: Public launch + organic growth (Kahoot model)

  Calendar reminders: revisit at 1,000 users, 5,000 users, first
  school formally adopting.

AT ~1,000 users OR first school asks formally — total cost ~15-30k NIS
  ├─ Re-run self-pentest
  ├─ Quote 2-3 pen-test firms; pick one
  ├─ Pen-test (3-6 weeks)
  └─ Remediate findings

AT ~5,000 users — total cost 0 NIS, lead time 30-90 days
  └─ Start database registration with the Privacy Protection
     Authority (free; want certificate before crossing 10,000)

AT first school using formally OR ≥5 schools organic — total cost ~6-15k NIS
  ├─ Lawyer drafts DPA template
  ├─ Lawyer reviews privacy/terms vs MoE template
  ├─ Complete DPIA from docs/DPIA-TECHNICAL.md (lawyer fills legal
  │  sections; engineering already done)
  └─ Submit Tofes 22/23 to MoE Information Security desk
```

**Phased budget (so cost lands when revenue can absorb it):**
- Now: ~1-2k NIS (lawyer consult only).
- After ~1,000 users: + ~15-30k NIS (pen-test).
- After first school: + ~6-15k NIS (DPA + policy revision).
- Total to MoE acceptance: ~22-47k NIS, spread over 12-18 months.

This is roughly half the cost of the all-in-one sprint and matches
the cadence at which you'd actually need each artefact.

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
