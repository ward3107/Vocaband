# Vocaband capacity verification

## Current evidence (2026-09-15)

Capacity for 10,000 **active students plus teachers is unverified**.
`fly.toml` comments claim a historical 10k connection validation, but the committed
May 21 report contains only runs up to 5,000, with failures. It used an older
configuration and cannot establish today's capacity. Obtain the later raw report
before treating those comments as evidence. Do not equate configured connection
limits, one shared JWT, or idle sockets with distinct active students.

Live tests against the isolated test Supabase verified two teachers can create
classes, cannot read/update each other's classes, and two roster students can
sign in and only read their own class (not another class or its roster).
These are authorization checks, not capacity results.

## Connection harness

`node --import tsx scripts/loadtest-socket.ts` now measures a shared hold window
**after every connection attempt settles**, records premature disconnects,
and exits 1 on failed criteria (2 for configuration errors). It emits JSON,
including actual peak/minimum held concurrency and load-driver event-loop delay.
It does not invent RTT from a fire-and-forget event. There is no application RTT
measurement until a real application response is observed.

Use a fresh synthetic staging JWT via environment injection; never commit tokens
or paste them into reports. The harness does not renew expired credentials.
The target is required; production vocaband.com origins are rejected. Review DNS
and routing too: a different hostname can still point to production.

```sh
# Export TEST_JWT securely in the driver environment first.
TARGET=https://YOUR-ISOLATED-STAGING-HOST \
STAGING_ORIGIN=https://YOUR-ISOLATED-STAGING-HOST \
CONNECTIONS=10 HOLD_SECONDS=60 \
node --import tsx scripts/loadtest-socket.ts > /tmp/connections-10.json

# Offline harness verification (local Socket.IO fixtures, no Supabase):
node --test scripts/loadtest/connections.test.mjs
```

Defaults: 10 sockets, batch 10 every 250ms, 15s connect timeout, 60s shared hold.
Controls: CONNECTIONS (1–10000), HOLD_SECONDS (1–3600), RAMP_BATCH (1–100),
RAMP_BATCH_DELAY_MS, CONNECT_TIMEOUT_MS, MAX_P95_MS (default 1500).
Pass: >=99% connected AND >=99% held concurrently, p95 below threshold,
zero unexpected disconnects. These are proposed connection gates, not an SLA.
A saturated driver invalidates server-capacity conclusions even if a round fails.

## Environment required before large runs

- Dedicated frontend/Worker and Fly game backend, both using the confirmed test
  Supabase. Verify JWT issuer and project routing before creating fixtures.
- Match production machine size/count, region, Redis, auth, RLS, limits and build
  SHA. Record actual deployed settings; repository configuration is insufficient.
- Verify Redis adapter health and cross-machine gameplay. The adapter forwards
  broadcasts; application game state and game commands need separate verification.
- Distinct synthetic users and class memberships; no repeated JWT as a substitute
  for student identities in gameplay tests. Provision via supported teacher/roster
  paths, before the measured phase. Use the actual login flow for login-burst tests.
- Observe CPU/RSS/event-loop lag, sockets per VM, restarts, Redis errors/traffic,
  Supabase Auth/API latency, database load/locks and application errors.
- Confirm an isolated staging origin and resource budget before a 10k run. Do not
  reuse the historical Fly staging hostname without verifying ownership/config.

## Workload model to implement and execute

Baseline assumption: **10,000 students + 400 teachers, 25 students per class**.
Change class sizes and activity mix to reflect the intended rollout.
400 observing teachers means at least 10,400 game sockets in an all-live scenario,
plus API/health traffic and headroom. Two configured hard limits of 5,000 are not
proof of sufficient capacity. Run distinct scenarios, then a mixed workload:

| Scenario | Real flow | Required assertions |
|---|---|---|
| Login burst | Roster login, class and assignment fetch | Successful sessions, correct roles/classes, latency and rate-limit outcomes |
| Dashboard | Students fetch assignments, teachers fetch class progress | Correct nonempty fixtures, no cross-class rows, bounded query load |
| Live Challenge | Teacher observes; distinct students join and increment score | Teacher receives each expected score; no missing or cross-class entries |
| Quick Play | Create, join, start, answer, kick and end | Exercise each game protocol separately; verify cross-VM commands |
| Progress | Finish assigned work and read results back | Exact per-user persistence; retry doesn't duplicate rewards/results |
| Recovery | Drop/reconnect a school-sized cohort | Rejoin correct room, no ghost players, scores retained |
| Soak | Repeat representative flows for >=60min | No growing memory/queue/backlog; token renewal works |

Do not treat demo mode as authenticated gameplay. Do not send made-up
SUBMIT_ANSWER events: Live Challenge uses join_challenge/update_score; Quick Play
has its own event contracts. Build assertions against actual protocol responses.

Stages: 100, 500, 1,000, 3,000, 5,000, 10,000 students, plus proportional teachers.
At each stage collect a steady window and a separate burst. Stop on sustained
errors, unhealthy servers, lost writes or exhausted budget. Recover baseline
before the next stage. Partition distinct fixtures across multiple load drivers;
aggregate timestamps/counts, not averages of per-driver percentiles. The current
connection harness is per-driver, not a distributed orchestrator.

## Weak classroom network

Existing `e2e/tests/slow-network.spec.ts` covers Chromium landing only at ~400kbps
and 400ms latency. It does not establish authenticated game reliability.

Next browser scenarios: teacher start and student join/answer/save under 400kbps,
400ms latency; a 10s offline period; recovery; repeat save. Assert UI feedback,
continued usability, authoritative score/result and absence of duplicate writes.
Use network shaping on the isolated test path for packet loss and WebSocket
latency; do not describe sleeps in a load generator as bandwidth emulation.
Validate on actual Safari/mobile too. Separately test one school's shared public
IP because classroom NAT can trigger per-IP limits; don't bypass those limits.

## Budget and report

No current account plan, deployed machine inventory, quota or approved paid driver
is available. Therefore there is **no reliable currency estimate yet**. Record:
VM count × active test hours × current rate; driver hours; Redis commands/bytes;
Supabase compute/Auth/API/egress; frontend/CDN traffic. Price from current account
billing and official calculators before execution; do not reuse old price comments.

Every report must include SHA, topology, test project, workload/identities, ramp
and shared hold windows, attempts/successes, active concurrency, p50/p95/p99,
errors/disconnects, correctness assertions, driver health, server metrics and
cost. Publish a supported capacity only for a workload that passed all gates.

References: [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/),
[Socket.IO memory measurement](https://socket.io/docs/v4/memory-usage/).
