# DPIA — Executive Summary (Vocaband)

> ⚠️ **DRAFT — pending DPO + privacy-lawyer sign-off.**  This is the
> procurement-facing summary.  The engineering-input version is at
> `docs/DPIA-TECHNICAL.md` (208 lines, structured for the lawyer's
> formal write-up).
>
> Authoritative language: English.  HE / AR / RU companion summaries
> at `DPIA-EXECUTIVE-SUMMARY-he.md`, `-ar.md`, `-ru.md`.  In case of
> conflict, the English text governs until counsel finalises a
> binding version.
>
> Version: 2026-05-22 draft 1.

---

## 1. Why we ran a DPIA

A DPIA is **mandatory** under GDPR Art. 35 when one or more of the
following triggers fire.  For Vocaband, **three independent
triggers** apply:

| Trigger (GDPR Art. 35(3) + EDPB Guidelines 04/2017) | Vocaband relevance |
|---|---|
| Systematic processing of children's personal data | Core user base is students aged 9–15. |
| Use of innovative technology (AI / ML on personal data) | OCR (Gemini), sentence generation (Claude), lesson builder, Bagrut generator. |
| Large-scale processing | Designed for entire Israeli school districts; >10k students per district is the target scale. |

A DPIA is also required under **Israeli Privacy Protection
Regulations 2017 § 9** for any database of "medium" or "high"
security level processing minors' data, which Vocaband qualifies for.

---

## 2. Scope of the processing

| Field | Value |
|---|---|
| **Controller** | Vocaband Educational Technologies (Israel).  On signing of a school DPA, the school becomes the Controller for student data and Vocaband becomes the Processor. |
| **DPO** | `privacy@vocaband.com` — see `src/config/privacy-config.ts → DATA_PROTECTION_OFFICER`. |
| **Categories of subjects** | Students 6–18 (primary 9–15); teachers (adults); school administrators (adults). |
| **Categories of personal data** | Listed in `RoPA.md → Activities 1–8` and in `src/config/privacy-config.ts → DATA_COLLECTION_POINTS`. |
| **Geographic scope** | Israel (Hebrew + Arabic + Russian-speaking schools); pilot interest from EU schools. |
| **Hosting** | EU (Supabase Frankfurt, Fly.io Amsterdam, Sentry Germany). |

---

## 3. Necessity and proportionality

The processing is **necessary** because:

- Vocabulary learning requires per-student progress tracking; an
  anonymous gradebook would defeat the educational purpose.
- AI features (OCR, sentence generation) are necessary to cut the
  preparation overhead that would otherwise prevent teachers from
  using the platform.
- Live in-class challenges require real-time per-student state.

The processing is **proportionate** because:

- Default student accounts collect **no email**, **no real name**,
  **no government ID**, **no photograph**, **no location**.  See
  `RoPA.md → Activity 1`.
- AI features process **vocabulary words only** — no personal data
  is sent to Anthropic / Gemini OCR / Gemini Translate.  Image OCR
  payloads are discarded by the vendor after the API returns.
- Live-challenge state is **in-memory only**, never written to
  disk (except optionally as a final score row if the teacher
  confirms at end-of-game).
- Behavioural advertising and marketing are **prohibited** by the
  Processor's own engineering guarantees (`docs/legal/DPA-en.md §2.3`).

---

## 4. Risk analysis (high level)

Full risk register: `docs/RISK-REGISTER.md` (279 lines, Reg 2017 § 6).
The five highest-impact residual risks, after applying the controls
described in §5, are:

| # | Risk | Likelihood (residual) | Severity (residual) | Mitigation summary |
|---|---|---|---|---|
| R-1 | Compromised teacher account → cross-class data view | Possible | Medium | MFA roadmap (audit H-1); RLS isolates per-class; audit-log captures bulk reads. |
| R-2 | Service-role key leakage → full DB dump | Unlikely | Critical | Key kept in Fly secrets only; `INCIDENT-RESPONSE.md` "Service-role key compromise" playbook for rotation; key never present in client bundle. |
| R-3 | OCR upload contains incidental student PII | Possible | Low | Teacher-only feature; upload UI advises against student work; vendor zero-retention; image discarded after extraction. |
| R-4 | Supabase outage during school hours → loss of teaching session | Unlikely | Medium | Multi-AZ within Frankfurt; daily backups (≤30d) + offsite R2 (≤365d); business continuity in `INCIDENT-RESPONSE.md`. |
| R-5 | Sub-processor breach (Anthropic / Google / etc.) | Unlikely | Medium | DPF + zero-retention contracts; per-vendor TIA in `SUBPROCESSORS.md`; supply-chain playbook in `INCIDENT-RESPONSE.md`. |

No risk is rated **High** likelihood × **Critical** severity (the
threshold for "stop-the-line" per the risk-register rubric).

---

## 5. Mitigations and security controls (summary)

| Domain | Controls |
|---|---|
| **Encryption** | TLS 1.3 in transit; AES-256-equivalent at rest (Supabase). |
| **Authentication** | Google OAuth (DPF-certified) or email + OTP for teachers; class code + PIN or anonymous session for students.  Operator MFA on Supabase / Fly / Cloudflare consoles. |
| **Authorisation** | Row-Level Security on every PII table; tenant-scoped (per-class) reads enforced at the database layer. |
| **Audit logging** | Append-only `audit_log` with database-level immutability triggers (`20260518120000_audit_log_immutability.sql`).  730-day retention. |
| **PII redaction** | `scrubPii.ts` runs in `Sentry.beforeSend` AND on every `console.*` call via `installScrubbingConsole`. |
| **Consent** | Default-OFF non-essential cookies, symmetric Accept/Reject buttons; Sentry gated behind `analytics: true` consent. |
| **Data subject rights** | In-app `export_my_data` (Art. 15/20) and `delete_my_account` (Art. 17) covering all user-data tables incl. auth.users. |
| **Sub-processor governance** | Public registry `docs/SUBPROCESSORS.md` with per-vendor TIA + DPF status; ≥30-day change-notification subscription. |
| **Incident response** | `docs/INCIDENT-RESPONSE.md` — 24h DPO notify, 72h PPA notify, MoE Information Security desk notify, supply-chain + key-compromise playbooks, quarterly tabletop. |
| **Penetration testing** | `scripts/security-pen-test.sh` (executable RLS + headers + audit-log immutability suite). |

---

## 6. Children's data — additional considerations

- **No real-name requirement.**  Students choose a display name —
  first names and nicknames are encouraged.
- **No email.**  Default student accounts use a synthetic internal
  address; no message is ever delivered to a student inbox.
- **No public profiles.**  Progress is visible only inside the
  student's class, to their class teacher, and to the school
  administrator if appointed.
- **Parental rights.**  Currently exercised by emailing
  `privacy@vocaband.com`.  Direct in-product channel pending audit
  item C-1+C-8.
- **AI safety.**  AI-generated text aimed at children runs under
  safety filters consistent with the AI sub-processors' published
  children-safety guidance; no AI-generated free-form chat is ever
  surfaced directly to a student without teacher mediation.

---

## 7. Consultation

Stakeholders consulted during preparation of this DPIA / executive
summary:

- **Engineering / DPO** (single individual at time of writing).
- **External privacy counsel** — **pending**; the operator's task
  list includes a 1-hour consult to ratify the risk-register
  scores + this DPIA (see `docs/OPERATOR-PLAYBOOK-MOE.md → Task 5`).
- **MoE liaison** — **pending**; engagement deferred until the
  first school formally enquires (`OPERATOR-PLAYBOOK-MOE.md → Task 12`).
- **Affected data subjects** — not directly consulted (industry
  standard for under-13 services); the school as Controller carries
  out community engagement when adopting the platform.

---

## 8. Conclusion + sign-off

Based on the controls described above, the residual risk for each
activity in §4 is rated **Low** or **Medium**.  No activity scores
above the "stop-the-line" threshold of 12 (Severity × Likelihood)
in `docs/RISK-REGISTER.md`.

The processing is therefore considered **proportionate, necessary,
and within the boundaries of acceptable residual risk** for the
educational purposes served.

| Role | Name | Sign-off date |
|---|---|---|
| **Engineering / Processor owner** | Waseem Abu Akel | 2026-05-22 (draft) |
| **DPO** | (same individual at time of writing) | **pending** |
| **External privacy counsel** | **pending** | **pending** |

---

## 9. Review schedule

- Annual full review.
- Ad-hoc review on any of: new sub-processor; new AI feature; new
  user category; change of hosting region; material change to the
  data model; security incident at SEV-1 or SEV-2 level.
