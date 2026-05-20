# 04 — Game Modes & Gameplay Loop

> 15 game modes spanning Classic flashcards, Sentence Builder, Listening, Synonym Match, Hot Seat (teacher-led), Shoresh Hunt (root-word), Niqqud (vowel marks, for Vocahebrew), and more. Each mode awards XP via shared economy.
>
> Key files: `src/views/GameActiveView.tsx`, `src/views/GameModeSelectionView.tsx`, `src/views/GameModeIntroView.tsx`, `src/views/GameFinishedView.tsx`, `src/views/GameRoutes.tsx`, `src/views/ListeningModeView.tsx`, `src/views/SynonymMatchView.tsx`, `src/views/HotSeatView.tsx`, `src/views/ShoreshHuntView.tsx`, `src/views/NiqqudModeView.tsx`, `src/components/ClassicModeGame.tsx`, `src/hooks/useGameState.ts`, `src/hooks/useGameRoundOptions.ts`, `src/hooks/useGameModeMechanicsState.ts`, `src/hooks/useGameModeActions.ts`, `src/hooks/useGameFinish.ts`, `src/constants/game.ts`.

---

## 1. Purpose of Module

- **What:** Render, run, and resolve a single play session for any of the 15 modes; produce a normalized score + XP outcome.
- **Who:** Students (primary), guests in Quick Play.
- **Why:** This is the product. Gameplay quality drives retention, learning outcomes, and word-of-mouth in schools.
- **Criticality:** **S1** — XP/streak loss, scoring bugs, or crashes mid-round damage trust quickly with kids and teachers.

---

## 2. User Flow Mapping

### 2.1 Standard mode (happy)

```
Student dashboard → tap an assignment
→ GameModeSelectionView (filter to modes in this assignment)
→ tap mode → GameModeIntroView (animated intro)
→ "Start" → GameActiveView
   → useGameState initializes (words, round count, mode params)
   → audio preloaded via useAudio
   → loop: present round → wait for answer → score → next
→ all rounds done → GameFinishedView
   → useGameFinish persists results
   → XP awarded → boosters applied → streak updated
   → confetti / pet evolution / badge unlock animations
→ student returns to dashboard
```

### 2.2 Multi-mode mini-curriculum

If an assignment has 3 modes (e.g., Classic + Listening + Sentence), the student picks any; after finish, they're offered "next mode" CTA.

### 2.3 Live Challenge gameplay

Covered in `05-LIVE-CHALLENGE.md`. Same rounds but synced via socket.io; teacher controls round pacing.

### 2.4 Quick Play gameplay

Covered in `06-QUICK-PLAY.md`. Guest plays with ephemeral score.

### 2.5 Failure paths

| Path                                      | Detection                                   | Recovery                                                    |
|-------------------------------------------|----------------------------------------------|-------------------------------------------------------------|
| Audio fails to load mid-round             | Audio onerror                                | Continue silently with retry; show small alert              |
| App backgrounded mid-round                | `document.visibilitychange`                  | Pause timer; resume on foreground                            |
| Browser refresh mid-round                 | Lost state                                   | `useGameState` can persist to sessionStorage and resume      |
| Network drop on game finish                | Save queue retries                           | `useSaveQueueResilience` ensures XP persists when reconnected|
| Assignment deleted while playing          | Foreign key check on save                    | Save degrades to local; show "Assignment removed" toast     |

---

## 3. Functional QA Scenarios

### 3.1 Across all modes

| ID            | Scenario                                              | Steps                                                    | Expected                                                                | Severity | Priority |
|---------------|-------------------------------------------------------|----------------------------------------------------------|--------------------------------------------------------------------------|----------|----------|
| GAME-FUNC-001 | Start any mode from intro                              | Intro → Start                                            | Active view mounts; first round visible within 1s                       | S2       | P0       |
| GAME-FUNC-002 | Complete all rounds                                   | Play through                                             | GameFinishedView shows accurate score; XP awarded                       | S2       | P0       |
| GAME-FUNC-003 | Exit mid-game via back                                | Tap back / OS back gesture                                | Confirmation prompt; on confirm: progress saved as "attempted"          | S2       | P0       |
| GAME-FUNC-004 | Pause via menu                                         | Open in-game menu                                        | Pause timer; resume restores                                            | S3       | P1       |
| GAME-FUNC-005 | Skip word (if mode allows)                            | Skip button                                              | Word marked unanswered; penalty per mode rules                          | S3       | P1       |
| GAME-FUNC-006 | XP correctness                                        | Answer 10/10 with x2 booster                              | XP = base × 2; visible in animation                                      | S2       | P1       |
| GAME-FUNC-007 | Streak counted only once per day                      | Play 3 sessions same day                                  | Streak +1 once; subsequent sessions no double increment                 | S2       | P1       |
| GAME-FUNC-008 | Audio plays for word prompt                           | Round with audio                                          | Audio plays automatically; replay button visible                        | S2       | P1       |
| GAME-FUNC-009 | Replay audio button                                    | Tap                                                       | Re-plays current word                                                    | S3       | P1       |
| GAME-FUNC-010 | Show translation toggle (if available)                | Tap eye icon                                              | Hebrew/Arabic translation appears                                       | S3       | P1       |
| GAME-FUNC-011 | Wrong answer feedback                                  | Submit wrong                                              | Red flash; correct answer shown; word added to "to review"              | S3       | P1       |
| GAME-FUNC-012 | All wrong answers                                      | Submit all wrong                                          | Game still finishes; gentle copy; minimal XP                            | S3       | P1       |
| GAME-FUNC-013 | All correct answers                                    | Submit all correct                                        | Confetti; max XP; pet evolution check                                   | S3       | P1       |
| GAME-FUNC-014 | Single-word assignment                                | 1-word list                                               | Mode plays once; finishes normally                                       | S3       | P2       |
| GAME-FUNC-015 | Empty assignment (edge)                                | Open assignment with 0 words                              | Mode selection disabled or "No words to play"                            | S3       | P2       |

### 3.2 Mode-specific

| ID            | Mode             | Scenario                                       | Expected                                                              | Severity |
|---------------|------------------|-----------------------------------------------|------------------------------------------------------------------------|----------|
| GAME-FUNC-101 | Classic          | Multiple-choice; 4 options always              | Distractors drawn from same difficulty; no duplicate distractor       | S3       |
| GAME-FUNC-102 | Sentence Builder | Drag tiles to build sentence                  | Touch + mouse parity; correct sentence validates                      | S3       |
| GAME-FUNC-103 | Listening        | Audio plays; type word                         | Submit triggers fuzzy match (Levenshtein ≤ 2 = correct?)              | S3       |
| GAME-FUNC-104 | Synonym Match    | Pair word ↔ synonym                            | All pairs solvable; no orphans                                        | S3       |
| GAME-FUNC-105 | Hot Seat         | Teacher-led; one student answers, rest watch  | Teacher socket events drive UI                                         | S2       |
| GAME-FUNC-106 | Shoresh Hunt     | Find root word in Hebrew                       | (Vocahebrew) correct shoresh accepted                                  | S3       |
| GAME-FUNC-107 | Niqqud           | Place vowel marks                              | Correct mark assigned; partial credit                                  | S3       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                              | Expected                                                                  |
|---------------|----------------------------------------------------|---------------------------------------------------------------------------|
| GAME-EDGE-001 | Word with no audio asset (custom word, audio not yet generated) | UI shows "Audio coming soon"; mode still playable in text form        |
| GAME-EDGE-002 | Distractor pool too small (set has only 4 words)   | Use generic distractors from ALL_WORDS                                    |
| GAME-EDGE-003 | Word > 30 chars overflows answer button             | Truncate with tooltip on long-press                                       |
| GAME-EDGE-004 | Unicode normalization (NFC vs NFD)                  | Compare via `.normalize('NFC')`                                          |
| GAME-EDGE-005 | Listening with homophones                           | Both spellings accepted as correct                                        |
| GAME-EDGE-006 | Player types extra trailing whitespace              | Stripped before compare                                                   |
| GAME-EDGE-007 | Mixed-case input "Apple"                            | Case-insensitive comparison                                               |
| GAME-EDGE-008 | Sentence Builder with 1-word sentence               | Should not happen; sentence bank validation                              |
| GAME-EDGE-009 | Round timer = 0                                     | Auto-submit current state                                                |
| GAME-EDGE-010 | Negative XP edge after booster fail                 | Floor at 0; never negative                                                |

### 4.2 User-behavior edge cases

| ID            | Behavior                                                                  | Expected                                                  |
|---------------|---------------------------------------------------------------------------|-----------------------------------------------------------|
| GAME-EDGE-101 | Tap answer 10× rapidly                                                    | Single submit; subsequent taps ignored                    |
| GAME-EDGE-102 | Background app at 5s remaining; foreground at -2s                         | Round auto-submitted; no negative timer state             |
| GAME-EDGE-103 | Rotate device mid-round                                                   | Layout reflows; state preserved                           |
| GAME-EDGE-104 | Pull-to-refresh on iOS during play                                        | Prevented within game; pull does not reload page          |
| GAME-EDGE-105 | Triple-tap zoom on iOS                                                    | Layout maintained                                         |
| GAME-EDGE-106 | OS audio focus stolen by call                                             | Game pauses                                                |
| GAME-EDGE-107 | App switched mid-finish, comes back                                       | Finish view shown, XP saved exactly once                  |
| GAME-EDGE-108 | Browser refresh on GameFinished view                                      | Result not duplicated; idempotent persistence             |
| GAME-EDGE-109 | Opening two tabs and playing in both                                      | Each tab has independent local state; both save (audited as separate plays) |
| GAME-EDGE-110 | Cheat: edit DOM to mark answer correct                                    | Final score validated server-side (sum of round outcomes); client lying is detectable later |

### 4.3 Infrastructure edge cases

| ID            | Failure                                            | Expected                                                              |
|---------------|----------------------------------------------------|-----------------------------------------------------------------------|
| GAME-EDGE-201 | Supabase write fails on game finish                | `useSaveQueue` retries; UI shows pending; eventual consistency        |
| GAME-EDGE-202 | Worker → Fly proxy timeout                          | Fallback direct to Supabase for client-writable rows                  |
| GAME-EDGE-203 | Audio CDN 404                                       | Skip audio with placeholder beep; log                                 |
| GAME-EDGE-204 | Slow 3G — round delay > 5s                          | Pre-fetch next round assets while current is being answered          |
| GAME-EDGE-205 | Service worker stale                                | Force update detection; soft prompt to reload                         |

### 4.4 AI edge cases

| ID            | Failure                                                         | Expected                                                         |
|---------------|-----------------------------------------------------------------|------------------------------------------------------------------|
| GAME-AI-001   | Sentence Builder uses Gemini-generated sentence with bias      | Pre-vetted sentence bank used first; AI only as fallback         |
| GAME-AI-002   | Listening audio uses TTS that mispronounces                    | Allow teacher report; alternative audio fallback                  |
| GAME-AI-003   | AI returns unsafe content during gameplay                       | Render placeholder; log for moderation                            |

---

## 5. Security QA

| ID           | Attack                                                             | Exploit                                                                                | Expected secure behavior                                                                          |
|--------------|--------------------------------------------------------------------|----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| GAME-SEC-001 | Inflate XP via patched client                                       | DevTools edit state to set score = 9999                                                | Server validates score = sum of expected per-round XP; cap per assignment + booster guard         |
| GAME-SEC-002 | Race-condition double-save                                          | Submit same game twice within 200ms                                                    | Idempotency key on save; duplicates rejected                                                       |
| GAME-SEC-003 | Replay attack on finish endpoint                                    | Capture POST body, replay                                                              | Server uses nonce per session id; second replay rejected                                          |
| GAME-SEC-004 | Inject HTML via Sentence Builder answer                             | Type `<img onerror>` as drag tile                                                      | Drag tiles are pre-defined; user-typed only in listening mode                                     |
| GAME-SEC-005 | XSS in word translation                                             | Custom word with translation injected via OCR                                          | Translations escaped on render                                                                     |
| GAME-SEC-006 | Local storage tamper to fake streak                                 | Set `streak = 365`                                                                     | Server is source of truth; client display is hint only                                            |
| GAME-SEC-007 | Bypass cooldown on daily missions                                   | Edit `useDailyMissions` localStorage                                                   | Server-side mission state authoritative                                                            |

---

## 6. Accessibility QA

| ID            | Check                                                                 | Expected                                                |
|---------------|----------------------------------------------------------------------|---------------------------------------------------------|
| GAME-A11Y-001 | Answer buttons reachable via Tab                                     | Logical order                                            |
| GAME-A11Y-002 | Audio replay button labeled                                          | aria-label="Play audio for word"                        |
| GAME-A11Y-003 | Round progress as live region                                        | "Round 3 of 10"                                          |
| GAME-A11Y-004 | Reduced motion                                                       | Confetti and pet-evolve animations disabled              |
| GAME-A11Y-005 | Color-only feedback                                                  | Correct/incorrect also use icon (✓/✗)                    |
| GAME-A11Y-006 | Focus moves to first answer on round start                           | Verified                                                  |
| GAME-A11Y-007 | Screen reader announces "Correct!" or "Try again"                    | aria-live="assertive"                                    |
| GAME-A11Y-008 | RTL drag in Sentence Builder                                         | Drag direction natural for HE/AR                          |

---

## 7. Responsive & Device QA

| ID            | Device                                  | Check                                                                |
|---------------|-----------------------------------------|----------------------------------------------------------------------|
| GAME-RESP-001 | iPhone SE                                | 4 answer buttons fit; no clipping                                    |
| GAME-RESP-002 | iPhone 14 Pro w/ Dynamic Island         | UI not occluded                                                       |
| GAME-RESP-003 | Android low-end                          | 60fps animations or graceful degrade                                  |
| GAME-RESP-004 | iPad split view                          | Buttons remain hittable                                               |
| GAME-RESP-005 | Foldable                                 | Content reflows                                                       |
| GAME-RESP-006 | Landscape orientation                    | Layout adapts                                                         |
| GAME-RESP-007 | Mouse vs touch parity in Sentence Builder | Both work                                                             |
| GAME-RESP-008 | Game on PWA fullscreen                   | No iOS Safari URL bar overlap                                         |

---

## 8. Performance QA

| Metric                                      | Target            | Critical |
|--------------------------------------------|-------------------|----------|
| Time-to-first-round (TTR) after Start       | < 1.2s            | > 3s     |
| Round transition                            | < 200ms           | > 600ms  |
| Audio play start latency                    | < 150ms           | > 500ms  |
| Frame rate during animations                | ≥ 55fps           | < 40fps  |
| Memory after 30-round session               | < 250MB           | > 500MB  |
| Game finish persist                         | < 800ms           | > 2s     |
| Vocab lazy-load chunk                       | < 250KB gz        | > 500KB  |

---

## 9. Database Integrity QA

| ID           | Check                                                                          | Expected                                                  |
|--------------|--------------------------------------------------------------------------------|-----------------------------------------------------------|
| GAME-DB-001 | One progress row per (student, assignment, mode, attempt)                       | UNIQUE constraint                                          |
| GAME-DB-002 | RLS: student writes own progress                                                | Verified                                                  |
| GAME-DB-003 | XP transaction is atomic                                                         | Single RPC `apply_game_finish` updates xp + streak + boosters |
| GAME-DB-004 | Streak day stored as UTC date string with TZ adjustment for class               | Verified                                                  |
| GAME-DB-005 | Audit log: each finish persisted with raw score + booster snapshot              | Yes                                                       |
| GAME-DB-006 | Indexes: `progress(student_id, assignment_id)`, `progress(class_id, played_at)` | Verified for gradebook queries                            |
| GAME-DB-007 | Idempotency: same `session_id` rejected on second insert                        | Verified                                                  |

---

## 10. API QA

### `POST /rest/v1/rpc/apply_game_finish`

```json
{
  "sessionId": "uuid",
  "assignmentId": "uuid",
  "modeId": "classic",
  "rounds": [{ "wordId": "...", "correct": true, "timeMs": 1200 }, ...],
  "boostersUsed": ["xp_booster"]
}

200 → { "xpAwarded": 120, "streak": 5, "newBadges": [], "petLevel": 3 }
400 → { "error": "validation_error" }
403 → { "error": "no_class_access" }
409 → { "error": "duplicate_session" }
500 → { "error": "internal" }
```

| ID           | Check                                                                | Expected                                  |
|--------------|----------------------------------------------------------------------|-------------------------------------------|
| GAME-API-001 | Auth required                                                        | 401 without bearer                        |
| GAME-API-002 | Schema validates each round                                          | Reject malformed                          |
| GAME-API-003 | Score recomputed server-side from rounds                             | Client-claimed score ignored              |
| GAME-API-004 | Cap on rounds per assignment                                          | Reject > 200                              |
| GAME-API-005 | Booster usage validated                                              | Cannot use booster not owned              |
| GAME-API-006 | Streak rules deterministic                                            | Verified                                  |
| GAME-API-007 | Idempotent on duplicate sessionId                                    | Returns first result                      |
| GAME-API-008 | Audit log written                                                    | Yes                                       |

---

## 11. State Management QA

| ID             | Check                                                                          | Expected                                                  |
|----------------|--------------------------------------------------------------------------------|-----------------------------------------------------------|
| GAME-STATE-001 | `useGameState` resets between sessions                                          | No leakage                                                 |
| GAME-STATE-002 | Audio refs released on unmount                                                 | No memory leak                                            |
| GAME-STATE-003 | Booster panel updates after finish                                              | Within 1 render                                            |
| GAME-STATE-004 | Streak optimistic increment matches server                                       | Reconcile within 2s                                        |
| GAME-STATE-005 | `useSaveQueue` retries on online event                                          | Online → flush                                            |

---

## 12. Observability & Monitoring QA

| ID            | Signal                                          | Threshold        | Indicates                       |
|---------------|--------------------------------------------------|------------------|---------------------------------|
| GAME-OBS-001 | Game finish success                              | < 99% → alert    | Save queue / RPC issue          |
| GAME-OBS-002 | Median XP per finished game                      | drop > 20% w/w   | Scoring regression              |
| GAME-OBS-003 | Mode crash rate                                  | > 0.5% → alert   | UI crash                        |
| GAME-OBS-004 | Audio load failure                               | > 1% → alert     | CDN issue                       |
| GAME-OBS-005 | Average game duration                            | trending change  | UX regression or cheat tool     |
| GAME-OBS-006 | Idempotency duplicate rate                       | > 0.5% → review  | Client bug retrying too eagerly |

---

## 13. QA Automation Strategy

| Layer       | Tool          | Coverage                                                                 |
|-------------|---------------|---------------------------------------------------------------------------|
| Unit        | Vitest        | scoring, streak, fuzzy matcher, normalizers                              |
| Integration | Supabase SQL  | `apply_game_finish` RPC                                                  |
| E2E         | Playwright    | Full play through Classic + Listening + Sentence                          |
| Perf        | Lighthouse + RUM | FPS / memory                                                            |
| Visual      | Playwright    | GameFinished view × 3 languages                                          |
| Chaos       | Chrome DevTools network throttling | Slow 3G + offline reconnect                              |

**P0**: Playwright E2E across top 5 modes. **P1**: RPC idempotency unit + integration. **P2**: visual diff on GameFinished.

---

## 14. Production Readiness Score (Game Modes)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 4     | Mature; covers 15 modes                                                                     |
| Security        | 3     | Server-side score validation must be confirmed; idempotency partially in place               |
| Performance     | 3     | Vocab lazy-load good; some modes hit memory under long sessions                              |
| Accessibility   | 3     | Live regions partial; reduced-motion respected                                                |
| Reliability     | 4     | Save queue + retries                                                                        |
| Observability   | 2     | No formal alerts                                                                            |
| Data integrity  | 4     | Atomic RPC; idempotency                                                                     |

**Module readiness: 3.3 / 5.**

---

## 15. QA Success Metrics

| KPI                                | Acceptable | Warning | Critical |
|------------------------------------|------------|---------|----------|
| Game completion rate               | ≥ 90%      | 80–90%  | < 80%    |
| XP persist success                 | ≥ 99.5%    | 99–99.5%| < 99%    |
| Mode crash-free sessions           | ≥ 99.5%    | 99–99.5%| < 99%    |
| Median TTR                         | < 1.5s     | 1.5–3s  | > 3s     |
| Streak ghost increments / 10k plays | 0         | 1–5     | > 5      |
| Cheat detection rate (if enforced)  | ≥ 95%     | 80–95%  | < 80%    |

---

## 16. Self-QA Validation

**Missed initially:**
1. **OS audio focus stolen by phone call** — added GAME-EDGE-106.
2. **DOM tamper for fake correctness** — added GAME-SEC-001; server must re-derive score.
3. **Two-tab simultaneous play** — added GAME-EDGE-109; clarify policy.
4. **Round timer race on background → foreground** — added GAME-EDGE-102.
5. **Service worker stale serving an old GameActive bundle** — added GAME-EDGE-205. Cross-ref `11-PWA-MOBILE.md`.

**Dangerous assumptions:**
- "Client never lies about score" — must validate server-side.
- "All 6482 words have audio" — not guaranteed; custom words start without.
- "Animations are smooth on all devices" — low-end Android can chug; add FPS observability.

**Hidden failures:**
- Pet evolution animation can briefly cover the "Next round" CTA on small screens. Layout regression risk.
- Daily mission re-trigger after midnight TZ rollover during a long session.
