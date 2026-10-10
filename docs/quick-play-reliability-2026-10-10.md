# Quick Play reliability update — 2026-10-10

This change set was prepared against main `09013d3`. Publication and production
deployment are separate steps; this document records implementation and local
verification, not a claim that the change is live.

## Changed behavior

- A new player receives a server-generated ID and a private, signed rejoin
  credential. A public ID or a matching nickname cannot claim another player.
  Credentials are scoped to the session, player and verified account, expire
  after 24 hours and are kept in per-tab storage. All player actions require an
  admitted socket before handling or forwarding between servers.
- The leaderboard exposes an explicit allow-list of public fields. It does not
  expose account IDs or rejoin credentials. Rejoin tokens are also redacted by
  the client PII scrubber.
- Concurrent hook consumers share one pending socket connection. Join intent
  survives the join screen unmounting, and pending score updates wait for the
  server's rejoin confirmation. A lost join acknowledgement can be retried on
  the same socket without creating another player.
- The teacher board opens in an all-player grid sized to its available desktop
  area, with scrolling on small screens. The podium view remains available.
  Removal and list identity use player IDs, including when names are equal.
- Assignment loading has a busy state and a retryable visible error. Review
  mode distinguishes a failed load from an empty queue, waits for outstanding
  answer saves before finishing, and clearly reports unconfirmed saves. It
  does not blindly retry the non-idempotent review RPC.
- Production migrations only run from main and share one concurrency lock.
  No database schema changes are included.
- Transitive dependency overrides close the eight production-dependency audit
  findings present at the base commit.

## Verification

- Full TypeScript check passed.
- All 67 Vitest files passed: **617 tests**.
- Real server integration uses an isolated local Supabase/JWKS fixture. It
  checks duplicate names, account privacy, rejoin ownership and score retention,
  12 impersonation attempts, wheel answers, repeated joins, and a wave of 60
  students followed by 60 reconnects without duplicate rows.
- Production build passed. Because the local environment blocks the `tsx` CLI
  IPC socket, the two prebuild generators used `node --import tsx`; Vite then
  ran directly with the same project configuration.
- Entry closure: **75.1 kB gzip**, below the existing 80 kB budget.
- `npm audit --omit=dev`: **0 reported vulnerabilities** on 2026-10-10.
- Targeted ESLint: no errors; existing React-effect/purity warnings remain.
- `git diff --check` passed.

## Rollout and remaining work

Deploy the matching browser and server changes together between classroom
sessions, and refresh older open tabs. Older clients do not adopt a new
server-issued ID; do not start a class with mixed protocol versions. Every
server must use the same `QUICK_PLAY_REJOIN_SECRET`, or the existing shared
`SUPABASE_SERVICE_ROLE_KEY` fallback. Changing that secret invalidates credentials.

The 60-player test is a single-process integration test, not a production load
certification. Shared durable session state, multi-server score persistence,
cross-server kick/end behavior and recovery after a server restart remain
separate work. The pending score queue is in memory and has no durable server
acknowledgement. Losing the browser's credential creates a new player rather
than recovering an old player by name.

Visual browser and Safari verification remain outstanding: the local Chromium
download failed. Review the projector grid at 1024×768 and 1920×1080, mobile RTL,
and a real teacher/student flow before production rollout. The existing GitHub
browser jobs can verify their covered routes but are not a substitute for this
new-grid visual review.
