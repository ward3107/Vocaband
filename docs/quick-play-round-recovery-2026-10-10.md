# Quick Play recovery — phase 3, 2026-10-10

Follows PR #1412. Active rounds and result finalization no longer depend on the
application process that received the teacher's request. No schema migration,
dependency update or new secret is required.

## Active rounds

Category Race, Speed Round and Word Hunt Arena load their authoritative state
from Redis for each transition. A compare-and-swap revision commits the round
state, answer receipt and score awards in one Lua operation. Concurrent servers
retry against the winning revision. Browsers receive successful game events
only after the commit. Old socket owners and closed sessions cannot commit.

Question IDs, original deadlines, submitted answers, first-correct winner,
arena word locks, pickup state, double-points flags, rough mode and cooldowns
survive application-server loss. Private answer indexes stay server-side;
rejoining students receive only the public board and their own question/result.
An explicit teacher end is persisted and rejects later answers even before the
original timer expires. A teacher can control the round from any server.

Absolute deadlines replace host-local timers. Every server with room members
can advance an expired round, release a word or respawn a pickup. Revision
checks prevent two workers committing the same transition. A small metadata
query checks whether a deadline is due, avoiding repeated downloads of the full
arena while idle. Movement writes use a separate shared hash and are coalesced
for broadcast; frequent movement cannot invalidate answer transactions.

## Final results

An authorized END request first records a durable finalization intent, including
the verified teacher and database session ID. Workers then freeze scores and
persist the existing idempotent progress rows and inactive session record.
The caller receives success only after database persistence finishes.

Redis retains pending jobs without expiration. Once frozen, score keys are
pinned until successful persistence, then return to the normal 24-hour TTL.
Workers poll independently of browser connections, claim jobs for 30 seconds,
and back off from 2 to 60 seconds on failures. A process killed while holding a
claim can be replaced after that claim expires. Database requests are bounded
by timeouts. Repeating a write after a lost reply does not increment play_count.
The existing Fly configuration keeps two application machines running.

## Verification

- Full local suite: **653 tests in 70 files** passed with Redis 7.4.2.
- Full TypeScript and the CI ratchet passed with zero errors. The production
  build passed; entry closure remains **75.1 kB gzip** within the 80 kB budget.
- Two real Express/Socket.IO processes and a local Supabase/JWKS fixture test
  SIGKILL of one and both processes, recovery of all three game modes, preserved
  winner and answer receipts, exclusive cross-server word grabs, and deadline
  completion without the teacher browser.
- A database outage followed by teacher disconnect and both-server SIGKILL
  verifies automatic finalization after restart, one progress row, one play,
  and release of the retention pin after success.
- Sixty simultaneous students across two servers receive scored answers with
  exactly one first-correct winner and totals matching Redis.
- Store tests verify atomic competing commits, no partial award batch,
  revoked socket rejection, closure fencing and independent movement.
- CI's production auth/header probe now targets the canonical apex host;
  the www redirect previously produced six false failures. The CSP probe
  also requires a script-src directive, rather than passing an absent header.
  The canonical-host run passed **11 HTTP auth/header checks**. The script's
  14 database probes remain skipped with the configured publishable key;
  authenticated RLS/isolation checks still require dedicated test accounts.

The fixtures use no production credentials or student data. A cold-start timing
test initially exceeded its test timeout under concurrent compilation; isolated
and full-suite reruns passed after allowing startup headroom.

## Operational boundaries

- Redis remains the durability dependency. This does not recover a destroyed
  or expired Redis dataset. Active sessions retain the existing 24-hour TTL;
  before the first worker freezes an accepted END intent, that TTL still applies.
- Only committed actions are recoverable. Socket delivery itself is not
  exactly-once; reconnect resends current state and committed answer receipts.
  Time spent disconnected does not extend the original question deadline.
- Browser-only effects such as animation and temporary movement boosts are not
  restored. Authoritative scores and the next-answer multiplier are restored.
- Rounds started by the previous release existed only in RAM. Roll out between
  classes and start a new session after deployment; recovery applies to rounds
  started on this release.
- Physical iPhone, school Wi-Fi and projector acceptance in a real classroom,
  including a real production gradebook write, remains an operator check.

Implementation references: [Redis atomic scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/)
and [Supabase upsert](https://supabase.com/docs/reference/javascript/upsert).
