# Speed Round — Design Report

> Status: **approved — Phase 1 (Game A) in build**. Phase 2 (map arena) is planned.
> Visual mockups live in [`docs/mockups/`](./mockups/) (10 SVGs + PNG renders).

---

## 0. Two-phase roadmap (decided)

The competition splits into two games that ship in order:

- **✅ Game A — "Speed Round" buzzer (Phase 1, building now).** No map/movement.
  Same word to everyone, race to tap the right answer fastest, live podium.
  Reuses ~80% of the existing Category Race engine. This whole document specifies it.
- **🔜 Game B — "Word Hunt Arena" (Phase 2, future).** A literal shared map where
  each student steers an avatar that walks/runs to reach floating words; reaching a
  word triggers a quick question — **which is exactly Game A's buzzer**. So Phase 1
  is not throwaway: it becomes the "grab → answer" moment inside the arena.

  Phase 2 is a substantially bigger build — it adds a **game canvas** (PixiJS/Phaser),
  **joystick movement controls**, **high-frequency position sync (~15×/sec)**, and a
  server-side **"who grabbed first" arena referee** with collision/respawn. It reuses
  the room, join, leaderboard, and Game A's answer flow, but the arena itself is new
  (~30% reuse). See `mockups/10-word-hunt-arena-phase2.svg`.

Everything below specifies **Game A**.

---

## 1. What it is

A **Kahoot-style synchronized buzzer mode** for the existing competition area. All
students join one shared room; the teacher drives rounds; one word is pushed to
**everyone at the same instant** with a shared countdown; students race to tap the
correct answer; **faster correct answers earn more points** (speed bonus); the big
screen shows a **live podium** that re-animates after each word. Multiple rounds run
back-to-back, each can use a different "fast" question mode, and **one leaderboard
carries across all rounds**.

It is **purely additive** — Quick Play, Live Challenge, Category Race, and all 14
game modes stay exactly as they are. Speed Round is one new option.

See: `mockups/1-teacher-podium.svg`, `mockups/2-student-phone.svg`,
`mockups/5-speed-round-storyboard.svg`.

---

## 2. Two ways the room competes (the framing)

| | ⚡ Speed Round (NEW) | 🏃 Open Race (already exists as Quick Play) |
|---|---|---|
| Pace | Lockstep — same word, same second | Self-paced — each kid on their own word |
| Driven by | Teacher (round by round) | Students (free play) |
| Competition | Fastest correct wins each word | Total points on a shared scoreboard |
| Fits modes | Quick taps: true-false, classic, reverse, listening, idiom, letter-sounds | Slower/building: spelling, matching, memory-flip, scramble, sentence-builder, fill-blank |

It's the **competition type, not the mode**, that decides race-vs-scoreboard.
See `mockups/4-two-ways-to-compete.svg`.

---

## 3. The one decision that matters: who knows the correct answer

**Finding (from reading the code):** the server has **no access** to the main
vocabulary. `ALL_WORDS` (6,482 words, `src/data/vocabulary.ts`) is never imported by
`server.ts`. Category Race only scores server-side because it uses a small,
self-contained answer bank (`src/data/category-race-bank.ts`). Multiple-choice
distractors are built **client-side** (`src/hooks/useGameRoundOptions.ts`).

Three options, with the recommendation:

1. **Server generates the whole question** — requires importing the full vocab into
   the protected server and reading custom/Hebrew words from the DB per session.
   Heavy; couples scoring to the vocab pipeline the protected zone exists to insulate.
2. **✅ RECOMMENDED — Teacher's screen builds the question; server scores by index.**
   The teacher host builds `{prompt, options, correctIndex}` client-side (reusing
   existing distractor logic). It sends this on round start. The server **stores
   `correctIndex` privately and never includes it in the broadcast** — students
   receive only the options. On submit, students send the **index they tapped** (not
   text); the server compares it to the stored correct index and awards points +
   speed bonus. The correct answer is only revealed when the round closes.
3. **Dedicated server-side Speed Round bank** — mirrors Category Race but means
   re-implementing every mode's question construction on the server.

**Why Option 2:**
- Keeps the server out of the vocabulary pipeline (consistent with why Category Race
  uses a tiny standalone bank).
- The teacher is already a trusted, token-verified actor (`qpVerifyTeacherOwnsSession`).
- It's the only option that natively supports **custom word lists, Hebrew sessions,
  and all six fast modes** without rebuilding each on the server.
- Anti-cheat parity with Category Race: student sends an index (≈ text), server holds
  the answer secret, computes the score. A tampered client can't self-award — it
  would have to guess the index, i.e. just guess the answer.
- Trade-off: a malicious **teacher** could author a wrong "correct" answer for their
  own room. Accepted — the teacher is the room owner and can already adjust their own
  leaderboard via the existing `TEACHER_BONUS`.

---

## 4. How it runs (lifecycle)

`LOBBY → REVEAL (word + shared deadline) → RACING (kids tap) → SCORE (server: correct?
+ speed + mark fastest) → RESULT (podium updates, answer shown) → loop to next word →
FINAL (winner + ranking, scores saved to Supabase)`.

This is the **exact lifecycle Category Race already implements**. See
`mockups/3-architecture-flow.svg`, `mockups/7-round-lifecycle.svg`,
`mockups/8-student-journey.svg`.

---

## 5. What's reused vs. new vs. needs sign-off

See `mockups/9-build-map-new-vs-reused.svg`.

**♻️ Reused (already built):** socket.io `/quick-play`, the Category Race
shared-deadline + speed-scoring engine, the podium (`CategoryRacePodium`), QR/code
join flow, multi-VM leaderboard merge, XP/progress persistence.

**🆕 New, unprotected (approve freely):**
- `src/views/SpeedRoundHostView.tsx` (clone of `CategoryRaceHostView.tsx`) — mode
  picker, timer picker, next-word, podium re-keyed per round, builds the question
  client-side.
- `src/views/SpeedRoundStudentView.tsx` (clone of `CategoryRaceStudentView.tsx`) —
  reveal → tap options → locked/waiting → per-round result → final.
- `src/hooks/useQuickPlaySocket.ts` — new `startSpeedRound`/`endSpeedRound`/
  `submitSpeedAnswer` + `onSpeedRound`/`onSpeedResult`/`onSpeedEnded`.
- `src/handlers/quickPlaySession.ts` (`createSpeedRoundSession`),
  `src/handlers/teacherDashboardActions.ts` (`startSpeedRoundFromDashboard`),
  `TeacherLiveScreens.tsx`, `StudentAuthRoutes.tsx`, `studentJoinChunks.ts`,
  `useQuickPlayUrlBootstrap.ts`, dashboard launch button.

**🔒 Protected — needs explicit owner sign-off:**

| File | Change | Why unavoidable |
|---|---|---|
| `src/core/quickPlayProtocol.ts` | Add `SPEED_*` events + payload types + constants | The client↔server contract lives here; both sides import it. |
| `server.ts` | Add `currentSpeed` state, `qpScoreSpeedSubmission`, `qpMaybeAutoEndSpeed`, three `SPEED_*` handlers, fanout listener | Authoritative round state + scoring + socket handlers live here, beside the `RACE_*` code. Additive only. |
| `src/core/views.ts` | Add `"speed-round-host"`, `"speed-round-student"` to the `View` union | Shared union; can't be declared elsewhere. |
| `src/utils/authViews.ts` | Add the two views to the route allow-list | Student/guest route gating reads this. |

**No DB migration needed** — `quick_play_sessions.allowed_modes` is an unconstrained
`TEXT[]`; passing `["speed-round"]` works exactly like `["category-race"]` today.

---

## 6. Proposed protocol additions (for the protected contract)

```ts
// new event names (mirror the RACE_* set)
SPEED_START      = "qp:teacher:speed:start"     // client → server
SPEED_SUBMIT     = "qp:student:speed:submit"    // client → server
SPEED_END_ROUND  = "qp:teacher:speed:end-round" // client → server
SPEED_ROUND      = "qp:speed:round"             // server → room (NO correctIndex)
SPEED_RESULT     = "qp:speed:result"            // server → submitting socket
SPEED_ENDED      = "qp:speed:ended"             // server → room (reveals answer + winner)

QP_SPEED_MODES = ["true-false","classic","reverse","listening","idiom","letter-sounds"]
QP_SPEED_MODE  = "speed-round"        // allowed_modes sentinel
QP_SPEED_BONUS_MAX = 50               // speed is the whole point → bigger than race
```

Round-start carries `{mode, prompt, options, correctIndex (private), roundSeconds}`;
the broadcast strips `correctIndex`; the student submits `{roundId, choiceIndex}`; the
result carries `{correct, correctIndex, roundPoints, speedBonus, firstCorrect,
totalScore}`. Full shapes are in the architect plan.

---

## 7. Phased build order

- **Phase 0 — contract (protected, approve first):** add `SPEED_*` to the protocol +
  the two views to `views.ts`/`authViews.ts`. Nothing user-visible; unblocks everything.
- **Phase 1 — one mode end-to-end (true-false):** server state + scoring + handlers +
  auto-end + fanout; hook methods; session creation + dashboard launch + URL routing;
  host view (mode fixed to true-false); student view (reveal → 2 buttons → result).
  Proves the whole synchronized loop + speed bonus + carry-over leaderboard. **Shippable.**
- **Phase 2 — the rest of the modes + per-word winner:** mode picker (classic,
  reverse, listening w/ TTS, idiom, letter-sounds); `firstCorrect`/`winnerClientId` +
  "First!" badge + winner highlight; reveal correct option on round end.
- **Phase 3 — polish:** auto-run, slot-machine word reveal, SFX, per-word confetti,
  presentation mode, optional untimed mode, "new round in place" flow.

See `mockups/6-teacher-launch-flow.svg` for the teacher entry path.

---

## 8. Risks / open questions

1. **Teacher-authored answer trust** — accepted per room-owner model; fallback is a
   server-bundled bank (Option 3) if stronger guarantees are ever needed.
2. **"First correct" across multiple servers** — ordering is authoritative on the
   round-owner VM (arrival order, not true tap time). Ship arrival-order first; add
   client tap-timestamps later only if needed.
3. **Listening mode + iOS audio unlock** — reuse the existing join-tap audio prime;
   verify the get-ready path covers a student who joined long before round 1.
4. **Speed-bonus weighting** — needs playtesting on 5s rounds so a slow-but-correct
   answer still feels rewarded. Tunable constants in the protocol file.
5. **Payload size** — clamp prompt/option lengths server-side (sentence mode can be
   long), mirroring existing race discipline.

---

## 9. What we need from you

1. **Approve the concept** (Speed Round as an additive mode) — pictures 1–9.
2. **Approve the security decision** — Option 2 (teacher builds question, server
   scores by index).
3. **Approve the protected-file changes** — `server.ts`, `quickPlayProtocol.ts`,
   `views.ts`, `authViews.ts` (additive, modeled on existing Category Race code).
4. **Confirm build scope** — start with Phase 0 + Phase 1 (true-false end-to-end).
