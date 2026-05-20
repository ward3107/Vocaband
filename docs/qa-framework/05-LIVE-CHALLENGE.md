# 05 — Live Challenge (Real-Time Classroom Podium)

> Teacher launches a synchronized challenge in front of the class; students join from their devices; live leaderboard projects on teacher screen.
>
> Key files: `src/views/LiveChallengeView.tsx`, `src/views/LiveChallengeClassSelectView.tsx`, `src/views/TeacherLiveScreens.tsx`, `src/components/CompetitionLeaderboardModal.tsx`, `src/hooks/useLiveChallengeSocket.ts`, `src/hooks/useLiveChallengeEvents.ts`, `src/hooks/useCompetitions.ts`, `src/core/types.ts` (SOCKET_EVENTS), `server.ts` (socket.io).

---

## 1. Purpose of Module

- **What:** Real-time, teacher-led classroom mode. All students answer the same words simultaneously; podium animates per round; final winners revealed.
- **Who:** Teacher (host) + entire class on individual devices.
- **Why:** High-engagement, high-visibility experience; flagship feature for marketing + retention.
- **Criticality:** **S1** — if it fails live in a classroom, teacher loses face in front of 30 students. Hard to recover trust.

---

## 2. User Flow Mapping

### 2.1 Happy path

```
Teacher → Class card → "Live Challenge"
→ LiveChallengeClassSelectView (already in class context)
→ Pick assignment + modes for challenge
→ "Start" → socket.io connect to /socket.io with teacher token
→ Server creates `challenge` session with code
→ Teacher screen shows join code + QR
→ Students on their devices: dashboard → "Join live" → enter code OR scan QR
→ Each student socket connects, server validates class membership
→ When N students joined OR teacher taps "Begin"
   → server emits ROUND_START with word + answer options + 30s timer
→ Students submit; server scores; emits LEADERBOARD_UPDATE
→ After last round → CHALLENGE_END with final podium
→ Teacher screen: podium with top 3 + class average
→ Confetti; XP awarded to all participants per server rules
```

### 2.2 Alternate / failure paths

| Path                                            | Detection                                | Recovery                                                                |
|-------------------------------------------------|------------------------------------------|-------------------------------------------------------------------------|
| Student disconnects mid-round                    | socket disconnect event                  | Server marks as away; student rejoins → restores last known round       |
| Teacher refreshes page                          | socket disconnect                        | Server preserves session for 5 min; teacher rejoin restores host        |
| Teacher closes tab                               | socket close                             | Server ends session after grace period; students see "Host left"        |
| Worker → Fly socket upgrade fails               | upgrade rejected                          | Client retries with backoff; banner "Reconnecting"                      |
| Time skew between teacher and students          | server-authoritative timer                | Server emits round end deterministically; clients sync via server time  |
| Latecomer joins after round 3                    | join after start                          | Latecomer counted from current round; missing rounds = 0 XP             |

---

## 3. Functional QA Scenarios

| ID            | Scenario                                          | Steps                                                                                  | Expected                                                                                       | Severity | Priority |
|---------------|---------------------------------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|----------|----------|
| LIVE-FUNC-001 | Teacher starts challenge                          | Teacher → Live → pick assignment → Start                                                | Code + QR shown; socket joined                                                                  | S1       | P0       |
| LIVE-FUNC-002 | Student joins via code                            | Student → dashboard → Join → type code                                                  | Joins lobby; teacher screen counter increments                                                  | S1       | P0       |
| LIVE-FUNC-003 | Student joins via QR                              | Open QR-encoded URL                                                                     | Auto-join after auth                                                                            | S2       | P0       |
| LIVE-FUNC-004 | Begin round                                       | Teacher → Begin                                                                         | All students receive ROUND_START within 500ms                                                  | S1       | P0       |
| LIVE-FUNC-005 | Round timer countdown                             | Wait                                                                                    | Timer matches teacher screen ±300ms across all clients                                          | S2       | P0       |
| LIVE-FUNC-006 | Leaderboard updates after each round              | Round ends                                                                              | Teacher screen reorders; smooth animation                                                       | S2       | P1       |
| LIVE-FUNC-007 | Final podium                                      | Last round ends                                                                         | Top 3 with confetti; XP distributed                                                            | S2       | P0       |
| LIVE-FUNC-008 | Student reconnect within grace                    | Kill socket → reconnect                                                                 | Resumes at current round; doesn't lose prior score                                              | S2       | P0       |
| LIVE-FUNC-009 | Teacher reconnect                                  | Refresh teacher tab                                                                     | Host restored; session continues                                                                | S2       | P0       |
| LIVE-FUNC-010 | Pause / resume by teacher                         | Tap pause                                                                               | Timer freezes for all; resume continues                                                         | S2       | P1       |
| LIVE-FUNC-011 | Skip round                                         | Teacher skip                                                                            | Server emits ROUND_END(skipped); next round starts                                              | S3       | P1       |
| LIVE-FUNC-012 | Eject student                                      | Teacher → roster → eject                                                                | Server disconnects student; cannot rejoin same session                                          | S3       | P2       |
| LIVE-FUNC-013 | 30+ students load test                            | 30 simulated joiners                                                                     | All receive events; latency < 1s                                                                | S2       | P0       |
| LIVE-FUNC-014 | Same student joins from 2 devices                  | Phone + tablet                                                                          | Server links by user_id; latest socket wins; UX warns "Joined on another device"               | S3       | P2       |
| LIVE-FUNC-015 | End challenge early                                | Teacher → End                                                                            | Server emits CHALLENGE_END; awards XP for completed rounds                                      | S2       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                | Expected                                                  |
|---------------|--------------------------------------|-----------------------------------------------------------|
| LIVE-EDGE-001 | Empty word list assignment           | Cannot start; UI blocked                                  |
| LIVE-EDGE-002 | Assignment edited mid-challenge      | Current challenge uses snapshot from start                |
| LIVE-EDGE-003 | Tie at podium                         | Show tied positions correctly                             |
| LIVE-EDGE-004 | Student name length on podium        | Truncated with ellipsis on TV display                     |
| LIVE-EDGE-005 | Round timer = 0 with no submissions   | Score = 0 for all; continue                               |

### 4.2 User-behavior edge cases

| ID            | Behavior                                                                  | Expected                                                  |
|---------------|---------------------------------------------------------------------------|-----------------------------------------------------------|
| LIVE-EDGE-101 | Student spam-clicks answer                                                | Single submit; subsequent ignored                         |
| LIVE-EDGE-102 | Student switches between Classic dashboard and Live                       | If in Live session, dashboard not switched until end      |
| LIVE-EDGE-103 | Teacher minimizes browser; rejoins from PWA                               | Same session                                              |
| LIVE-EDGE-104 | Student rotates device                                                    | Layout reflows; state preserved                           |
| LIVE-EDGE-105 | Wi-Fi router reboot mid-session                                           | Clients auto-reconnect within 30s grace                   |
| LIVE-EDGE-106 | Teacher's projector goes to sleep                                         | Session still running; resumed when projector wakes       |
| LIVE-EDGE-107 | Student joins with wrong code                                             | "Invalid code" + retry                                    |
| LIVE-EDGE-108 | Student joins from class A while session is in class B                    | Server validates class match; rejects                     |
| LIVE-EDGE-109 | Student tab backgrounded                                                  | Receives events; score normally                           |

### 4.3 Infrastructure edge cases

| ID            | Failure                                              | Expected                                                              |
|---------------|------------------------------------------------------|-----------------------------------------------------------------------|
| LIVE-EDGE-201 | Cloudflare Worker → Fly websocket upgrade fails      | Client falls back to long-polling transport                          |
| LIVE-EDGE-202 | Fly.io single-region outage                          | Cloudflare returns 5xx; classroom shown "Service degraded"           |
| LIVE-EDGE-203 | Server-side memory leak after 100 sessions           | Health check restarts pod; sessions migrated (if sticky) or recreated|
| LIVE-EDGE-204 | Sticky session breaks                                | If Fly has multiple machines, session id must include machine pin OR be Redis-backed |
| LIVE-EDGE-205 | NAT mobile hotspot disconnects all students at once  | Server queues events; reconnect floods handled with backoff          |
| LIVE-EDGE-206 | Clock drift on Fly.io VM                             | Server uses monotonic timer for round duration                       |

### 4.4 Concurrency edge cases

| ID            | Scenario                                                                  | Expected                                                  |
|---------------|---------------------------------------------------------------------------|-----------------------------------------------------------|
| LIVE-EDGE-301 | 30 submissions at exactly the timer expiry                                | All accepted if before server's ROUND_END timestamp       |
| LIVE-EDGE-302 | Submissions arrive after ROUND_END                                        | Server returns "round closed"; client UI shows neutrally  |
| LIVE-EDGE-303 | Two students tie on time-of-correct                                        | Tie-break rule (e.g. earlier submit wins by sub-ms server time) |
| LIVE-EDGE-304 | Teacher hits Begin twice                                                  | Idempotent; second emit ignored                           |

---

## 5. Security QA

| ID            | Attack                                                          | Exploit                                                                                          | Expected secure behavior                                                                       |
|---------------|------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| LIVE-SEC-001  | Spoof teacher socket and emit ROUND_START                        | Open socket with student token, send teacher events                                              | Server checks `role === teacher` AND owns the session                                          |
| LIVE-SEC-002  | Submit answer as another student                                  | Send SUBMIT_ANSWER with someone else's user_id                                                   | Server uses socket-authenticated identity, ignores client-sent user_id                         |
| LIVE-SEC-003  | Join challenge for class not enrolled in                          | Forge class_id                                                                                    | Server cross-checks `users.class_id`                                                            |
| LIVE-SEC-004  | Bot-flood join                                                    | Connect 1000 sockets with valid student token                                                    | Rate limit: 1 connection per user; 5 concurrent total per IP                                  |
| LIVE-SEC-005  | Replay leaderboard events                                          | Capture and replay                                                                                | Events carry monotonic sequence number; out-of-order ignored                                  |
| LIVE-SEC-006  | DoS via large payload                                              | Send 10MB SUBMIT_ANSWER                                                                          | Server has max payload size (e.g. 4KB) per event                                                |
| LIVE-SEC-007  | XSS via display name on podium                                    | Display name like `<svg onload=...>`                                                              | Always rendered as text node                                                                    |
| LIVE-SEC-008  | Steal session ID via QR captured on social media                  | QR shared publicly                                                                                | QR encodes single-use join token + expires when challenge ends                                  |
| LIVE-SEC-009  | Submit answer before ROUND_START                                  | Send SUBMIT_ANSWER early                                                                          | Server rejects until round active                                                              |
| LIVE-SEC-010  | Cancel mid-round to dodge low score                               | Disconnect intentionally                                                                          | Final score includes attended rounds only; tracked separately                                  |

---

## 6. Accessibility QA

| ID             | Check                                                  | Expected                                          |
|----------------|--------------------------------------------------------|---------------------------------------------------|
| LIVE-A11Y-001  | Podium readable by screen reader                       | Rank, name, score                                  |
| LIVE-A11Y-002  | Timer announced periodically                           | Avoid spam; announce at 10s, 5s, 0s               |
| LIVE-A11Y-003  | Confetti respects reduced motion                       | Replace with static graphic                        |
| LIVE-A11Y-004  | High-contrast TV-projection mode                       | All text > 24pt; min contrast 7:1 for projector   |
| LIVE-A11Y-005  | Color-blind palette for leaderboard delta              | Use icons for rising/falling                       |
| LIVE-A11Y-006  | RTL podium                                             | Top→down still semantically correct                |

---

## 7. Responsive & Device QA

| ID            | Device                                  | Check                                                                |
|---------------|-----------------------------------------|----------------------------------------------------------------------|
| LIVE-RESP-001 | Teacher screen (TV / projector 1080p)   | Layout optimized for 1080p; large fonts                              |
| LIVE-RESP-002 | Teacher iPad casting to AirPlay         | No iOS UI overlays on projector                                      |
| LIVE-RESP-003 | Student phones 360–414px wide          | Answer buttons accessible                                            |
| LIVE-RESP-004 | Student Chromebook                       | Mouse + keyboard parity                                              |
| LIVE-RESP-005 | Old Android Chrome 80                    | Polyfills socket.io / fetch                                          |
| LIVE-RESP-006 | iPad split-screen / Stage Manager        | Usable at 50% width                                                  |
| LIVE-RESP-007 | Phone in landscape                       | Layout works                                                         |

---

## 8. Performance QA

| Metric                                | Target          | Critical    |
|--------------------------------------|-----------------|-------------|
| Socket connect time                   | < 1s            | > 3s        |
| ROUND_START → first paint on client   | < 400ms         | > 1.5s      |
| Submission RTT                        | < 300ms         | > 1s        |
| Server CPU @ 30 concurrent sessions   | < 60%           | > 85%       |
| Memory per active session             | < 5MB           | > 20MB      |
| Reconnect on lost socket              | < 5s            | > 15s       |
| Leaderboard render with 35 entries    | < 100ms         | > 300ms     |

### Load profile

- Pilot scale: 10 classrooms × 30 students = 300 sockets simultaneously.
- Scale target: 100 classrooms × 30 students = 3000 sockets.
- k6 load test must hit 5000 sockets sustained with no message loss.

---

## 9. Database Integrity QA

| ID           | Check                                                                          | Expected                                                  |
|--------------|--------------------------------------------------------------------------------|-----------------------------------------------------------|
| LIVE-DB-001  | Challenge sessions stored ephemerally OR in DB with TTL                        | Define and implement; default 7-day retention             |
| LIVE-DB-002  | Per-round scores persisted for replay/gradebook                                | Yes, via `competition_results`                            |
| LIVE-DB-003  | Final XP awarded once                                                          | Idempotency via session_id                                |
| LIVE-DB-004  | No PII in challenge replay outside of class scope                               | Verified                                                  |
| LIVE-DB-005  | Index on `competition_results(class_id, started_at)`                            | Verified                                                  |

---

## 10. API & WebSocket QA

### Socket events (per `src/core/types.ts`)

| Event                | Direction       | Payload                                                                           |
|----------------------|-----------------|------------------------------------------------------------------------------------|
| CHALLENGE_JOIN       | client→server   | { joinCode, role }                                                                 |
| CHALLENGE_JOINED     | server→client   | { sessionId, participants, currentRound }                                          |
| ROUND_START          | server→client   | { roundIndex, word, options, deadline }                                            |
| SUBMIT_ANSWER        | client→server   | { roundIndex, answer }                                                             |
| ROUND_END            | server→client   | { roundIndex, leaderboard, correct }                                               |
| LEADERBOARD_UPDATE   | server→client   | { entries }                                                                        |
| CHALLENGE_END        | server→client   | { finalPodium, xpAwarded }                                                         |
| PARTICIPANT_LEFT     | server→client   | { userId }                                                                         |
| HOST_LEFT            | server→client   | {}                                                                                  |
| ERROR                | server→client   | { code, message }                                                                  |

| ID            | Check                                                                  | Expected                                                  |
|---------------|------------------------------------------------------------------------|-----------------------------------------------------------|
| LIVE-API-001  | Each event schema validated                                            | Reject malformed; emit ERROR                              |
| LIVE-API-002  | Auth on connect via JWT (Sec-WebSocket-Protocol or query)              | 401 close on missing/invalid                              |
| LIVE-API-003  | Heartbeat / ping every 25s                                              | Stale sockets pruned                                      |
| LIVE-API-004  | Max payload 4KB                                                         | Larger → close 1009                                       |
| LIVE-API-005  | Backpressure: drop low-priority events under load                       | LEADERBOARD_UPDATE coalesces                              |
| LIVE-API-006  | Reconnect resumes with `sessionId + lastSeq`                            | Server replays missed events                              |
| LIVE-API-007  | CORS / Origin check                                                     | Only vocaband.com origins                                 |
| LIVE-API-008  | Rate limit per socket (5 events/sec)                                    | Excess closed 1008                                        |

---

## 11. State Management QA

| ID             | Check                                                                          | Expected                                                  |
|----------------|--------------------------------------------------------------------------------|-----------------------------------------------------------|
| LIVE-STATE-001 | Local round state matches server `lastSeq`                                    | Reconcile on reconnect                                    |
| LIVE-STATE-002 | Optimistic UI on answer submit                                                | Locks button; awaits ack                                  |
| LIVE-STATE-003 | Leaderboard differential animation                                              | Compute via previous-vs-next; no flicker                  |
| LIVE-STATE-004 | Teacher screen disconnect doesn't crash students                                | Students continue; show "Waiting for host"                |
| LIVE-STATE-005 | Final XP applied in single transaction                                          | Verified                                                  |

---

## 12. Observability & Monitoring QA

| ID            | Signal                                                | Threshold                          | Indicates                          |
|---------------|--------------------------------------------------------|------------------------------------|------------------------------------|
| LIVE-OBS-001  | Active socket count                                    | > 80% capacity → alert             | Need to scale Fly machines         |
| LIVE-OBS-002  | Disconnect rate / minute                                | > 5% → alert                       | Network or backend issue           |
| LIVE-OBS-003  | Reconnect success rate                                  | < 95% → alert                      | Recovery broken                    |
| LIVE-OBS-004  | Event RTT p95                                          | > 1s → alert                       | Latency issue                      |
| LIVE-OBS-005  | Failed JWT on socket connect                            | spike → investigate                | Tampering                          |
| LIVE-OBS-006  | Memory per Fly machine                                  | > 80% → alert                      | Leak / scale-out needed            |
| LIVE-OBS-007  | Out-of-order event count                                | > 0 → review                       | Sequencing bug                     |

---

## 13. QA Automation Strategy

| Layer       | Tool          | Coverage                                                                |
|-------------|---------------|--------------------------------------------------------------------------|
| Unit        | Vitest        | event reducer in `useLiveChallengeEvents`                                |
| Integration | mocha + socket.io-client | server event contract                                       |
| E2E         | Playwright × N tabs | full session w/ teacher + 5 students                              |
| Load        | k6 + xk6-websockets | 5000 concurrent sockets                                          |
| Chaos       | toxiproxy     | latency, jitter, packet loss                                            |
| Security    | OWASP ZAP / custom | event spoofing, auth bypass                                        |

**P0**: E2E with 1 teacher + 5 students; load with 300 sockets. **P1**: 5000 socket k6 stress.

---

## 14. Production Readiness Score (Live Challenge)

| Dimension       | Score | Notes                                                                                          |
|-----------------|-------|------------------------------------------------------------------------------------------------|
| Functional      | 3     | Works for pilot scale; reconnect semantics need explicit tests                                   |
| Security        | 3     | Role enforcement essential; rate-limit on socket events to be verified                          |
| Performance     | 2     | No published load test result yet at 5000 sockets                                                |
| Accessibility   | 3     | Projection mode + reduced motion partially addressed                                             |
| Reliability     | 2     | Single-region Fly; needs failover plan                                                          |
| Observability   | 2     | Limited; needs RUM for socket health                                                            |
| Data integrity  | 4     | Server-authoritative scoring + idempotent XP                                                    |

**Module readiness: 2.7 / 5 — needs load testing + reliability work before scaling beyond pilots.**

---

## 15. QA Success Metrics

| KPI                                  | Acceptable | Warning  | Critical |
|--------------------------------------|------------|----------|----------|
| Session completion rate              | ≥ 95%      | 90–95%   | < 90%    |
| Mean event RTT                       | < 250ms    | 250–800ms| > 800ms  |
| Disconnect rate / session            | < 5%       | 5–15%    | > 15%    |
| Reconnect success                    | ≥ 95%      | 90–95%   | < 90%    |
| Score discrepancy (teacher vs client) | 0         | 1        | > 1      |
| Host abandon → session orphan        | 0          | 1        | > 1      |

---

## 16. Self-QA Validation

**Missed initially:**
1. **Sticky-session requirement** — added LIVE-EDGE-204. If Fly.io scales to multiple VMs, socket.io must use Redis adapter or Fly's sticky routing.
2. **QR code social-media leak** — added LIVE-SEC-008.
3. **Round-end race condition with last submission** — covered in LIVE-EDGE-301 / 302 with server timestamp tie-break.
4. **Tie at podium** — added LIVE-EDGE-003.
5. **Latecomer joins after round 3** — added in user flow §2.2; needs server logic to start them at current round.
6. **Eject student** — added LIVE-FUNC-012; need server-emitted disconnect.

**Dangerous assumptions:**
- "30 students fit in one Fly machine" — true today; verify at 100+ students per session.
- "Reconnect within 30s grace works" — must explicitly test.

**Hidden failures:**
- Schools with classroom NAT often see all students share one external IP → IP-based rate limits may misfire. Whitelist class-mode hosts or rate-limit per token instead of IP.
- TV projector at 720p may render leaderboard text too small; test at common classroom resolutions.
