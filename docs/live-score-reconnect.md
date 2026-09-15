# Live Challenge reconnect score continuity

## Problem and behavior

The staging protocol probe reproduced 20 points before disconnect, zero on rejoin,
and rejection of the next total (30). Connected-player presence was also the only
place the server kept the live score. Removing the last socket erased it.

`liveScoreStore` separates the accepted score from presence. With REDIS_URL set,
all instances read and atomically validate the same score; single-instance local
development uses bounded memory. Join restores the score, and duplicate totals
are idempotent. Class, authenticated uid and persisted progress baseline namespace
the record. The existing ten-point increment and 10,000-point maximum remain.
No payload can select another user's score: server session checks still precede
updates. Configured shared-store failures reject joins/updates rather than
silently creating divergent local scores.

## Boundaries

- Retention is 15 minutes since the last successful join or accepted score update.
  It is not indefinite offline support. Expired updates require a fresh join.
- A changed persisted progress baseline starts a fresh score namespace on join.
  This does not introduce a full round identifier or explicit teacher reset API.
  Starting another unsaved round with the same baseline inside the retention
  window resumes the prior total. Explicit round lifecycle needs separate work.
- This preserves scores already accepted by the server, not answers generated
  while offline or skipped by client throttling.
- Presence remains per machine and broadcasts through the existing adapter.
  This is not a redesign of the leaderboard protocol or Quick Play.
- Redis is used for every accepted score attempt and join, with automatic expiry.
  That additional traffic must be included in the large-run cost measurements.
- Staging returned PGRST123 (aggregates disabled). The server now falls back to
  ordered, paginated score reads and remembers that aggregates are disabled.
  Other query failures reject joining instead of silently assuming zero. The
  fallback's read cost must be measured before large-scale rollout.

## Verification

All 561 Vitest tests passed, including five new continuity/isolation/validation/
expiry/outage cases. TypeScript passed. An additional integration test against a
local Redis 7.2.7 instance passed using two independent clients: reconnect on a
second instance, duplicate concurrent totals, invalid jumps/regressions, TTL and
completed-progress namespace reset.

Run the integration check with a local Redis listening on port 6389:

```sh
node --import tsx --test scripts/loadtest/live-score-redis.test.ts
```

LOCAL_TEST_REDIS_URL may override the local port; non-loopback hosts are rejected.
Tests delete only their randomly named keys. The changed backend has not yet been
deployed to staging or production. Full browser recovery, multiple Fly machines,
and 10,000 active students remain unverified.
