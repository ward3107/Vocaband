# Word Hunt Arena (Phase 2) — Design Report

> Status: **approved — building 2a+2b**. Companion to `docs/speed-round-design.md`
> (Game A, shipped) and mockup `docs/mockups/10-word-hunt-arena-phase2.svg`.

---

## 1. What it is

A real-time multiplayer movement game on the existing `/quick-play` socket
namespace. Students steer avatars around a shared 2D map; word tokens float on
it; **running into a word auto-grabs it** and pops the **existing Speed Round
buzzer** for that word; correct + fast = points on the same leaderboard/podium.
Everyone sees everyone move live; the teacher's big screen shows the whole arena.

## 2. Decisions (locked with owner)

| Decision | Choice | Rationale |
|---|---|---|
| Rendering | **DOM + CSS transforms** (no PixiJS/Phaser) | ~38 nodes max; stays in React/Tailwind/motion stack; GPU-composited `translate3d`; cheapest on low-end school Android. (Overrides the mockup's earlier PixiJS note.) |
| Position authority | **Client-authoritative**, sent at a fixed tick | Position cheating is low-harm — you still must answer correctly to score. |
| Grab authority | **Server-authoritative referee** | First grab to reach the owning VM locks the word synchronously (single-threaded event loop ⇒ no double-grab race). Range-checked against the server's last-known position. |
| Question bridge | **Host pre-authors ALL word questions at arena start** (`buildSpeedQuestion` in a loop) | Server grants grabs instantly from memory; no host round-trip in the latency-critical grab moment; reuses Game A's authoring + index-scoring unchanged. |
| Load profile | **Balanced + safety caps** | 10 ticks/sec, room-batched snapshots, 30-player cap, idle skip, per-socket move limiter. |
| Grab feel | **Auto-grab on contact** | Most "chase" energy; debounced client-side, cooldown server-side. |

## 3. Network design (the load-critical part)

- Clients send `ARENA_MOVE` (x,y) at **10/sec**, skipping ticks while idle.
- The server **never broadcasts per-move**. A per-session `setInterval` tick
  (10/sec, `QP_ARENA_TICK_MS`) emits **one** `ARENA_SNAPSHOT` to the room with
  index-aligned compact arrays (slot ids + rounded int coords).
- Numbers (30 students, single VM): ~300 small inbound msgs/sec; snapshots
  ≈150 bytes × 10/sec × 30 recipients ≈ **45 KB/sec egress** — trivial against
  the load-tested 1,000-socket ceiling (`docs/load-test-report-2026-05-21.md`).
- Caps: `QP_ARENA_MAX_PLAYERS = 30`, visible words ≈ 8, move limiter 15/sec/socket,
  grab cooldown 1.5s.
- Client render: snapshots land in a **ref** (never per-tick React state); a
  single `requestAnimationFrame` loop eases each avatar toward its target
  (`current += (target−current)·k`) for 60fps motion from 10/sec data. The local
  avatar moves instantly from input (client prediction). RAF + sends pause while
  the buzzer modal is open or the tab is hidden (battery).
- ⚠️ **Operator note:** many *simultaneous* arenas multiply Redis adapter relay
  traffic across VMs; a single class is nowhere near limits, but monitor the
  Redis free tier if arenas become popular. Don't raise the tick above 10/sec
  without re-running the load harness.

## 4. Server model (protected `server.ts`, additive)

`QpSessionState.currentArena`: config + `words: Map<wordId, token>` (each token
holds label, prompt, options, **private correctIndex**, pos,
state `available|locked|answered`, lockedBy, and — when locked — an embedded
Speed-Round-style `activeRound` record) + `positions: Map` + grab cooldowns +
the snapshot tick timer.

Handlers (modeled on the `SPEED_*` set): `ARENA_START` (teacher token-verified;
validates/clamps the question batch exactly like `SPEED_START`; scatters the
first N tokens; starts the tick; emits `ARENA_STATE`), `ARENA_MOVE` (validate,
clamp to bounds, write + mark dirty — **no emit**), `ARENA_GRAB` (cooldown →
availability → range check → lock + emit `ARENA_WORD` to room +
`ARENA_GRAB_GRANTED` with the question, options only, to the grabber),
`ARENA_END`. Grab timeout releases the word back to available.

**Answering reuses the existing `SPEED_SUBMIT`**: the handler also resolves
arena `activeRound`s, scoring through the same core as `qpApplySpeedSubmission`
(index vs private correctIndex, base + speed bonus → `QpStudentEntry.score`),
so the same leaderboard/podium works untouched. Arena gets its own tunable
point constants so it can be balanced independently of Speed Round.

Multi-VM: snapshots carry `serverId` (client unions per-VM like leaderboards);
grabs landing on a non-owner VM fan out via `QP_ARENA_GRAB_FANOUT` (mirrors the
speed/race fanout), carrying the client-reported position for the range check.

## 5. Client model (unprotected)

- `ArenaCanvas` — fixed-aspect container; avatars/tokens are absolutely
  positioned emoji divs moved via `translate3d`; RAF interpolation writes
  transforms through refs (bypassing React on the 60fps path).
- `ArenaJoystick` — pointer-event thumbstick + WASD fallback; integrates the
  local position in the RAF loop; separate 10/sec sender.
- `SpeedBuzzer` — the answering/locked/result UI **extracted from
  `SpeedRoundStudentView`** into a shared component; the arena renders it as a
  modal fed by `ARENA_GRAB_GRANTED` (same shape as a speed round), submitting
  via the existing `submitSpeedAnswer`.
- `ArenaHostView` / `ArenaStudentView` — cloned from the Speed Round views
  (join/lobby/rejoin/QR/podium machinery reused verbatim).
- Routing/session wiring mirrors Speed Round: sentinel `QP_ARENA_MODE`
  (`"word-hunt-arena"`) in `allowed_modes`; no DB migration.

## 6. Protected-zone changes (approved by owner this session)

`server.ts` (arena state + handlers + tick + fanout, additive),
`src/core/quickPlayProtocol.ts` (`ARENA_*` contract), `src/core/views.ts`
(2 new views), `src/utils/authViews.ts` (allow-list). All mirror the Game A
additions; CODEOWNERS still gates the merge.

## 7. Build order

- **2a — movement:** arena state + move relay + snapshot tick; canvas +
  joystick + interpolation; host projector view. Exit: a room full of avatars
  moving live on one map.
- **2b — words + grab + buzzer:** word lifecycle, grab referee + fanout, batch
  question authoring at start, shared SpeedBuzzer overlay, scoring into the
  existing podium. Exit: two students race to a word — one wins it, answers,
  scores.
- **2c — polish (deferred):** respawn/refill, speed-boost tokens, trails,
  SFX/confetti, tuning pass (tick, smoothing k, grab radius) on real devices.

## 8. Risks

1. **Backend load from concurrent arenas** (see §3 operator note) — re-run the
   socket load harness with a movement variant before wide rollout.
2. **Grab fairness on bad Wi-Fi** — server position lags up to ~100ms; generous
   grab radius + client prediction mitigate; play-test the radius.
3. **Low-end Android** — pause-when-hidden + capped node count; add a "snap"
   (no interpolation) fallback if needed.
4. **Reconnect mid-arena** — re-send `ARENA_STATE` on (re)join.
5. **Score balance** — separate arena point constants so a fast runner can't
   out-earn Speed Round disproportionately; tune in 2c.
