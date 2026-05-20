# 11 — PWA, Mobile, and Save Queue

> Installable PWA experience, offline guards, mobile UX, save-queue + resilience, in-page camera, and OS integration.
>
> Key files: `src/components/PwaInstallBanner.tsx`, `src/hooks/usePwaInstall.ts`, `src/hooks/useOnlineStatus.ts`, `src/hooks/useEffectiveConnection.ts`, `src/hooks/useSaveQueue.ts`, `src/hooks/useSaveQueueResilience.ts`, `src/hooks/useBeforeUnloadWhileSaving.ts`, `src/components/OfflineIndicator.tsx`, `src/components/InAppBrowserWarning.tsx`, `src/components/InPageCamera.tsx`, `src/components/MobileNav.tsx`, `src/components/AccessibilityWidget.tsx`.

---

## 1. Purpose of Module

- **What:** Ensures the SPA is installable, works under intermittent connectivity, persists pending writes, and respects mobile UX conventions (safe area, keyboard, gestures).
- **Who:** All users on mobile devices, primarily students on Chromebooks / tablets / phones.
- **Why:** Pilots target schools where students have personal devices with unreliable Wi-Fi. PWA install increases retention.
- **Criticality:** **S2** — PWA bugs are widespread but rarely catastrophic. Save queue bugs ARE catastrophic (data loss).

---

## 2. User Flow Mapping

### 2.1 Install

```
User browses for 2+ sessions on Chrome/Edge
→ PwaInstallBanner detects `beforeinstallprompt`
→ banner appears (dismissible)
→ user taps "Install" → native prompt
→ on accept: installs as standalone PWA
→ Safari (iOS): manual "Add to home screen" instructions
```

### 2.2 Offline play

```
User loses connectivity mid-game
→ useOnlineStatus fires → OfflineIndicator shown
→ Game continues; XP write queued
→ Reconnect → useSaveQueueResilience flushes → toast "Synced"
```

### 2.3 Save queue lifecycle

```
mutation called → enqueued in useSaveQueue
→ if online: dispatch immediately
→ if offline: persist to IndexedDB; UI shows pending dot
→ on online event: flush in order; retry with exponential backoff
→ useBeforeUnloadWhileSaving prevents accidental tab close while queue non-empty
```

### 2.4 In-app browser warning

```
User opens vocaband.com from Instagram in-app browser
→ UA sniff → InAppBrowserWarning modal
→ "Open in Safari/Chrome" CTA
→ Native intent or copy URL
```

---

## 3. Functional QA Scenarios

| ID            | Scenario                                                  | Steps                                                              | Expected                                                       | Severity | Priority |
|---------------|-----------------------------------------------------------|--------------------------------------------------------------------|-----------------------------------------------------------------|----------|----------|
| PWA-FUNC-001  | Banner shows on eligible device                            | Open on Chrome Android × 2 sessions                                | Banner shows                                                    | S3       | P1       |
| PWA-FUNC-002  | Install via banner                                         | Tap Install                                                         | Native prompt → install                                         | S3       | P1       |
| PWA-FUNC-003  | Standalone display mode                                    | Open from home screen                                              | No URL bar; correct splash                                      | S3       | P1       |
| PWA-FUNC-004  | iOS Safari "Add to Home Screen" instructions               | Detect iOS Safari                                                  | Inline tutorial visible                                         | S3       | P1       |
| PWA-FUNC-005  | Offline indicator appears                                  | Toggle off Wi-Fi                                                    | Banner within 2s                                                 | S2       | P0       |
| PWA-FUNC-006  | Offline play game finish                                   | Disconnect mid-finish                                              | Local save queued; UI shows "Saving when online"                | S1       | P0       |
| PWA-FUNC-007  | Reconnect flushes save queue                               | Re-enable network                                                  | Sync within 30s; toast "Saved"                                  | S1       | P0       |
| PWA-FUNC-008  | beforeunload while saving                                  | Try to close tab during pending save                               | Confirm dialog appears                                          | S2       | P0       |
| PWA-FUNC-009  | In-app browser warning on Instagram                        | Open from Instagram                                                 | Modal shown; CTA to open externally                             | S3       | P1       |
| PWA-FUNC-010  | Camera permission grant                                    | Tap OCR → camera prompt                                            | Granted → preview shown                                          | S2       | P1       |
| PWA-FUNC-011  | Camera permission denial                                   | Deny prompt                                                         | Friendly fallback to file picker                                | S3       | P1       |
| PWA-FUNC-012  | Mobile nav touch hit areas                                 | Tap each tab                                                        | ≥ 44×44px; works one-handed                                     | S3       | P1       |
| PWA-FUNC-013  | Safe area on iPhone 14 Pro                                 | Dynamic Island device                                              | Content not occluded                                             | S3       | P1       |
| PWA-FUNC-014  | Pull-to-refresh                                            | Pull from top                                                       | Disabled in-game; allowed on dashboard                          | S3       | P2       |
| PWA-FUNC-015  | Keyboard overlap on chat / inputs                          | Focus an input                                                      | Form scrolls into view                                          | S3       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Connectivity edge cases

| ID            | Failure                                                          | Expected                                                          |
|---------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| PWA-EDGE-001  | Captive portal Wi-Fi                                             | OfflineIndicator may falsely show online; ping-based detection    |
| PWA-EDGE-002  | Slow 3G                                                          | UX adapts; useEffectiveConnection adjusts                         |
| PWA-EDGE-003  | Wi-Fi flapping during play                                       | Multiple connect/disconnect events handled                        |
| PWA-EDGE-004  | Save queue corrupted in IndexedDB                                | useSaveQueueResilience recovers by clearing and warning user      |
| PWA-EDGE-005  | Tab killed by OS while queue pending                             | On next open, queue resumes                                       |
| PWA-EDGE-006  | Storage quota exceeded                                           | Evict oldest queue entries; alert                                 |
| PWA-EDGE-007  | Server returns 5xx repeatedly                                    | Exponential backoff cap (e.g. max 5 min interval)                 |
| PWA-EDGE-008  | Server returns 4xx (unrecoverable)                               | Drop from queue; surface error                                    |
| PWA-EDGE-009  | Clock skew across devices                                        | Server-side timestamps authoritative                              |

### 4.2 Service worker edge cases

| ID            | Failure                                                          | Expected                                                          |
|---------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| PWA-EDGE-101  | Old service worker serves outdated SPA                          | Skip-waiting + clients.claim → reload prompt                      |
| PWA-EDGE-102  | Cached vocab chunk for a removed word                            | Refresh chunk on assignment open                                  |
| PWA-EDGE-103  | Service worker registration fails                                | Fallback: app works without offline support                       |

### 4.3 OS edge cases

| ID            | Failure                                                          | Expected                                                          |
|---------------|------------------------------------------------------------------|-------------------------------------------------------------------|
| PWA-EDGE-201  | App backgrounded > 1h                                            | On foreground: refresh auth, refetch state                        |
| PWA-EDGE-202  | iOS audio loses focus to a call                                  | Pause game                                                        |
| PWA-EDGE-203  | Android battery saver throttles JS                               | UI degrades smoothly                                              |
| PWA-EDGE-204  | Device reboot mid-game                                           | On restart, dashboard state resumes                              |
| PWA-EDGE-205  | OS-level dark mode toggle while open                             | Respect prefers-color-scheme                                     |

---

## 5. Security QA

| ID           | Attack                                                | Exploit                                                                                 | Expected secure behavior                                                                       |
|--------------|-------------------------------------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| PWA-SEC-001  | Service worker fetches from untrusted origins         | Crafted import                                                                          | Service worker is same-origin only                                                            |
| PWA-SEC-002  | IndexedDB save queue contains JWT                     | Inspect storage                                                                          | Don't store secrets; only operation payloads                                                  |
| PWA-SEC-003  | Camera permission abuse                                | Background capture                                                                       | UI shows camera-on indicator; explicit close button                                           |
| PWA-SEC-004  | Web Share API leaking PII                              | "Share progress" includes name + score                                                  | Opt-in; sanitized share text                                                                  |
| PWA-SEC-005  | Notifications used for ads                             | Permission abuse                                                                         | Notifications opt-in, content controlled                                                      |

---

## 6. Accessibility QA

| ID             | Check                                                       | Expected                                                  |
|----------------|-------------------------------------------------------------|-----------------------------------------------------------|
| PWA-A11Y-001   | AccessibilityWidget toggleable on dashboard                | Yes; ALT+A shortcut                                       |
| PWA-A11Y-002   | High-contrast mode in widget                                | Yes                                                       |
| PWA-A11Y-003   | Larger text in widget                                       | Yes                                                       |
| PWA-A11Y-004   | Reduce motion toggle                                        | Yes                                                       |
| PWA-A11Y-005   | Save-pending state announced                                | aria-live                                                  |
| PWA-A11Y-006   | Offline indicator announced                                 | aria-live                                                  |

---

## 7. Responsive & Device QA

| ID            | Device                                  | Check                                                                |
|---------------|-----------------------------------------|----------------------------------------------------------------------|
| PWA-RESP-001  | iPhone SE → iPhone 15 Pro Max           | All viewports usable                                                  |
| PWA-RESP-002  | Galaxy A series (low-end)                | 60fps target; degrade gracefully                                      |
| PWA-RESP-003  | iPad Mini → iPad Pro                    | Layouts adapt                                                          |
| PWA-RESP-004  | Chromebook touchscreen                   | Touch + mouse parity                                                  |
| PWA-RESP-005  | Foldable Samsung Z Fold                  | Layout reflows on fold                                                |
| PWA-RESP-006  | Landscape mode                          | Game playable                                                          |

---

## 8. Performance QA

| Metric                                | Target           | Critical    |
|--------------------------------------|------------------|-------------|
| TTI on mid-tier Android               | < 5s             | > 12s       |
| Time to first interaction (low-end)   | < 7s             | > 15s       |
| Service worker cache hit rate         | > 80%            | < 50%       |
| Save queue flush time after online    | < 5s             | > 30s       |
| Memory baseline on iPhone SE          | < 200MB          | > 400MB     |
| Battery drain per 30-min session      | < 5%             | > 10%       |

---

## 9. State / Storage Integrity QA

| ID            | Check                                                                | Expected                                              |
|---------------|----------------------------------------------------------------------|-------------------------------------------------------|
| PWA-STATE-001 | Save queue persists across reload                                     | Yes                                                   |
| PWA-STATE-002 | Single source of truth (no duplicate queues)                          | Yes                                                   |
| PWA-STATE-003 | Migration when queue schema changes                                   | Yes                                                   |
| PWA-STATE-004 | Online/offline event coalescing                                       | Debounced                                             |
| PWA-STATE-005 | Service worker version stored                                          | Yes                                                   |

---

## 10. Observability & Monitoring QA

| ID            | Signal                                          | Threshold              | Indicates                          |
|---------------|--------------------------------------------------|------------------------|------------------------------------|
| PWA-OBS-001  | PWA install rate                                | Track                  | Adoption                            |
| PWA-OBS-002  | Save-queue depth p95                            | > 5 → alert            | Sync failing                        |
| PWA-OBS-003  | Save-queue retry count                          | trend up → review      | Backend instability                 |
| PWA-OBS-004  | Service worker activation lag                    | > 10s → review         | Slow rollout                        |
| PWA-OBS-005  | Offline session count / day                     | watch                  | Connectivity context                |

---

## 11. QA Automation Strategy

| Layer       | Tool         | Coverage                                                       |
|-------------|--------------|----------------------------------------------------------------|
| Unit        | Vitest       | save queue reducer, exponential backoff                        |
| E2E         | Playwright   | Offline → online flow; install prompt                          |
| Mobile      | BrowserStack | Real-device matrix                                              |
| Perf        | Lighthouse   | PWA scores                                                      |

**P0**: save-queue resilience tests. **P1**: install + offline E2E.

---

## 12. Production Readiness Score (PWA)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 4     | Save queue resilient; recent fixes                                                          |
| Security        | 4     | Standard                                                                                    |
| Performance     | 3     | Low-end Android needs more profiling                                                        |
| Accessibility   | 4     | Widget shipped                                                                              |
| Reliability     | 4     | Online/offline tested                                                                       |
| Observability   | 2     | Need queue-depth metrics                                                                    |
| Data integrity  | 4     | IndexedDB persistence                                                                       |

**Module readiness: 3.6 / 5.**

---

## 13. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| Save-queue eventually-consistent   | 100%       | < 100%   | data loss|
| Offline → online sync success      | ≥ 99%      | 95–99%   | < 95%    |
| PWA install completion rate        | n/a (KPI)  |  —       |  —       |
| Crash-free PWA sessions             | ≥ 99%      | 98–99%   | < 98%    |

---

## 14. Self-QA Validation

**Missed initially:**
1. **Captive portal false-online** — PWA-EDGE-001.
2. **Storage quota** — PWA-EDGE-006.
3. **Service worker stale** — PWA-EDGE-101.
4. **OS audio focus loss** — PWA-EDGE-202.

**Dangerous assumptions:**
- "User has reliable Wi-Fi" — many don't.
- "Save queue won't grow huge" — pathological case where backend down for hours.

**Hidden failures:**
- IndexedDB corruption silently drops mutations. Need redundancy: critical writes also store snapshot in localStorage.
- iOS Safari frequently evicts service worker caches without notice; assume cold start.
