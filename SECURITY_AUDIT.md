# Vocaband Security Audit Report

**Date:** 2026-03-30
**Auditor:** Claude (Automated Security Review)
**Scope:** Full codebase — authentication, authorization, sessions, RLS, input handling
**Branch:** `claude/security-audit-hpSBi`

---

## Executive Summary

Vocaband is a gamified vocabulary learning platform (React 19 + Express + Supabase + Socket.IO). The codebase demonstrates **strong security practices overall** — Helmet CSP, PKCE auth, server-side JWT verification, Row-Level Security on all tables, input validation, and rate limiting at multiple layers. Several medium-severity issues were identified, primarily around session management and student identity handling.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 2 |
| Medium   | 5 |
| Low      | 4 |
| Info     | 6 |

---

## 1. Authentication Flows

### 1.1 Teacher Authentication (Google OAuth + PKCE)

**Flow:** Google Sign-In -> Supabase OAuth -> PKCE code exchange -> Teacher allowlist check

| Step | Location | Security |
|------|----------|----------|
| Google OAuth redirect | `App.tsx:3088` | Uses `signInWithOAuth` with PKCE |
| PKCE code exchange | `main.tsx:16-50` | Runs BEFORE React mounts to avoid StrictMode race |
| Exchange retry | `main.tsx:22-38` | 3 attempts with backoff; stops on "already used" / "expired" |
| URL cleanup | `main.tsx:49` | `replaceState` clears `?code=` from URL |
| Allowlist check | `App.tsx:1058` | `is_teacher_allowed()` RPC (SECURITY DEFINER, case-insensitive) |
| Unauthorized sign-out | `App.tsx:1063` | Calls `signOut()` if email not in allowlist |

**Verdict:** Well-implemented. The PKCE exchange before React mount is a good pattern that prevents lock contention.

### 1.2 Student Authentication (Anonymous Auth + Class Code)

**Flow:** Enter class code + name -> Anonymous sign-in -> Validate class exists -> Check approval status -> Upsert user row

| Step | Location | Security |
|------|----------|----------|
| Input trimming | `App.tsx:2149-2150` | Name capped at 30 chars, code at 20 |
| Client rate limit | `App.tsx:2153-2160` | Max 5 attempts per 60 seconds |
| Login timeout | `App.tsx:2167-2173` | 20-second timeout aborts spinner |
| Anonymous sign-in | `App.tsx:2179` | `signInAnonymously()` reuses existing session |
| Class validation | `App.tsx:2189` | Queries `classes` table by code |
| Approval check | `App.tsx:2202-2221` | Checks `student_profiles.status` |
| User upsert | `App.tsx:2225-2241` | Insert or update user row with `role: 'student'` |

**Verdict:** Solid flow. The approval workflow adds a teacher-gated layer.

### 1.3 Guest / Demo Mode

| Feature | Location | Security |
|---------|----------|----------|
| Guest user creation | `App.tsx:678-688` | Ephemeral, client-only, `role: 'guest'` |
| Quick Play guest | `App.tsx:3604` | No Socket.IO, no database writes |
| Demo mode | `DemoMode.tsx` | Read-only, 10 sample words |

**Verdict:** Guests are properly isolated. They cannot write to the database (no Supabase session). Quick Play guests do NOT join Socket.IO live challenges — they only play locally.

---

## 2. Authorization & Row-Level Security

### 2.1 RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **users** | Own row or admin | Own UID only | Own row (role frozen) or admin | Not defined (no policy = deny) |
| **classes** | Any authenticated user | Teacher (own UID + is_teacher) | Teacher (own class) | Teacher (own class) |
| **assignments** | Teacher (own) or student (enrolled) | Teacher (own class) | Teacher (own class) | Teacher (own class) |
| **progress** | Own records or teacher (own class) | Own UID + own class_code | Own records (score can only increase) | Not defined |
| **teacher_allowlist** | No policies (all denied) | No policies | No policies | No policies |
| **consent_log** | Own records or admin | Own UID | Not defined | Not defined |
| **audit_log** | Own entries or admin | Own UID | Not defined | Not defined |
| **student_profiles** | Own profile or teacher (own class) | Various | Teacher (approve/reject) | Not defined |
| **quick_play_sessions** | Authenticated + active only | Via RPC | Via RPC | Not defined |

### 2.2 Role Escalation Prevention

- **Migration 001:** `users_update` forces `role = (SELECT role FROM users WHERE uid = auth.uid())` — users cannot change their own role
- **Migration 007:** `users_insert` restricts to `role = 'student'` unless email is in teacher allowlist or user is admin
- **Server-side (Socket.IO):** `getUserRoleAndClass()` checks role from DB before allowing join

**Verdict:** Role escalation is properly prevented at the database level.

### 2.3 SECURITY DEFINER Functions

| Function | Purpose | Risk |
|----------|---------|------|
| `is_teacher()` | Check role | Low — returns boolean only |
| `is_admin()` | Check role | Low — returns boolean only |
| `is_teacher_allowed(email)` | Check allowlist | Low — returns boolean, case-insensitive |
| `get_my_email()` | Get email from `auth.users` | Low — returns only caller's email |
| `export_my_data()` | GDPR data export | Medium — returns all user data, but scoped to auth.uid() |
| `delete_my_account()` | GDPR erasure | Medium — cascading delete, but scoped to auth.uid() |
| `cleanup_expired_data()` | Retention cleanup | Low — admin-only check |
| `generate_session_code()` | Crypto-secure codes | Low — uses `gen_random_bytes()` |
| `approve_student()` | Teacher approves student | Low — teacher ownership verified |
| `purchase_item()` | XP shop purchase | Low — atomic, checks balance |
| `save_student_progress()` | Insert progress | Low — validates auth.uid() |

**Verdict:** All SECURITY DEFINER functions properly check `auth.uid()`. No privilege escalation vectors found.

---

## 3. Session Management

### 3.1 Supabase Auth Config

```typescript
// src/core/supabase.ts
{
  persistSession: true,        // Sessions survive page refresh
  autoRefreshToken: true,      // SDK auto-refreshes before expiry
  flowType: 'pkce',            // PKCE prevents auth code interception
  detectSessionInUrl: false,   // Manual exchange in main.tsx
}
```

### 3.2 Session Restore on Refresh

| Scenario | Mechanism | Location |
|----------|-----------|----------|
| Teacher refresh | Supabase SDK auto-restores from localStorage (`sb-*-auth-token`) | Handled by SDK |
| Student refresh | `onAuthStateChange(INITIAL_SESSION)` -> check `vocaband_student_login` in localStorage -> `signInAnonymously()` -> UID migration if needed | `App.tsx:1134-1140` |
| Auth lock safety | 8-second timeout prevents infinite spinner if `onAuthStateChange` never fires | `App.tsx:1156-1158` |
| OAuth callback | Detects `?code=` or `#access_token=` in URL, keeps spinner until SIGNED_IN | `App.tsx:1116-1118` |

### 3.3 Socket.IO Session Lifecycle

| Event | Server Action | Location |
|-------|---------------|----------|
| Connection | Auth middleware verifies JWT | `server.ts:208-220` |
| join-challenge | Re-verify token, check class membership, add to leaderboard | `server.ts:225-272` |
| update-score | Validate socket owns the UID, rate limit, score bounds | `server.ts:300-319` |
| disconnect | Ref-counted cleanup, remove from leaderboard on last tab | `server.ts:323-345` |
| reconnect | Client re-emits join-challenge with fresh token | `App.tsx:916-929` |

### 3.4 Logout Flow

- `supabase.auth.signOut()` clears Supabase session
- `localStorage.removeItem('vocaband_student_login')` on SIGNED_OUT event
- Socket disconnect triggers server-side leaderboard cleanup
- Multi-tab ref counting ensures cleanup only on last tab close

---

## 4. Socket.IO Security

### 4.1 Rate Limiting

| Limiter | Scope | Window | Max | Location |
|---------|-------|--------|-----|----------|
| HTTP rate limit | Per IP | 60s | 200 | `server.ts:118` |
| Pre-auth IP | Per IP | 60s | 200 | `server.ts:131-135` |
| Per-user join | Per UID | 60s | 5 | `server.ts:136-140` |
| Score updates | Per socket | 1s | 2 | `server.ts:143-147` |
| Observe events | Per user | 60s | 5 | `server.ts:149-154` |

### 4.2 Input Validation

| Field | Validation | Location |
|-------|-----------|----------|
| classCode | 1-64 alphanumeric + hyphen/underscore | `server-utils.ts:19-23` |
| name | 1-100 chars, no control characters | `server-utils.ts:26-28` |
| uid | UUID v4 format (regex) | `server-utils.ts:32-34` |
| token | JWT format (3 base64url segments) | `server-utils.ts:38-41` |
| score | Number, finite, 0-10000, increments <= 10 | `server.ts:301-315` |

### 4.3 Anti-Cheat

- Scores can only **increase** (never decrease)
- Max increment per update: **10 points** (one correct answer)
- Rate: max **2 updates per second** per socket
- Socket must own the UID it tries to update (`socketSessions` check)

---

## 5. Security Headers & Transport

### 5.1 Helmet Configuration (Production)

```
Content-Security-Policy:
  default-src 'self'
  script-src  'self'
  style-src   'self' 'unsafe-inline' fonts.googleapis.com
  font-src    'self' fonts.gstatic.com
  img-src     'self' data: https:
  connect-src 'self' https://*.supabase.co wss://*.supabase.co {ALLOWED_ORIGIN}
  frame-src   https://accounts.google.com
  worker-src  'self' blob:

HSTS: max-age=31536000; includeSubDomains; preload
```

### 5.2 CORS

- Socket.IO restricted to `ALLOWED_ORIGIN` (production: `https://www.vocaband.com`)
- Express `trust proxy: 1` for Render/Cloudflare

---

## 6. Privacy & Compliance

| Feature | Status | Location |
|---------|--------|----------|
| Consent tracking | localStorage + DB table | `App.tsx:1715-1726`, migration 010 |
| Data export (GDPR) | `export_my_data()` RPC | migration 010:93-133 |
| Account deletion | `delete_my_account()` RPC | migration 010:139-206 |
| Audit logging | `audit_log` table | migration 010:43-64 |
| Data retention | Progress 365d, Orphans 90d, Audit 730d | migration 010:212-259 |
| Class deletion cleanup | Trigger orphans students, logs deletion | migration 010:265-291 |

---

## 7. Findings

### HIGH Severity

#### H1: Student `unique_id` Collision in Approval Workflow *(Fixed — 2026-03-30)*

**Location:** `App.tsx:2164`, `supabase/migrations/20260330_security_fixes.sql`
**Description:** The student profile lookup uses `unique_id = lowercase(classCode) + lowercase(studentName)`. If two students in the same class use the same display name, they share a profile row. Approving one approves both.
**Impact:** A student could bypass the approval workflow by registering with the same name as an already-approved student.
**Fix:** `unique_id` now includes the caller's anonymous auth UID (`code + name + ':' + uid`). The `get_or_create_student_profile` SECURITY DEFINER function enforces this server-side. Legacy rows are migrated to the new format on next login.

#### H2: Student Can Change Own `class_code` via Direct Supabase Update *(Fixed — 2026-03-30)*

**Location:** `supabase/migrations/20260330_security_fixes.sql`
**Description:** The `users_update` RLS policy only froze the `role` column. A student could call `supabase.from('users').update({ class_code: 'ANOTHER_CODE' })` to move themselves to a different class without teacher approval.
**Impact:** Unauthorized access to another class's assignments and leaderboard.
**Fix:** The `users_update` policy now freezes both `role` and `class_code` in a single `EXISTS` subquery. Non-admins may only retain their existing `class_code` (or set it from NULL during initial insert).

### MEDIUM Severity

#### M1: Student Credentials in Plaintext localStorage

**Location:** `App.tsx:2271`
**Description:** `vocaband_student_login` stores `{ classCode, displayName, uid }` in plaintext. Any browser extension or XSS (if CSP were bypassed) can read this.
**Impact:** Low in practice (anonymous auth, class codes are not highly sensitive), but violates principle of least exposure.
**Recommendation:** Use `sessionStorage` instead (clears on tab close) or store only a session identifier.

#### M2: UID Migration Without Integrity Check *(Mitigated — 2026-04-03)*

**Location:** `App.tsx` — student session restore
**Description:** When a student's anonymous UID changes between sessions, the code updates the `users` row using `savedUid` from localStorage. A tampered localStorage value could point to another student's UID.
**Impact:** Low — RLS policies (`auth.uid()::text = uid`) block SELECT/UPDATE for non-matching UIDs, and the attacker would need local browser access.
**Fix:** Added UUID format validation (`/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i`) for `savedUid` before any DB operation. Non-UUID values are rejected and stale login is cleared. Full elimination would require a server-side signed migration token.

#### M3: Consent Stored Only in localStorage *(Fixed — 2026-04-03)*

**Location:** `App.tsx` — `checkConsent`, `recordConsent`, withdraw consent handler
**Description:** Consent acceptance wrote to `localStorage` only. The `consent_log` DB table existed but was not populated by the app code. Clearing browser data bypassed the consent prompt.
**Impact:** Compliance gap — no server-side proof of consent for GDPR/Amendment 13.
**Fix:** `recordConsent` already wrote to `consent_log` (accept). `checkConsent` now falls back to a DB query when localStorage is missing — if a valid `accept` record exists, the banner is suppressed and localStorage is restored. Withdraw consent now also inserts a `withdraw` record into `consent_log` for a complete audit trail.

#### M4: Token Resent in Socket.IO Event Payload on Reconnect *(Fixed — 2026-04-03)*

**Location:** `App.tsx` — socket init; `server.ts` — join-challenge, observe-challenge handlers; `src/core/types.ts`
**Description:** The socket used a static auth token set at connection time, and also resent the token inside `join-challenge`/`observe-challenge` event payloads for server-side re-verification.
**Impact:** Low — the connection already required the token in `handshake.auth`. Redundant exposure in frame body.
**Fix:** Socket now uses an async auth callback (`auth: (cb) => getToken().then(t => cb({ token: t }))`), ensuring a fresh JWT is fetched on every reconnect at the handshake level. Token removed from all event payloads. Server `join-challenge` handler now validates the payload `uid` against `socket.data.uid` (stored by the connection middleware) instead of re-verifying a token. `observe-challenge` likewise uses `socket.data.uid`.

#### M5: In-Memory Rate Limiters Reset on Server Restart *(Accepted Risk)*

**Location:** `server.ts:131-154`
**Description:** All Socket.IO rate limiters use in-memory `Record<string, ...>` objects. A server restart (deploy, crash) resets all counters.
**Impact:** Low — Supabase rate limits and JWT verification provide additional protection. Brief window after restart has no rate limiting.
**Decision:** Accepted for current scale. Redis-backed rate limiting should be considered if abuse patterns emerge or user volume grows significantly.

### LOW Severity

#### L1: `unsafe-inline` in Style CSP

**Location:** `server.ts:100`
**Description:** Required for the Motion animation library. Weakens style injection protection.
**Recommendation:** Acceptable trade-off. Consider nonce-based styles if Motion adds support.

#### L2: Broad `imgSrc` Allows Any HTTPS Source

**Location:** `server.ts:102`
**Description:** `imgSrc: ["'self'", "data:", "https:"]` allows loading images from any HTTPS origin.
**Recommendation:** Restrict to known domains if possible.

#### L3: Guest UID Uses `Math.random()`

**Location:** `App.tsx:679`
**Description:** Guest UIDs are generated with `Date.now() + Math.random()`. Not cryptographically secure.
**Recommendation:** Use `crypto.randomUUID()` instead. Low impact since guests don't interact with the database.

#### L4: Error Messages Expose Details to Users

**Location:** `App.tsx:2123`
**Description:** `showToast("Could not approve student: ${error}", "error")` exposes raw error objects.
**Recommendation:** Show generic messages; log details to console only.

### INFORMATIONAL

| # | Finding | Notes |
|---|---------|-------|
| I1 | No `DELETE` policy on `users` table | Deletion only via `delete_my_account()` RPC (SECURITY DEFINER). Correct pattern. |
| I2 | Classes visible to all authenticated users | Intentional design — class code is the join credential. Rate-limited by Supabase. |
| I3 | No email verification for students | By design — students use anonymous auth. No email required. |
| I4 | No password reset flow | By design — teachers use Google OAuth, students use anonymous auth. |
| I5 | `trust proxy: 1` | Correct for single-proxy deployment (Render behind Cloudflare). |
| I6 | Service role key only on server | `SUPABASE_SERVICE_ROLE_KEY` used only in `server.ts`. Client uses anon key with RLS. |

---

## 8. What's Done Well

- **Defense in depth:** Input validation at client, server, and database levels
- **PKCE flow:** Properly implemented with pre-React-mount exchange
- **Role escalation prevention:** Both INSERT and UPDATE policies lock roles
- **Socket.IO auth:** Connection-level middleware + per-event re-verification
- **Anti-cheat:** Score monotonicity, increment caps, and rate limits
- **Privacy compliance:** GDPR/Amendment 13 tables, data export/deletion RPCs, audit logging
- **Teacher allowlist:** Cannot self-register as teacher; admin-managed
- **Multi-tab handling:** Ref-counted socket sessions prevent ghost leaderboard entries
- **Throttled broadcasts:** Batches leaderboard updates to prevent socket flooding
- **No XSS vectors:** No `dangerouslySetInnerHTML`, `eval()`, or `innerHTML` anywhere
- **No SQL injection:** All queries use Supabase SDK (parameterized)
- **Secrets management:** `.env*` gitignored, service key server-only, render.yaml references dashboard secrets

---

## 9. Recommendations Summary

| Priority | Action | Effort |
|----------|--------|--------|
| ~~**High**~~ | ~~Fix student `unique_id` to include UID or random component~~ | ✅ Done |
| ~~**High**~~ | ~~Add RLS constraint to prevent students from changing `class_code`~~ | ✅ Done |
| ~~**Medium**~~ | ~~Persist consent to `consent_log` table (not just localStorage)~~ | ✅ Done |
| ~~**Medium**~~ | ~~Remove token from `join-challenge` payload (use handshake auth only)~~ | ✅ Done |
| **Low** | Use `crypto.randomUUID()` for guest UIDs | Trivial |
| **Low** | Sanitize error messages shown to users | Small |
| **Low** | Restrict `imgSrc` CSP to known domains | Trivial |

---

## 10. Addendum — CodeQL Findings (2026-04-03)

Two additional high-severity issues were identified by GitHub CodeQL on branch `claude/fix-security-vulnerabilities-ZvlDj` and remediated in the same branch.

### CQ1: Biased Random Numbers in Class Code Generation *(Fixed)*

**Location:** `App.tsx` — `handleCreateClass`
**Description:** Class join codes were generated using `crypto.getRandomValues()` but mapped to an alphabet via `x % alphabet.length`. Since `2^32` is not divisible by 31 (the alphabet size), characters with lower index values were marginally more likely to appear.
**Fix:** Replaced modulo mapping with rejection sampling — values that exceed the largest multiple of the alphabet size are discarded and resampled, ensuring uniform distribution.

### CQ2: Incomplete URL Hostname Sanitization *(Fixed)*

**Location:** `App.tsx` — `handleGSheetsImport`
**Description:** The Google Sheets URL check used `parsed.hostname.endsWith("google.com")`, which would also accept hostnames like `evilgoogle.com` or `notgoogle.com`.
**Fix:** Changed to require `parsed.hostname === "google.com"` or `parsed.hostname.endsWith(".google.com")`, ensuring only legitimate Google domains are accepted.
