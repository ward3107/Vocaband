# 16 — Cross-Module Failure Analysis

> Failures that span more than one module. Where module-level testing is necessary but not sufficient.

---

## 1. Auth propagation failures

### 1.1 Stale role downstream

Scenario: teacher is demoted to student by admin while logged in.

| Component             | Behavior expected                                        |
|-----------------------|----------------------------------------------------------|
| Auth (01)             | Role re-check on each route guard                        |
| Class Management (02) | Teacher views become unreachable                         |
| Assignment (03)       | Wizard inaccessible                                      |
| Live Challenge (05)   | Active session ends gracefully                           |
| Observability (12)    | Event emitted                                            |

Without explicit handling, the user can continue with cached role until refresh, possibly mutating teacher-only data. Tests must catch this.

### 1.2 Logout in tab A while play in progress in tab B

| Component             | Behavior expected                                        |
|-----------------------|----------------------------------------------------------|
| Auth (01)             | onAuthStateChange fires in both tabs                     |
| PWA (11)              | Save queue flushes before logout                         |
| Game (04)             | Tab B ends current round and saves                       |
| API (12)              | Final save accepted with last valid JWT                 |

---

## 2. Cascading failures

### 2.1 Supabase outage during school day

| Module    | Effect                                              | Mitigation                                                |
|-----------|----------------------------------------------------|-----------------------------------------------------------|
| Auth      | New logins fail                                    | Banner; honor cached session                              |
| Class     | Dashboard cannot fetch                             | Skeleton + cached data from local                         |
| Assignment| Cannot save new ones                                | Save-queue holds                                          |
| Game      | Play continues; XP queued                           | Save queue                                                |
| Live      | Cannot start new sessions                          | Inform teacher                                            |
| Quick Play| Cannot start new sessions                          | Inform teacher                                            |
| Shop      | Purchases blocked                                  | Friendly error                                            |
| API       | 502 on Fly→Supabase                                 | Pass-through                                              |

If gracefully degraded, the classroom can still finish the lesson on cached state.

### 2.2 Gemini outage

| Module    | Effect                                              | Mitigation                                                |
|-----------|----------------------------------------------------|-----------------------------------------------------------|
| Assignment| OCR + custom sentence + custom audio fail          | UI: "Try again later" + manual entry path                 |
| Game      | Sentence Builder uses pre-vetted bank              | Bank is primary; no AI fallback needed for set 1          |

### 2.3 Cloudflare incident

| Module    | Effect                                              | Mitigation                                                |
|-----------|----------------------------------------------------|-----------------------------------------------------------|
| Worker    | SPA + API unreachable                              | DNS failover backup (long-term R&D)                       |
| Static    | Cached SPA serves; new visitors fail              | Service worker existing users continue                    |

---

## 3. Shared state corruption

### 3.1 XP across modules

XP is updated by: Game finish, Shop purchase (negative), Retention (chest claim), Boosters (multiplier).

| Risk                                                      | Defense                                                      |
|-----------------------------------------------------------|---------------------------------------------------------------|
| Two concurrent writes from Game and Shop tabs              | RPC `apply_xp_delta` atomic; uses row-level lock OR optimistic-version |
| Boosters expiring mid-finish                              | Server applies booster only if active at game finish time     |
| Daily mission progresses XP retroactively                  | All progression via `apply_game_finish`                       |

### 3.2 Streak across days

| Risk                                                      | Defense                                                      |
|-----------------------------------------------------------|---------------------------------------------------------------|
| Two devices same day                                       | UNIQUE on (user_id, day)                                      |
| Cross-TZ play                                              | Class TZ used                                                 |
| Mid-night play                                             | Day boundary = class TZ midnight                              |

---

## 4. Global loading deadlocks

### 4.1 useAuthRestore + useTeacherData + useLanguage race

If all three set loading state, ensure none waits on the other indefinitely.

- useAuthRestore resolves first.
- useTeacherData / useLanguage can resolve in parallel.
- Add a master timeout (e.g. 8s) for the splash screen with a "Reload" CTA.

### 4.2 Lazy-loaded chunks failing on slow networks

If `useVocabularyLazy` fails:
- Game cannot start → fail gracefully with retry CTA.
- Don't block the rest of the dashboard.

---

## 5. Notification failures

(Notifications not yet shipped, but if added)

- Web Push subscription failure must not break onboarding.
- Permission denial path tested.
- Stale subscriptions cleaned up server-side.

---

## 6. Background job failures

- Daily mission rotation cron failing → lazy compute on read.
- Weekly challenge cron failing → same.
- Audio generation queue stuck → retry + alert; teacher should still see "Generating..." indefinitely-bounded UI.

---

## 7. Analytics inconsistencies

Different surfaces may show different numbers if they don't share a single source of truth:
- Dashboard streak vs Profile streak.
- Class average XP shown in Teacher dashboard vs Gradebook.
- Live Challenge XP awarded vs Game History.

Define canonical computations server-side and document where each surface reads from.

---

## 8. End-to-end smoke scenarios

| ID            | Scenario                                                                 | Modules touched                       | Severity |
|---------------|--------------------------------------------------------------------------|---------------------------------------|----------|
| CROSS-001     | Teacher signs up → creates class → adds students → creates assignment → student joins via class code → plays Classic → completes → XP appears | 01, 02, 03, 04, 11, 12 | S1 |
| CROSS-002     | Live Challenge with 5 students all playing simultaneously                | 01, 04, 05, 12                        | S1       |
| CROSS-003     | Quick Play guest joins → plays → ends → sign-up flow                     | 06, 01, 12                            | S2       |
| CROSS-004     | Offline session: student loses Wi-Fi → finishes game → reconnects → XP saved | 04, 11, 12                       | S1       |
| CROSS-005     | Teacher OCRs photo → words generated → audio precached → student plays Sentence Builder using custom word with new audio | 03, 09, 04 | S2 |
| CROSS-006     | Streak across midnight TZ rollover                                       | 04, 08                                | S2       |
| CROSS-007     | Booster activated → multiple games played → expires → XP correctness throughout | 04, 07, 08                  | S2       |
| CROSS-008     | Class code rotated mid-challenge                                         | 02, 05                                | S2       |
| CROSS-009     | Teacher logs out while student in Live Challenge                         | 01, 05                                | S2       |
| CROSS-010     | Hebrew student plays English Listening mode                              | 04, 09, 10                            | S2       |

---

## 9. Self-QA validation

**Missed initially:**
- Pet evolution conflict with game finish — added cross-ref to Shop and Retention modules.
- Notifications path will need explicit cross-module thinking when shipped.

**Dangerous assumptions:**
- "Modules are independent" — they share users/classes/state. Test combinations explicitly.
