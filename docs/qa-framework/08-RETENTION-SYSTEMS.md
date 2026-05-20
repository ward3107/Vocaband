# 08 — Retention Systems

> Daily missions, daily chest, weekly challenge, comeback bonus, streaks, badges, achievements, due-review (SRS), and other recurring engagement loops.
>
> Key files: `src/hooks/useRetention.ts`, `src/hooks/useDailyMissions.ts`, `src/hooks/useDueReviews.ts`, `src/hooks/useCompetitions.ts`, `src/hooks/useFirstTimeGuide.ts`, `src/hooks/usePetEvolution.ts`, `src/hooks/useBoosters.ts` (overlap), `src/components/DashboardOnboarding.tsx`.

---

## 1. Purpose of Module

- **What:** Hooks that compute and persist retention-incentive state: streaks, daily missions, daily chests, weekly competitions, due word reviews (spaced repetition), comeback bonuses.
- **Who:** Students primarily; some teacher visibility (per-class missions).
- **Why:** Daily/weekly active user metric is the single biggest driver of MoE adoption and word-of-mouth.
- **Criticality:** **S2** — bugs here cause real psychological harm to kids who care about their streak.

---

## 2. User Flow Mapping

### 2.1 Daily missions

```
Student opens dashboard
→ useDailyMissions reads today's missions (server RPC)
→ if missions cleared by previous day: rotate fresh set
→ display progress bars
→ play games → server progresses missions atomically
→ on complete → trophy animation + XP reward
```

### 2.2 Daily chest

```
Streak >= 1 → useRetention shows chest icon
→ tap → animation → server RPC `claim_daily_chest`
→ reward: XP, optional booster, optional cosmetic
→ next chest = tomorrow
```

### 2.3 Weekly challenge

```
Sunday 00:00 local → new weekly challenge generated
→ progress tracked through the week
→ Saturday 23:59 → final reward distributed
→ leaderboard within class
```

### 2.4 Comeback bonus

```
Student inactive ≥ 3 days → on return, useRetention triggers comeback modal
→ Reward: bonus XP + small booster
→ Hide for 24h after claim
```

### 2.5 Streak

```
Game finish → server checks last_active_date
→ if today (UTC + class TZ): no change
→ if yesterday: streak +1
→ else: streak = 1 (or 0 if streak_freeze not active)
```

### 2.6 Due reviews (SRS)

```
useDueReviews reads from spaced_review queue
→ surfaces flashcards due today
→ outcomes update interval per SM-2 / SuperMemo formula
```

### 2.7 Failure paths

| Path                                              | Detection                   | Recovery                                                     |
|---------------------------------------------------|-----------------------------|--------------------------------------------------------------|
| Mission progress lost on RPC failure              | Save queue retry            | Eventual consistency                                          |
| Chest claim duplicated (refresh during animation) | Idempotency on date         | Server returns "already claimed"                              |
| Timezone confusion (UTC vs local)                 | Server uses class TZ        | Verified                                                      |
| Streak ghost increment (race in two tabs)         | Server unique on `(user, day)` | Yes                                                       |

---

## 3. Functional QA Scenarios

| ID            | Scenario                                            | Steps                                                       | Expected                                                                  | Severity | Priority |
|---------------|-----------------------------------------------------|-------------------------------------------------------------|----------------------------------------------------------------------------|----------|----------|
| RET-FUNC-001  | First-time student sees 3 missions                 | First open                                                  | Missions populated; intro tooltip                                          | S3       | P1       |
| RET-FUNC-002  | Complete a mission                                  | Play a Classic game with 10+ correct                       | Mission ticks complete; XP awarded                                         | S2       | P0       |
| RET-FUNC-003  | All missions cleared today                          | Complete all 3                                              | "All done, see you tomorrow" message                                       | S3       | P1       |
| RET-FUNC-004  | Day rollover                                        | Midnight passes; reopen app                                 | New set of missions                                                        | S2       | P1       |
| RET-FUNC-005  | Daily chest claim                                   | Tap chest                                                    | Animation; XP added; cannot claim again today                              | S2       | P0       |
| RET-FUNC-006  | Streak +1 across midnight                           | Play yesterday, then today                                  | Streak 2                                                                   | S2       | P0       |
| RET-FUNC-007  | Skip a day → reset                                  | Play Monday, skip Tuesday, play Wednesday                  | Streak resets to 1 (unless streak_freeze)                                  | S2       | P1       |
| RET-FUNC-008  | Streak freeze used                                  | Have freeze active when skipped                              | Streak preserved                                                          | S2       | P1       |
| RET-FUNC-009  | Weekly challenge progress                            | Play across the week                                        | Progress accumulates; visible on dashboard                                | S3       | P1       |
| RET-FUNC-010  | Weekly challenge end-of-week reward                  | After Saturday 23:59                                        | Reward applied automatically                                              | S3       | P1       |
| RET-FUNC-011  | Comeback bonus after 3-day absence                   | Skip 3 days                                                  | Modal appears; reward claimable                                            | S3       | P1       |
| RET-FUNC-012  | Due-review surface                                   | Words from past assignments                                 | Flashcards offered with "Quick review" CTA                                | S3       | P1       |
| RET-FUNC-013  | Pet evolution at milestone                          | Reach PET_MILESTONE                                          | Pet evolves; animation; saved server-side                                 | S3       | P1       |
| RET-FUNC-014  | Badge awarded                                        | Hit specific criterion (e.g. 1000 XP)                       | Badge unlock animation; `useAwardBadge`                                   | S4       | P2       |
| RET-FUNC-015  | First-time guide trigger                            | New student first dashboard                                 | DashboardOnboarding tour shows                                            | S3       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                              | Expected                                                  |
|---------------|----------------------------------------------------|-----------------------------------------------------------|
| RET-EDGE-001  | Streak = 365                                        | Display correctly                                         |
| RET-EDGE-002  | Negative streak (impossible bug)                   | Floor at 0                                                |
| RET-EDGE-003  | Multiple TZ moves (kid traveling)                   | Use class TZ, not device TZ                              |
| RET-EDGE-004  | Daylight saving transition                         | Day boundary respects local time                          |
| RET-EDGE-005  | Mission progress > 100%                            | Cap at 100                                                |
| RET-EDGE-006  | Two missions completed by same game finish          | Both progress applied atomically                          |
| RET-EDGE-007  | Comeback modal eligibility recomputed mid-session   | Show only on entry; not interrupt                         |
| RET-EDGE-008  | Pet evolves to last stage                           | No further evolution; stable state                        |

### 4.2 User-behavior edge cases

| ID            | Behavior                                                                  | Expected                                                  |
|---------------|---------------------------------------------------------------------------|-----------------------------------------------------------|
| RET-EDGE-101  | Refresh during chest claim                                                | Server idempotency: second claim returns "already"        |
| RET-EDGE-102  | Background app for 8 days, return                                         | Comeback eligible; streak reset; comeback modal           |
| RET-EDGE-103  | Two tabs, one claims chest, other still shows chest                       | Other shows "Already claimed" on retry                    |
| RET-EDGE-104  | Streak freeze activated AFTER missing a day                              | Cannot retroactively save                                 |
| RET-EDGE-105  | Daily mission lost due to assignment removal                              | Substitute mission generated                              |

### 4.3 Infrastructure edge cases

| ID            | Failure                                                          | Expected                                                  |
|---------------|------------------------------------------------------------------|-----------------------------------------------------------|
| RET-EDGE-201  | Cron job to rollover missions fails                              | Lazy compute on first request next day                    |
| RET-EDGE-202  | Server time skew                                                  | Trust DB clock, not app code                              |
| RET-EDGE-203  | Cache poisoning of mission list                                  | Server is source of truth                                 |
| RET-EDGE-204  | Save-queue stall during mission progression                      | Eventual consistency on reconnect                         |

---

## 5. Security QA

| ID           | Attack                                                | Exploit                                                                                 | Expected secure behavior                                                                       |
|--------------|-------------------------------------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| RET-SEC-001  | Inflate streak via PostgREST PATCH                    | Tamper `users.streak`                                                                   | RLS forbids client writes; only RPC may                                                       |
| RET-SEC-002  | Claim chest multiple times                            | Repeated RPC                                                                            | Idempotency on (user_id, claim_date)                                                          |
| RET-SEC-003  | Forge mission completion event                        | Submit POST with mission_id and progress 100                                            | Server only progresses via game finish RPC                                                    |
| RET-SEC-004  | Backdate game play to skip a missed day                | Tamper `played_at`                                                                      | Server uses DB now()                                                                          |
| RET-SEC-005  | Stack multiple boosters indefinitely                   | Repeated activate                                                                       | Stacking policy enforced server-side                                                          |

---

## 6. Accessibility QA

| ID             | Check                                                       | Expected                                                  |
|----------------|-------------------------------------------------------------|-----------------------------------------------------------|
| RET-A11Y-001   | Mission cards have aria-labels with progress percentage    | Yes                                                       |
| RET-A11Y-002   | Chest animation reduced-motion-aware                       | Yes                                                       |
| RET-A11Y-003   | Streak number read by screen reader                        | "5 day streak"                                            |
| RET-A11Y-004   | Comeback modal trap focus                                  | Yes                                                       |
| RET-A11Y-005   | Color-only progress bar has numeric text                   | Yes                                                       |

---

## 7. Responsive & Device QA

| ID            | Device                                  | Check                                                                |
|---------------|-----------------------------------------|----------------------------------------------------------------------|
| RET-RESP-001  | Phone portrait                           | All cards stack                                                       |
| RET-RESP-002  | Tablet                                   | Horizontal scroll if many                                            |
| RET-RESP-003  | Long mission title                       | Truncates                                                             |
| RET-RESP-004  | Pet animation on low-end Android        | Lower-fidelity fallback                                              |

---

## 8. Performance QA

| Metric                                | Target          | Critical    |
|--------------------------------------|-----------------|-------------|
| Dashboard retention render            | < 800ms         | > 2s        |
| Chest claim RPC                       | < 600ms         | > 2s        |
| Mission progression update           | < 300ms after game finish | > 1s |
| Pet evolution animation                | < 16ms / frame  | jank        |

---

## 9. Database Integrity QA

| ID           | Check                                                                          | Expected                                                  |
|--------------|--------------------------------------------------------------------------------|-----------------------------------------------------------|
| RET-DB-001   | `daily_chest_claims` UNIQUE on (user_id, claim_date)                            | Yes                                                       |
| RET-DB-002   | `daily_missions` rotation: cron at 00:05 server TZ OR lazy-create               | Documented                                                |
| RET-DB-003   | Streak day stored canonically                                                    | UTC date string                                           |
| RET-DB-004   | `streak_freeze_inventory` decrement atomic                                       | Yes                                                       |
| RET-DB-005   | `weekly_challenge_progress` partitioned by ISO week                              | Yes                                                       |
| RET-DB-006   | Audit log on retention events                                                    | Yes                                                       |

---

## 10. API QA

### `POST /rest/v1/rpc/claim_daily_chest`

```json
200 → { "xp": 50, "booster": "xp_booster_2x", "balance": 600 }
409 → { "error": "already_claimed_today" }
```

| ID           | Check                                                              | Expected                                              |
|--------------|--------------------------------------------------------------------|-------------------------------------------------------|
| RET-API-001  | Auth required                                                       | Yes                                                   |
| RET-API-002  | Idempotency per day                                                 | Yes                                                   |
| RET-API-003  | Streak verified before issuing                                       | Yes                                                   |
| RET-API-004  | Audit log entry                                                     | Yes                                                   |

---

## 11. State Management QA

| ID             | Check                                                                 | Expected                                                  |
|----------------|-----------------------------------------------------------------------|-----------------------------------------------------------|
| RET-STATE-001  | Missions refetch on day rollover                                       | Yes                                                       |
| RET-STATE-002  | Chest visibility tied to claimed state                                 | Yes                                                       |
| RET-STATE-003  | Streak optimistic increment after finish                              | Reconcile with server                                     |
| RET-STATE-004  | Comeback modal only once per session                                  | Yes                                                       |

---

## 12. Observability & Monitoring QA

| ID            | Signal                                          | Threshold              | Indicates                          |
|---------------|--------------------------------------------------|------------------------|------------------------------------|
| RET-OBS-001   | Daily chest claim rate                          | drop > 30% w/w → alert | Bug or engagement drop             |
| RET-OBS-002   | Streak distribution                              | watch trends           | Health of retention                |
| RET-OBS-003   | Mission completion rate                          | watch                  | Difficulty calibration             |
| RET-OBS-004   | Streak reset due to bug (vs missed day)         | 0                      | Manual reset audit                 |
| RET-OBS-005   | Comeback modal trigger frequency                | watch                  | Validate reactivation              |

---

## 13. QA Automation Strategy

| Layer       | Tool      | Coverage                                                       |
|-------------|-----------|----------------------------------------------------------------|
| Unit        | Vitest    | streak transitions, mission progress reducer, SRS interval math|
| Integration | Supabase  | RPC idempotency                                                 |
| E2E         | Playwright | day-rollover simulation (clock injection)                     |

**P0**: streak unit tests; **P1**: chest idempotency; **P2**: SRS algorithm test.

---

## 14. Production Readiness Score (Retention)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 4     | Multiple loops shipped                                                                      |
| Security        | 4     | RPC-only writes                                                                             |
| Performance     | 4     | Cheap                                                                                       |
| Accessibility   | 3     | Animations need reduced-motion check                                                        |
| Reliability     | 3     | Cron job risk                                                                               |
| Observability   | 2     | Dashboards pending                                                                          |
| Data integrity  | 4     | Uniques + idempotency                                                                       |

**Module readiness: 3.4 / 5.**

---

## 15. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| Chest claim success                | ≥ 99.5%    | 99–99.5% | < 99%    |
| Streak ghost increments            | 0          | 1        | > 1      |
| Missions rotate on midnight        | 100%       | 99–100%  | < 99%    |
| Comeback trigger correctness        | 100%       | < 100%   | —        |
| Pet evolution duplicates            | 0          | 1        | > 1      |

---

## 16. Self-QA Validation

**Missed initially:**
1. **DST and TZ edge cases** — added RET-EDGE-003/004.
2. **Streak freeze applied retroactively** — explicitly disallowed.
3. **Mission generated for removed assignment** — added RET-EDGE-105.
4. **Pet final stage** — added RET-EDGE-008.

**Dangerous assumptions:**
- "Server cron always fires" — design for lazy compute fallback.
- "SRS algorithm stable" — verify against known SM-2 fixtures.

**Hidden failures:**
- A 100-day streak lost to a bug is a major event for a child. Add an audit + customer-support reset workflow.
- Weekly challenge completing exactly at week boundary risks tie-breaks and reward double-grant.
