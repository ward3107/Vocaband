# 12 — Privacy & Compliance (Minors, PPA-13, MoE)

> The single most reputation-defining axis. One PII incident with minors
> can end the company.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Data-subject access (export) | HARDENED — `export_my_data()` (migration 010) | Low | INFO | HIGH |
| Right to deletion (erasure) | HARDENED — `delete_my_account()` with admin guard (010:203) | Low | INFO | HIGH |
| Consent log | HARDENED — `consent_log` table (010:17-26) | Low | INFO | HIGH |
| Audit log (sensitive actions) | HARDENED — `audit_log` table (010:43-51) | Low | INFO | HIGH |
| Retention policy | GOOD — `cleanup_expired_data()` (010:212-259); 365d progress, 90d orphans, 730d audit | Low | LOW | HIGH |
| Anonymous-user retention | GOOD — 30d pg_cron cleanup | Low | INFO | HIGH |
| Data localisation (EU) | GOOD — Supabase Frankfurt | Low | INFO | HIGH |
| PII in logs | GOOD — Phase 3 + 6 hardening; truncated token logs only | Low | LOW | MEDIUM |
| Third-party processors | MODERATE — Supabase, Cloudflare, Fly, Google AI, Anthropic, Sentry, R2 — DPA needed per processor | Medium | MODERATE | HIGH |
| DPIA | EXISTS — `docs/DPIA-TECHNICAL.md` | Low | INFO | HIGH |
| Privacy notice / consent UI | EXISTS — `docs/PRIVACY_CHECKLIST.md` references it | Low | LOW | MEDIUM |
| Parental consent for under-13s | NOT EXPLICITLY MODELLED — school-mediated consent assumed | Medium | MODERATE | MEDIUM |
| Breach notification readiness | EXISTS — `docs/INCIDENT-RESPONSE.md` | Low | INFO | HIGH |

**Overall:** HARDENED (88/100). Plumbing is excellent; the operator-side
work (DPAs with processors, parental consent flow) is the residual gap.

---

## 2. Data inventory (PII-bearing)

| Table | PII fields | Subjects | Retention |
|---|---|---|---|
| `users` | uid, email (teacher), role | teachers, students, anon | indefinite (teacher) / 90d after orphaning (student) |
| `classes` | code, name, teacher_uid | teachers | indefinite while class active |
| `assignments` | title, word list | n/a (no PII) | indefinite |
| `progress` | student_uid, score, word_id | students | 365d post-class |
| `consent_log` | uid, action, recorded_at, ip_address (optional) | all | indefinite (consent record) |
| `audit_log` | actor_uid, target_uid, action, metadata | all | 730d |
| `quick_play_*` | name (joiner), score | anon students | 30d |
| Supabase Storage `sound/` | none — generated audio | n/a | indefinite |

**Not stored.** Phone numbers, addresses, parents' contact, payment
methods (no payment yet), photos (OCR transient only), free-text
chat.

---

## 3. Offensive analysis

### A. PII leak via API response

We confirmed `/api/features` and `/api/version` are auth-gated. Other
diagnostic endpoints return small payloads. **Verify** no endpoint
returns a student's email (students don't have emails in the user
schema, so this should be impossible).

### B. PII in error responses

Phase 3 added a global error handler. **Verify** every async handler
either:
- catches and returns sanitised `res.status(500).json({error: '...'})`
- or relies on the global handler

Did not find any echo of `err.message` directly to client in the
sampled handlers.

### C. PII in logs (Fly, Sentry, Worker observability)

- Fly logs: token previews truncated; emails not logged unless
  explicitly. Spot-check via `flyctl logs | grep @` should yield zero.
- Sentry: client + server `beforeSend` should strip emails / `@` /
  UUIDs from breadcrumbs and event message bodies. Verify in
  `src/errorTracking.ts`.
- Cloudflare logs: redact `Authorization` header by default; verify
  no PII in `req.url` or `req.body` (`/api/translate` carries text
  in the body, which CF doesn't log by default).

### D. Data export under coercion

`export_my_data()` returns the user's data only (RLS via
`auth.uid()`). **Cannot** be coerced to return another user's data.
**Verified mitigated.**

### E. Right to deletion edge cases

A teacher with active classes deletes their account. `delete_my_account()`:
- deletes the teacher row
- cascades the classes
- `on_class_deleted` trigger nulls `class_code` for enrolled students
- the orphaned student row eventually cleaned at 90d (`cleanup_expired_data`)

**Edge:** what if a student has progress in the deleted class? The
trigger orphans the student; their progress survives but their
`class_code` is NULL. The 90d cleanup deletes the orphan. **Acceptable**
unless the school wants progress transferred to a new class — currently
not supported.

### F. Re-identification via aggregate

Anonymous Quick Play stores name + score. Could a teacher infer a
specific student from name + timing? Yes, by design (teachers know who
joined). Not a privacy violation in this context.

### G. Children-specific exposure

The platform addresses grades 4-9, ages ~9-15. For under-13s, GDPR
requires parental consent in many EU jurisdictions; Israel's PPA-13
similarly treats minors with care.

**Current model:** the school holds the legal basis (school-mediated
consent via the teacher's relationship). The privacy notice (Hebrew)
references this. **Operator action:** confirm with legal counsel that
this remains valid under the Israeli MoE framework.

---

## 4. Blue-team controls

| Control | Status | Priority |
|---|---|---|
| `consent_log` on every consent action | ✅ | — |
| `audit_log` on view_gradebook / export / delete | ✅ | — |
| `delete_my_account` admin-self-delete guard | ✅ | — |
| `cleanup_expired_data` retention enforcement | ✅ | — |
| Anonymous-user 30d cleanup | ✅ | — |
| EU data residency | ✅ | — |
| Sentry / Fly / CF PII scrubbing | partial | confirm all three |
| DPA executed with every processor | ❓ | operator |
| Privacy notice version-tracked | ❓ | confirm consent_log carries version |
| Annual DPIA refresh | scheduled | calendar |
| Breach notification timeline (72h GDPR) | documented | confirm operator + lawyer accessible |

---

## 5. Testing strategy

| Test | Auto? |
|---|---|
| `export_my_data()` returns only caller's data | Auto (`pen-test.sh` extend) |
| `delete_my_account()` cannot delete admin | Auto |
| `cleanup_expired_data()` deletes >365d progress | Auto (after seeding) |
| Logs contain no email patterns | Auto (regex grep) |
| Sentry events contain no email | Auto (Sentry's PII scrubber dashboard) |
| Anonymous joiner name profanity rejected | Auto (after filter added) |
| PII export under attacker JWT denied | Auto |

---

## 6. Architecture review

- **Data minimisation.** Students don't have emails. Teachers do.
  Anonymous QP users have only a transient name.
- **Purpose limitation.** Each table maps to a single product purpose
  (auth, progress, billing-future).
- **Storage limitation.** Retention encoded in cleanup function.
- **Integrity & confidentiality.** RLS + TLS + helmet.
- **Accountability.** audit_log + DPIA + documented incident response.

---

## 7. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| `export_my_data` / `delete_my_account` rate per uid | >2/day same uid | P2 |
| `cleanup_expired_data` skipped run | always | P0 |
| `users.role` change | always | P0 |
| `audit_log` write failure | always | P0 |
| Volume of audit events | weekly trend report | P3 |

---

## 8. Incident response

- **PII leak suspected:**
  - Engage DPO + lawyer immediately
  - Snapshot relevant logs (Fly, CF, Supabase) to S3/R2
  - Determine: data subjects affected, volume, severity
  - GDPR 72h notification clock starts at *awareness*
  - Notify supervisory authority (in Israel: PPA / Ministry of Justice)
  - Inform affected schools; coordinate parental notification
- **Mass-delete request (DPA Article 17):**
  - Operator runs `delete_my_account()` per uid
  - Document in `audit_log`
  - Confirm completion within 30 days
- **Subject access request (DPA Article 15):**
  - User uses in-app `export_my_data` button
  - If user can't access app, operator runs the RPC on their behalf
    after verifying identity

---

## 9. Edge cases

- **A student takes the device home, family member uses it** — class
  code is short-lived; no PII at risk.
- **A teacher screen-shares the gradebook on Zoom** — that's outside
  Vocaband's control; addressed in school policy.
- **A parent requests a student's data deletion** — under PPA-13,
  the school (data controller) initiates; operator runs
  `delete_my_account` on the student's uid.
- **Legal hold across a deleted account** — currently no legal-hold
  mechanism; if litigation arises, operator must pause cleanup. **Add
  a `legal_hold` boolean** to `users` and have `cleanup_expired_data`
  skip rows where it's true.

---

## 10. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| DSAR turnaround | <7 days | 7-30 | >30 (regulatory) |
| Deletion request turnaround | <7 days | 7-30 | >30 |
| Cleanup job success rate | 100% | 90-99% | <90% |
| Privacy-notice acceptance rate (consent_log) | matches active users | <90% match | <70% (audit) |

---

## 11. Self-critique

- The minors-consent model is school-mediated; legal counsel must
  confirm sufficiency annually.
- Sentry PII scrubber configuration was not read; verify
  `src/errorTracking.ts` strips email + UUID patterns from breadcrumbs.
- No legal-hold mechanism — flag for product when the first
  litigation arrives (it won't, but plan for it).
