# Security Documentation

Technical security measures implemented in Vocaband, for compliance review and audit purposes.

---

## 1. Row-Level Security (RLS) Policies

All tables have RLS enabled. Below is a plain-language summary of each policy.

### `users` table

| Policy | Rule |
|--------|------|
| **SELECT** | Users can read only their own row. Admins can read all. |
| **INSERT** | Users can only insert a row matching their `auth.uid()`. Students can self-register. Teachers must be on the allowlist. Admins can create any role. |
| **UPDATE** | Users can update their own row. Admins can update any row. Users cannot change their own `role` (prevents self-promotion to teacher/admin). |

### `classes` table

| Policy | Rule |
|--------|------|
| **SELECT** | Any authenticated user can read any class (by design: students need to look up classes by code to join). |
| **INSERT** | Only teachers can create classes, and only owned by themselves. |
| **UPDATE/DELETE** | Only the owning teacher can modify or delete a class. |

### `assignments` table

| Policy | Rule |
|--------|------|
| **SELECT** | Teachers see assignments for their own classes. Students see assignments for their enrolled class. Admins see all. |
| **INSERT/UPDATE/DELETE** | Only the teacher who owns the class can manage assignments. |

### `progress` table

| Policy | Rule |
|--------|------|
| **SELECT** | Students see only their own progress. Teachers see progress for their classes. Admins see all. |
| **INSERT** | Students can only insert progress for themselves (`auth.uid() = student_uid`) and only for their enrolled class. |
| **UPDATE** | Students can update only their own records, and only to a higher score (prevents score manipulation). |

### `consent_log` table

| Policy | Rule |
|--------|------|
| **INSERT** | Users can only insert records for themselves. |
| **SELECT** | Users can view their own consent history. Admins can view all. |

### `audit_log` table

| Policy | Rule |
|--------|------|
| **INSERT** | Users can only insert entries with their own `actor_uid`. |
| **SELECT** | Users can view their own audit entries. Admins can view all. |

### `teacher_allowlist` table

| Policy | Rule |
|--------|------|
| No client-side policies | All access denied by default. Only accessible via `SECURITY DEFINER` functions. |

---

## 2. Security Headers (Production)

Configured via `helmet` in `server.ts`:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; ...` | Prevents XSS and data exfiltration |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking |
| `Referrer-Policy` | `no-referrer` | Limits referrer leakage |

---

## 3. Rate Limiting

### HTTP (Express)
- **200 requests/minute** per IP for page/API requests
- Static assets (JS, CSS, images, fonts) are excluded from rate limiting
- Uses `express-rate-limit` with standard headers

### Socket.IO
- **Pre-auth IP limiter:** 200 join attempts/minute per IP (catches raw flooding)
- **Per-user limiter:** 5 join attempts/minute per authenticated user
- **Score updates:** Max 2 per second per socket
- All limiters have automatic cleanup to prevent memory leaks

---

## 4. Authentication

### Students
- Anonymous sign-in via Supabase Auth
- No password or email required
- Session persisted in `localStorage` (managed by Supabase SDK)
- PKCE flow for security

### Teachers
- Google OAuth via Supabase Auth
- Email must be pre-approved in `teacher_allowlist`
- PKCE flow with manual code exchange before React mounts

### Token Verification (Server)
- Socket.IO connections verify Supabase JWT via `supabase.auth.getUser(token)`
- Server uses service role key for admin operations

---

## 5. Input Validation & Sanitization

| Input | Validation |
|-------|-----------|
| Student name | Trimmed, max 30 chars |
| Class code | Trimmed, max 20 chars |
| Class name | Max 50 chars, DB CHECK > 0 and < 100 |
| Score | Capped to `gameWords.length * 10`, clamped to `[0, max]` |
| Live score | Must be `number`, finite, `[0, 10000]`, increments by max 10 per update |
| File uploads | CSV/XLSX/DOCX: max 5 MB; OCR images: max 10 MB |
| Word imports | Max 500 words per import |
| Google Sheets URL | Hostname must be exactly `google.com` or end with `.google.com` (prevents subdomain spoofing) |
| Socket payloads | All fields validated for type and length before processing |

---

## 6. SECURITY DEFINER Functions

These PostgreSQL functions run with elevated privileges:

| Function | Purpose | Why SECURITY DEFINER |
|----------|---------|---------------------|
| `is_teacher()` | Check if current user is a teacher | Needs to read `users` table regardless of RLS |
| `is_admin()` | Check if current user is an admin | Same as above |
| `is_teacher_allowed(email)` | Check email against allowlist | `teacher_allowlist` has no client RLS policies |
| `get_my_email()` | Get current user's email from `auth.users` | `authenticated` role cannot read `auth.users` |
| `export_my_data()` | Export all user data | Needs cross-table access |
| `delete_my_account()` | Delete user and associated data | Needs cascade delete privileges |
| `cleanup_expired_data()` | Remove expired records | Admin-only bulk delete |
| `purchase_item()` | Atomic shop purchase | Prevents race conditions |

---

## 7. Data Protection Measures

- **Encryption in transit:** HTTPS enforced via HSTS and Cloudflare
- **Encryption at rest:** Supabase encrypts database storage at rest (AES-256)
- **No passwords stored:** Students use anonymous auth; teachers use Google OAuth
- **No PII in URLs:** Class codes are the only identifier in client-side routing
- **Audit logging:** Teacher access to student data is logged
- **Consent tracking:** Per-user, versioned consent records with timestamps
