# Vocaband Security Audit — Public Summary

> **This is the redacted public summary of an internal security audit.**
> Specific file paths, line numbers, function names, RPC identifiers, RLS
> policy text, and reproduction details have been withheld for operational
> security. Researchers who need implementation-level detail to validate
> a finding can request it privately: **contact@vocaband.com**.
>
> For the vulnerability disclosure policy, see [SECURITY.md](./SECURITY.md).

---

## 1. Scope of the audit

| Area | Covered |
|---|---|
| Authentication flows (teacher OAuth, student anonymous, guest / demo) | ✅ |
| Authorization (Row-Level Security, role checks, policy completeness) | ✅ |
| Session management (restore, rotation, multi-tab, logout) | ✅ |
| Socket.IO security (auth handshake, rate limiting, room scoping) | ✅ |
| Supabase `SECURITY DEFINER` RPCs (search_path, auth.uid() usage, input validation) | ✅ |
| Input handling (assignment builder, paste analysis, OCR, custom words) | ✅ |
| CSP / CORS / headers (Helmet config, CSRF) | ✅ |
| Build-time secret exposure (bundle analysis for service-role keys) | ✅ |
| Dependency vulnerabilities (`npm audit`, known-CVE scan) | ✅ |

---

## 2. Findings by severity

| Severity | Count | Status (latest) |
|---|---|---|
| Critical | 0 | — |
| High | 2 | All resolved |
| Medium | 5 | All resolved |
| Low | 4 | Resolved or documented as accepted risk |
| Info | 6 | Tracked as hardening ideas |

No known critical or high-severity issue remains open at the time of this
summary. Specific remediation commits are maintained privately.

---

## 3. Controls confirmed working

The following controls were verified during the audit and remain in place:

- **PKCE OAuth flow** for teacher sign-in (not implicit grant)
- **Anonymous auth** for students with class-code-scoped access
- **Teacher allowlist** gate — only approved email addresses can hold
  teacher role, enforced via a `SECURITY DEFINER` function
- **Row-Level Security** enabled on every user-facing table in the
  `public` schema; policies cover SELECT, INSERT, UPDATE, and (where
  applicable) DELETE
- **Role escalation prevention** at the database layer — users cannot
  change their own role through direct DML; new inserts are constrained
  to `role = 'student'` unless the caller is allowlisted or admin
- **`SECURITY DEFINER` hardening** — functions run with an explicit
  `SET search_path`, and ownership/authorship checks are done before
  any privileged write
- **Server-side JWT verification** on every WebSocket handshake and on
  each score-update event; sockets cannot forge another user's UID
- **Rate limiting** at multiple layers: API endpoints, Socket.IO events,
  authentication attempts, public RPC calls (e.g., class-code lookup)
- **Content Security Policy** via Helmet, with nonce-gated inline script
  and a strict `connect-src` allowlist
- **Input validation** at both client (display limits, character
  filtering) and database (`CHECK` constraints, enum validation,
  bounded numeric columns)
- **No service-role keys** in the client bundle — verified by grepping
  the published JavaScript for known secret patterns

---

## 4. Categories of findings (now resolved)

What follows is a category-level summary of issues identified during
the audit. Remediation has shipped; specifics are kept private.

### 4.1 Session management

- One edge case where a stale identity token could persist across a
  specific role-change path. Resolved by tightening the sign-out
  cleanup sequence.
- One case where local-storage state could leak between users on a
  shared device. Resolved by broadening the keys cleared on sign-out.

### 4.2 Row-Level Security

- Two policies were reviewed for subquery dependencies on other
  RLS-protected tables (a common "cascading RLS" trap). Policies were
  rewritten or the dependent table's policy adjusted to prevent silent
  zero-row returns for legitimate users.
- One policy relied on an implicit type cast that could silently
  fail under specific client contexts. Replaced with an explicit cast.

### 4.3 RPC hardening

- Three `SECURITY DEFINER` functions were missing an explicit
  `SET search_path`. Added on all of them.
- One RPC used a check-then-act upsert pattern vulnerable to a race
  condition under concurrent calls from the same student. Replaced
  with an atomic `ON CONFLICT` upsert.
- Bound validation tightened on a small-integer input column to
  prevent values outside the column's `CHECK` constraint from
  producing a generic 500-class error.

### 4.4 Realtime channels

- Replica-identity on the progress table was raised from `default`
  to `full` so DELETE events carry enough row context to drive
  client-side features (notably the student-side kick detection).
- A migration was found to unconditionally recreate the Supabase
  realtime publication from scratch, which would have wiped
  publication membership on re-run. Documented and scheduled for
  an idempotent rewrite.

### 4.5 Input handling

- OCR output is escaped before being rendered as text; a class-code
  paste helper strips non-alphanumeric characters before the DB
  lookup.
- Display names are length-capped client-side and constrained by a
  `CHECK` at the DB; a teacher-side paste helper does the same for
  class names.

### 4.6 Dependency hygiene

- `npm audit` revealed no high-severity vulnerabilities in
  production dependencies at the time of the audit. Dev-only
  transitive findings were noted as accepted (not shipped to
  users).

---

## 5. Accepted risks

Decisions we made to NOT fix, with rationale:

- **Teacher allowlist is maintained manually.** Self-service teacher
  signup would require additional identity verification we don't
  have today. Manual allowlisting is the intentional control.
- **Student PII is minimal by design.** Display names + scores only;
  no email, no phone, no DOB. This is the accepted privacy posture
  for grades 4–9 in Israeli schools.
- **Public vocabulary data is not access-controlled.** The 6,482-word
  curriculum list is curriculum-aligned and publicly disclosable.

---

## 6. Next audit

Audits are refreshed after each major release. The next one will focus
on: Quick Play session lifecycle edge cases, pending-approval flow
under adversarial input, and the newly-added analytics RPCs. Specific
coverage and results will be retained privately.

---

_Last reviewed: 2026-04. For implementation-level questions contact
[contact@vocaband.com](mailto:contact@vocaband.com)._
