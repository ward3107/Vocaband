# Vocaband — Privacy lawyer handoff memo

> **Read this first.** This is the entry point for a privacy lawyer
> reviewing Vocaband for compliance with חוק הגנת הפרטיות התשמ"א-1981,
> the Data Security Regulations 2017, GDPR, and COPPA-equivalent
> obligations. Every other doc is referenced from here.
>
> Time budget for this read: **15 minutes**. The deep-dive docs total
> ~50 pages — this memo lets you scope the engagement before billing
> hours on background reading.
>
> Last updated 2026-05-10.

---

## TL;DR — what we're asking for

| What we have | What we need from you |
|---|---|
| Technical controls in place (RLS, TLS A+, CSP, rate-limits, sub-processor list) | Certify whether they meet the regulatory bar |
| Engineering's draft DPIA (technical sections) | Risk-rating, residual-risk decisions, signoff |
| Sub-processor list with DPAs in place | Confirm no transfer-mechanism gaps (esp. US-based: Cloudflare, Google, Fly.io) |
| Plain-language privacy notice draft | Legal review + Hebrew-bar redraft if needed |
| MoE vendor questionnaire mostly answered | Six questions in §6 below need your signoff before submission |
| Clear data-flow diagram + retention policy | Confirm 1-2 above-the-line decisions: parental-consent regime, retention windows |

The technical work is mostly done. We need legal certification, not
legal *implementation* — although you'll likely flag 2-3 fixes we
should make before submission.

---

## 1. Who we are + what we do (1 paragraph)

**Vocaband Educational Technologies** (Israel) operates an English
vocabulary learning platform for Israeli school students. Teachers
create classes and assignments; students log in via class code or
Google OAuth and play game-mode exercises that record progress;
teachers see aggregate progress in a gradebook. Curriculum aligns
with Israeli Ministry of Education vocabulary sets (Set 1 / Set 2 /
Set 3). Primary audience: grades 4-9 (ages 9-15). Translations into
Hebrew and Arabic. Currently pre-MoE-procurement; preparing the
vendor file.

---

## 2. Documents you'll need, in reading order

Read in order — each one builds on the previous.

| # | Doc | Why | Pages |
|---|---|---|---|
| 1 | **This memo** (`LAWYER-HANDOFF.md`) | Orientation | 1 |
| 2 | `docs/SECURITY-OVERVIEW.md` | What we audited, what we fixed, current posture | 8 |
| 3 | `docs/DPIA-TECHNICAL.md` | Pre-filled technical sections of the DPIA | 6 |
| 4 | `docs/SUBPROCESSORS.md` | Every third-party that touches data, with DPA references | 5 |
| 5 | `docs/PRIVACY_CHECKLIST.md` | What we tell parents + IT directors | 3 |
| 6 | `docs/DATA_FLOW.md` | End-to-end data-flow diagrams | 4 |
| 7 | `docs/PENTEST-SOW.md` | Statement of Work for the regulatory pen-test (every 18 months) | 5 |
| 8 | `docs/MOE-VENDOR-QUESTIONNAIRE.md` | The MoE form we need to submit | 4 |

If your engagement is scoped narrowly (just COPPA, just GDPR, just
חוק הגנת הפרטיות), skip docs 7-8.

---

## 3. Regulatory regimes in scope

### 3.1 חוק הגנת הפרטיות התשמ"א-1981 + תקנות אבטחת מידע 2017

**Applies because:** primary user base is Israeli minors. Database
classified as **"high security level"** (`רמה גבוהה`) under the 2017
regulations because it processes personal data of >100,000 subjects
**and** sensitive data (children's identifying data tied to
educational performance).

Implications confirmed in our technical work:

- External pen-test required every 18 months — `docs/PENTEST-SOW.md`.
- Annual security audit by qualified entity — currently internal.
- Documented information-security policy — partial (in `docs/SECURITY-OVERVIEW.md`).
- DPO (Data Protection Officer) — **TODO**, see §5.
- Database registration with Israeli Privacy Protection Authority — **TODO**, see §5.
- Retention + deletion policy — implemented (cron job `cleanup_expired_data_cron`).

**For lawyer:** confirm the database classification (high security
level) is correct, confirm registration is required at our scale,
draft the registration filing.

### 3.2 GDPR

**Applies because:** we serve some EU students (small, ~5%
estimated, but non-zero). Hosted in EU (Supabase Frankfurt) which
helps but doesn't exempt.

Implications:

- Lawful basis for processing minors' data — Art. 8 — **needs your decision** (see §6.1).
- Data subject rights (access, rectification, erasure) — implemented technically but no documented runbook.
- DPIA — `docs/DPIA-TECHNICAL.md` is the engineering input; you complete the legal sections.
- Transfers to non-EU sub-processors (Cloudflare, Google OAuth, Fly.io, OpenAI/Gemini) — need transfer-mechanism review (SCCs).

### 3.3 COPPA-equivalent (US)

**Applies because:** we don't *target* US students, but if any
school in our customer base has US-citizen students or expat
families, COPPA applies. Worth assessing rather than assuming away.

Implications:

- Verifiable parental consent for under-13 — **TODO**, depends on
  whether we accept US schools at all (see §6.2).
- COPPA-compliant privacy policy section.
- Direct-notice obligation if we collect data without school
  intermediation.

---

## 4. Technical controls already in place (the easy yes)

Quick reference for the questionnaire — full evidence in
`docs/SECURITY-OVERVIEW.md`.

| Control | Status | Where verified |
|---|---|---|
| Encryption in transit (TLS 1.2+) | ✅ A+ on SSL Labs | `SECURITY-OVERVIEW.md` Phase 4 |
| Encryption at rest (AES-256) | ✅ Supabase default | `SUBPROCESSORS.md` §1 |
| Row-level security on all tables | ✅ 17 verification gates | `scripts/security-pen-test.sh` |
| Authentication (OAuth + Email-OTP) | ✅ | `SECURITY-OVERVIEW.md` |
| CSP (no `unsafe-inline` script, no `unsafe-eval`) | ✅ Phase 6 | `SECURITY-OVERVIEW.md` |
| Per-user rate limiting on sensitive endpoints | ✅ | `SECURITY-OVERVIEW.md` Phase 5 |
| Audit logging | ✅ Supabase + custom | `DPIA-TECHNICAL.md` §7 |
| Right-to-erasure technical capability | ✅ Cascading deletes wired | `DPIA-TECHNICAL.md` §6 |
| Retention enforcement | ✅ Nightly pg_cron job | `operator-tasks.md` 2026-05-07 |
| Sub-processor DPAs | ✅ All in place | `SUBPROCESSORS.md` |
| EU data residency | ✅ Supabase Frankfurt | `SUBPROCESSORS.md` §1 |
| Incident response plan | ✅ Documented | `docs/INCIDENT-RESPONSE.md` |
| Breach notification capability | ✅ Within 72 hours per GDPR | `INCIDENT-RESPONSE.md` |

---

## 5. Operator gaps (still open — not legal questions, just TODOs)

These are pending operator actions, not legal-judgment calls.
Listed here so you know they're tracked, not forgotten.

| Gap | Owner | When |
|---|---|---|
| External pen-test (regulatory minimum 18 months) | Operator + pen-test firm | Pre-MoE submission |
| DPO appointment | Operator | If required at our scale (see §6.5) |
| Database registration with the Privacy Protection Authority | Operator + you | If required at our scale (see §6.5) |
| Public-facing privacy notice (Hebrew + English + Arabic) | Operator + you | Before MoE submission |
| Parent-consent flow in product (if you decide it's required) | Engineering | After §6.1 decision |
| US-school stance (accept or geo-block?) | Operator | Pre-MoE submission |

---

## 6. The questions only you can answer

**This is what we're paying you for.** Six decisions block the
MoE submission.

### 6.1 Lawful basis for student data processing

**The question:** Is "educational legitimate interest + teacher-
mediated parental authority via the school context" a defensible
basis under § 11 of the Privacy Protection Law and Art. 6 GDPR for
students aged 9-15? Or do we need explicit verifiable parental
consent at signup?

**Why it matters:** Affects whether we need to build a parent-
consent flow into the product (~2 weeks engineering) or whether
the school's enrollment paperwork is sufficient.

**Engineering recommendation:** School-mediated consent is
sufficient if (a) the school has a signed DPA with us, and (b) the
school's enrollment paperwork includes a clause that covers
educational tools. We'd like your confirmation or correction.

### 6.2 US students — accept or geo-block?

**The question:** Do we have any US students currently? If we keep
the door open, COPPA applies fully (verifiable parental consent +
direct-notice obligation). If we geo-block US IPs, we sidestep it
entirely.

**Engineering recommendation:** Geo-block US for the next 12 months
unless a specific opportunity opens up. Israeli MoE is the primary
market and COPPA compliance is a meaningful engineering cost.

### 6.3 Sub-processor transfer mechanisms

**The question:** Cloudflare (US), Google OAuth (US), Fly.io (US),
Gemini API (US) all process some data. We have DPAs with each.
Are SCCs (Standard Contractual Clauses) sufficient under the
post-Schrems-II regime, or do we need additional transfer-impact
assessments?

**Engineering recommendation:** SCCs for all four; document in a
TIA that minimum personal data crosses borders (no student PII to
Gemini — only OCR text + sentence-generation prompts; teacher
emails to Google for OAuth only). We'd like your confirmation.

### 6.4 Retention windows

**The question:** Our cleanup cron deletes:
- Quick-Play sessions: 30 days after end
- Inactive student accounts: **TODO — what's the right number?** Currently 24 months.
- Inactive teacher accounts: 36 months
- Audit logs: 12 months

Are these defensible? Israeli MoE typically asks for "data
retained no longer than necessary for the educational purpose."

**Engineering recommendation:** 24/36/12 feels right but we want
your signoff and would adjust if you say otherwise.

### 6.5 DPO appointment + database registration

**The question:** At our current scale (~hundreds of teachers,
thousands of students projected at 12 months), are we required to:
(a) appoint a DPO under תקנות אבטחת מידע, and
(b) register the database with the Privacy Protection Authority?

If yes to (b), please draft the filing.

### 6.6 Privacy notice — sufficiency

**The question:** Review `docs/PRIVACY_CHECKLIST.md` and the public
privacy page (`/privacy` on www.vocaband.com). Sufficient under
Israeli + GDPR notice obligations? If not, please redraft (or
direct us to redraft, with your edits).

---

## 7. Engagement scope (suggested)

What we'd like to scope to you:

1. Read docs §2 (1-8) — ~3-4 hours.
2. Answer the 6 questions in §6 — variable.
3. Sign-off + redrafts on `DPIA-TECHNICAL.md` legal sections.
4. Sign-off on `PRIVACY_CHECKLIST.md` + public privacy notice.
5. Draft (or template) for the database registration filing if §6.5 = yes.
6. One-page certification letter we can include in the MoE vendor file.

What we are **not** asking for:

- Full re-architecture / re-design of data flows (engineering's domain).
- Pen-testing (separate firm — see `PENTEST-SOW.md`).
- Day-to-day privacy-incident response (we have an internal runbook
  in `INCIDENT-RESPONSE.md`; you're called in for serious breaches).

---

## 8. Engagement format

- One-time fixed-fee for points 1-6 of §7.
- Quote against this memo, not against an open-ended retainer.
- Deliverables: written answers to §6, marked-up DPIA, certification letter.
- We expect this to take ~10-15 hours of your time.
- Working language: Hebrew preferred for filings; English for our
  engineering internal docs.
- Confidentiality: standard NDA before doc handoff.

---

## 9. Contact

Operator: [your name] — `[email]` — `[phone]`
Engineering: [your name] — `[email]`

Send the engagement letter + quote; we'll counter-sign and ship
the doc bundle.
