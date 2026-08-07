# Quick Play In-Game 🆘 Help Button — Design

**Date:** 2026-08-07
**Branch context:** to-be-created (feature branch off `main`)
**Status:** Approved design, ready for implementation planning
**Source item:** `docs/open-issues.md` § C1 (top-5 item; the only top-5 that did not ship on `claude/quick-play-game-flow-2rpPk`)

---

## Summary

Quick Play (`src/views/QuickPlayStudentView.tsx`) currently has no in-game affordance for a student to say "I need help." Kids aged 9–13 freeze when audio fails, the connection stalls, or they can't parse the prompt — they either sit silent or tap random UI. This spec adds a **floating red 🆘 button** to the student's gameplay view that opens a small 4-option menu. Three options are self-service (replay audio, force reconnect, toggle translation); the fourth ("Show my teacher") is a real-time signal to the teacher's `QuickPlayMonitor` view.

This is a **full v1** — all four options, including the teacher-notification path that requires changes to two protected files (`server.ts`, `src/core/quickPlayProtocol.ts`).

### Decisions locked during brainstorming

- **Scope:** All 4 options, not a reduced 3-option v1.
- **Placement:** Student's Quick Play gameplay phase **only**. Not on join, Get Ready, or endgame screens — each of those already has its own error/exit affordances (`QuickPlayExitScreens`, `QuickPlayGetReady`, `QuickPlayEndgameCard`).
- **Teacher UX:** Per-student 🙋 emoji badge on their leaderboard card **plus** a `"🙋 3 students need help"` counter in the `QuickPlayMonitor` header. Teacher taps the student's card (or the header counter) to acknowledge and clear. No sound alerts.
- **Anti-spam:** One raised hand per student at a time. Button greys to a ✓ state until the teacher clears it OR 60 seconds elapse (auto-expire). Server-side rate-limit: max 5 raise attempts per student per minute.
- **Languages:** EN + HE + AR at minimum (matches existing `src/locales/student/quick-play.ts` coverage). RU included if trivial.
- **No sound alerts on the teacher side** — classrooms are noisy enough that a "ping" would be lost, and one that cut through would disrupt every student's focus.

---

## User stories

- **As a student mid-game**, when I can't hear the word being spoken, I want to tap one button to replay it AND get a reminder to check my phone's silent switch.
- **As a student mid-game**, when the game looks frozen, I want a single tap that reconnects me without losing my score.
- **As a student mid-game whose native language is Hebrew or Arabic**, when I don't understand the English prompt, I want to see a translation on the same screen without navigating away.
- **As a student who tried the self-service options and is still stuck**, I want to raise my hand so my teacher walks over and helps me in person.
- **As a teacher running Quick Play on a classroom projector**, I want to see at a glance which specific student(s) need help so I can visit them without pausing the whole game.

---

## Architecture

### New components + hooks (all non-protected)

#### `src/components/QuickPlayHelpButton.tsx` (new)
The floating 🆘 button and its bottom-sheet menu. Fully self-contained presentational component.
- **Props:** `onReplayAudio: () => void`, `onForceReconnect: () => void`, `onToggleTranslation: () => void`, `handRaised: boolean`, `onRaiseHand: () => void`, `handAckExpiresAt: number | null`, `language: Language` (imported from `src/hooks/useLanguage.tsx` — covers EN / HE / AR / RU).
- **Responsibilities:** render the button, open/close the menu, render each option card, dispatch the right callback on tap, render the 60-second auto-expire countdown on the ✓ state.
- **Positioning:** `fixed bottom-4 right-4` with a z-index below toast notifications. Uses `data-quick-play-help` attribute so future stacked-corner components can detect and offset (mirroring `data-floating-buttons`).
- **Style:** round red-gradient button (`from-red-500 to-rose-600`), ~56×56 px, shadow-lg. Bottom-sheet menu on mobile; centered card on wider screens.
- **Motion:** `motion/react` — spring open/close, `whileHover={{ scale: 1.05 }}`, `whileTap={{ scale: 0.95 }}`.

#### `src/hooks/useQuickPlayHelp.ts` (new)
Owns only the raised-hand state and the socket wiring on the student side. The three self-service action callbacks (replay audio, force reconnect, toggle translation) are **not** wrapped by this hook — they already exist in the caller's scope (`useAudio`, `useQuickPlaySocket`, translation-toggle state) and are passed straight through to the button as props. Keeping the hook narrow avoids coupling it to unrelated systems.
- **Signature:** `useQuickPlayHelp(socket, session) → { handRaised, handAckExpiresAt, onRaiseHand }`.
- **Responsibilities:** track raised-hand state; emit `qp:studentRaiseHand`; listen for `qp:studentHandCleared` from server; enforce local 60-second auto-expire.
- **Isolation:** all socket-event wiring for the *help* feature lives here so `QuickPlayHelpButton` stays pure presentational and easy to test.

### Modified components (non-protected)

#### `src/views/QuickPlayStudentView.tsx`
- Mount `<QuickPlayHelpButton />` inside the gameplay-phase render branch **only**.
- Wire it to `useQuickPlayHelp` and pass the audio + reconnect + translation callbacks.
- Total addition: ~15 lines. No refactor of the existing 796-line file.

#### `src/components/QuickPlayMonitor.tsx`
- Extend the internal `Student` type with `handRaisedAt: number | null` (timestamp of most-recent raise; `null` when cleared).
- Render a 🙋 emoji badge on each leaderboard card whose `handRaisedAt` is non-null.
- Add a `"🙋 N students need help"` counter to the header when the count > 0. Tapping the counter clears all raised hands in one shot; tapping an individual card clears just that one.
- Subscribe to `qp:studentHandRaised` (append/update) and dispatch `qp:teacherAckHelp` on card / counter tap.
- Total addition: ~40 lines (badge render, header counter, socket wiring, handler).

#### `src/locales/student/quick-play.ts`
Add ~10 keys, translated in EN / HE / AR / RU:
- `helpButtonAria` — accessible label for the floating button
- `helpMenuTitle` — "How can I help? 🤔"
- `helpCantHearWord` — "🔊 I can't hear the word"
- `helpCantHearTip` — "Turn off silent mode if you still can't hear!"
- `helpGameFrozen` — "⏳ The game looks frozen"
- `helpReconnecting` — "Reconnecting…"
- `helpCantRead` — "🌍 I can't read this"
- `helpShowTeacher` — "🙋 Show my teacher"
- `helpHandRaisedToast` — "Your teacher will see this soon!"
- `helpHandRaisedStatePill` — "✓ Waiting for teacher"

### Protected-zone changes (⚠️ needs explicit per-file operator approval before edit)

#### `src/core/quickPlayProtocol.ts` (protected — `src/core/`)
Add 3 event constants to `SOCKET_EVENTS` and their payload types:
- `QP_STUDENT_RAISE_HAND` (student → server) — payload: `{ sessionCode, studentUid }`
- `QP_STUDENT_HAND_RAISED` (server → teacher only) — payload: `{ studentUid, name, raisedAt }`
- `QP_TEACHER_ACK_HELP` (teacher → server) — payload: `{ sessionCode, studentUid | 'all' }`
- `QP_STUDENT_HAND_CLEARED` (server → student) — payload: `{ studentUid }`

#### `server.ts` (protected — backend)
- Add 2 socket handlers on the Quick Play namespace:
  - `on(QP_STUDENT_RAISE_HAND)` — validate session + student membership, apply rate-limit (max 5 per student per rolling minute; excess silently dropped, no error toast), broadcast `QP_STUDENT_HAND_RAISED` only to the teacher socket of that session.
  - `on(QP_TEACHER_ACK_HELP)` — validate teacher role for that session, broadcast `QP_STUDENT_HAND_CLEARED` back to the affected student(s).
- Rate-limit state: in-memory `Map<studentUid, number[]>` of recent raise timestamps, pruned on each call. Total server memory impact is negligible (< 1 KB per active student).
- No database persistence in v1 — raised-hand state is ephemeral and dies with the session. Rationale: post-game reporting on help usage is a v2 nice-to-have and can be added without protocol changes.

---

## Data flow

```
Student taps 🆘 → menu opens → taps "🙋 Show my teacher"
    ↓
useQuickPlayHelp emits QP_STUDENT_RAISE_HAND {sessionCode, studentUid}
    ↓
server.ts handler:
  - Rate-limit check (5/min max)
  - If OK: broadcast QP_STUDENT_HAND_RAISED to teacher socket only
    ↓
Teacher's QuickPlayMonitor receives event, updates local Student list
  → 🙋 badge appears on that student's leaderboard card
  → header counter increments
    ↓
Teacher taps card → dispatches QP_TEACHER_ACK_HELP {sessionCode, studentUid}
    ↓
server.ts handler:
  - Validate teacher role
  - Broadcast QP_STUDENT_HAND_CLEARED {studentUid} to that student
    ↓
Student's useQuickPlayHelp receives event, sets handRaised=false
  → 🆘 button returns to un-raised state, tappable again
```

Auto-expire fallback: if 60 seconds elapse without a teacher ack, the student side self-clears (no server round-trip needed). This prevents the "teacher didn't see it, student is stuck with a greyed button" failure mode.

---

## Error handling

- **Socket disconnected when student taps 🙋:** button flashes with error styling, toast: *"Can't reach the teacher right now. Try again in a moment."* No local state change.
- **Rate-limit exceeded (5/min):** server silently drops. Student sees no error (deliberate — the student already had their hand raised recently, showing another confirmation would be confusing).
- **Teacher clears a hand that was already auto-expired client-side:** `QP_STUDENT_HAND_CLEARED` arrives at a student whose state is already `false`. Handler is idempotent; no visible effect. No error.
- **Multiple teachers on the same session (edge case):** first ack wins; the second ack is a no-op. No conflict handling needed.

---

## Testing plan

- **Unit test** (Vitest, in `src/__tests__/`) for the rate-limit helper in `server.ts` — pure function, 5 test cases (under limit, at limit, over limit, window-slide, empty history).
- **Manual smoke test** once implemented (in extracted zip via `npm run dev`):
  1. Tap 🆘 → menu opens → each of the 3 self-service options fires the correct effect.
  2. Tap 🙋 → button greys to ✓, toast appears.
  3. On teacher screen: badge + counter appear.
  4. Teacher taps card → student's button unfreezes.
  5. Raise hand → don't ack → 60 s later → student's button self-clears.
- **No E2E Playwright tests in v1** — the existing `ci-e2e.yml` runs on a different cadence; this feature can be added to it as a follow-up if student usage justifies the CI cost.

---

## Files touched — full list

| File | Change kind | Protected? | LOC est. |
|---|---|---|---|
| `src/components/QuickPlayHelpButton.tsx` | New | No | ~160 |
| `src/hooks/useQuickPlayHelp.ts` | New | No | ~80 |
| `src/views/QuickPlayStudentView.tsx` | Mount the button + wire hook | No | +15 |
| `src/components/QuickPlayMonitor.tsx` | Badge + counter + tap-to-clear | No | +40 |
| `src/locales/student/quick-play.ts` | Add ~10 keys × 4 languages | No | +40 |
| `src/__tests__/rate-limit.test.ts` | New (unit test) | No | ~50 |
| `server.ts` | 2 handlers + rate-limit helper | ⚠️ **YES** | +80 |
| `src/core/quickPlayProtocol.ts` | 4 event constants + types | ⚠️ **YES** | +20 |

Rough total: ~485 lines added, no lines removed.

---

## Out of scope (v2 candidates)

- Persisting raised-hand history to the database for post-game teacher reports.
- Notifying multiple teachers if a session ever gets multi-teacher (not a current use case).
- A "quiet hours" version of the button on the join / Get Ready screens (docs list separate items for join-time issues — a different feature).
- Broadcasting hand-raise counts to the leaderboard (privacy — kids shouldn't know which peers asked for help).
- Custom help-menu items configurable by the teacher.
- Adding the button to other game modes outside Quick Play (Live Challenge, Hot Seat, Class Minute) — each has its own flow and would need its own scoping conversation.

---

## Rollout / deployment considerations

- **Feature flag:** none needed for v1 — the button is additive and unmounted state is trivially safe. If real-classroom usage produces surprises, the fastest kill-switch is reverting the `QuickPlayStudentView.tsx` mount hunk (~15 lines).
- **Branch protection:** the two protected-file edits require the operator's explicit per-file approval before any edit occurs. Implementation plan will pause at those files for confirmation.
- **CI:** the new unit test and the additional LOC in `server.ts` should keep the typecheck-ratchet at its current baseline (`.typecheck-baseline` = 1). The entry-closure guardrail is unaffected — nothing new lands on the cold landing chunk.

---

## Open questions

None at spec-write time. All decisions in the "Decisions locked" list above were made explicitly during brainstorming.
