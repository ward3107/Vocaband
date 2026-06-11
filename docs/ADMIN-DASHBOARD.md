# Admin "Command Center" — Developer Dashboard reference

> The admin-only operations console. Reached at **`?view=developer-dashboard`**
> by a user whose `users.role = 'admin'`. Source: `src/views/DeveloperDashboardView.tsx`
> + `src/views/developer/*`. This doc is the map; the code is the source of truth.

---

## Access & security model (read this first)

Three layers — the **database is the real lock**, the UI is convenience:

1. **Database.** Every admin action is a Postgres function that is
   `SECURITY DEFINER`, pins `search_path`, runs `PERFORM public.assert_admin()`
   as its first statement (raises `42501` unless `auth.uid()` maps to a
   `users` row with `role='admin'`), is **`REVOKE`d from `PUBLIC`/`anon`** and
   granted only to `authenticated`, and writes an `audit_log` row for every
   mutation. A logged-in teacher/student calling one gets denied by the DB.
2. **Server.** `/api/admin/*` endpoints in `server.ts` run `requireAdmin()` and
   log failures to `authz_failures`.
3. **Frontend.** The "Admins only" gate (`hasAdminAccess(user)`) is **cosmetic** —
   bypassing it yields RPC errors, not data.

Other guarantees: admins can't self-promote (`users.role` is pinned against
self-edit), `admin_set_role` refuses to drop the last admin or self-change, and
destructive UI actions route through `ConfirmDialog` (typed-phrase + audited
reason) — covered by `src/__tests__/ConfirmDialog.test.tsx`.

---

## Layout

- **Sticky command bar:** ⌘K (Cmd/Ctrl-K) command palette + a KPI strip.
  KPIs sparkline real series — counts from `admin_stats_series` (daily snapshot),
  AI cost/calls from `ai_usage_counters`. Sparklines appear once ≥2 days accrue.
- **Grouped rail → tabs:**

| Group | Tab | Panel | Backing RPC(s) / source |
|---|---|---|---|
| People & access | User lookup | `DevUserLookupPanel` (+ `PersonDrawer`) | `admin_search_users`, `admin_set_role`, `admin_set_plan`, `admin_export_user_data`, `admin_delete_user_account` |
| | Entitlements | `DevEntitlementsSection` | `admin_list_entitlements`, `admin_add_teacher`, `admin_remove_teacher`, `admin_set_plan`, `admin_set_ai_disabled`, `admin_set_ai_access` |
| | Classes | `DevClassesPanel` | `admin_list_classes`, `admin_class_roster`, `admin_rename_class`, `admin_reset_class_code`, `admin_transfer_class`, `admin_archive_class`/`admin_restore_class`, `admin_delete_class` |
| | Schools | `DevSchoolsPanel` | `admin_list_schools`, `admin_school_detail`, `admin_create_school`, `admin_assign_manager`/`admin_remove_manager`, `admin_delete_school`, bulk-seed |
| Growth | AI & cost | `DevAiCostPanel` | `admin_ai_usage` + `/api/admin/provider-billing` |
| | Trial funnel | `DevTrialFunnelPanel` | `admin_trial_funnel` |
| | Insights | `DevInsightsPanel` | onboarding funnel / top modes / DAU-WAU-MAU RPCs |
| | Broadcast | `DevAnnouncementsPanel` | `admin_*_announcement` |
| Safety & privacy | Privacy requests | `DevDataRequestsPanel` | `admin_search_users`, `admin_export_user_data`, `admin_delete_user_account` |
| | Content review | `DevModerationPanel` | `admin_list_vocab_sets`, `admin_vocab_set_detail`, `admin_delete_vocab_set`, `admin_delete_vocab_word` |
| | Audit log | `DevAuditLogPanel` | `admin_list_audit_log` |
| | Security ops | `DevSecurityChecklistPanel` + `DevAuthzFailuresPanel` | `admin_list_security_checks`, `authz_failures` (RLS) |
| System | DB health | `DevSystemPanel` | `admin_db_health` |
| | Feature flags | `DevFeatureFlagsPanel` | `admin_list_flags`, `admin_upsert_flag`, `admin_delete_flag` |
| | Infra | `DevInfraPanel` | `/api/admin/integrations` |

### Cross-cutting pieces
- **⌘K palette** (`CommandPalette.tsx`) — fuzzy search users/classes/schools + tab nav.
- **Person 360** (`PersonDrawer.tsx`) — one slide-over for a user's role / plan / export / delete.
- **Bulk** — multi-select on Classes (delete) and Entitlements (set-plan / remove).
- **Charts** (`charts.tsx`) — dependency-free SVG `Sparkline` + `MiniBars`.
- **Shared** (`developer/devShared.ts`) — types + `callAdminRpc(Cached)` + 60s RPC cache.

---

## Admin RPC migrations

| File | Adds |
|---|---|
| `20260624…_developer_dashboard_admin_rpcs` | `assert_admin`, overview, entitlements, schools, plans, allowlist |
| `20260626…_developer_dashboard_batch1_rpcs` | user search, audit log, trial funnel, GDPR export/delete |
| `20260628…_admin_set_role` | role change (last-admin + self guards) |
| `20260629…_dashboard_analytics_rpcs` | onboarding / top modes / active users / recent exports |
| `20260711…_admin_ai_kill_switch` | per-teacher `ai_disabled` |
| `20260712…_admin_delete_school_and_manager` | remove manager, safe-delete school |
| `20260716…_admin_school_detail` | per-school roster drill-down |
| `20260717…_admin_class_management` | list / rename / reset-code / transfer / delete class |
| `20260718…_admin_stats_daily` | daily snapshot table + nightly pg_cron + `admin_stats_series` |
| `20260719…_admin_content_moderation` | vocabulary review + remove (sets / words) |
| `20260720…_admin_class_roster_and_archive` | per-class roster + `archived_at` + archive/restore |

> **Deploy:** migrations auto-apply to the `vocaband-eu` project via the
> `.github/workflows/supabase-migrations.yml` pipeline on merge to `main`.
> After a new admin migration lands, re-run `scripts/security-pen-test.sh`.

---

## Known follow-ups (intentionally deferred)
- Archive currently flags a class admin-side; **hiding archived classes from
  their teacher** needs a careful live-read change (not yet done).
- Content moderation is **delete-only**; flag-and-hide + worksheet coverage are open.
- Dashboard is **English-only** (admin-only surface).
- Test coverage so far is the `ConfirmDialog` guard; panel/RPC integration tests are open.
