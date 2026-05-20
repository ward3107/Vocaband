# 06 — Quick Play (QR-Join Guest Mode)

> Teacher generates a QR; students (or guests) scan to join an ephemeral session without going through full class-code auth. Designed for substitute teachers, demo days, and parent nights.
>
> Key files: `src/views/QuickPlaySetupView.tsx`, `src/views/QuickPlaySetupSection.tsx`, `src/views/QuickPlayStudentView.tsx`, `src/views/QuickPlayTeacherMonitorView.tsx`, `src/views/QuickPlayExitScreens.tsx`, `src/hooks/useQuickPlaySocket.ts`, `src/hooks/useQuickPlayEvents.ts`, `src/hooks/useQuickPlayRealtime.ts`, `src/hooks/useQuickPlaySessionState.ts`, `src/hooks/useQuickPlayGuestState.ts`, `src/hooks/useQuickPlayUrlBootstrap.ts`.

---

## 1. Purpose of Module

- **What:** Short, frictionless multi-player play session. Teacher picks words + modes, generates a QR, students scan and play immediately.
- **Who:** Teacher (host), students or guests (with no Vocaband account).
- **Why:** Solves the "first 30 seconds" problem in a classroom or demo; no class-code typing.
- **Criticality:** **S2** — lower than Live Challenge (no PII for guests) but high marketing weight.

---

## 2. User Flow Mapping

### 2.1 Happy path

```
Teacher dashboard → "Quick Play"
→ QuickPlaySetupView: pick set / modes / time limit
→ "Start" → server creates ephemeral session
→ QuickPlayTeacherMonitorView shows QR + join URL + live participant list
→ Student opens QR → /quick-play/<sessionId>
→ QuickPlayStudentView: choose display name (optional), choose avatar
→ socket connect with guest token (or student JWT if logged in)
→ teacher taps "Begin" → rounds start
→ student plays, sees own score + class rank
→ end of session → QuickPlayExitScreens: prompt "Save your progress?"
→ if guest: option to create class-code account; if logged-in student: progress saved
```

### 2.2 Alternate paths

| Path                                            | Detection                                   | Recovery                                                           |
|-------------------------------------------------|---------------------------------------------|--------------------------------------------------------------------|
| Teacher logs out mid-session                     | host socket close                           | Session ended; guests see "Game over"                              |
| Guest closes tab mid-session                     | socket close                                | Reconnect resumes; otherwise dropped from leaderboard              |
| Same QR rescanned after session ended            | session marked closed                        | UI shows "This game has ended"                                     |
| Guest tries to join expired session              | server validation                           | "Game not found or has ended"                                      |
| Logged-in student opens QR for another class    | server validates membership optional         | Allowed (guest mode) but no XP credited to their class             |

---

## 3. Functional QA Scenarios

| ID            | Scenario                                                          | Steps                                                              | Expected                                                                            | Severity | Priority |
|---------------|-------------------------------------------------------------------|--------------------------------------------------------------------|--------------------------------------------------------------------------------------|----------|----------|
| QP-FUNC-001   | Teacher starts session                                            | Quick Play → pick set 1 → 10 words → start                          | QR + URL displayed; session id valid                                                | S2       | P0       |
| QP-FUNC-002   | Guest joins via QR                                                | Scan QR with phone camera → opens browser                           | Lands on QuickPlayStudentView; name picker shown                                    | S2       | P0       |
| QP-FUNC-003   | Guest joins via direct URL                                        | Paste URL                                                           | Same as QR                                                                          | S3       | P1       |
| QP-FUNC-004   | Guest enters display name                                         | Type "Yoni"                                                         | Validated; socket joins; teacher monitor sees them                                  | S2       | P0       |
| QP-FUNC-005   | Guest with skip-name                                              | Continue without name                                               | Defaults to "Guest 7" or similar; teacher monitor sees them                          | S3       | P1       |
| QP-FUNC-006   | Multiple devices join same session                                | 5 phones scan                                                        | All connect; counter increments to 5                                                | S2       | P0       |
| QP-FUNC-007   | Teacher begins rounds                                             | Tap "Begin"                                                          | Round 1 starts on all clients                                                       | S2       | P0       |
| QP-FUNC-008   | Single-round play                                                  | Configure with 1 word                                                | Round plays; auto-end                                                                | S3       | P1       |
| QP-FUNC-009   | End of session                                                    | Last round ends                                                      | Exit screens shown; teacher sees podium                                              | S2       | P0       |
| QP-FUNC-010   | Save progress prompt (guest)                                      | Tap "Save"                                                           | Routed to sign-up; ephemeral score migrated to new account                          | S3       | P1       |
| QP-FUNC-011   | Save progress prompt (logged-in)                                  | Auto-saved                                                          | No prompt; XP applied to student account                                            | S3       | P1       |
| QP-FUNC-012   | Cancel from setup                                                 | Back during setup                                                    | No session created                                                                  | S3       | P2       |
| QP-FUNC-013   | Restart same configuration                                        | "Play again" after session                                          | New session id; teacher relands on monitor                                          | S3       | P2       |
| QP-FUNC-014   | Teacher leaves and returns                                        | Refresh teacher tab                                                  | Session resumes if within grace                                                     | S3       | P1       |
| QP-FUNC-015   | Dead-resume detection (guest)                                     | Guest reopens app long after session ended                          | Friendly screen: "This game has ended"; safe back to landing                        | S3       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                              | Expected                                                          |
|---------------|----------------------------------------------------|-------------------------------------------------------------------|
| QP-EDGE-001   | Display name with profanity                        | Filtered                                                          |
| QP-EDGE-002   | Display name length > 24                           | Rejected client + server                                          |
| QP-EDGE-003   | Display name in Hebrew/Arabic                      | Accepted, rendered RTL                                            |
| QP-EDGE-004   | Display name pure emoji                            | Accepted; doesn't break layout                                    |
| QP-EDGE-005   | URL with invalid sessionId                         | "Game not found"                                                  |
| QP-EDGE-006   | URL with valid but expired sessionId               | "Game has ended"                                                  |
| QP-EDGE-007   | URL deeplink while logged in as teacher            | Teacher sees "You're a teacher; join as guest?"                   |

### 4.2 User-behavior edge cases

| ID            | Behavior                                                                 | Expected                                                  |
|---------------|--------------------------------------------------------------------------|-----------------------------------------------------------|
| QP-EDGE-101   | 50 guests scan within 30 seconds                                         | All connect; rate-limit prevents abuse                    |
| QP-EDGE-102   | Same device scans QR twice                                                | Second scan reuses existing socket                        |
| QP-EDGE-103   | Guest backgrounded mid-session                                            | Resume on foreground                                      |
| QP-EDGE-104   | Browser closed mid-session                                                | Guest considered left; score frozen                       |
| QP-EDGE-105   | Guest refreshes during round                                              | Resume with last round state                              |
| QP-EDGE-106   | Multiple guests pick same name                                            | Auto-suffix or warning                                    |
| QP-EDGE-107   | Switching from QP to standard game                                        | Clean transition; no socket leak                          |
| QP-EDGE-108   | QR rescanned in private/incognito                                          | Fresh guest identity                                      |
| QP-EDGE-109   | Trapped back button in QP                                                  | `useBackButtonTrap` prevents accidental exit               |

### 4.3 Infrastructure edge cases

| ID            | Failure                                                | Expected                                                  |
|---------------|--------------------------------------------------------|-----------------------------------------------------------|
| QP-EDGE-201   | Cloudflare cached old SPA serving stale session events | Service worker version check forces reload                |
| QP-EDGE-202   | Fly socket worker restart mid-session                  | Sessions in Redis/sticky resume                           |
| QP-EDGE-203   | QR image fails to render                                | Fallback to URL text + copy button                        |
| QP-EDGE-204   | Camera scan permission denied                          | Manual URL entry                                          |
| QP-EDGE-205   | Cellular data only, slow 3G                            | Reduced asset payload; first-paint < 3s                   |

---

## 5. Security QA

| ID           | Attack                                            | Exploit                                                                                | Expected secure behavior                                                                       |
|--------------|---------------------------------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| QP-SEC-001   | QR shared on social media                          | Public access to URL                                                                   | Session id has short TTL (e.g. 30 min from creation); after end, URL dead                     |
| QP-SEC-002   | Spam-join 1000 guest sockets                       | Bot army                                                                               | Rate limit 5 connects/min/IP; cap session participants at e.g. 50                              |
| QP-SEC-003   | Profanity in display name on TV projection         | Crude name                                                                              | Filter; teacher can rename/kick                                                                |
| QP-SEC-004   | Inject markup in display name                      | `<svg onload>`                                                                          | Rendered as text                                                                                |
| QP-SEC-005   | Submit huge payload                                 | 10MB SUBMIT_ANSWER                                                                     | Server enforces 4KB cap                                                                         |
| QP-SEC-006   | Brute scan random session ids                       | Iterate UUIDs                                                                          | UUID v4 entropy; rate limit on join                                                            |
| QP-SEC-007   | Replay old session id                              | Reuse                                                                                   | Server validates "session active"                                                              |
| QP-SEC-008   | Persist guest identifier across sessions           | Cookie/fingerprint                                                                      | Guest identity ephemeral; no cross-session linkage                                              |
| QP-SEC-009   | Teacher impersonation via stolen monitor URL       | URL contains host token                                                                | Monitor URL requires teacher auth; no token in URL fragment                                    |
| QP-SEC-010   | Guest sees other guests' answers                    | Server emits full leaderboard with answers                                              | Only public columns (name, score, rank); never raw answer text                                  |

---

## 6. Accessibility QA

| ID            | Check                                                       | Expected                                                  |
|---------------|-------------------------------------------------------------|-----------------------------------------------------------|
| QP-A11Y-001   | QR has accompanying URL text                                | Yes                                                       |
| QP-A11Y-002   | Display-name input labeled                                  | Yes                                                       |
| QP-A11Y-003   | Touch targets ≥ 44px on join screen                         | Yes                                                       |
| QP-A11Y-004   | Reduced motion respected on round transitions              | Yes                                                       |
| QP-A11Y-005   | Exit screens reachable via keyboard                         | Yes                                                       |

---

## 7. Responsive & Device QA

| ID            | Device                                  | Check                                                                |
|---------------|-----------------------------------------|----------------------------------------------------------------------|
| QP-RESP-001   | Camera scan from default Android camera  | Opens browser to URL                                                 |
| QP-RESP-002   | iOS Safari camera scan                   | Same                                                                  |
| QP-RESP-003   | iPad as projection screen                | Monitor view scales                                                  |
| QP-RESP-004   | Old phone WebView (in-app browser)       | Warning + redirect                                                   |
| QP-RESP-005   | Low-end Android 5                        | Polyfills load; play works                                          |

---

## 8. Performance QA

| Metric                                | Target          | Critical    |
|--------------------------------------|-----------------|-------------|
| Time-to-join (scan → first round)     | < 5s            | > 15s       |
| QR generation                         | < 100ms         | > 500ms     |
| Socket join                            | < 1s            | > 3s        |
| Max guests per session                 | 50              | breached    |
| Memory per guest socket on server     | < 2MB           | > 5MB       |

---

## 9. Database Integrity QA

| ID           | Check                                                          | Expected                                                  |
|--------------|----------------------------------------------------------------|-----------------------------------------------------------|
| QP-DB-001   | Guests are NOT persisted in `public.users`                     | Verified                                                  |
| QP-DB-002   | Session metadata stored in ephemeral cache OR with TTL          | Verified                                                  |
| QP-DB-003   | Sign-up flow migrates ephemeral score to new account            | Yes                                                       |
| QP-DB-004   | No PII retained for non-signed-up guests                        | Verified                                                  |
| QP-DB-005   | Telemetry: aggregate counts only, no per-guest details          | Verified                                                  |

---

## 10. API & WebSocket QA

| ID           | Check                                                                  | Expected                                                  |
|--------------|------------------------------------------------------------------------|-----------------------------------------------------------|
| QP-API-001  | Session creation endpoint requires teacher auth                        | 401 otherwise                                              |
| QP-API-002  | Join endpoint allows anonymous + authenticated                          | Yes                                                       |
| QP-API-003  | Session TTL enforced                                                    | 30 min from creation by default                            |
| QP-API-004  | All events follow LIVE-API event-validation rules                      | Same suite                                                 |
| QP-API-005  | Pagination on participant list (if > 50)                                 | Yes                                                       |

---

## 11. State Management QA

| ID             | Check                                                                       | Expected                                                       |
|----------------|-----------------------------------------------------------------------------|----------------------------------------------------------------|
| QP-STATE-001   | `useQuickPlayGuestState` ephemeral, cleared on exit                         | Yes                                                            |
| QP-STATE-002   | `useQuickPlaySocket` reconnects within 5s                                    | Yes                                                            |
| QP-STATE-003   | Back-button trap (`useBackButtonTrap`) active during play                    | Yes                                                            |
| QP-STATE-004   | URL bootstrap parses session id idempotently                                | Yes                                                            |
| QP-STATE-005   | Teacher monitor unsubscribes on unmount                                      | Yes; no leak                                                   |

---

## 12. Observability & Monitoring QA

| ID            | Signal                                            | Threshold                | Indicates                          |
|---------------|--------------------------------------------------|--------------------------|------------------------------------|
| QP-OBS-001    | Sessions created / day                            | n/a                      | Adoption                            |
| QP-OBS-002    | Guests-per-session distribution                   | watch                    | Quality of experience               |
| QP-OBS-003    | Sign-up conversion from QP exit                   | watch for drops          | UX                                  |
| QP-OBS-004    | Session abandonment rate                          | < 20% acceptable         | Friction                            |
| QP-OBS-005    | Memory / Fly machine                              | < 80%                    | Need scale                          |

---

## 13. QA Automation Strategy

Same stack as Live Challenge (Playwright + k6 + Vitest). Add:

- **Mobile camera QR**: manual or BrowserStack real-device farm.
- **Visual diff** on join screen + monitor view in EN/HE/AR.

**P0**: E2E with 1 teacher + 3 guests via Playwright (using stored QR fixture). **P1**: dead-resume detection regression.

---

## 14. Production Readiness Score (Quick Play)

| Dimension       | Score | Notes                                                                                   |
|-----------------|-------|-----------------------------------------------------------------------------------------|
| Functional      | 4     | Recently hardened (PR #823 — kid-speak toasts + dead-resume detection)                  |
| Security        | 3     | Anonymous join needs careful rate-limit + payload caps                                  |
| Performance     | 3     | 50-guest cap sane; not load-tested at that scale                                        |
| Accessibility   | 3     | Trap and keyboard verified; needs SR pass                                                |
| Reliability     | 3     | Ephemeral by design; teacher reconnect grace tested                                     |
| Observability   | 2     | Sessions counter exists; alarms missing                                                  |
| Data integrity  | 4     | No persistence for guests is intentional and verified                                   |

**Module readiness: 3.1 / 5.**

---

## 15. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| Join completion (scan → play)      | ≥ 90%      | 80–90%   | < 80%    |
| Session completion                  | ≥ 85%      | 70–85%   | < 70%    |
| Mean guests per started session    | ≥ 3        | 1–3      | < 1      |
| Abuse incidents / week              | 0          | 1        | > 1      |
| Sign-up conversion from exit       | track (no SLA; product KPI) |  |       |

---

## 16. Self-QA Validation

**Missed initially:**
1. **Dead-resume detection** — covered in QP-FUNC-015 (already shipped per PR #823); add regression case.
2. **Profanity on TV** — added QP-SEC-003.
3. **Camera permission denied → manual URL entry** — added QP-EDGE-204.
4. **In-app browser warning** — already handled globally; cross-ref.
5. **Logged-in student joining QP for another class** — added in flow §2.2; allowed but no XP to original class.

**Dangerous assumptions:**
- "Guests will provide reasonable names" — they won't. Profanity + length + emoji must all be defended.
- "30-min TTL is enough" — verify in pilot; some teachers may want > 60min.

**Hidden failures:**
- QR rendered too small on low-DPI projector — verify minimum size (≥ 320×320 px at projector pixel density).
- A teacher leaving QP open all day creates a long-lived session that may attract abuse; auto-end after inactivity (e.g. 15 min idle).
