# Privacy Compliance Checklist

Tracks all privacy features required for Israeli PPA Amendment 13 compliance. Use this for audits, regulator inquiries, and ongoing maintenance.

---

## 1. Legal Framing & Roles

| Requirement | Status | Location |
|-------------|--------|----------|
| Data controller identified | Done | `src/privacy-config.ts` → `DATA_CONTROLLER` |
| Data processors listed | Done | `src/privacy-config.ts` → `THIRD_PARTY_REGISTRY` |
| Hosting regions documented | Done | `src/privacy-config.ts` → `HOSTING_REGIONS` |
| Privacy contact email | Done | `src/privacy-config.ts` → `DATA_CONTROLLER.contactEmail` |

## 2. Transparency & Consent

| Requirement | Status | Location |
|-------------|--------|----------|
| Data collection points mapped | Done | `src/privacy-config.ts` → `DATA_COLLECTION_POINTS` |
| Versioned privacy policy | Done | `src/privacy-config.ts` → `PRIVACY_POLICY_VERSION` |
| Versioned terms of service | Done | `src/privacy-config.ts` → `TERMS_VERSION` |
| Consent timestamp stored per user | Done | `public.users.consent_given_at`, `public.users.consent_policy_version` |
| First-seen timestamp per user | Done | `public.users.first_seen_at` |
| Consent log (accept/withdraw) | Done | `public.consent_log` table |
| Consent checkbox (teachers) | Done | `src/App.tsx` → consent modal (shown after login if policy version mismatch) |
| Consent notice (students) | Done | `src/App.tsx` → "By joining, you agree to our Privacy Policy" on login form + consent modal on dashboard |
| Non-essential data blocked before consent | Done | Consent modal overlays dashboard; gamification data only collected after login |
| Privacy settings page | Done | `src/App.tsx` → `view === "privacy-settings"` |

## 3. Data Subject Rights

| Requirement | Status | Location |
|-------------|--------|----------|
| View stored data summary | Done | Privacy Settings page → "What Data We Store" section |
| Download all data (JSON export) | Done | `public.export_my_data()` RPC + download button in Privacy Settings |
| Edit display name | Done | Privacy Settings page → name edit inline |
| Delete account (student) | Done | `public.delete_my_account()` RPC → deletes user + progress |
| Delete account (teacher) | Done | `public.delete_my_account()` RPC → deletes user + classes (cascades to assignments) |
| Withdraw consent | Done | Privacy Settings → "Withdraw Consent" button → logs out |
| Link to full privacy policy | Done | Privacy Settings + login page → `/privacy.html` |
| Link to terms of service | Done | Privacy Settings + login page → `/terms.html` |

## 4. Security & Logging

| Requirement | Status | Location |
|-------------|--------|----------|
| Audit log table | Done | `public.audit_log` — records actor, action, data category, target, timestamp |
| Audit log helper in app code | Done (2026-05-04) | `src/utils/audit.ts → logAudit()` — best-effort, never throws |
| Teacher gradebook access logged | Done (2026-05-04) | `useTeacherActions.fetchScores()` calls `logAudit('view_gradebook', 'progress', { metadata: { rows, classes } })` after successful fetch |
| Class deletion logged | Done (2026-05-04) | `useTeacherActions.handleDeleteClass` calls `logAudit('delete_class', 'classes', { metadata: { class_id } })` after successful delete |
| Other admin actions logged | TODO | `delete_assignment`, `award_reward`, `approve_student`, `reject_student`, `remove_student`, `edit_class`, `edit_assignment` — wire incrementally as each surface is touched.  All have AuditAction values pre-defined in `src/utils/audit.ts`. |
| Data export logged | Done | `export_my_data()` RPC inserts audit log entry; `PrivacySettingsView` now calls the RPC (was bypassing it before 2026-05-04) |
| Account deletion logged | Done | `delete_my_account()` RPC inserts audit log entry before deletion; `PrivacySettingsView` now calls the RPC (was bypassing it before 2026-05-04) |
| Audit log retention enforced | Done (2026-05-04) | `cleanup_expired_data()` function exists in `010_privacy_compliance.sql`; `20260605_cleanup_expired_data_cron.sql` schedules it nightly at 03:30 UTC |
| RLS policies on all tables | Done | See `SECURITY.md` for full policy descriptions |
| Role checks enforced | Done | RLS + `is_teacher()` / `is_admin()` helper functions |
| Security headers documented | Done | `SECURITY.md` § Security Headers |
| Rate limiting documented | Done | `SECURITY.md` § Rate Limiting |

## 5. Retention & Cleanup

| Requirement | Status | Location |
|-------------|--------|----------|
| Configurable retention periods | Done | `src/privacy-config.ts` → `RETENTION_PERIODS` |
| Progress records: 365 days default | Done | `RETENTION_PERIODS.progressRecordsDays` |
| Orphaned students: 90 days default | Done | `RETENTION_PERIODS.orphanedStudentDays` |
| Audit log: 2 years default | Done | `RETENTION_PERIODS.auditLogDays` |
| Cleanup RPC function | Done | `public.cleanup_expired_data()` — admin-only |
| Class deletion clears student class_code | Done | `on_class_deleted` trigger sets `class_code = NULL` |
| Backup retention documented | Done | Privacy Settings → "Data in encrypted backups may be retained for up to 30 days" |

## 6. Third Parties & Transfers

| Requirement | Status | Location |
|-------------|--------|----------|
| Third-party registry (JSON-exportable) | Done | `src/privacy-config.ts` → `THIRD_PARTY_REGISTRY` |
| Each party marked processor/controller | Done | `processorOnly` field on each entry |
| Data categories per third party | Done | `dataCategories` field on each entry |
| Hosting region per third party | Done | `hostingRegion` field on each entry |
| Cross-border transfers documented | Done | `HOSTING_REGIONS` in privacy-config.ts, `DATA_FLOW.md` |

## 7. Documentation

| Document | Status | Location |
|----------|--------|----------|
| `DATA_FLOW.md` | Done | Repository root — per-flow data mapping |
| `SECURITY.md` | Done | Repository root — RLS policies, headers, rate limits |
| `PRIVACY_CHECKLIST.md` | Done | This file |
| `src/privacy-config.ts` | Done | Machine-readable privacy configuration |
| `supabase/migrations/010_privacy_compliance.sql` | Done | Database schema for compliance tables |

---

## Maintenance Notes

- **When adding a new external service:** Add it to `THIRD_PARTY_REGISTRY` in `src/privacy-config.ts`
- **When adding a new data collection point:** Add it to `DATA_COLLECTION_POINTS` in `src/privacy-config.ts`
- **When updating the privacy policy:** Bump `PRIVACY_POLICY_VERSION` in `src/privacy-config.ts` — all users will see the consent modal on next login
- **When updating terms:** Bump `TERMS_VERSION` in `src/privacy-config.ts`
- **To run data cleanup:** Call `SELECT public.cleanup_expired_data()` as an admin user, or set up a Supabase cron job
- **Retention periods:** Adjust constants in `RETENTION_PERIODS` — the cleanup RPC accepts custom values too
