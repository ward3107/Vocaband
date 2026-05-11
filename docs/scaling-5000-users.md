# Scaling Vocaband to 5000 students + 100 teachers

> Live status doc. Update as items move. Keep it lean.
> Last updated: 2026-05-11.

---

## Tier 1 — Compute (Fly.io)

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 1.1 | Multi-VM socket.io (`@socket.io/redis-adapter`) | ✅ Done 2026-05-11 | – | Tested live, 2 ms latency to Upstash |
| 1.2 | Node 22 base image | ✅ Done 2026-05-11 | – | Fixes Supabase realtime-js ws requirement |
| 1.3 | `fly.toml` concurrency tuned (1000/2000) | ✅ Done 2026-05-11 (PR #549) | – | Merged to main |
| 1.4 | `fly scale count 3 -a vocaband` | ⏸ Pending | Operator | Run after pulling PR #549 |
| 1.5 | Multi-VM smoke test (Live Challenge across 2 VMs) | ⏸ Pending | Operator | Open teacher + student in 2 browsers |
| 1.6 | VM size bump to `performance-1x`/2 GB | 🔵 Optional | Operator | Defer until load test shows it's needed |

## Tier 2 — Database (Supabase)

> **Supabase tier: Pro** (confirmed 2026-05-11).
> **Audit run: 2026-05-11** via `get_advisors`.

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 2.1 | Connection pooling | ✅ N/A — server uses `supabase-js` → PostgREST, which pools internally. No direct pg connections from Fly. |
| 2.2 | Quick Play subject migration applied | ✅ Done 2026-05-11 | – | `20260510120000_quick_play_subject.sql` |
| 2.3 | RLS `auth.uid()` re-eval | ✅ Done 2026-05-11 | – | Migration `20260511160000_rls_initplan_optimization.sql`. 0 remaining init-plan lints. |
| 2.4 | Duplicate permissive policies | ✅ Done 2026-05-11 | – | Migration `20260511170000_consolidate_permissive_policies.sql`. 0 remaining duplicate combos. classes/teacher_rewards consolidated into single OR'd policies; student_profiles INSERT/SELECT/UPDATE combined with semantically-identical WITH CHECK. |
| 2.5 | Unindexed FKs on `student_profiles` | ✅ Done 2026-05-11 | – | `idx_student_profiles_approved_by`, `idx_student_profiles_auth_uid` added in same migration. |
| 2.6 | No PK on `class_lookup_rate` | 🔵 Optional | – | Replication-unfriendly. Low impact at our scale. |
| 2.7 | Unused indexes — audit + selective drop | ✅ Done 2026-05-11 | – | Migration `20260511180000_drop_redundant_indexes.sql`. Dropped 3 truly redundant indexes (`idx_word_corrections_word_id`, `idx_audit_log_actor`, `idx_quick_play_allowed_modes`). Kept 19+ flagged ones: PK/UNIQUE constraints, FK-covering indexes, and indexes for recently-shipped features. See migration comment for rationale. |
| 2.8 | Security WARNs (144 lints) | 🔵 Tracked | – | Mostly `function_search_path_mutable` + `auth_leaked_password_protection` toggle. Defer — not scaling-related. |
| 2.9 | Backup / restore drill | ⏸ Pending | Operator | Verify nightly backup exists, do one test restore |

### Affected tables (RLS optimization)
`assignments`, `audit_log`, `bagrut_responses`, `bagrut_tests`, `classes`, `consent_log`, `daily_missions`, `quick_play_joins`, `quick_play_ratings`, `quick_play_sessions`, `review_schedule`, `student_profiles`, `teacher_rewards`, `users`, `word_attempts`, `word_corrections`

### Duplicate policy combos
- `classes` (SELECT for authenticated): "Teachers can view own classes" + `classes_select`
- `progress` (SELECT for authenticated): `progress_select` + `quick_play_progress_select`
- `student_profiles` (INSERT/SELECT/UPDATE for public): 2 each
- `teacher_rewards` (SELECT for public): 2 policies

## Tier 3 — Storage & egress

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 3.1 | Audio MP3s on Cloudflare R2 + CDN | ⏸ Pending | – | Currently served from Supabase Storage. Setup doc: `docs/CLOUDFLARE_R2_SETUP.md` |
| 3.2 | Image assets WebP/AVIF | ❓ To audit | – | Avatars + badges — check current formats |
| 3.3 | Vocabulary chunk lazy-loaded | ✅ Done 2026-04-28 | – | See `docs/perf-audit-2026-04-28.md` |

## Tier 4 — External APIs (cost risk)

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 4.1 | Gemini spending cap (Google Cloud Console) | ⏸ Pending | Operator | Set hard monthly limit |
| 4.2 | Anthropic spending cap | ⏸ Pending | Operator | Same — set max_tokens or monthly cap |
| 4.3 | OCR result caching (avoid duplicate calls) | ❓ To audit | – | Check `useOcrUpload.ts` cache hit rate |
| 4.4 | Upstash Redis paid tier | ⏸ Pending | Operator | Free = 10k commands/day. Bump to paid (~$10/mo) when running regular Live Challenges |

## Tier 5 — Observability

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 5.1 | Sentry (error monitoring) | ⏸ Pending | – | Install + wire up DSN |
| 5.2 | UptimeRobot ping on `/api/health` | ⏸ Pending | Operator | Free tier, 5 min interval |
| 5.3 | Supabase advisors weekly check | ⏸ Pending | – | Add to ops rhythm |
| 5.4 | Fly metrics dashboard | 🔵 Optional | – | `fly dashboard metrics` |

## Tier 6 — Load testing

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 6.1 | Staging Fly app | ⏸ Pending | Operator | k6 against prod trips Cloudflare WAF — see `scripts/loadtest/README.md` |
| 6.2 | Staging Supabase project | ⏸ Pending | Operator | Separate from prod, no real student data |
| 6.3 | Run k6 smoke scenario | ⏸ Pending | – | `scripts/loadtest/smoke.js` |
| 6.4 | Run k6 sustained scenario | ⏸ Pending | – | `scripts/loadtest/sustained.js` |
| 6.5 | Run k6 spike scenario | ⏸ Pending | – | `scripts/loadtest/spike.js` |
| 6.6 | Run k6 socket scenario | ⏸ Pending | – | `scripts/loadtest/socket.js` |

---

## Legend
- ✅ Done
- ❓ To verify / audit
- ⏸ Pending action
- 🔵 Optional / defer
