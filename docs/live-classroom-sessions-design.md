# Design: Roster-based live classroom sessions (no QR scan)

> Status: **DRAFT for review** — no code yet. Captures the plan + security model
> so we build from a spec. Author: operator + Claude session 2026-06-20.

## The idea (in one line)

A logged-in student (class code + PIN) should **never have to scan a QR code** to
join a live game. The **teacher** picks a class + a mode, and every enrolled
student in that class gets an in-app **"Your teacher started ___ — Join!"**
prompt; they tap and they're in.

## Modes in scope

All the teacher-driven / live / classroom modes:
- Quick Play (Live Play)
- Category Race
- Speed Round
- Word Hunt Arena
- Hot Seat
- Class Show
- (and the shared "vocabulary" live flows that run on the same rails)

## Why this is the right direction

- Fewer "the QR won't scan / camera permission" failures in class.
- The student is **already identified** (name + class), so no name-typing and no
  anonymous guests — cleaner rosters, cleaner analytics, safer for minors.
- It reuses what already exists; the games themselves don't change.

---

## What already exists (reuse, don't rebuild)

- **Realtime server**: `server.ts` (socket.io) already powers Live Challenge +
  Quick Play sessions today.
- **Session rails**: live games run as `quick_play_sessions` rows with an
  `allowed_modes` + word list (see `docs/word-hunt-arena-design.md`,
  `docs/speed-round-design.md`).
- **Roster**: students enrol in a class (`student_profiles` / `users.class_code`);
  the teacher already has a class → student list.
- **Student auth**: class code + PIN issues a real Supabase session, so the
  student has a verifiable identity on the socket.

The **new** part is small: a **per-class "presence + announce" channel** so the
teacher's "start" reaches that class's logged-in students, who then join the
existing session by its code (which the app supplies for them — no scan).

---

## Proposed flow

1. Teacher opens a live mode, picks **which class** plays (they may own several).
2. Teacher taps **Start** → server creates the session (as today) **and**
   broadcasts a `class:session-started` event to that class's channel.
3. Each enrolled student's app is subscribed to **their own class channel**.
   On the event, it shows a full-screen **"Join [Word Hunt Arena] now"** card.
4. Student taps **Join** → app joins the existing session by code on their
   behalf (no QR, no name entry — identity is known).
5. Teacher sees students appear on the roster/podium and runs the game as today.
6. On end/timeout, the student card auto-dismisses.

---

## 🔒 Security model (designed first, on purpose)

The hard rule: **nothing about authorization is trusted from the client.**

1. **Channel membership is server-verified.** A student may only subscribe to
   their *own* class channel. On subscribe, the server checks the authenticated
   user's enrolment (`student_profiles` / `users.class_code`) against the
   requested class **server-side** — never from a client-supplied class id.
2. **Join is authorized per session.** When a student accepts the prompt, the
   server re-verifies: (a) the student is enrolled in the class that owns the
   session, and (b) the session is live. Only then are they admitted.
3. **No cross-class leakage.** A student can never receive prompts for, or peek
   into, a class they're not in. Channel names are derived server-side from the
   verified enrolment, not from anything the client sends.
4. **Teacher-side authorization.** Only the class **owner** (the class-ownership
   check we already use, e.g. in `award_reward`) can start a session for a class.
5. **Minors-safe.** No new PII on the wire; the prompt carries only the mode +
   session code, never other students' data. Aligns with the Families/COPPA
   posture already in `docs/google-play-publishing-guide.md`.
6. **Abuse limits.** Rate-limit "start" per teacher and "join" per student;
   ignore duplicate/stale announcements; sessions expire so a leaked code can't
   be joined later.
7. **RLS still backs everything.** Even if a socket check were bypassed, the
   `quick_play_sessions` + roster RLS policies must independently deny
   out-of-class reads/writes (defense in depth).

> Threat to explicitly test: a logged-in student tampering with the class id to
> join another class's live game. Both the socket check **and** RLS must block it.

---

## Components to build (rough)

| Layer | Change | Protected? |
|---|---|---|
| Backend | Per-class socket channel: `subscribe` (server-verifies enrolment), `class:session-started` broadcast on teacher start | ✅ `server.ts` |
| DB | Possibly an index / RLS review on `quick_play_sessions` for class-scoped lookups; confirm enrolment source of truth | ✅ `supabase/` |
| Teacher UI | "Pick a class" step before starting any live mode | views (not protected) |
| Student UI | Subscribe to class channel on login; full-screen "Join now" prompt | views (not protected) |
| Shared | New socket event constants | ✅ `src/core/types.ts` |

(✅ = protected zone — needs explicit per-file approval before editing.)

---

## Phased rollout (lowest risk first)

1. **Phase 0 (this doc):** agree the flow + security model.
2. **Phase 1:** one mode end-to-end (suggest **Speed Round** — simplest rails) as
   a proof, behind a feature flag, internal-test only.
3. **Phase 2:** harden + security-test (the cross-class tamper test above), then
   extend to Category Race, Word Hunt Arena, Quick Play, Hot Seat, Class Show.
4. **Phase 3:** remove the flag. QR join stays permanently (additive, per the
   locked decision below) — it's the path for guests / shared / non-logged-in
   devices.

---

## Decisions (locked)

- **QR join stays — this feature is purely ADDITIVE.** We do NOT remove or change
  the existing QR / `?session=` scan flow. The roster-based "teacher starts →
  student taps Join" path is a *second* way to join the same session. Teachers
  pick per moment: QR for a shared screen / guest device, per-class start for
  their logged-in students. Because nothing existing is modified, today's flows
  cannot regress. (Operator decision, 2026-06-20.)

## Open questions for the operator

- Should a student get the prompt only when the **app is open**, or also as a
  push notification when it's closed? (Push = extra native work + permissions.)
- One active live session per class at a time, or several in parallel?
- Where is the **source of truth** for "is this student in this class" —
  `student_profiles` or `users.class_code`? (We saw both in the reward bug; this
  feature should standardize on one.)
