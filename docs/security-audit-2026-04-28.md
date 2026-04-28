# Security audit — 2026-04-28

Phase 1 + Phase 2 of a 5-phase security review.  Phases 3-5 (dynamic
testing, compliance gap analysis, fix implementation) are out of scope
for this run.

## TL;DR

- **Phase 1 (automated scans + hygiene):** clean.
- **Phase 2 (Supabase RLS + SECURITY DEFINER):** **6 findings — 3 HIGH,
  3 MED.**  All concentrated in two areas: (1) the legacy
  `quick_play_joins` table, (2) two RPCs that weren't tightened when
  the Quick Play V2 path shipped (`save_student_progress_batch`,
  `award_reward`).
- **No HIGH or MED findings** anywhere else.  The bulk of the
  RLS surface (14 tables, 6 of 8 audited RPCs) is correctly scoped.

Highest priority: fix `save_student_progress_batch` (anon writes
arbitrary scores), then `quick_play_joins` (anon reads/writes student
PII), then `award_reward` (any teacher gives unbounded XP to any
student).

## Phase 1 — automated + hygiene scans

### 1.1 Dependency vulnerabilities (`npm audit`)

```
0 critical / 0 high / 0 moderate / 0 low / 0 info
total: 0 vulnerabilities across 993 dependencies
```

Clean.  No action.

### 1.2 Committed secrets

Scanned all tracked files for: `sb_secret_*`, `sk-ant-*`, `sk-proj-*`,
`AKIA[0-9A-Z]{16}`, `ghp_*`, `eyJhbGciOiJIUzI1NiIs`, hardcoded
`password=` / `api_key=` literals.

**No real secrets committed.**  One false-positive: `docs/fly-migration.md`
contains `<paste from Render env var of the same name>` placeholders —
intentional documentation, not secrets.

### 1.3 `.gitignore` + env-file hygiene

`.gitignore` correctly blocks `.env*` with whitelisted exceptions for
`.env.example` and `.env.production`.  Tracked env files contain
build-time public values only:

- `VITE_SUPABASE_URL` (publicly visible in shipped JS — not a secret)
- `VITE_SUPABASE_ANON_KEY` (publishable key, designed for browser code)
- `VITE_SOCKET_URL` (empty string in production — same-origin)

Verified `.env.production:6-9` correctly documents the keys that must
NOT be in this file (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`GOOGLE_AI_API_KEY`).  Those are stored as Fly secrets only.

### 1.4 Sensitive `console.*` logging

Scanned for `console.(log|warn|error|debug)` of `token`, `password`,
`secret`, `api[_-]?key`, `service[_-]?role`, `jwt`,
`session.access_token`.  Found 9 matches:

- All token references log only a 16-char prefix (`token.slice(0, 16)`)
  or a status indicator (`token ? "✓" : "✗"`).  JWT prefixes are
  non-sensitive base64-encoded headers.
- No password / API key / service-role logs anywhere.
- Dev-only logs are gated behind `if (isDev)`.

No action needed.

## Phase 2 — Supabase RLS + SECURITY DEFINER audit

### 2.1 Table inventory + RLS coverage

17 public tables in the schema:

```
ai_allowlist            ENABLE
assignments             ENABLE
audit_log               ENABLE
class_lookup_rate       ENABLE
classes                 ENABLE
consent_log             ENABLE
progress                ENABLE
quick_play_joins        ENABLE
quick_play_sessions     ENABLE
sentence_cache          ENABLE
student_profiles        ENABLE
teacher_allowlist       ENABLE
teacher_profiles        ENABLE
teacher_rewards         ENABLE
users                   ENABLE
word_attempts           ENABLE
word_corrections        ENABLE
```

**All 17 tables have RLS enabled.**  No table is silently bypassable.

### 2.2 Per-table policy audit

| Table | SELECT | INSERT | UPDATE | DELETE | Risk |
|---|---|---|---|---|---|
| `users` | `auth.uid()::text = uid OR is_admin()` | scoped + `is_teacher_allowed(email)` | scoped + `prevents self-promotion` | (none — deny) | LOW |
| `classes` | teacher-owner OR student-member OR admin | teacher + own | teacher + own | teacher + own | LOW |
| `assignments` | teacher of class OR student in class OR admin | teacher of class | teacher of class | teacher of class | LOW |
| `progress` | self OR teacher of class OR admin | self + matching class_code | self + score-monotonic | (none — deny) | LOW |
| `word_attempts` | self OR teacher of class OR admin | (none — RPC only) | (none) | (none) | LOW |
| `word_corrections` | self only | self only | self only | self only | LOW |
| `student_profiles` | self OR teacher-of-class | (none — RPC only) | self / teacher-approve only | (none) | LOW |
| `consent_log` | self OR admin | self | (none) | (none) | LOW |
| `audit_log` | self OR admin | self | (none) | (none) | LOW |
| `teacher_rewards` | self | self | (none) | (none) | LOW |
| `teacher_allowlist` | (no policies — deny-all) | (no policies) | (no policies) | (no policies) | LOW |
| `ai_allowlist` | (no policies — deny-all) | (no policies) | (no policies) | (no policies) | LOW |
| `class_lookup_rate` | (no policies — deny-all) | (no policies) | (no policies) | (no policies) | LOW |
| `sentence_cache` | (no policies — deny-all) | (no policies) | (no policies) | (no policies) | LOW |
| `quick_play_sessions` | teacher-owner OR `is_active=true` open | teacher | teacher | (none) | **MED** |
| `teacher_profiles` | `USING (true)` for any authenticated user | denied | denied | denied | **MED** |
| `quick_play_joins` | `USING (true)` | `WITH CHECK (true)` | (none) | (none) | **HIGH** |

#### 2.2-FINDING-1 [HIGH]: `quick_play_joins` is wide-open

`supabase/migrations/20260329_quick_play_joins.sql:20-23` declares
`USING (true)` on SELECT and `WITH CHECK (true)` on INSERT.  Any
authenticated user (or anon, depending on grant) can:

- Read every student name + class_code paired in any past join.
- Insert arbitrary `(student_name, class_code)` rows.

This is **student PII** (names tied to school class codes).  Even if
the table is partially deprecated by the QP V2 flow, it still exists
and accumulates data.

**Recommended fix:** restrict SELECT to teachers viewing their own
class joins (`EXISTS (SELECT 1 FROM classes WHERE code = class_code
AND teacher_uid = auth.uid()::text)`), restrict INSERT to require an
authenticated session whose `users.class_code` matches `class_code`,
and audit whether the table is still written by any live code path.
If not, drop it.

#### 2.2-FINDING-2 [MED]: `teacher_profiles` is enumerable by any student

`supabase/migrations/20260403_oauth_student_auth.sql:32` uses
`USING (true)` on SELECT.  Any authenticated user (including students)
can `SELECT * FROM teacher_profiles` and enumerate every teacher's
email, school name, and status.

Risk: low for direct attack, but a student curious enough to open
DevTools and run a Supabase query gets a directory of every teacher.

**Recommended fix:** narrow SELECT to `auth.uid()::text =
auth_uid OR is_admin()` so a teacher reads only their own profile.

#### 2.2-FINDING-3 [MED]: `quick_play_sessions` enumerable when active

`supabase/migrations/20260327_quick_play_sessions.sql:34-58` allows
anyone (including unauthenticated callers via the service-role
fallthrough) to read sessions where `is_active = true`.

Mitigated by the 6-character alphanumeric session code (~2.1B
combinations) which makes brute-force enumeration impractical.  Still,
a determined enumeration could pull active session metadata.

**Recommended fix:** restrict SELECT to either the teacher who
created the session OR a caller who already supplied a valid session
code via the `class_lookup_by_code`-style RPC pattern (rate-limited).
Keep the open-read for true anon-guest QP joiners only if the QR
flow can't function without it.

### 2.3 SECURITY DEFINER RPC audit (top 8 highest-stakes functions)

| Function | Auth | Role | Scope | Validation | Rate-limit | Risk |
|---|---|---|---|---|---|---|
| `delete_my_account` | ✓ | ✓ | ✓ self | n/a | no | LOW |
| `export_my_data` | ✓ | n/a | ✓ self | n/a | no | LOW |
| `admin_create_standalone_student` | ✓ | ✓ admin | n/a | ✓ name not empty | no | LOW |
| `approve_student` | ✓ implicit | n/a (via class-ownership) | ✓ class-ownership | ✓ exists checks | no | LOW |
| `switch_student_class` | ✓ | n/a | ✓ self only | ✓ class exists | no | LOW |
| `get_class_activity` / `get_class_mastery` | ✓ | implicit (via class-ownership) | ✓ class-ownership | ✓ 90-day window cap | implicit | MED |
| **`award_reward`** | ✓ | ✓ teacher | ✗ **MISSING** class-ownership | ✗ **NO XP cap** | no | **HIGH** |
| **`save_student_progress_batch`** | ✗ **MISSING** | n/a | ✗ **DEFERRED** to underlying RPC | partial | no | **HIGH** |

#### 2.3-FINDING-1 [HIGH]: `award_reward` has no class-ownership check

`supabase/migrations/20260425120000_teacher_rewards.sql:42-116` checks
that the caller is a teacher (line 60) but **does NOT verify the
caller owns the class the rewarded student belongs to**.  Any teacher
in the system can award XP / rewards to any student in any other
teacher's class.

Worse, line 79 casts `p_reward_value` directly to INTEGER with **no
bounds check**.  Negative values are allowed (could nuke a student's
XP).  Values up to 2³¹-1 are allowed (could grant 2 billion XP and
break leaderboards / overflow downstream calculations).

**Recommended fix:**
1. Add a class-ownership check:
   ```sql
   IF NOT EXISTS (
     SELECT 1 FROM public.users u
     JOIN public.classes c ON c.code = u.class_code
     WHERE u.uid = p_student_uid
       AND c.teacher_uid = auth.uid()::text
   ) THEN
     RAISE EXCEPTION 'Not authorized to reward this student';
   END IF;
   ```
2. Add an XP bounds check:
   ```sql
   IF p_reward_value < 0 OR p_reward_value > 1000 THEN
     RAISE EXCEPTION 'Invalid reward amount (must be 0–1000)';
   END IF;
   ```

#### 2.3-FINDING-2 [HIGH]: `save_student_progress_batch` writes are unauthenticated

`supabase/migrations/20260518_save_progress_batch.sql:35-80` is
SECURITY DEFINER, granted to `anon`, with **no `auth.uid() IS NULL`
check**.  The batch wrapper calls `save_student_progress()` per row,
which itself **has no scope enforcement** — any caller can write
arbitrary scores for arbitrary student UIDs.

In practice the existing client code passes its own UID, so this
hasn't been exploited.  But anyone with a network tab can fabricate
a request hitting this RPC and inflate any student's score by 10K
points (the per-call cap inside the underlying single-row RPC).

**Recommended fix:**
1. Add to the top of `save_student_progress_batch`:
   ```sql
   v_caller := auth.uid()::text;
   IF v_caller IS NULL THEN
     RAISE EXCEPTION 'Authentication required';
   END IF;
   ```
2. Inside the loop, validate every batch entry's `student_uid` equals
   `v_caller` (students may only write THEIR OWN progress).  Carve
   out an exception only for QP guests with `student_uid` matching a
   live `quick_play_joins` row.
3. Audit the underlying `save_student_progress()` RPC — same fix
   applies.

#### 2.3-FINDING-3 [MED]: Class-data RPCs lack explicit teacher/admin role

`get_class_activity` (`supabase/migrations/20260510_get_class_activity_rpc.sql`)
and `get_class_mastery` (`20260509_get_class_mastery_rpc.sql`) verify
class-ownership (`teacher_uid = auth.uid()::text`) but don't check
that the caller has `role='teacher'` OR `role='admin'`.

In practice this is fine because non-teachers can never own a class
(insert is gated).  But the implicit assumption is brittle: if a
future migration ever lets a non-teacher own a class, these RPCs
silently expand access.

**Recommended fix:** add `OR public.is_admin()` so admins can query
any class for support purposes, and document that the implicit
teacher-only access depends on classes-INSERT being teacher-gated.

## Summary

| Severity | Count | Priority |
|---|---|---|
| HIGH | 3 | Fix this week — `save_student_progress_batch`, `quick_play_joins`, `award_reward` |
| MED | 3 | Fix this month — `teacher_profiles` enumeration, `quick_play_sessions` enumeration, class-RPC role check |
| LOW | 14 tables, 6 RPCs | Production-safe |

## Suggested fix order

1. **`save_student_progress_batch` + underlying `save_student_progress`** — add auth.uid() check + scope each batch row to the caller's own UID.  Prevents arbitrary score forgery.  ~30 minutes of SQL + a migration.
2. **`quick_play_joins`** — narrow SELECT/INSERT.  If table is dead code, drop it instead.  ~30 minutes including verifying no live code path writes.
3. **`award_reward`** — add class-ownership check + XP bounds check.  ~30 minutes.
4. **`teacher_profiles`** — narrow SELECT to self.  ~15 minutes.
5. **`get_class_activity` / `get_class_mastery`** — add `OR is_admin()`.  ~15 minutes.
6. **`quick_play_sessions`** — defer until QP feature stabilises; the 6-char enumeration risk is low.

Total fix budget: **~2.5 hours**.

## Out of scope (would need separate sessions)

- **Phase 3** — dynamic testing (try to break the running app via DevTools / cURL with bad payloads).  Would surface things like: insufficient input sanitisation, race conditions, response-info leaks.
- **Phase 4** — compliance gap analysis (GDPR / COPPA / Israeli kids' data law).  Best done with legal review, not engineering.
- **Phase 5** — implementing the fixes above.

## What's NOT a finding (positive observations)

- All RLS policies that need to compare `auth.uid()` to a TEXT column
  use `::text` cast — no UUID/TEXT mismatch bugs.
- `is_teacher()`, `is_admin()`, `is_teacher_allowed()` helpers are
  SECURITY DEFINER and read the role column correctly.
- Privacy-related RPCs (`delete_my_account`, `export_my_data`) are
  GDPR-aligned and properly scoped.
- The `class_lookup_by_code` RPC has both auth requirement AND a
  30/min rate limit per caller (`class_lookup_rate` ledger table).
- Score writes use a server-validated monotonic check so a student
  can't downgrade their own progress.
- `users` UPDATE policy explicitly prevents self-promotion to teacher
  / admin via the `WITH CHECK (is_admin() OR role = existing_role)`
  pattern.

These together represent a maturity level that catches the common
classes of vulnerability.  The 6 findings above are gaps in an
otherwise well-architected RLS surface — fixable rather than
fundamental.
