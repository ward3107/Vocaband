# Quick Play shared state — phase 2, 2026-10-10

Follow-up: [phase 3 round recovery and background finalization](quick-play-round-recovery-2026-10-10.md)
supersedes this historical report's active-round and finalization limitations.

Phase 1 shipped in PR #1411 (`e52c461`). This follow-up replaces the remaining
per-process scoreboard authority with a Redis-backed session store. No database
migration or new secret is required.

## Behavior

- Atomic Lua operations keep the roster, cumulative scores, owner socket,
  revocations, team assignments, closure and award deduplication together.
  Keys share a Redis Cluster hash tag. Records expire after 24 idle hours.
  Configured Redis failure fails closed; RAM is only used without REDIS_URL.
- Client-reported progress and server-issued awards are separate components.
  A teacher bonus or a Speed/Race/Arena award cannot swallow the next regular
  score increment. Duplicate regular totals and award request IDs are safe.
- Every scoreboard snapshot is complete and revision-ordered. The browser
  ignores older snapshots and cannot revive a kicked row from another VM.
  Account IDs, owner socket IDs and reported-score internals stay private.
- The per-tab score outbox persists the latest cumulative target until ACK,
  including refresh and lost-ACK replay. Catch-up is chunked into bounded
  increments. A confirmed join seeds the next game's cumulative baseline;
  switching player or room does not inherit the preceding player's score.
- Kick revocation is shared and reaches the student's socket on another VM.
  END freezes all results before persistence and clears every VM's round
  timers. Failures keep the teacher's Close Session action retryable. Retrying
  from either VM saves the same frozen snapshot without increasing play_count.
- Finalization uses the existing progress uniqueness constraint and guest
  trigger from the committed migrations. As with the existing schema, stored
  gradebook scores are capped at 1000. Multiple tabs for one authenticated
  account produce its highest score, with one progress row per session.
- The teacher navigates away only after the server confirms final persistence
  and the inactive session row. New failure/saving text supports EN/HE/AR.
- Full npm audit, including development/build dependencies: zero findings at
  the time of verification. CI now typechecks server.ts and supplies Redis for
  the two-server regression suite.

## Verification

Full TypeScript and CI checks passed; all **639 tests in 70 files** passed.
Production build passed, with **75.1 kB gzip** entry closure (80 kB budget).

Local tests run isolated Express/Socket.IO servers against local Supabase/JWKS
fixtures and Redis 7.4.2, never production student data. The two-server suite
covers cross-server reconnect, lost-ACK replay, teacher bonus deduplication,
server-scored Speed Round, remote kick, failing END with successful retry,
and restart of both application servers while preserving scores and teams.
Store tests cover atomic capacity, balance, ownership, revocation and closure.
Outbox tests cover refresh, chunking, stale ACKs, retry, player changes and expiry.

The browser job mounts the real board component/styles with 60 duplicate-name
players at 1024×768, 1920×1080, Android and WebKit mobile sizes in Hebrew and
Arabic. It checks overflow and actions by player ID and retains screenshots.
This is component/browser-engine coverage, not a physical iPhone/projector test
or a live classroom load certification.

## Remaining boundaries

- Scores, teams and revocations survive application-server restarts. Active
  Race/Speed/Arena question state, countdowns, positions and power-ups still
  belong to the round-owner process. Restarting that process requires the
  teacher to start a new round; it does not erase already committed totals.
- Redis's own persistence, backup and availability are infrastructure concerns.
  This change does not claim recovery after loss/expiry of Redis data.
- A failed finalization is retryable while the frozen snapshot remains (24h).
  There is no background finalization worker if the teacher closes the tab.
- Clearing/denying sessionStorage removes refresh durability. Memory remains
  available while the tab lives; lost private identity cannot be reclaimed by name.
- The new store cannot retroactively recover old RAM-only server awards. Deploy
  between classes and refresh older tabs before starting the next session.
- Production database writes are not exercised by the local fixture tests.
  A real teacher/student session and physical Safari/projector review remain
  the final operational acceptance checks.
