# 01 — Authentication & Session Module

> Covers all auth surfaces: teacher Google OAuth, teacher email OTP, student class-code login, student Google OAuth, guest Quick Play join, session restore, and logout. Custom Supabase domain: `auth.vocaband.com` (EU region).
>
> Key files: `src/components/TeacherLoginCard.tsx`, `src/views/TeacherLoginView.tsx`, `src/views/StudentAccountLoginView.tsx`, `src/views/StudentAuthRoutes.tsx`, `src/hooks/useStudentLogin.ts`, `src/hooks/useTeacherOtpAuth.ts`, `src/hooks/useOAuthState.ts`, `src/hooks/useAuthRestore.ts`, `src/core/supabase.ts`.

---

## 1. Purpose of Module

- **What:** Authenticate three classes of users (teacher, student, guest) into the right SPA view with the right permissions, persist their session across reloads, and recover cleanly from auth failures.
- **Who:** Israeli teachers (grades 4–9) and their students; pilot schools; demo prospects.
- **Why:** Auth is the gate to all PII (children's names, progress) and the integrity of class data. RLS in Supabase keys off `auth.uid()` — if auth is wrong, every downstream check is wrong.
- **Criticality:** **S1**. Any breach or data leak here is catastrophic for a Ministry-of-Education-targeting product.

---

## 2. User Flow Mapping

### 2.1 Teacher Google OAuth (happy path)

```
TeacherLoginView mounts
→ user clicks "Continue with Google"
→ supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: <origin>/auth/callback })
→ browser redirected to Google
→ user consents
→ Google → auth.vocaband.com → /auth/callback?code=...
→ Supabase exchanges code → session set
→ SPA detects SIGNED_IN event in onAuthStateChange
→ useAuthRestore loads profile from public.users table
→ Role decoded → teacher dashboard
```

### 2.2 Teacher email OTP

```
TeacherLoginCard
→ enter email → POST supabase.auth.signInWithOtp({ email, emailRedirectTo })
→ Supabase sends magic link via Resend SMTP (see RESEND-SMTP-SETUP.md)
→ user clicks link in email client
→ /auth/callback?token_hash=...&type=email
→ Supabase exchanges → session
→ same downstream path as 2.1
```

### 2.3 Student class-code login

```
StudentAccountLoginView
→ enter class code (e.g. "AB7K9") + display name
→ useStudentLogin.signInStudent()
   → POST /api/student/login { classCode, displayName }
   → Fly.io looks up class, validates code (case-insensitive, trimmed)
   → SECURITY DEFINER RPC creates or fetches student row
   → returns { access_token, refresh_token, user }
→ supabase.auth.setSession({ access_token, refresh_token })
→ SPA → StudentDashboardView
```

### 2.4 Guest Quick Play join (no account)

```
Student scans QR (containing /quick-play/<session-id>)
→ QuickPlayStudentView mounts
→ useQuickPlayUrlBootstrap parses session id
→ socket.io connect with guest token
→ teacher's QuickPlaySetupView authorizes session
→ guest plays under ephemeral guest UUID (no public.users row)
→ session ends → guest disconnected, no persisted state
```

### 2.5 Auth failure paths

| Failure                                  | Detection                              | Recovery                                                         |
|------------------------------------------|----------------------------------------|------------------------------------------------------------------|
| Wrong class code                          | RPC returns `not_found`                | Toast: "Class code not found, ask your teacher"                  |
| Class disabled by teacher                 | RPC returns `class_disabled`           | Toast + escalation copy                                          |
| OTP link expired                          | Supabase returns `token_expired`       | UI: "Link expired, request a new one" + 60s rate-limit countdown |
| OAuth user denies consent                 | Provider returns `access_denied`       | Back to TeacherLoginView with neutral message                    |
| Supabase outage                           | Network error / 5xx                    | Banner: "Service degraded — try again in a moment"               |
| Session refresh token expired             | onAuthStateChange `TOKEN_REFRESHED` fails | Forced logout + redirect to login                              |
| Browser blocks third-party cookies        | OAuth redirect loops or `pkce` failure | Detect via referrer check; show "Open in default browser" UI     |
| In-app browser (Instagram/Facebook)       | UA sniff → `InAppBrowserWarning`       | Show modal asking user to open in Safari/Chrome                  |

### 2.6 Session restore on cold boot

```
SPA boots
→ useAuthRestore checks supabase.auth.getSession()
→ if session exists:
    → fetch public.users row
    → derive role + class memberships
    → route to correct dashboard
→ if no session: route to landing
→ if session corrupt (decode error): clear local storage → landing
```

---

## 3. Functional QA Scenarios

| ID            | Scenario                                                                  | Steps                                                                                                       | Expected Result                                                                                                            | Severity | Priority |
|---------------|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|----------|----------|
| AUTH-FUNC-001 | Teacher Google login — happy path                                        | Open landing → "I'm a teacher" → "Continue with Google" → consent on Google.                               | Lands on TeacherDashboardView with profile loaded; supabase session persisted in localStorage under `sb-*-auth-token`.      | S2       | P1       |
| AUTH-FUNC-002 | Teacher OTP login — happy path                                            | Enter teacher email → submit → open magic link in same browser tab.                                         | Session exchanged, dashboard loaded; OTP single-use (re-clicking link fails gracefully).                                   | S2       | P1       |
| AUTH-FUNC-003 | Student class-code login — happy path                                     | Enter "AB7K9" + "Yael".                                                                                     | Student joins class AB7K9; row created in `public.users` with role=student; redirected to StudentDashboardView.            | S1       | P0       |
| AUTH-FUNC-004 | Same class code + same display name twice                                 | Second login with identical inputs.                                                                         | RPC returns existing row, not duplicate; XP/progress preserved.                                                            | S2       | P1       |
| AUTH-FUNC-005 | Same class code + different display name                                  | Login with "Yael", then "Yael K".                                                                           | Two distinct student rows; UI does not silently merge.                                                                     | S3       | P2       |
| AUTH-FUNC-006 | Class code with whitespace / case variants                                | Enter " ab7k9 " or "AB7k9".                                                                                 | Server normalizes (trim + uppercase); match succeeds.                                                                      | S3       | P2       |
| AUTH-FUNC-007 | Logout from teacher dashboard                                             | Click avatar → Logout.                                                                                      | `supabase.auth.signOut()` clears storage; redirected to landing; back-button does not restore dashboard.                   | S2       | P1       |
| AUTH-FUNC-008 | Logout from student dashboard                                             | Open menu → Logout.                                                                                         | Session cleared; class membership preserved server-side; can re-enter via class code.                                      | S2       | P1       |
| AUTH-FUNC-009 | OTP rate limit                                                            | Request 6 OTPs in 60s.                                                                                      | 6th request blocked client-side with countdown; server returns 429 if client check bypassed.                               | S2       | P1       |
| AUTH-FUNC-010 | Session restore after browser restart                                     | Login → close browser → reopen on same device.                                                              | Session restored; dashboard loads without re-auth.                                                                         | S2       | P1       |
| AUTH-FUNC-011 | Cross-tab logout sync                                                     | Login → open 2 tabs → logout in tab A.                                                                      | Tab B detects auth change within 5s and redirects to landing (via supabase onAuthStateChange).                             | S3       | P2       |
| AUTH-FUNC-012 | "Continue as guest" Quick Play join                                       | Scan QR or open `/quick-play/<id>` directly.                                                                | Joins without account; ephemeral identity; no public.users row created.                                                    | S2       | P1       |
| AUTH-FUNC-013 | Magic link opened in different browser                                    | Request OTP in Chrome → open link in Safari.                                                                | Session created in Safari; Chrome remains unauthenticated; no cross-leak.                                                  | S3       | P2       |
| AUTH-FUNC-014 | OAuth callback param missing                                              | Manually hit `/auth/callback` with no code.                                                                 | Redirect to landing with neutral error toast; no crash.                                                                    | S3       | P2       |
| AUTH-FUNC-015 | Role downgrade — student trying to access teacher route                   | Direct-navigate `/dashboard/teacher` as student.                                                            | `useViewGuards` redirects to student dashboard; no flash of teacher UI.                                                    | S1       | P0       |
| AUTH-FUNC-016 | Teacher demo login (`/demo`)                                              | Open DemoMode without auth.                                                                                 | Demo loads with mock data; no Supabase queries fire; no PII written.                                                       | S2       | P1       |
| AUTH-FUNC-017 | Display-name profanity                                                    | Submit `"f*** you"` as display name.                                                                        | Server-side filter blocks or substitutes; child-safe message returned.                                                     | S2       | P1       |
| AUTH-FUNC-018 | Display-name with Hebrew/Arabic                                           | Submit `"יעל"` and `"يَوسُف"`.                                                                                | Accepted, persisted as UTF-8; rendered RTL correctly.                                                                      | S2       | P1       |
| AUTH-FUNC-019 | Display-name with emoji                                                   | Submit `"Yael 🦄"`.                                                                                          | Accepted (display-only); does not break any UI containers, including leaderboard rows.                                      | S3       | P2       |
| AUTH-FUNC-020 | Account already exists for OTP email                                      | Request OTP for already-registered teacher.                                                                 | Same session granted; no duplicate row; role preserved.                                                                    | S2       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                                          | Expected                                                                                           |
|---------------|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| AUTH-EDGE-001 | Empty display name                                              | Inline validation prevents submit                                                                  |
| AUTH-EDGE-002 | Display name 256+ chars                                         | Server rejects with friendly error (max 32–40 chars)                                               |
| AUTH-EDGE-003 | Display name with `<script>alert(1)</script>`                   | Persisted as escaped text, never rendered as HTML in dashboard/leaderboard                         |
| AUTH-EDGE-004 | Display name with RTL override unicode `‮`                | Stripped or visually neutralized                                                                   |
| AUTH-EDGE-005 | Class code with non-ASCII digits (Arabic-Indic)                 | Server normalizes or rejects                                                                       |
| AUTH-EDGE-006 | Empty class code                                                | Submit button disabled                                                                             |
| AUTH-EDGE-007 | Email with `+alias`                                             | Accepted, OTP delivered                                                                            |
| AUTH-EDGE-008 | Email with disposable domain (10minutemail.com)                 | Allowed for now; flagged for future moderation                                                     |
| AUTH-EDGE-009 | OAuth `state` param tampered                                    | Supabase rejects exchange; user shown neutral error                                                |
| AUTH-EDGE-010 | Code reused after success                                       | Second exchange returns `invalid_grant`; no new session                                            |

### 4.2 User-behavior edge cases

| ID            | Behavior                                                                 | Expected                                                                                  |
|---------------|--------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| AUTH-EDGE-101 | Double-click "Login" button                                              | Single request fired (button disabled while pending)                                      |
| AUTH-EDGE-102 | Open OAuth tab, abandon, return                                          | UI returns to login screen; no half-state                                                 |
| AUTH-EDGE-103 | Multi-tab — login in A, register in B                                    | B's request reuses session from A; no conflict                                            |
| AUTH-EDGE-104 | Login → immediately refresh                                              | Auth restore path returns same session; no flash of landing                               |
| AUTH-EDGE-105 | Back-button after logout                                                 | Cached dashboard not visible; auth guard redirects                                        |
| AUTH-EDGE-106 | Switch from teacher to student account on same device                    | Clean session swap; teacher data not visible to student                                   |
| AUTH-EDGE-107 | Class code submitted while offline                                       | Saved to queue, retried on reconnect, or clear error                                      |
| AUTH-EDGE-108 | Refresh during OAuth redirect                                            | Lands on whichever URL is reached; no half-auth state                                     |

### 4.3 Infrastructure edge cases

| ID            | Failure                                              | Expected                                                                |
|---------------|-------------------------------------------------------|-------------------------------------------------------------------------|
| AUTH-EDGE-201 | Supabase auth endpoint 500                            | UI shows degraded banner; retry with exponential backoff               |
| AUTH-EDGE-202 | Worker → Fly.io 502                                   | `/api/student/login` retried; user-facing toast after 2 fails           |
| AUTH-EDGE-203 | Cloudflare → Supabase TLS fails                       | Error logged; user sees "Service unavailable"                          |
| AUTH-EDGE-204 | Cookie blocked by browser policy                      | `InAppBrowserWarning` shown                                            |
| AUTH-EDGE-205 | LocalStorage disabled                                 | Detect and warn; offer demo mode                                       |
| AUTH-EDGE-206 | DNS hijack of auth.vocaband.com (theoretical)         | TLS pin / HSTS preload — detect via SCT logs (compliance task)         |

### 4.4 AI edge cases

> Auth module does not call AI directly. Prompt-injection coverage is in `03-ASSIGNMENT-MODULE.md` (OCR) and `09-VOCABULARY-DATA.md` (sentence builder).

---

## 5. Security QA

> Acting as offensive security QA. RLS is the last line of defense — but auth boundary is the first.

| ID           | Attack                                          | Exploit path                                                                                                                    | Expected secure behavior                                                                                                                          |
|--------------|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| AUTH-SEC-001 | JWT tampering                                    | Edit `role` claim in localStorage to `service_role`.                                                                            | Supabase rejects on signature check; RLS denies; no privileged write.                                                                              |
| AUTH-SEC-002 | Authorization escalation via direct PostgREST    | Send `Authorization: Bearer <student-jwt>` to `/rest/v1/users?role=eq.teacher` from curl.                                       | RLS returns only own row; no other-user PII leaks.                                                                                                 |
| AUTH-SEC-003 | IDOR on student rows                             | Replace `user_id` query param with another's UUID.                                                                              | RLS rejects; 0 rows returned.                                                                                                                       |
| AUTH-SEC-004 | CSRF on `/api/student/login`                     | Cross-origin POST from attacker.com with cookies.                                                                              | CORS allow-list excludes attacker; if cookies are not used (bearer-only), CSRF is N/A; verify both.                                                |
| AUTH-SEC-005 | OAuth redirect-URI confusion                     | Try `redirectTo=https://attacker.com/auth`.                                                                                     | Supabase only honors registered redirect domains (`vocaband.com` and `www.vocaband.com`).                                                          |
| AUTH-SEC-006 | Magic link forwarding (phishing-style)           | Teacher forwards their OTP link.                                                                                                | Link is single-use; recipient gains session, original loses it. Document UX risk in user docs; out-of-band MFA recommended.                       |
| AUTH-SEC-007 | Session fixation                                 | Attacker pre-issues a session id and tricks user to login under it.                                                             | Supabase issues fresh tokens on every successful auth; old session invalidated.                                                                    |
| AUTH-SEC-008 | Replay attack on OAuth code                      | Capture `?code=` and replay later.                                                                                              | Code is single-use; PKCE pair binds to original session.                                                                                          |
| AUTH-SEC-009 | Enumeration via login error timing               | Hit `/api/student/login` with varying class codes and measure response time.                                                    | Constant-time response; uniform error message for all failure modes.                                                                              |
| AUTH-SEC-010 | Brute force class code                           | Spray 4-char codes against `/api/student/login`.                                                                                | Rate limit per IP (≤ 20/min) + per class code (≤ 5 fails/15min). Lock + alert on exceeded threshold.                                              |
| AUTH-SEC-011 | XSS via display name                             | Inject `<img onerror=...>` into `display_name`.                                                                                 | Always rendered via React text node (`{name}`), never `dangerouslySetInnerHTML`; CSP `script-src 'self' ...` blocks inline.                       |
| AUTH-SEC-012 | Service-role key exposure                        | Inspect bundle / network for `SUPABASE_SERVICE_ROLE_KEY`.                                                                       | Never present in client bundle; server-only env var; verified via `grep` in CI.                                                                    |
| AUTH-SEC-013 | Long-lived refresh token theft                    | Steal refresh token from compromised device.                                                                                    | 30-day expiry default; allow user to "Log out of all devices"; detect anomalous refresh and force re-auth.                                        |
| AUTH-SEC-014 | Quick Play guest impersonation                    | Steal session id from teacher screen.                                                                                           | Session id is short-lived (10 min after start); rotates on new round; can be revoked by teacher button.                                           |
| AUTH-SEC-015 | OAuth in-app browser hijack                       | Instagram in-app browser captures Google credentials.                                                                           | `InAppBrowserWarning` blocks OAuth in known UA strings; recommends external browser.                                                              |

---

## 6. Accessibility QA (WCAG 2.1 AA)

| ID            | Check                                                                                  | Expected                                                                                          |
|---------------|----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| AUTH-A11Y-001 | Tab order on login form                                                                | Email → Submit → "Continue with Google" → secondary links, no traps.                              |
| AUTH-A11Y-002 | Screen reader announces validation errors                                              | `aria-live="polite"` region renders the error text.                                               |
| AUTH-A11Y-003 | Color contrast on "Login" button                                                       | ≥ 4.5:1 vs background in both light and (future) dark mode.                                       |
| AUTH-A11Y-004 | Focus visible after OAuth redirect back                                                | Focus moved to a meaningful target (e.g. dashboard heading).                                      |
| AUTH-A11Y-005 | Class-code input — autocapitalization off                                              | Mobile shows uppercase keyboard via `autoCapitalize="characters"`.                                |
| AUTH-A11Y-006 | RTL rendering                                                                          | Labels right-aligned in HE/AR; placeholder text not mirrored awkwardly.                          |
| AUTH-A11Y-007 | Reduced motion                                                                         | Login transitions respect `prefers-reduced-motion: reduce`.                                       |
| AUTH-A11Y-008 | Voiceover reads "Continue with Google" not "Google G icon"                             | Button has accessible name.                                                                       |
| AUTH-A11Y-009 | Zoom 200%                                                                              | Form remains usable, no horizontal scroll under 320px width.                                      |
| AUTH-A11Y-010 | High-contrast / Windows forced colors                                                  | Borders + focus rings remain visible.                                                             |

---

## 7. Responsive & Device QA

| ID            | Device / Viewport                                            | Check                                                                  |
|---------------|---------------------------------------------------------------|------------------------------------------------------------------------|
| AUTH-RESP-001 | iPhone SE 1st gen (320×568)                                   | Form fits, no overflow                                                  |
| AUTH-RESP-002 | iPhone 14 Pro safe area                                       | Form not occluded by notch                                              |
| AUTH-RESP-003 | Android Chrome with keyboard open                             | Submit button visible (avoid overlap; `viewport-fit=cover`)             |
| AUTH-RESP-004 | iPad portrait + landscape                                     | Card centered, max-width respected                                      |
| AUTH-RESP-005 | Desktop ultrawide 3440×1440                                   | Card centered, hero image not stretched                                 |
| AUTH-RESP-006 | Low-end Android (1GB RAM)                                     | LCP < 3s on Fast 3G; no jank                                            |
| AUTH-RESP-007 | iOS Safari 16 PWA                                              | Status bar styling correct; OAuth opens in SFSafariViewController       |
| AUTH-RESP-008 | Browser zoom 50% / 200%                                       | Layout intact                                                           |
| AUTH-RESP-009 | Foldable Galaxy Z Fold                                        | Hinge-aware layout                                                      |
| AUTH-RESP-010 | OS keyboard switching (iOS → Hebrew QWERTY)                  | Class code accepts letters from any layout                              |

---

## 8. Performance QA

| Metric          | Target (P75) | Critical          | Notes                                                                                       |
|-----------------|--------------|-------------------|---------------------------------------------------------------------------------------------|
| TTFB            | < 600ms      | > 1500ms          | Worker should serve cached SPA in < 200ms                                                   |
| LCP             | < 2.5s       | > 4s              | Landing page hero with login card                                                            |
| CLS             | < 0.05       | > 0.2             | Pre-allocate logo/illustration boxes                                                         |
| JS bundle       | < 220KB gz   | > 350KB gz        | Login route should not import the entire `App.tsx` orchestrator                              |
| OAuth round-trip | < 4s        | > 8s              | End-to-end Google → callback → SPA hydration                                                |
| OTP send        | < 3s        | > 8s              | Resend SMTP latency baseline                                                                |
| Auth restore (cold) | < 800ms  | > 2s              | `useAuthRestore` should not block first paint                                                |
| Concurrent login | 100 RPS    | sustained         | Fly.io `/api/student/login` capacity load test                                              |

---

## 9. Database Integrity QA

| ID          | Check                                                                                                  | Expected                                                            |
|-------------|--------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| AUTH-DB-001 | `public.users` UNIQUE on (`auth_user_id`)                                                              | Verified via migration                                              |
| AUTH-DB-002 | `public.users` UNIQUE on (`class_id`, `lower(display_name)`) for students                              | Idempotent re-login                                                 |
| AUTH-DB-003 | RLS policy on `public.users` — student can SELECT only own row + classmates' name/avatar              | Verified by RLS pen-test (`scripts/security-pen-test.sh`)            |
| AUTH-DB-004 | Soft-delete vs hard-delete on logout                                                                   | Logout never deletes; only session is cleared                       |
| AUTH-DB-005 | Cascade behavior when class deleted                                                                    | Students reassigned or class FK nulled; no orphan progress rows     |
| AUTH-DB-006 | Concurrent student creation under same class+name race                                                 | DB UNIQUE prevents duplicate; second insert returns existing row    |
| AUTH-DB-007 | Index on `public.classes(class_code)`                                                                  | Login lookup remains O(log n) at 100k classes                       |
| AUTH-DB-008 | Audit trail on role changes                                                                            | Trigger writes to `audit_log` whenever a `users.role` is updated    |

---

## 10. API QA

### `POST /api/student/login`

```json
// Request
{ "classCode": "AB7K9", "displayName": "Yael" }

// Success (200)
{ "access_token": "eyJ...", "refresh_token": "...", "user": { "id": "uuid", "displayName": "Yael", "classId": "uuid" } }

// Errors
400 { "error": "validation_error", "field": "classCode" }
404 { "error": "class_not_found" }
403 { "error": "class_disabled" }
429 { "error": "rate_limit_exceeded", "retryAfter": 60 }
500 { "error": "internal_error" }
```

| ID           | Check                                                                          | Expected                                                                  |
|--------------|---------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| AUTH-API-001 | Body schema validation (zod or equivalent)                                     | Reject non-string `classCode`, missing `displayName`                      |
| AUTH-API-002 | Trim + uppercase normalization on `classCode`                                  | Match works regardless of input casing                                    |
| AUTH-API-003 | Display name length 1..32                                                       | 33+ chars → 400                                                           |
| AUTH-API-004 | Profanity filter                                                                | Blocked words → 400 with neutral message                                  |
| AUTH-API-005 | Rate limit                                                                      | 20 req/min/IP and 5 fails/15min/classCode                                 |
| AUTH-API-006 | Constant-time response on `not_found` vs `class_disabled`                      | Avoid enumeration                                                          |
| AUTH-API-007 | CORS                                                                            | Only `https://www.vocaband.com` allowed                                   |
| AUTH-API-008 | Returns same `refresh_token` lifetime as Supabase default (30d)                 | Verified                                                                  |
| AUTH-API-009 | Idempotency-Key header support (optional)                                       | Repeated submit with same key returns first response                      |
| AUTH-API-010 | Logging redacts PII                                                             | No `displayName` or `classCode` in plaintext server logs                  |

### `POST /api/teacher/otp` (if proxied via Fly) and `POST /supabase/auth/otp`

Same suite as above for: rate limit, CORS, schema validation, redaction.

---

## 11. State Management QA

| ID             | Check                                                                                        | Expected                                                                                |
|----------------|----------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| AUTH-STATE-001 | `useAuthRestore` only fires once per mount                                                   | Verify with React StrictMode double-render guard                                        |
| AUTH-STATE-002 | `onAuthStateChange` unsubscribed on unmount                                                  | No memory leak                                                                          |
| AUTH-STATE-003 | Stale closure: user changes class → `useTeacherData` refetches                               | Old class data not shown                                                                |
| AUTH-STATE-004 | OAuth callback while another tab logged in                                                   | New tab wins; old tab notified within 5s                                                |
| AUTH-STATE-005 | Auth restore race with `useTeacherTheme` and `useApplyTeacherTheme`                          | Theme not flashed in wrong color before role resolution                                 |
| AUTH-STATE-006 | `localStorage` cleared mid-session                                                           | Next request fails; UI returns to landing                                               |
| AUTH-STATE-007 | `useViewGuards` enforces role on every route transition                                       | No teacher routes render for students even momentarily                                  |

---

## 12. Observability & Monitoring QA

| ID           | Signal                                                          | Threshold for alert                                                          | Indicates                                       |
|--------------|------------------------------------------------------------------|-------------------------------------------------------------------------------|-------------------------------------------------|
| AUTH-OBS-001 | `auth_login_success_total` counter (Fly.io)                      | Sudden drop > 50% vs 1h average                                              | Auth outage / Supabase incident                  |
| AUTH-OBS-002 | `auth_login_failure_total{reason}` counter                       | Spike of `class_not_found` > 1000/hr                                          | Brute-force / spam                              |
| AUTH-OBS-003 | OAuth callback p95 latency                                       | > 6s                                                                          | Slow Supabase / Google                          |
| AUTH-OBS-004 | OTP send failure rate (Resend webhook)                           | > 5% of attempts                                                              | SMTP misconfig                                   |
| AUTH-OBS-005 | 4xx ratio on `/api/student/login`                                | > 30%                                                                         | Possible enumeration / outage                    |
| AUTH-OBS-006 | Number of unique IPs hitting login per minute                    | > 500 (well above pilot scale)                                                | DDoS / scrape                                    |
| AUTH-OBS-007 | Failed JWT verifications                                          | Any spike                                                                     | Tampering attempts                              |
| AUTH-OBS-008 | Sentry breadcrumb: auth-restore failures                          | Any error                                                                     | Bug in restore flow                              |

Silent-failure detection:
- Heartbeat: synthetic check logs in once every 5 min as a known test teacher; alert if 3 consecutive fail.
- Compare login attempts vs successful sessions; if divergence widens, investigate.

---

## 13. QA Automation Strategy

| Layer        | Tool                | Coverage                                                                                                |
|--------------|---------------------|---------------------------------------------------------------------------------------------------------|
| Unit         | Vitest              | `useStudentLogin`, `useAuthRestore`, normalizers, validators                                            |
| Integration  | Supertest           | `/api/student/login` happy + 4xx                                                                        |
| Contract     | Pact / JSON-schema  | Login response shape vs SPA expectation                                                                  |
| E2E          | Playwright          | Auth flows × 3 browsers × mobile emulation                                                              |
| Security     | OWASP ZAP scripted  | XSS in display name, IDOR on `/users`, rate-limit fuzz                                                  |
| Visual       | Playwright + pixel  | Login card in EN/HE/AR + light/dark                                                                     |
| A11y         | axe-core, Pa11y     | Login page                                                                                              |
| Perf         | Lighthouse CI       | LCP, CLS, JS bundle for `/` and `/teacher/login`                                                        |
| Load         | k6                  | 100 RPS sustained on `/api/student/login` for 5 min                                                     |
| Chaos        | toxiproxy           | Inject 500ms latency + packet loss between Worker and Fly                                               |

Automation priority: **P0** Playwright suite for the 4 happy paths + 6 highest-severity edge cases. **P1** k6 load test on login. **P2** ZAP scripted scan in CI.

---

## 14. Production Readiness Score (Auth module)

| Dimension             | Score 0–5 | Notes                                                                                          |
|-----------------------|-----------|------------------------------------------------------------------------------------------------|
| Functional            | 4         | Happy paths well-covered, error UX needs unification (multiple toast styles in codebase).      |
| Security              | 4         | RLS + OAuth + OTP standard; needs CSP header verification and rate-limit enforcement audit.    |
| Performance           | 4         | OAuth round-trip dependent on Google + Supabase; client side is fast.                          |
| Accessibility         | 3         | Login card good; missing live region for some error toasts.                                    |
| Reliability           | 3         | Depends on Supabase uptime; no fallback if Supabase fully down.                                |
| Observability         | 2         | Counters not formalized; Sentry panel exists but not enforced.                                  |
| Disaster recovery     | 3         | Documented in `DISASTER-RECOVERY.md`; not fire-drilled.                                        |
| Data integrity        | 4         | RLS + unique constraints solid.                                                                |

**Module readiness: 3.4 / 5.**

Blockers / vulnerabilities / instability risks:
- **Blocker:** Verify `Content-Security-Policy` is set on Worker for SPA shell; OAuth provider iframes must be allowlisted.
- **Vulnerability:** Brute-force class code rate limit not yet enforced in code (check Fly.io middleware).
- **Instability:** Sequence `useAuthRestore` → `useTeacherTheme` → `useApplyTeacherTheme` can flicker; needs a single auth bootstrap atom.

---

## 15. QA Success Metrics

| KPI                                            | Acceptable      | Warning      | Critical    |
|------------------------------------------------|-----------------|--------------|-------------|
| Login success rate (overall)                   | ≥ 99.0%         | 95–99%       | < 95%       |
| Login p95 latency                              | < 1.5s          | 1.5–3s       | > 3s        |
| Auth-restore failures per 1000 sessions        | < 1             | 1–5          | > 5         |
| 401 ratio post-login (within 5 min)            | < 0.1%          | 0.1–1%       | > 1%        |
| OTP delivery success                           | ≥ 98%           | 95–98%       | < 95%       |
| Cross-tab logout sync delay                    | < 5s            | 5–15s        | > 15s       |
| Defect escape rate from this module / quarter  | ≤ 1 S2 bug      | 2 S2         | any S1      |

---

## 16. Self-QA Validation

Reviewing the document for gaps:

**Missed initially:**
1. **OAuth in-app browser** — added AUTH-FUNC + AUTH-SEC-015. Instagram/Facebook in-app browsers commonly break Google OAuth. Already partly handled by `InAppBrowserWarning.tsx`; testing must cover it.
2. **Quick Play guest session vs authenticated student same QR** — covered partially in AUTH-FUNC-012; needs an explicit cross-flow test in `06-QUICK-PLAY.md`.
3. **Role downgrade after deletion** — if a teacher is demoted by admin, do their open sessions retain teacher UI until refresh? Added AUTH-STATE-007 explicitly enforcing role re-eval on every route guard.
4. **Magic-link forwarding social-engineering risk** — added AUTH-SEC-006; not a code bug but a documented risk for teacher onboarding.
5. **CSP and HSTS header verification** — promoted to a Readiness blocker (section 14).
6. **Audit-trail for role changes** — added AUTH-DB-008.

**Dangerous assumptions to flag:**
- "Supabase will rate-limit" — verify; do not assume.
- "Worker enforces CORS" — verify allowed-origin list in `worker/index.ts`.
- "Display name profanity is filtered" — confirm filter source-of-truth and HE/AR coverage.

**Hidden failures that could still happen in production:**
- Stale `useTeacherTheme` cache + new login → wrong theme color flash. Add visual regression.
- DST or timezone skew on session expiry computation.
- Local clock skew > 5 min on a student's tablet breaks Supabase JWT `iat`/`exp`. Show "Set device clock" hint when JWT rejected for `clock-skew`.

These improvements are now reflected in the matrices above.
