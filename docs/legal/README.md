# Vocaband — Legal package index

> The four documents in this directory form the legal / procurement
> bundle a school district, Ministry of Education official, or
> EU-school DPO needs to evaluate Vocaband and sign a contract.
> Together with the engineering-side documents listed at the bottom,
> they cover GDPR Art. 28 (DPA), Art. 30 (RoPA), Art. 35 (DPIA),
> and Israeli Privacy Protection Regulations 2017 §§ 5–11.

> ⚠️ **All four documents are DRAFTS pending legal review.**  An
> Israeli privacy lawyer (and, for EU schools, an EU-qualified
> privacy counsel) must review and finalise each translation before
> a school signs.  Engineering produced the starting drafts so the
> lawyer doesn't have to extract architecture facts from source code;
> legal judgement, jurisdiction wording, and signing-format Hebrew /
> Arabic / Russian remain the lawyer's job.

---

## Documents

### 1. Data Processing Agreement (DPA) — `Art. 28` template

The signing-format processor agreement.  Hand this to a school's
lawyer; expect them to redline §10 (liability) and §13.2 (residual
retention) — those are the negotiation points.

| Language | File | Size | Notes |
|---|---|---|---|
| English (authoritative) | [`DPA-en.md`](./DPA-en.md) | 597 lines | Reference text; governs in case of translation conflict. |
| עברית | [`DPA-he.md`](./DPA-he.md) | 553 lines | Legal-register Hebrew; terms aligned with `public/privacy.html`. |
| العربية | [`DPA-ar.md`](./DPA-ar.md) | 595 lines | MSA legal register. |
| Русский | [`DPA-ru.md`](./DPA-ru.md) | 652 lines | Formal Russian legal register. |

### 2. Records of Processing Activities (RoPA) — `Art. 30` matrix

Single multilingual file (table-based; column headers are bilingual
EN/HE/AR/RU, row content identical across languages because each row
is a structured technical fact).  Covers all eight processing
activities with the per-activity fields required by GDPR Art. 30 and
Israeli Reg 2017 § 5.

- [`RoPA.md`](./RoPA.md)

### 3. DPIA — Executive summary

The procurement-facing summary of the engineering DPIA at
`../DPIA-TECHNICAL.md`.  Shows the three Art. 35 triggers, the
necessity-and-proportionality assessment, the five residual risks,
and the security-controls summary.

| Language | File |
|---|---|
| English | [`DPIA-EXECUTIVE-SUMMARY-en.md`](./DPIA-EXECUTIVE-SUMMARY-en.md) |
| עברית | [`DPIA-EXECUTIVE-SUMMARY-he.md`](./DPIA-EXECUTIVE-SUMMARY-he.md) |
| العربية | [`DPIA-EXECUTIVE-SUMMARY-ar.md`](./DPIA-EXECUTIVE-SUMMARY-ar.md) |
| Русский | [`DPIA-EXECUTIVE-SUMMARY-ru.md`](./DPIA-EXECUTIVE-SUMMARY-ru.md) |

---

## Related artifacts (outside this directory)

The legal documents above cross-reference the following companion
artifacts.  When a reviewer asks "where is the actual control?", the
answer is usually one of these files.

| Topic | File | Owner |
|---|---|---|
| Public privacy policy (auto-generated from source) | `../../public/privacy.html` | `src/config/privacy-config.ts` + `scripts/generate-privacy-html.ts` |
| Sub-processor registry + international transfer register + change history + subscribe-to-changes | `../SUBPROCESSORS.md` | `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY + SUBPROCESSOR_CHANGELOG` |
| Risk register (Reg 2017 § 6) | `../RISK-REGISTER.md` | Engineering + DPO |
| DPIA — technical / engineering version | `../DPIA-TECHNICAL.md` | Engineering |
| Information security policy (Reg 2017 § 4) | `../INFORMATION-SECURITY-POLICY.md` | Engineering + DPO |
| Incident-response runbook (Art. 33–34 / Reg 2017 § 11) | `../INCIDENT-RESPONSE.md` | DPO |
| Privacy-checklist for new feature work | `../PRIVACY_CHECKLIST.md` | Engineering |
| MoE compliance brief (Hebrew, MoE-vendor language) | `../MOE-COMPLIANCE-BRIEF-HE.md` | DPO + lawyer |
| MoE vendor questionnaire response | `../MOE-VENDOR-QUESTIONNAIRE.md` | DPO + lawyer |
| Lawyer briefing pack | `../LAWYER-BRIEF-MOE.md` | DPO + lawyer |
| Operator playbook (when to do which legal step) | `../OPERATOR-PLAYBOOK-MOE.md` | Operator |
| Data subject rights — export RPC | `../../supabase/migrations/20260522020000_expand_export_and_delete.sql` (`export_my_data`) | Engineering |
| Data subject rights — erasure RPC | same migration (`delete_my_account`) | Engineering |
| Audit-log immutability triggers (Reg 2017 § 8) | `../../supabase/migrations/20260518120000_audit_log_immutability.sql` | Engineering |
| Cross-tenant RLS on classes | `../../supabase/schema.sql` + migrations `20260430` / `20260517125414` | Engineering |
| PII scrubber (stdout + Sentry) | `../../src/utils/scrubPii.ts` + `../../src/utils/serverLog.ts` | Engineering |

---

## Maintenance

- **Cadence.**  Each document carries its own review schedule
  internally.  Default: annual full review + ad-hoc on any material
  architecture / sub-processor / regulatory change.
- **Drift detection.**  If a reviewer spots a fact in any of these
  documents that contradicts `src/config/privacy-config.ts` or the
  current source code, the **source code wins** — open an issue and
  the next maintainer regenerates the affected section.
- **Translation handling.**  English is the authoritative version
  in every translated document.  HE / AR / RU are draft translations
  pending native-counsel review.  When the lawyer finalises a
  language, the warning banner at the top of that file should be
  replaced with the lawyer's sign-off note and date.

---

## Provenance

This directory was bootstrapped on **2026-05-22** as part of the
edtech-compliance audit (item C-5).  The session that generated the
drafts is recorded in the git history; each commit message names
the audit item closed (C-2, C-3, C-4, C-5, C-6, C-7, C-9, C-10 to
date).

The two outstanding audit items at the time of this commit are:

- **C-1 + C-8** — verifiable parental consent / parental-rights
  surface (largest piece; new tables, parent-token email flow,
  attestation model).
- The **High tail** — MFA, CSRF, CSP `styleSrcElem` hardening, AI
  output-safety filter, NSFW OCR pre-filter, admin-action audit
  log, WCAG 2.1 AA statement, Google Fonts self-hosting.

See the audit report committed at the start of this session for
the full prioritised list.
