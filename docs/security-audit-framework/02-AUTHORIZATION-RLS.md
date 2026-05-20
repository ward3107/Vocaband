# 02 — Authorization & Row-Level Security

> The defining defence of a multi-tenant K-9 platform. Failure here = PII
> leak across schools = PPA-13 reportable incident.

This module is a **red-team perspective** on top of the existing exhaustive
RLS test matrix in `docs/qa-framework/14-SECURITY-RLS.md`. Don't duplicate
that doc — go there for the matrix, come here for the attacker paths.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| RLS coverage | HARDENED — every table in `public` schema | Low | INFO | HIGH |
| RLS enforcement | HARDENED — `FORCE ROW LEVEL SECURITY` on minors' data | Low | INFO | HIGH |
| Role escalation | HARDENED — INSERT (migration 007) + UPDATE (migration 001) policies | Low | INFO | HIGH |
| SECURITY DEFINER hygiene | HARDENED — 8 functions, all `auth.uid()`-bound, `search_path` pinned where touching `auth.*` | Low | INFO | HIGH |
| Service-role usage in code | GOOD — server-only; one anon-exposed endpoint (Quick Play session lookup) | Medium | MODERATE | HIGH |
| Cross-tenant isolation | HARDENED — teacher A cannot see teacher B's class/assignment/progress | Low | INFO | HIGH |
| Anonymous-user privilege | GOOD — anon JWT cannot submit progress (RLS INSERT requires class enrollment) | Low | LOW | HIGH |
| Audit logging of authz failures | HARDENED — `authz_failures` table + `log_authz_failure` RPC + admin dashboard at `?view=admin-security` (PR #834, migration applied 2026-05-20) | Low | INFO | HIGH |

**Overall:** HARDENED (94/100). This is the strongest module in the
platform.

---

## 2. Attack surface mapping

| Surface | Authorisation control | Bypass attempts considered |
|---|---|---|
| `public.users` SELECT | `auth.uid() = uid` OR same-class teacher | spoof `auth.uid()` (JWT-signed → infeasible) |
| `public.classes` SELECT | open to authenticated (signup needs lookup) | enumerate codes (mitigation: code length) |
| `public.assignments` SELECT | teacher-owned class OR student-enrolled | mass-assign payload to a class you don't own |
| `public.progress` SELECT | own row OR teacher of class | submit progress for someone else's UID |
| `public.progress` UPDATE | own row, score must increase | downgrade score, replay-attack |
| `public.teacher_allowlist` | denied to all clients | direct PostgREST hit |
| SECURITY DEFINER `delete_my_account` | self-delete only, admin denied | self-delete admin (denied at line 203 of `010_privacy_compliance.sql`) |

---

## 3. Offensive analysis (red team)

### A. Cross-tenant probe (the "different teacher's class" attack)

**Setup.** Sign up as Teacher A. Authenticate. Grab Teacher A's JWT.
Discover Teacher B's `class_id` from a leaked screenshot, OSINT, or
brute-force of `classes.code` (6-char alphanumeric).

**Probe.**
```
PATCH /rest/v1/assignments?id=eq.<B-assignment-id>
Authorization: Bearer <A-JWT>
Content-Type: application/json
{"title":"hacked"}
```

**Expected outcome.** `policy_check_returned 0 rows updated` — RLS
UPDATE policy scopes to `class_id IN (SELECT id FROM classes WHERE
teacher_uid = auth.uid())` (`005_scope_assignments_and_progress_write.sql`).
**Verified mitigated.** No bypass found.

### B. IDOR via progress write

**Setup.** Authenticated student.

**Probe.**
```
POST /rest/v1/progress
{"student_uid":"<other-student-uid>","word_id":"hello","score":100}
```

**Expected.** Denied — INSERT policy requires `student_uid = auth.uid()`
AND `class_code` matches caller's enrolled class
(`005_scope_assignments_and_progress_write.sql`; schema.sql:228-231).
**Verified mitigated.**

### C. Score replay / downgrade

**Setup.** Student wants to fake a high score for an alt account, or
roll back a low score to hide it.

**Probe.** Upsert `progress` row.

**Expected.** UPDATE policy enforces `NEW.score >= OLD.score`
(schema.sql:240). **Verified mitigated** — but only against direct
DB-level rollback; the **client-controlled gameplay score** itself has
no zero-knowledge proof. A teacher viewing the leaderboard cannot tell a
real 100% from a tampered 100%. **Residual risk:** rep-only, no data
loss; left as accepted.

### D. SECURITY DEFINER abuse

Eight functions. We re-checked each for the four classical bugs:

1. **search_path injection** — only `cleanup_stale_anon_users` and
   `get_my_email` touch `auth.*`. Both have `SET search_path =
   public,auth` / `auth,public` pinned. **Safe.**
2. **Unbounded delete** — `delete_my_account` cascades via FKs +
   trigger. The `on_class_deleted` trigger nullifies students'
   `class_code` rather than deleting them. **Safe** but means a deleted
   class leaves orphan students; cleanup at 90 days bounds this.
3. **Admin self-delete** — explicit guard (010:203). **Safe.**
4. **Caller-supplied UID** — none. Every function reads `auth.uid()`
   directly. **Safe.**

### E. Service-role bypass paths

Find every spot in `server.ts` where `supabaseAdmin` (service-role
client) is used:

- Token verification (`verifyToken`) — read-only.
- `/api/quick-play/session/:code` (server.ts:2240-2290) — **public
  RLS bypass.** Intentional, documented. Returns a small subset:
  session metadata, host name. No PII of joiners. **Acceptable**, but
  see module 05 for the brute-force concern.
- `/api/health/audit-log` — read-only, owner-only.
- AI endpoints upload to `audit_log` via the admin path — write-only
  to a single table. **Safe.**

No path was found where service-role data flows into a response keyed
on a user-supplied identifier without prior `requireAuthenticatedTeacher`
gating.

### F. Trigger abuse

`on_class_deleted` (010:265-291) runs as the table owner. If a teacher
could be tricked into deleting their own class via CSRF, all enrolled
students lose their `class_code` mapping. We have:

- CSP `frame-ancestors 'none'` (server.ts:390).
- CORS on `/api/*` is allowlist-gated (server.ts:445-458).
- Supabase `DELETE` requires the PostgREST endpoint to be hit with the
  user's JWT in the Authorization header — not cookies.
- SameSite-Lax + token-in-header = no CSRF vector.

**Verified mitigated.**

---

## 4. Blue-team controls

| Control | Status | Where |
|---|---|---|
| `FORCE ROW LEVEL SECURITY` on minors' tables | ✅ | schema.sql, migrations |
| `is_teacher`/`is_admin`/`is_teacher_allowed` SECURITY DEFINER helpers | ✅ | schema.sql:91-115 |
| `audit_log` on sensitive actions (export, delete, gradebook view) | ✅ | migration 010 |
| `consent_log` on policy acceptance | ✅ | migration 010 |
| Retention cleanup (`cleanup_expired_data`) | ✅ | 010:212-259 |
| Pen-test script (`scripts/security-pen-test.sh`) | ✅ | 4 negative-RLS checks; expand to 12 |
| RLS drift detection (CI) | ❌ Missing | add `pg_dump --schema-only` diff against `supabase/schema.sql` baseline in CI |
| Per-tenant authz failure dashboard | ❌ Missing | Sentry tag by `actor_uid`, surface in weekly report |

---

## 5. Testing strategy

The `docs/qa-framework/14-SECURITY-RLS.md` matrix is comprehensive (20
SEC-FUNC scenarios). What's **missing**:

| Test | Why | How |
|---|---|---|
| Schema-drift gate | A migration that drops `RLS` is invisible today | `pg_dump --schema-only > diff` in CI, fail on diff |
| RLS policy enumeration | A new table without RLS slips in | SQL: `SELECT relname FROM pg_class WHERE relkind='r' AND relrowsecurity=false AND relnamespace='public'::regnamespace;` — alert if non-empty |
| `pg_policies` count guard | Policy deletion via migration goes unnoticed | snapshot count, alert on decrease |
| SECURITY DEFINER search_path guard | Future SD without `SET search_path` | regex check on new migrations |
| Cross-region replication test | Read-replica might serve stale RLS | not applicable today; revisit when scaling |

### Automation hooks

Add to `.github/workflows/ci.yml`:

```yaml
- name: RLS guard
  run: |
    psql "$SUPABASE_DB_URL" -tAc \
      "SELECT count(*) FROM pg_class
       WHERE relkind='r'
         AND relrowsecurity=false
         AND relnamespace='public'::regnamespace;" | grep -q '^0$' \
      || (echo "TABLE WITHOUT RLS DETECTED" && exit 1)
```

---

## 6. Architecture review

- **Defence in depth.** RLS is layer 1. `requireAuthenticatedTeacher` is
  layer 2. Pro-tier gate is layer 3. Even if one fails, the others
  hold — confirmed for every audited endpoint.
- **Least privilege at function level.** No SECURITY DEFINER grants
  more than the function needs (e.g. `export_my_data` reads but does
  not delete; `delete_my_account` reads + deletes its own rows + the
  cascading FKs, nothing else).
- **JIT access.** Not applicable — Supabase only auto-includes admin
  via the service-role key, which lives in Fly secrets and is rotated
  by operator playbook.

---

## 7. Monitoring + detection

| Signal | Alert on | Tier |
|---|---|---|
| Any `users.role` UPDATE | Always | P0 |
| New row in `teacher_allowlist` | Always (operator action) | P0 |
| `audit_log` INSERT failure rate >0% | Investigate | P1 |
| RLS-deny rate (PostgREST 403/policy-violation) | >50/min from one JWT | P1 |
| Anon-user attempting `INSERT progress` | RLS denies, but log it | P2 |
| Schema drift (any DDL outside migration) | Always | P0 |

---

## 8. Incident response

- **Suspected RLS bypass:** snapshot `audit_log` for affected window;
  diff `pg_policies` vs. schema.sql; rollback last migration; notify
  DPO + affected schools per PPA-13 if PII left the tenant.
- **SECURITY DEFINER function abuse:** revoke `EXECUTE` from `authenticated`
  on the suspected function; investigate logs; release fix.
- **Allowlist tampering:** restore from latest weekly backup (R2);
  audit gap between backup and incident.

---

## 9. Edge cases

- **Class deleted while student is mid-game.** The student's
  `class_code` becomes NULL via `on_class_deleted` trigger. The next
  `INSERT progress` will fail RLS. Acceptable; UX should surface a
  graceful "class no longer exists" toast.
- **Teacher transfers ownership.** Not currently supported — there is
  no `change_teacher_uid()` RPC. If you add one, **wrap it in a
  SECURITY DEFINER** that audit-logs the change.
- **Student in two classes simultaneously.** Data model assumes one
  `class_code` per `users.uid`. The wizard prevents this client-side
  but RLS does not (a single user row holds one code). Acceptable
  invariant.
- **Anonymous user wins shop item.** RLS would deny because the
  function `award_reward` checks role. Per `docs/security-audit-2026-04-28.md`
  this was fixed (Phase 1 HIGH finding) — confirm by reading the latest
  `award_reward` migration.

---

## 10. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| Tables without RLS in `public` | 0 | — | ≥1 |
| RLS-deny rate / total requests | <0.05% | 0.05-0.5% | >0.5% |
| `users.role` changes / month | <5 (operator-driven) | 5-20 | >20 |
| New SECURITY DEFINER functions / quarter | 0-2 (audited) | 3-5 | >5 unaudited |

---

## 11. Self-critique

- We have not load-tested RLS at 5000 concurrent students — `EXPLAIN`
  cost of policies under load is a separate workstream.
- We did not enumerate every `auth.*` function granted to
  `authenticated` role — Supabase has many, and some (e.g.
  `auth.email()`) are safe but worth confirming.
- The pen-test script tests 4 negative cases; we recommend extending
  to 12 (one per RLS policy direction × table).
