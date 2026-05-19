# Performance & Polish — Living TODO

> **Purpose:** A reusable checklist for keeping Vocaband fast, smooth, and polished. Re-audit before any big release. Last audit: 2026-05-19.

## Status legend
- ✅ **DONE** — verified in code
- 🟡 **PARTIAL** — works but has gaps worth closing
- 🔴 **MISSING** — not implemented yet

---

## TL;DR — what's still pending

**Quick wins (do first, ~1 day total):**
1. 🔴 Add `loading="lazy"` to `<img>` tags
2. 🔴 Haptic feedback on correct answer / level-up (`navigator.vibrate`)
3. 🔴 Music ducking — lower BG music when TTS plays
4. 🟡 Convert remaining `height`/`width` animations to `transform: scaleY/X` (layout thrash)

**Medium effort (~1 week total):**
5. 🟡 Sound palette — tap, correct, wrong, level-up SFX (only wrong buzzer exists)
6. 🔴 Skeleton screens replacing spinners on dashboards
7. 🟡 Convert remaining PNG/JPG assets to WebP/AVIF
8. 🟡 Pre-render next question card while current is on screen

**Bigger / nice-to-have:**
9. 🟡 Optimistic UI verification across all 15 game modes
10. 🟡 Dedicated streak combo trail effect (fire/lightning on rapid streaks)

---

## 1. Load speed

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 1.1 | Split `App.tsx` + lazy-loaded routes | ✅ DONE | `App.tsx` now 1,192 lines (was 5,800). `src/lib/lazyWithRetry.ts:39-65` wraps `React.lazy` with retry + stale-deploy recovery | — |
| 1.2 | Lazy vocabulary load | ✅ DONE | `src/hooks/useVocabularyLazy.ts:43-58` defers 370kB chunk until auth | — |
| 1.3 | Audio preloading | ✅ DONE | `useAudio.ts` Howler.js lazy-loaded, `preloadMany()` batches, LRU cache (100 words) | — |
| 1.4 | Cloudflare Worker caching | ✅ DONE | `worker/index.ts:277` — `public, s-maxage=60, stale-while-revalidate=300`; HTML never aggressively cached | — |
| 1.5 | Vite manual chunks | ✅ DONE | `vite.config.ts:519-549` — vocab/sentry/react/motion/supabase chunks split | — |
| 1.6 | Image lazy-loading attribute | 🔴 MISSING | No `loading="lazy"` on `<img>` tags anywhere | 1 hour |
| 1.7 | WebP/AVIF image conversion | 🟡 PARTIAL | No conversion plugin in `vite.config.ts`. Some assets may still be PNG | half day |

## 2. Tap response & feel

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 2.1 | `touchAction: 'manipulation'` on buttons | ✅ DONE | `AnswerOptionButton.tsx:67` + multiple components | — |
| 2.2 | 44px+ touch targets | ✅ DONE | Answer buttons 88px min-height | — |
| 2.3 | Double-tap protection | ✅ DONE | `AnswerOptionButton.tsx:33` — disabled on `feedback` state | — |
| 2.4 | Optimistic UI on answer | 🟡 PARTIAL | Callback pattern looks immediate, but not verified across all 15 modes | 1 day audit |
| 2.5 | Haptic feedback (`navigator.vibrate`) | 🔴 MISSING | Zero usage in codebase. Big "feel" win | 2 hours |

## 3. Animations

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 3.1 | `motion/react` everywhere | ✅ DONE | Used throughout | — |
| 3.2 | Page transitions with `AnimatePresence` | ✅ DONE | Exit/enter animations on route change | — |
| 3.3 | XP bar smooth fill | ✅ DONE | `PetCompanion.tsx` — `width` with 0.6s ease-out | — |
| 3.4 | Confetti on level-up | ✅ DONE | `useGameState.ts` — canvas-confetti lazy-loaded, 80-150 particles | — |
| 3.5 | 60fps (transform-only) | 🟡 PARTIAL | Layout thrash found in: `QuickPlayMonitor.tsx:1225/1302/1346` (height animations), `DailyGoalBanner.tsx:96`, `StudentGreetingCard.tsx:312`, `DailyMissionsCard.tsx:208`, `PetCompanion.tsx:171` | half day |
| 3.6 | Skeleton screens (vs spinners) | 🔴 MISSING | No skeleton pattern in codebase | 1-2 days |
| 3.7 | Streak combo fire/lightning | 🟡 PARTIAL | `ReactionParticle` emoji float exists but no dedicated combo trail | 1 day |

## 4. Network & backend

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 4.1 | Batched Supabase calls | ✅ DONE | `useAuthRestore.ts`, `useClassSwitch.ts`, `useTeacherData.ts` use `Promise.all` / `Promise.allSettled` | — |
| 4.2 | Service worker / PWA / offline | ✅ DONE | `vite.config.ts` VitePWA + Workbox; `src/main.tsx` registers `/sw.js`; manifest configured | — |
| 4.3 | CDN audio (R2) | ✅ DONE | `useAudio.ts` — Cloudflare R2 with Supabase fallback | — |
| 4.4 | Realtime subscriptions with cleanup | ✅ DONE | `useDashboardPolling.ts` — `.channel().on().subscribe()` + unsubscribe on unmount | — |
| 4.5 | Pre-render next question | 🟡 PARTIAL | Audio preloaded but next question's UI/images not prefetched | half day |

## 5. Visual polish

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 5.1 | Dark mode | ✅ DONE | Tailwind `dark:` variants throughout + `prefers-color-scheme` | — |
| 5.2 | Font loading with `font-display: swap` | ✅ DONE | `index.css` — Plus Jakarta Sans + Be Vietnam Pro | — |
| 5.3 | Gradient design language | ✅ DONE | Per CLAUDE.md conventions | — |

## 6. Sound design

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 6.1 | TTS word audio | ✅ DONE | `useAudio.ts` | — |
| 6.2 | Wrong-answer buzzer | ✅ DONE | `useAudio.ts:587-603` — oscillator | — |
| 6.3 | Tap / correct / level-up SFX | 🔴 MISSING | Only buzzer exists. Need: tap pop, correct ding, level-up fanfare | 1 day |
| 6.4 | Music ducking on TTS | 🔴 MISSING | No volume reduction logic | 2 hours |

---

## Recommended order of attack

If you have **one day** this week:
1. Add `loading="lazy"` to all `<img>` (#1.6) — 1 hour
2. Add haptic feedback on correct/level-up (#2.5) — 2 hours
3. Add music ducking (#6.4) — 2 hours
4. Add tap/correct/level-up SFX (#6.3) — 3 hours

If you have **a week**:
5. Skeleton screens for dashboards (#3.6) — 1-2 days
6. Convert layout-thrash animations to transforms (#3.5) — half day
7. WebP/AVIF conversion + audit unused images (#1.7) — half day
8. Pre-render next question (#4.5) — half day
9. Verify optimistic UI across all modes (#2.4) — 1 day

## What NOT to do (anti-patterns to avoid)
- Don't add a JS animation library on top of `motion/react` — it's already optimal
- Don't switch from React 19 / Vite — already top-tier
- Don't make a native iOS/Android app — PWA + service worker already covers offline
- Don't add 3D avatars until skeleton screens + haptics ship — those move the needle more

---

## How to use this file
1. Before any release, re-run the audit (just ask Claude: "audit performance against `docs/performance-polish-todo.md`")
2. When you finish an item, change 🔴/🟡 → ✅ and add evidence
3. When you spot a new gap, add a new row
4. Date the audit at the top
