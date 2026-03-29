# Data Flow Documentation

This document describes what personal data is sent, to which service, stored where, and for how long, for each major user flow in Vocaband.

---

## 1. Student Login (Anonymous Sign-In)

| Step | Data Sent | Destination | Stored Where | Retention |
|------|-----------|-------------|--------------|-----------|
| Enter class code + name | `class_code`, `display_name` | Supabase (client SDK) | `public.users` table | Until account deletion or orphan cleanup (90 days after class removal) |
| Anonymous sign-in | Browser generates anonymous session | Supabase Auth | `auth.users` (Supabase-managed) | Until session expires or sign-out |
| Class lookup | `class_code` | Supabase | Not stored (SELECT query) | N/A |
| User profile creation | `uid`, `role`, `display_name`, `class_code`, `avatar` | Supabase | `public.users` | Until account deletion |
| Join live challenge (optional) | `uid`, `display_name`, `class_code`, `token` | Render (Socket.IO) | In-memory only (server RAM) | Until socket disconnect |

## 2. Teacher Login (Google OAuth)

| Step | Data Sent | Destination | Stored Where | Retention |
|------|-----------|-------------|--------------|-----------|
| Click "Sign in with Google" | OAuth redirect | Google OAuth servers | Google manages auth cookies | Google's policy |
| PKCE code exchange | Authorization code | Supabase Auth | `auth.users` (Supabase-managed) | Until session expires |
| Allowlist check | `email` | Supabase RPC (`is_teacher_allowed`) | `public.teacher_allowlist` (pre-populated) | Permanent (admin-managed) |
| Teacher profile creation | `uid`, `email`, `display_name`, `role` | Supabase | `public.users` | Until account deletion |

## 3. Assignment Creation (Teacher)

| Step | Data Sent | Destination | Stored Where | Retention |
|------|-----------|-------------|--------------|-----------|
| Create assignment | `title`, `word_ids`, `words` (JSONB), `class_id`, `deadline`, `allowed_modes` | Supabase | `public.assignments` | Until teacher deletes or class deleted (CASCADE) |
| Upload CSV/XLSX/DOCX | File content | Browser only (FileReader API) | Not stored server-side | N/A (client-side only) |

## 4. Gameplay (Student Completing Assignment)

| Step | Data Sent | Destination | Stored Where | Retention |
|------|-----------|-------------|--------------|-----------|
| Submit score | `student_name`, `student_uid`, `assignment_id`, `class_code`, `score`, `mode`, `completed_at`, `mistakes`, `avatar` | Supabase | `public.progress` | Configurable (default: 365 days) |
| XP/streak update | `xp`, `streak`, `badges` | Supabase | `public.users` | Until account deletion |
| Live score update | `uid`, `classCode`, `score` | Render (Socket.IO) | In-memory only | Until socket disconnect |
| Offline retry | Progress record | Browser `localStorage` (`vocaband_retry_*`) | Client-side only | Until successfully synced |

## 5. OCR Image Upload (Teacher)

| Step | Data Sent | Destination | Stored Where | Retention |
|------|-----------|-------------|--------------|-----------|
| Upload image | Image file | Browser (Tesseract.js WASM) | Not stored anywhere | N/A |
| OCR processing | Image pixels | Tesseract.js (in-browser) | Not stored | N/A |
| Matched words | Extracted words matched against vocabulary bank | Client-side state only | Not stored | N/A |

**Note:** OCR runs entirely in the browser using WebAssembly. No image data is sent to any server.

## 6. Google Sheets Import (Teacher)

| Step | Data Sent | Destination | Stored Where | Retention |
|------|-----------|-------------|--------------|-----------|
| Enter Google Sheets URL | URL | Browser (fetch API) | Not stored | N/A |
| Fetch CSV export | HTTP GET to Google Sheets `/export?format=csv` | Google Sheets (public sheet) | Not stored server-side | N/A |
| Parse vocabulary | CSV text | Client-side parsing | Not stored | N/A |

**Note:** Only the sheet content (vocabulary words) is fetched. No personal data is sent to Google beyond standard HTTP headers (IP, User-Agent).

## 7. Consent & Privacy

| Step | Data Sent | Destination | Stored Where | Retention |
|------|-----------|-------------|--------------|-----------|
| Accept privacy policy | `uid`, `policy_version`, `terms_version`, `action` | Supabase | `public.consent_log` | 10 years (configurable) |
| Export my data | RPC call | Supabase | Not stored (returned to client) | N/A |
| Delete my account | RPC call | Supabase | Data deleted; audit log entry retained | Audit: 2 years |

---

## Data Storage Summary

| Table | Personal Data | Owner | Retention |
|-------|--------------|-------|-----------|
| `users` | uid, email, display_name, class_code, avatar, badges, xp, streak | User | Until deletion |
| `classes` | name, teacher_uid, code | Teacher | Until deletion |
| `assignments` | title, words, class_id | Teacher | Cascades with class |
| `progress` | student_name, student_uid, score, mistakes, avatar | Student | 365 days (configurable) |
| `consent_log` | uid, policy_version, action, timestamp | User | 10 years |
| `audit_log` | actor_uid, action, target_uid, metadata | System | 2 years |
| `teacher_allowlist` | email | Admin | Permanent |

## Client-Side Storage

| Key Pattern | Data | Purpose | Persistence |
|-------------|------|---------|-------------|
| `sb-*-auth-token` | Supabase JWT | Authentication | Until sign-out |
| `vocaband_welcome_seen` | Boolean flag | UI state | Permanent |
| `vocaband_retry_*` | Progress record (JSON) | Offline sync | Until synced |
| `oauth_exchange_failed` | Boolean flag | Error state | Session only |
