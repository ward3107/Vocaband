# Staging connection and Live Challenge observations — 2026-09-15

These are small protocol probes, not a 10,000-student capacity certification.
Target: `vocaband-staging-honeyed-brook-4330.fly.dev`, using the confirmed
isolated test Supabase. No production load was generated.

## Environment limitations

The driver's default WebSocket path failed. Explicitly using the environment's
HTTPS proxy agent succeeded; the user's Windows native WebSocket handshake also
succeeded. This isolates the original immediate failure to the driver setup.
It does not establish why transport establishment through the proxy is slow.
The deployed backend SHA is unknown; the supplied Fly screenshot showed release
v22. No V2 leaderboard events were observed in the functional probe, so cross-VM
leaderboard behavior and correspondence to current main remain unverified.

## Connection probe

Ten independent authenticated sockets used one synthetic teacher identity.
All ten remained connected throughout a shared 60-second hold, with zero
rejections or unexpected disconnects. Connect p50 was 9,296.7 ms and p95
9,392.4 ms. The 1,500 ms latency gate failed and was not relaxed.
Driver event-loop p99 was 23.9 ms; RSS was 67,051,520 bytes.
This is idle connection stability, not ten distinct students or gameplay.

## Small Live Challenge probe

Two synthetic teachers connected and requested observation of their respective
test classes. One roster student joined class A. Teacher A received the student's
entry and score 10. The score observation took approximately 1,711 ms end to end
through the proxy. Teacher B received no class A entry, but also no positive
class B event: treat that as limited negative evidence, not a complete isolation
test. Earlier database RLS checks are separate evidence.

Initial transport setup took 9,752–9,769 ms. Full authenticated connection took
10,088–10,099 ms. Approximately 327–336 ms followed transport opening, including
network time. Authentication alone therefore does not explain the ten seconds.

After a deliberate disconnect and a fresh authenticated connection, the student
could rejoin but the returned `currentGameScore` was 0 rather than 10. This probe
did not save a completed assignment, so it does not demonstrate loss of persisted
progress or XP. It also did not execute the React UI.

A follow-up reproduced the consequence: updates to 10 and then 20 were observed;
after disconnect/rejoin the score was 0; sending the next total of 30 produced no
score-30 broadcast within four seconds, and the last observed score stayed 0.

## Code findings and repair requirements

The inspected `server.ts` removes the last socket's live entry on disconnect and
initializes currentGameScore to zero on every join. Updates may increase by at
most ten points. The client rejoins automatically; its normal score emitter sends
the current total, so totals above ten after a reset can be rejected. No explicit
score restore on reconnect was found in the inspected client paths.

A server repair needs authoritative game-score continuity across disconnects and
machine changes, a bounded retention lifetime, explicit new-round reset semantics,
and tests ensuring scores cannot be forged or leaked between classes. Retaining
only a process-local entry would not cover machine changes. Removing score
validation or trusting arbitrary client totals is not an acceptable repair.
`server.ts` is explicitly protected by CLAUDE.md and requires file-specific owner
approval before edits; it has not been changed in this work.

Before increasing load: resolve reconnect correctness, identify/deploy the tested
backend revision, verify observers and students on distinct machines, and run
actual browser gameplay and shaped-network recovery. Large-load budget review
remains pending.
