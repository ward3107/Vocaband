# Load-test report — 2026-05-21

## Environment

- **Target:** `https://vocaband-staging-honeyed-brook-4330.fly.dev` (staging Fly app, dedicated for this test; bypasses Cloudflare's per-IP DDoS guard that blocks load-driver IPs against prod)
- **Driver:** operator laptop, Windows + PowerShell + `npx tsx scripts/loadtest-socket.ts`
- **Fly app:** 2 × `shared-cpu-1x:512MB` machines in `fra`, `auto_stop_machines = 'stop'`, `hard_limit = 2000` per machine, `min_machines_running = 1`
- **Redis adapter:** misconfigured (placeholder URL) — staging ran in effective single-VM-per-machine mode. Doesn't affect connection-layer measurements, but flagged in follow-ups.
- **Started by:** operator
- **JWT verification:** remote `supabaseAdmin.auth.getUser()` per connection (the legacy path — this PR replaces it).

## Round summary

| Round | Sockets | Success | p50 | p95 | p99 | Max | Peak concurrent | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | 100 | 100.0 % | 819 ms | 1009 ms | 1096 ms | 1096 ms | 100 | ✅ PASS — all criteria met |
| 2 | 500 | 100.0 % | 2061 ms | 2476 ms | 2514 ms | 2806 ms | 500 | ⚠️ FAIL on p95 (>1500 ms), but no rejections |
| 3 | 1000 | 100.0 % | 2176 ms | 2801 ms | 3138 ms | 3168 ms | 1000 | ⚠️ FAIL on p95, latency plateauing |
| 4 | 2500 | 100.0 % | 3741 ms | 16367 ms | 17499 ms | 17813 ms | 2500 | ❌ FAIL — latency cliff, UX unusable |
| 5 | 5000 | **65.7 %** | 1962 ms | 5375 ms | 8922 ms | 15893 ms | **3286** | ❌ FAIL — 1714 sockets rejected (`websocket error`) at the per-machine concurrency ceiling |

## Ceiling

**Published ceiling: 1000 concurrent sockets** on the tested 2-machine config (3 s p95 connect time, 100 % success).

Hard refusal point: **~3286 concurrent** — the practical limit of `hard_limit = 2000` × 2 machines (theoretical 4000, less the staggered ramp losses). Beyond that, new sockets get rejected by Fly's edge with `websocket error` rather than queueing.

Realistic capacity for the "8 schools × 600 students = 4800 concurrent" sales claim on this config:
- 1-2 schools (≤1000): ✅ comfortable
- 3-4 schools (≤2000): ⚠️ works but 5-10 s connect time for tail users
- 5+ schools (≥3000): 🚧 some students never connect, others wait 10-30 s

## Root-cause analysis

Two stacked bottlenecks:

1. **Auth pipeline (responsible for the 1000 → 2500 latency cliff).** Every socket connection triggered `supabaseAdmin.auth.getUser(token)` — a ~300 ms HTTP round-trip from Fly fra to Supabase Auth eu-frankfurt. At ≤1000 concurrent these run in parallel and latency stays bounded by Supabase's queue depth. Beyond ~1000, Supabase starts serializing them and the latency curve breaks (p95 jumped from 2.8 s → 16 s between rounds 3 and 4 with only a 2.5× load increase).
2. **Per-machine concurrency limit (responsible for the 5000-round rejections).** `fly.toml`'s `hard_limit = 2000` × 2 machines puts a hard ceiling around 3286 successful sockets. Reached cleanly in round 5 — Fly correctly refused excess connections rather than crashing.

The auth pipeline is the higher-impact issue: fixing it makes the platform fast at the loads it already accepts, without changing the machine count.

## Follow-ups

### Shipping with this report (PR #TBD)

- **Local JWT signature verification** in `server.ts` — adds an optional `SUPABASE_JWT_SECRET` env var that, when set, replaces the remote `auth.getUser()` round-trip with a sub-millisecond local signature check. Expected effect: removes the 1000 → 2500 latency cliff entirely, drops p95 connect time at all load levels back to <100 ms + RTT. Operator action: set `SUPABASE_JWT_SECRET` on prod via Supabase dashboard → Settings → API → JWT Secret. Once set, re-run rounds 4 and 5 to confirm the flattened curve.
- **Documentation:** `fly.toml` now lists `SUPABASE_JWT_SECRET` as an optional-but-high-leverage secret. Comment explains the trade-off so future operators don't have to re-derive it.

### Deferred to follow-up tickets

- **Scale to 3-4 machines** (`fly scale count 4`) for the per-machine ceiling. Cheap on Fly's Hobby plan (auto-stop drops idle cost). Should happen *after* the JWT fix is verified, so the next load test measures real capacity rather than the auth bottleneck.
- **Verify multi-VM Redis fan-out.** Staging's `REDIS_URL` was misconfigured during this run, so the test exercised single-VM-per-machine behaviour. Set a real `rediss://` URL on staging, re-run round 5 with `fly scale count 3`, watch for `[redis-adapter] attached` + `pub/sub smoke test passed` in logs.
- **Supabase connection pooling.** Once auth and concurrency are unblocked, the next bottleneck will be Supabase's connection pool (REST + Postgres). Enable Transaction-mode pooling in Supabase dashboard before the load test ramp hits 5000 again.
- **Full game-loop coverage.** This harness only measures the connection layer — no `JOIN_CHALLENGE`/`SUBMIT_ANSWER` events. Connection ceiling is the primary unknown per `docs/qa-framework/05-LIVE-CHALLENGE.md`, but a follow-on harness should drive real game events at ≥1000 concurrent to surface per-event throughput limits.
- **Update load-test-runbook.md** to add three operational footguns observed this session:
  1. Never use `fly deploy --strategy immediate` on first-time-app creation — Fly's services config gets seeded with `internal_port = 3000` (its default) and won't be overwritten by subsequent deploys. Symptom: `servicecheck-00-http-3000` failing forever on a machine that's actually listening on a different port.
  2. After staging is provisioned, verify each secret has a real value (not a placeholder) by checking startup logs for the boot warnings — placeholder strings in secrets cause silent JWT rejects (Invalid token loops) and CSP regressions.
  3. The JWT TTL is 1 h. For multi-round tests, re-capture the token before the round that's likely to cross the boundary, not after seeing it fail.

## Operational notes captured during this session

- Staging hostname: `vocaband-staging-honeyed-brook-4330.fly.dev`
- Teardown when finished: `fly scale count 0 --app vocaband-staging-honeyed-brook-4330` (or `fly apps destroy ... --yes` to remove entirely)
- The Cloudflare-bypass approach (load-test against `*.fly.dev` directly) works cleanly — CF's WAF was the original blocker against load-testing prod, and a dedicated staging app is the right long-term answer

## Round logs

Per-round outputs captured to `C:\Users\Waseem\Desktop\loadtest-staging-{100,500,1000,2500,5000}.log` on the operator's laptop. Not committed (sensitive token in env state). Summarised above.
