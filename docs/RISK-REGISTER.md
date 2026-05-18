# Vocaband — Risk Register (סקר סיכונים)

> Required by תקנות הגנת הפרטיות (אבטחת מידע) התשע"ז-2017 § 6
> ("Risk survey"). Engineering supplies the threats and current
> mitigations; severity × likelihood scoring is provisional and must be
> ratified by a privacy lawyer / DPO before being relied upon for the
> MoE submission.
>
> Last updated 2026-05-18.

---

## 0. Scoring rubric

### Severity

| Score | Label | Definition |
|---|---|---|
| 1 | Negligible | No personal-data exposure; user can self-recover within minutes. |
| 2 | Low | Limited disruption; no PII exposed; ≤10 users affected. |
| 3 | Medium | PII of a small group (≤100) exposed; teacher-level data revealed cross-tenant. |
| 4 | High | PII of >100 users exposed; cross-school data breach; partial credential disclosure. |
| 5 | Critical | Mass PII breach; full database dump; service-role key in attacker hands; sustained outage during school hours. |

### Likelihood (annualised)

| Score | Label | Rough rate |
|---|---|---|
| 1 | Rare | < 1% / yr (would surprise us if it happened in 5 years) |
| 2 | Unlikely | 1-10% / yr |
| 3 | Possible | 10-50% / yr |
| 4 | Likely | 50-90% / yr (expect it at least once) |
| 5 | Almost certain | ≥ 90% / yr (we'd be lucky to avoid it) |

### Inherent vs Residual

- **Inherent** = "if we did nothing about it"
- **Residual** = "given the controls we actually have"

The MoE submission cares about **residual**. Aim for residual score ≤ 8
(Severity × Likelihood) on every row. Anything ≥ 12 is a stop-the-line.

---

## 1. Risk matrix

Heat map (residual score, color implied):

```
              Likelihood
              1      2      3      4      5
Severity 5    5     10     15     20     25
Severity 4    4      8     12     16     20
Severity 3    3      6      9     12     15
Severity 2    2      4      6      8     10
Severity 1    1      2      3      4      5
```

Target for residual: green (≤6), yellow (7-12), red (≥13).

---

## 2. Register

### R1 — Cross-student data leakage via RLS bypass

| Field | Value |
|---|---|
| Affected data | Student progress, names, class membership |
| Inherent | 5 × 4 = 20 (red) |
| Controls | RLS on every table; pen-test verified 2026-04-28; `save_student_progress` re-validates `auth.uid()`; `audit_log` records every access; `scripts/security-pen-test.sh` runs 17 gates quarterly |
| Residual | 4 × 2 = **8 (yellow)** |
| Reduce further by | External pen-test (planned at ~1k users); replace `motion/react`-mandated `unsafe-inline` style-src with nonce-based CSP |
| Owner | Engineering |

### R2 — Cross-teacher data leakage (one teacher reads another's class)

| Field | Value |
|---|---|
| Affected data | Class roster, student progress, assignments |
| Inherent | 5 × 4 = 20 |
| Controls | RLS scopes by `teacher_uid`; `class_lookup_by_code` admin-aware; April 2026 MED fix; pen-test verified |
| Residual | 4 × 2 = **8 (yellow)** |
| Reduce further by | Same as R1 — external pen-test |
| Owner | Engineering |

### R3 — Score / XP forgery by client manipulation

| Field | Value |
|---|---|
| Affected data | Gradebook integrity (not PII exposure but trust integrity) |
| Inherent | 3 × 5 = 15 |
| Controls | `save_student_progress` SECURITY DEFINER re-validates per-student scope; `award_reward` clamps XP ±1000 + class-ownership; UPDATE policy prevents score decrease |
| Residual | 2 × 2 = **4 (green)** |
| Reduce further by | Add server-side replay protection (nonce per game session) — currently relies on rate limiting |
| Owner | Engineering |

### R4 — Account takeover via stolen JWT

| Field | Value |
|---|---|
| Affected data | All data accessible to that user |
| Inherent | 4 × 4 = 16 |
| Controls | TLS 1.2/1.3 only; JWT TTL 1 h; refresh-token revocable from Supabase dashboard; no cookies (no CSRF); `Authorization: Bearer` only; Google MFA covers OAuth path |
| Residual | 3 × 2 = **6 (green)** |
| Reduce further by | Add MFA for email-OTP fallback path; shorter refresh-token TTL on teacher accounts |
| Owner | Engineering + future product |

### R5 — Service-role key leak

| Field | Value |
|---|---|
| Affected data | Entire database (RLS bypass) |
| Inherent | 5 × 3 = 15 |
| Controls | Key only on Fly.io secret store, never in `src/`, never in repo; rotated 2026-04-28; rotation cadence semi-annual; `.gitignore` audited |
| Residual | 5 × 1 = **5 (green)** |
| Reduce further by | Migrate to scoped service tokens (Supabase v3 token model when available); monitor Supabase logs for unusual write rates |
| Owner | Operator |

### R6 — XSS via user-supplied content

| Field | Value |
|---|---|
| Affected data | Whole client of affected user (depends on payload) |
| Inherent | 4 × 4 = 16 |
| Controls | React auto-escapes; CSP `'unsafe-eval'` blocked; `'unsafe-inline'` blocked on `script-src`; OCR/AI output sanitised before display; URL sanitiser for `<img src>` |
| Residual | 3 × 2 = **6 (green)** |
| Reduce further by | Close `style-src-elem 'unsafe-inline'` gap (motion/react refactor — currently CSS-only, no JS escalation) |
| Owner | Engineering |

### R7 — Anonymous Quick-Play session enumeration

| Field | Value |
|---|---|
| Affected data | Live QP session metadata; participant nicknames |
| Inherent | 3 × 3 = 9 |
| Controls | Session codes 6-char alphanumeric (~2^31 keyspace); 60/min/IP rate limit; only `is_active = true` rows visible; April 2026 MED fix narrowed SELECT to `authenticated` only |
| Residual | 2 × 2 = **4 (green)** |
| Reduce further by | Bump code length to 8 chars (low priority — current keyspace + rate limit already make enumeration infeasible) |
| Owner | Engineering |

### R8 — DDoS / availability attack

| Field | Value |
|---|---|
| Affected data | Service availability (not PII) |
| Inherent | 4 × 3 = 12 |
| Controls | Cloudflare absorbs at the edge (free tier); Fly.io auto-scales within plan; PWA service worker serves cached content offline; per-IP + per-token rate limits |
| Residual | 3 × 2 = **6 (green)** |
| Reduce further by | Upgrade to Cloudflare Pro WAF when traffic warrants (~$20/mo); k6 load test (`scripts/loadtest/`) |
| Owner | Operator |

### R9 — Sub-processor breach (Supabase / Fly / Cloudflare / Google / Anthropic)

| Field | Value |
|---|---|
| Affected data | Depends on processor — see `docs/SUBPROCESSORS.md` |
| Inherent | 4 × 2 = 8 |
| Controls | DPA in place with each; quarterly review of their security advisories; minimal data sent to AI processors (vocabulary words only, no PII); encryption-at-rest from each |
| Residual | 4 × 2 = **8 (yellow)** |
| Reduce further by | This is irreducible by us — depends on sub-processor's own posture. Mitigate by limiting data sent, alerting on advisories, and ability to swap (already true for Fly + Cloudflare). |
| Owner | Operator |

### R10 — Insider misuse / accidental destructive action by Vocaband staff

| Field | Value |
|---|---|
| Affected data | Could be entire database |
| Inherent | 5 × 3 = 15 |
| Controls | Currently one founder. Audit log records every admin action; service-role key on Fly secrets only; `cleanup_expired_data` gated on `is_admin()`; **audit log is now immutable** (mig 20260518120000); production deploy gated by GitHub `main` branch protection |
| Residual | 4 × 2 = **8 (yellow)** |
| Reduce further by | Hire 2nd engineer + introduce 2-person rule for destructive ops; require PR review on `main`; document break-glass procedure |
| Owner | Operator |

### R11 — Data-subject rights not honoured (export / delete / rectify)

| Field | Value |
|---|---|
| Affected data | Compliance with חוק הגנת הפרטיות § 13 (access) + § 14 (rectify) + Amendment 13 (delete) |
| Inherent | 4 × 4 = 16 |
| Controls | `export_my_data()` self-service in privacy settings; `delete_my_account()` self-service; consent log proves opt-in; lawyer to review flow in lawyer brief |
| Residual | 3 × 2 = **6 (green)** |
| Reduce further by | Add class-roster export for teachers; add admin tooling for manual rectification of student names (currently students self-rectify) |
| Owner | Engineering |

### R12 — Data integrity loss (silent corruption, accidental destructive write)

| Field | Value |
|---|---|
| Affected data | All data — restored from backup costs ≤24 h RPO |
| Inherent | 4 × 2 = 8 |
| Controls | Supabase daily backup + 30-day retention; no manual destructive ops on production; new audit-log immutability (mig 20260518120000) prevents log tampering; DR plan in `docs/DISASTER-RECOVERY.md` |
| Residual | 3 × 1 = **3 (green)** |
| Reduce further by | Off-Supabase weekly `pg_dump` to R2 (operator playbook §6) — closes the "Supabase loses our project" case |
| Owner | Operator |

### R13 — Parental-consent gap for under-14

| Field | Value |
|---|---|
| Affected data | Legal basis for processing of minor data |
| Inherent | 4 × 3 = 12 |
| Controls | Teacher-mediated onboarding via class code (no direct student signup with email); minimal data collected; no advertising / tracking; § 25 of the Privacy Law may or may not require explicit parental consent — **lawyer to confirm**; if required, parent-email consent step can be added |
| Residual | **TBD by lawyer** (estimate 3 × 2 = 6 if teacher-mediation accepted, 4 × 3 = 12 if explicit parental consent required and missing) |
| Reduce further by | Build parent-email consent flow if lawyer says required; document school-as-controller arrangement if accepted |
| Owner | 🚫 Lawyer judgement → engineering build if required |

### R14 — Cross-border transfer challenge (Israel ↔ EU ↔ US)

| Field | Value |
|---|---|
| Affected data | All data, in transit + at rest in foreign jurisdictions |
| Inherent | 3 × 3 = 9 |
| Controls | Israel-EU mutual adequacy decision; EU-US DPF for Google OAuth; SCCs with Anthropic; Supabase + Fly hosted in EU (Frankfurt + Amsterdam); minimal data sent to US (no student PII to Anthropic) |
| Residual | **2 × 2 = 4 (green)** *— pending lawyer confirmation of basis text* |
| Reduce further by | Lawyer to write the legal-basis paragraph for the privacy policy |
| Owner | 🚫 Lawyer |

### R15 — Regulatory change (PPA Amendment 13 follow-ons, MoE circular update)

| Field | Value |
|---|---|
| Affected data | Compliance posture |
| Inherent | 3 × 4 = 12 |
| Controls | Quarterly review cadence; subscription to PPA + MoE update mailing lists (operator TODO); doc-driven compliance (everything in `docs/` so changes are diffable) |
| Residual | 2 × 3 = **6 (green)** |
| Reduce further by | Retain a privacy lawyer on annual subscription instead of one-time consult |
| Owner | Operator |

---

## 3. Summary heat map

| Risk | Residual | Status |
|---|---|---|
| R1 — Cross-student data | 8 | yellow |
| R2 — Cross-teacher data | 8 | yellow |
| R3 — XP forgery | 4 | green |
| R4 — JWT theft | 6 | green |
| R5 — Service-role key leak | 5 | green |
| R6 — XSS | 6 | green |
| R7 — QP enumeration | 4 | green |
| R8 — DDoS | 6 | green |
| R9 — Sub-processor breach | 8 | yellow |
| R10 — Insider misuse | 8 | yellow |
| R11 — Subject rights | 6 | green |
| R12 — Data integrity | 3 | green |
| R13 — Parental consent | TBD | **lawyer blocker** |
| R14 — Cross-border transfer | 4 | green pending lawyer |
| R15 — Regulatory change | 6 | green |

**No risk is currently red.** Four are yellow (8). R13 is the only one
that is currently un-scored because it requires legal judgement.

---

## 4. Review cadence

- After every external pen-test → update Severity / Likelihood per findings.
- After every SEV-1/SEV-2 incident → confirm or revise the relevant row.
- Annually irrespective of incidents → confirm no controls drifted.
- After any PPA amendment or MoE circular update → re-check applicability.

---

## 5. Lawyer ratification needed

Before this Risk Register is submitted with the MoE vendor questionnaire,
a privacy lawyer must:

1. Confirm the rubric in § 0 matches expected Israeli regulator
   conventions (some auditors prefer 1-3 scales).
2. Ratify or override every residual score in § 2.
3. Fill in R13 explicitly.
4. Sign off on R14 cross-border transfer mechanism wording.

Until that happens, this doc is engineering's best estimate and
should be labelled "DRAFT — pending lawyer ratification" anywhere it
is shown externally.
