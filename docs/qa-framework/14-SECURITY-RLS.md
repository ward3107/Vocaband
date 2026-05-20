# 14 — Security Deep-Dive (RLS, RBAC, PII, AppSec)

> Application-level security posture, beyond what's in individual modules. Focus on RLS policy review, role-based access, PII handling (children!), supply chain, secrets, and offensive testing.
>
> Key files: `supabase/schema.sql`, `supabase/migrations/`, `scripts/security-pen-test.sh`, `docs/SECURITY-OVERVIEW.md`, `docs/SECURITY-SELF-TEST.md`, `docs/SECURITY.md`, `docs/PRIVACY_CHECKLIST.md`.

---

## 1. Purpose

- **What:** Cross-cutting security tests + posture review covering data, transit, identity, abuse prevention, and compliance with Israeli MoE expectations.
- **Who:** Security QA, AppSec, compliance, DPO.
- **Why:** Single most reputation-defining axis. A single privacy incident with minors can end the company.
- **Criticality:** **S1**.

---

## 2. Threat model summary

Top threats, by likelihood × impact:

| #  | Threat                                                          | L | I | Score | Mitigation reference                          |
|----|------------------------------------------------------------------|---|---|-------|------------------------------------------------|
| T1 | RLS misconfiguration → cross-class data exposure                 | 2 | 5 | 10    | Section 5; `scripts/security-pen-test.sh`     |
| T2 | Service-role key leak                                            | 2 | 5 | 10    | Section 8; secrets in Fly                      |
| T3 | Student PII (name, progress) in logs / 3rd-party scripts         | 3 | 5 | 15    | Section 6; CSP + privacy review                |
| T4 | Compromised teacher account → mass-edit assignments              | 2 | 4 | 8     | Section 7; activity audit                      |
| T5 | Brute-force class code                                            | 3 | 3 | 9     | Section 4; rate limit                          |
| T6 | OCR / sentence generator prompt injection                         | 3 | 3 | 9     | Section 4; schema + filters                    |
| T7 | DDoS during school day                                            | 2 | 4 | 8     | Cloudflare WAF                                 |
| T8 | Supply-chain compromise (npm package)                            | 2 | 5 | 10    | Section 8; lockfile + SCA                      |
| T9 | Malicious upload (custom audio)                                  | 2 | 4 | 8     | Section 6; pipeline moderation                 |
| T10| Vulnerability in 3rd-party dependency                            | 3 | 4 | 12    | Section 8                                      |

---

## 3. Functional scenarios

| ID            | Scenario                                                  | Steps                                                              | Expected                                                       | Severity | Priority |
|---------------|-----------------------------------------------------------|--------------------------------------------------------------------|-----------------------------------------------------------------|----------|----------|
| SEC-FUNC-001  | Auth required on protected endpoints                       | curl without bearer                                                | 401                                                             | S1       | P0       |
| SEC-FUNC-002  | RLS pen-test green                                         | Run scripts/security-pen-test.sh                                   | All 4 checks pass                                              | S1       | P0       |
| SEC-FUNC-003  | TLS minimum 1.2                                            | nmap --script ssl-enum-ciphers                                     | TLS 1.2 + 1.3 only                                              | S1       | P0       |
| SEC-FUNC-004  | HSTS preload-eligible                                      | curl headers                                                       | max-age 1 year, includeSubDomains, preload                     | S2       | P1       |
| SEC-FUNC-005  | CSP set with no `unsafe-inline` in script-src              | Headers                                                             | strict CSP                                                      | S2       | P0       |
| SEC-FUNC-006  | Cookies httpOnly + secure + samesite                       | Inspect                                                             | All session cookies                                            | S2       | P1       |
| SEC-FUNC-007  | Privacy: no PII in console logs                            | Browser console                                                     | No name / id strings in prod build                              | S1       | P0       |
| SEC-FUNC-008  | Privacy: no third-party tracker before consent             | Network panel                                                       | No GA / Meta calls without consent                              | S1       | P0       |

---

## 4. RLS regression tests (the heart of the module)

For each table, run the following matrix:

| Table                      | Role        | Select | Insert | Update | Delete | Notes                                  |
|----------------------------|-------------|--------|--------|--------|--------|----------------------------------------|
| `users`                    | self        | own row + own class peers (limited fields) | n/a | own profile fields | n/a |                                         |
| `users`                    | other class | DENY   | DENY   | DENY   | DENY   |                                          |
| `users`                    | service role| ALL    | ALL    | ALL    | ALL    | Used only server-side                  |
| `classes`                  | teacher     | own classes | own classes | own classes | own classes (soft-delete) |                  |
| `classes`                  | student     | own classes | DENY   | DENY   | DENY   |                                         |
| `assignments`              | teacher     | own classes | own classes | own classes | own classes |                                          |
| `assignments`              | student     | own classes | DENY   | DENY   | DENY   |                                         |
| `progress`                 | self        | own rows | own rows (via RPC) | DENY (RPC only) | DENY |                                         |
| `progress`                 | teacher     | rows in own classes | DENY | DENY | DENY |                                          |
| `user_inventory`           | self        | own rows | DENY (RPC only) | DENY | DENY |                                         |
| `daily_chest_claims`       | self        | own rows | DENY (RPC only) | DENY | DENY |                                         |
| `competition_results`      | self        | own + own class | DENY | DENY | DENY |                                         |
| `audit_log`                | service role| ALL    | ALL    | DENY   | DENY   |                                          |

Automation: `scripts/security-pen-test.sh` already covers 4 paths; extend to a full matrix CI step.

---

## 5. Security QA test cases (offensive)

| ID            | Attack                                                | Vector                                                                                 | Expected                                                                                |
|---------------|-------------------------------------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| SEC-OFF-001   | IDOR on /rest/v1/users                                | PostgREST direct                                                                       | RLS denies                                                                                |
| SEC-OFF-002   | RLS bypass via custom RPC                              | Call private SECURITY DEFINER as student                                              | RPC validates caller; rejects                                                            |
| SEC-OFF-003   | JWT none/alg confusion                                 | Tamper signature alg                                                                   | Supabase rejects                                                                          |
| SEC-OFF-004   | Mass enumeration of class codes                        | Loop                                                                                    | Rate limit + IP / token throttle                                                          |
| SEC-OFF-005   | Stored XSS via display name                            | `<svg onload=...>`                                                                      | React text render; CSP                                                                    |
| SEC-OFF-006   | DOM XSS via URL params                                 | `?ref=<script>`                                                                          | All params escaped before render                                                          |
| SEC-OFF-007   | CSRF                                                   | Cross-origin POST                                                                       | CORS allowlist + bearer                                                                    |
| SEC-OFF-008   | Open redirect                                          | `?next=http://attacker.com`                                                              | Allowlist                                                                                  |
| SEC-OFF-009   | Path traversal in static assets                        | `/_next/../../etc/passwd` (or equivalent)                                              | Worker static serving normalizes                                                          |
| SEC-OFF-010   | Replay of magic-link token                              | Use token twice                                                                          | Rejected                                                                                  |
| SEC-OFF-011   | XSS via custom audio metadata                          | Filename with HTML                                                                       | Never rendered as HTML                                                                    |
| SEC-OFF-012   | SSRF via OCR URL                                       | Image URL pointing to internal                                                          | Server uses uploaded bytes only                                                            |
| SEC-OFF-013   | Prompt injection in OCR / Sentence Builder             | Crafted photo or word                                                                    | Server prompt + JSON schema enforcement                                                  |
| SEC-OFF-014   | Insecure deserialization                                | Crafted payload                                                                          | No deserializer of untrusted blobs                                                       |
| SEC-OFF-015   | Server-Side Template Injection                          | Crafted input                                                                            | No template engine on user inputs                                                        |
| SEC-OFF-016   | HTTP request smuggling                                  | Crafted Transfer-Encoding                                                                | Cloudflare normalizes                                                                    |
| SEC-OFF-017   | Cache poisoning                                         | Vary header tricks                                                                       | Cache key correctly accounts for user                                                    |
| SEC-OFF-018   | Header injection                                        | CRLF                                                                                    | Sanitized                                                                                |
| SEC-OFF-019   | Privilege escalation via /api/admin                     | Student token                                                                            | 403                                                                                      |
| SEC-OFF-020   | OAuth state CSRF                                       | Forge state                                                                              | PKCE                                                                                     |
| SEC-OFF-021   | Account takeover via email enumeration                  | Login error timing                                                                        | Constant time                                                                            |
| SEC-OFF-022   | Side-channel via timing of RLS                          | Time differences                                                                          | Acceptable variance; not exploitable                                                     |
| SEC-OFF-023   | Sensitive data in browser cache                          | Inspect                                                                                  | No Cache-Control for sensitive responses                                                 |
| SEC-OFF-024   | Mobile app deep link spoofing (future)                   | n/a yet                                                                                  | Document for VocaHebrew app                                                              |
| SEC-OFF-025   | Subdomain takeover                                      | Dangling DNS                                                                              | Audit                                                                                    |

---

## 6. PII / Privacy

Children's PII is sacred. The product collects:

- Display name (often first name; sometimes initial only)
- Class code (group-level)
- Progress / XP (per child)
- Sometimes photo via OCR (incidental; should be discarded)

**Rules:**

- No PII to any third party without explicit consent and DPA.
- No analytics tools that send PII (raw names) — use anonymized event ids.
- No logging of PII at server (use user_id UUIDs, never display_name).
- No PII in error messages thrown to client.
- OCR images discarded after extraction; not stored.
- Sentry / error tracking must scrub PII fields.
- Backups encrypted at rest.
- Right to erasure: documented operator workflow.

| ID            | Check                                                              | Expected                                                          |
|---------------|--------------------------------------------------------------------|-------------------------------------------------------------------|
| SEC-PII-001  | Sentry init has beforeSend stripping PII                            | Yes                                                               |
| SEC-PII-002  | Server logs use user_id, not names                                  | grep audit in CI                                                  |
| SEC-PII-003  | Analytics events contain no names                                    | Manual review per event                                           |
| SEC-PII-004  | OCR images not persisted                                             | Verify ephemeral handling                                         |
| SEC-PII-005  | Right-to-erasure workflow                                            | Documented; tested                                                |
| SEC-PII-006  | Backup retention policy aligned with DPA                             | Documented (see `docs/MOE-REQUIREMENTS.md`)                       |
| SEC-PII-007  | Data residency in EU                                                 | Supabase Frankfurt; R2 EU; Fly EU                                  |
| SEC-PII-008  | Children's photos not visible to other children                      | Avatars are catalog items; no upload by students                  |

---

## 7. Role-based access control (RBAC)

| Role         | Capabilities                                                                                                  |
|--------------|--------------------------------------------------------------------------------------------------------------|
| `student`    | Read own profile + class peers (name/avatar); play games; mutate own progress via RPC; purchase items.       |
| `teacher`    | All student capabilities + create/edit classes, assignments, view class roster + per-student progress.        |
| `school_admin` (future) | Plus aggregate analytics across teachers within school.                                              |
| `service_role` (server only) | Bypasses RLS; used for explicit RPCs. Never exposed.                                              |
| `super_admin` (Vocaband ops) | Backend dashboard; auditable.                                                                     |

| ID            | Check                                                                | Expected                                                          |
|---------------|----------------------------------------------------------------------|-------------------------------------------------------------------|
| SEC-RBAC-001 | Role stored in `users.role` enum                                       | Yes                                                               |
| SEC-RBAC-002 | Role changes audit-logged                                              | Yes                                                               |
| SEC-RBAC-003 | Client never trusts role from JWT alone for sensitive ops              | Re-check server-side                                              |
| SEC-RBAC-004 | Admin endpoints behind separate auth                                   | Yes                                                               |

---

## 8. Supply chain & secrets

| ID            | Check                                                                | Expected                                                          |
|---------------|----------------------------------------------------------------------|-------------------------------------------------------------------|
| SEC-SUP-001  | package-lock.json committed                                            | Yes                                                               |
| SEC-SUP-002  | npm audit run in CI                                                    | Yes; fail on high/critical                                        |
| SEC-SUP-003  | Dependabot or Renovate                                                 | Yes                                                               |
| SEC-SUP-004  | Pin major versions                                                     | Yes                                                               |
| SEC-SUP-005  | No `postinstall` scripts in critical packages                          | Audit                                                             |
| SEC-SUP-006  | SBOM generated per release                                              | Yes                                                               |
| SEC-SUP-007  | Secrets in Fly Secrets / GitHub Encrypted Secrets                       | Yes                                                               |
| SEC-SUP-008  | No secrets in repo                                                      | grep audit in CI                                                  |
| SEC-SUP-009  | Secret rotation cadence ≤ 90 days                                       | Tracked                                                           |
| SEC-SUP-010  | OAuth client secret usage                                               | Server-side only                                                  |

---

## 9. Compliance / regulatory

- **Israeli Privacy Protection Law** + Ministry-of-Education requirements (`docs/MOE-REQUIREMENTS.md`).
- **GDPR-equivalent** posture (EU data residency).
- **COPPA-ish** considerations for children under 13 (informed consent via teacher/parent).
- **DPA with sub-processors** (Supabase, Cloudflare, Google, Fly.io) — see `docs/SUBPROCESSORS.md`.

| ID            | Check                                                                | Expected                                                          |
|---------------|----------------------------------------------------------------------|-------------------------------------------------------------------|
| SEC-COMP-001 | Privacy policy published + accessible                                 | Yes                                                               |
| SEC-COMP-002 | Cookie banner / consent for non-essential                              | `CookieBanner.tsx` present                                        |
| SEC-COMP-003 | Accessibility Statement                                                | `AccessibilityStatement.tsx` present                              |
| SEC-COMP-004 | DPIA reviewed                                                          | `docs/DPIA-TECHNICAL.md`                                          |
| SEC-COMP-005 | Sub-processor list                                                     | `docs/SUBPROCESSORS.md`                                            |
| SEC-COMP-006 | Information security policy                                            | `docs/INFORMATION-SECURITY-POLICY.md`                              |
| SEC-COMP-007 | Incident response plan                                                  | `docs/INCIDENT-RESPONSE.md`                                        |

---

## 10. Pen-test

External pen-test scoped in `docs/PENTEST-SOW.md`. Recommended cadence: annually + on major architectural changes.

---

## 11. QA Automation Strategy

| Layer        | Tool             | Coverage                                                       |
|--------------|------------------|----------------------------------------------------------------|
| Static       | npm audit, Snyk  | dependencies                                                   |
| Static       | semgrep          | code patterns                                                  |
| Static       | gitleaks         | secrets in commits                                             |
| RLS          | custom SQL tests | per table per role                                              |
| DAST         | OWASP ZAP        | scripted scan against staging                                  |
| Pen-test     | external         | annually                                                       |
| CSP          | CSP-Evaluator    | header lint                                                    |

**P0**: RLS matrix CI, gitleaks. **P1**: semgrep, ZAP. **P2**: external pen-test schedule.

---

## 12. Production Readiness Score (Security)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Auth            | 4     | Supabase + RLS strong                                                                       |
| AuthZ           | 4     | RLS + RBAC                                                                                  |
| Transit         | 4     | TLS + HSTS                                                                                  |
| Data at rest    | 4     | Supabase encrypted                                                                          |
| PII             | 3     | Logs need full audit; Sentry config to verify                                                |
| Supply chain    | 3     | Audit step needs CI enforcement                                                              |
| Pen-test        | 2     | External pending                                                                            |
| Compliance      | 3     | Strong docs; need formal MoE submission                                                      |

**Module readiness: 3.4 / 5.**

---

## 13. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| Critical vulns open                | 0          | —        | any      |
| High vulns SLA                     | < 14 days  | 14–30    | > 30d    |
| RLS regressions in CI              | 0          | —        | any      |
| PII in logs                        | 0          | —        | any      |
| Secret leaks                       | 0          | —        | any      |
| Quarterly pen-test                  | done       | 1 quarter overdue | 2+ overdue |

---

## 14. Self-QA Validation

**Missed initially:**
1. **PII in console logs** — SEC-FUNC-007.
2. **OAuth state CSRF** — SEC-OFF-020.
3. **SBOM** — SEC-SUP-006.
4. **Subdomain takeover audit** — SEC-OFF-025.

**Dangerous assumptions:**
- "RLS is enough" — it's necessary but not sufficient. Server-side RPCs must still validate.
- "JWT verification is automatic" — verify supabase-js / jose configuration.

**Hidden failures:**
- A new feature can quietly add a `SECURITY DEFINER` RPC without proper caller check.
- A logging library upgrade can suddenly log objects that include PII fields.
