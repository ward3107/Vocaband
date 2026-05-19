# Performance & Polish — Living TODO

> **Purpose:** A reusable checklist for keeping Vocaband fast, smooth, and polished. Re-audit before any big release. Last audit: 2026-05-19. Last edit: 2026-05-19.

## Status legend
- ✅ **DONE** — verified in code
- 🟡 **PARTIAL** — works but has gaps worth closing
- 🔴 **MISSING** — not implemented yet
- ⛔ **REJECTED** — decided against (with reason)

---

## TL;DR — what's still pending

**Rejected (battery-conscious decision):**
- ⛔ Haptic feedback (`navigator.vibrate`) — vibration motor drains battery on long sessions
- ⛔ Tap / correct / level-up SFX palette — multiple `new Audio()` instances drain battery and risk audio-context exhaustion on cheap Android

**Quick wins done in commit `1c42645`:**
- ✅ Lazy-load images in card lists + modals (ClassCard, LiveChallenge chip, EditClassModal); `decoding="async"` on crop-modal image
- ✅ Convert 4 dashboard progress bars from `width: %` to GPU `scaleX`
- ✅ Delete orphaned `google-oauth-logo.{png,svg}`
- ✅ WebP/AVIF — confirmed moot (only favicons + OG image remain; both must stay PNG)

**Done in this session:**
- ✅ Adaptive next-word audio preload (commit `46791c9`)
- ✅ Tiered streak combo glow on game header (commit `181b822`)
- ✅ Optimistic UI verified — all 15 game modes already pass through hooks that update state synchronously before `saveScore` writes
- ✅ Skeleton screens — re-audit found 23 `animate-pulse` skeleton states already inlined across dashboard cards (`PetEvolutionCard`, `ReviewQueueCard`, `DailyMissionsCard`, `ClassMinuteCard`, etc.). Initial audit missed them because they're per-card, not a shared `<Skeleton>` primitive
- ⛔ Music ducking — moot. Background music lives only in `QuickPlayMonitor.tsx` (teacher projector); all `speak()`/TTS calls live in student game views. Two audio streams never coexist on the same device

**Nothing material left in the original list.** Re-audit before the next big release using "audit performance against `docs/performance-polish-todo.md`".

---

## 1. Load speed

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 1.1 | Split `App.tsx` + lazy-loaded routes | ✅ DONE | `App.tsx` now 1,192 lines (was 5,800). `src/lib/lazyWithRetry.ts:39-65` wraps `React.lazy` with retry + stale-deploy recovery | — |
| 1.2 | Lazy vocabulary load | ✅ DONE | `src/hooks/useVocabularyLazy.ts:43-58` defers 370kB chunk until auth | — |
| 1.3 | Audio preloading | ✅ DONE | `useAudio.ts` Howler.js lazy-loaded, `preloadMany()` batches, LRU cache (100 words) | — |
| 1.4 | Cloudflare Worker caching | ✅ DONE | `worker/index.ts:277` — `public, s-maxage=60, stale-while-revalidate=300`; HTML never aggressively cached | — |
| 1.5 | Vite manual chunks | ✅ DONE | `vite.config.ts:519-549` — vocab/sentry/react/motion/supabase chunks split | — |
| 1.6 | Image lazy-loading attribute | ✅ DONE | `ClassCard.tsx:286`, `LiveChallengeView.tsx:122`, `EditClassModal.tsx:264` + `decoding="async"` on `ImageCropModal.tsx:289`. TopAppBar avatar + PWA install icons kept eager (above-fold / precached) | — |
| 1.7 | WebP/AVIF image conversion | ⛔ N/A | Only 6 raster assets: favicons (must be PNG), OG image (PNG for social compat), and now-deleted Google OAuth logo. Nothing else to convert | — |

## 2. Tap response & feel

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 2.1 | `touchAction: 'manipulation'` on buttons | ✅ DONE | `AnswerOptionButton.tsx:67` + multiple components | — |
| 2.2 | 44px+ touch targets | ✅ DONE | Answer buttons 88px min-height | — |
| 2.3 | Double-tap protection | ✅ DONE | `AnswerOptionButton.tsx:33` — disabled on `feedback` state | — |
| 2.4 | Optimistic UI on answer | ✅ DONE | Audited 2026-05-19. `useGameState.ts` lines 778/851/891/657/739/922 all set feedback + score before any Supabase write. Self-contained modes (Listening, SpeedRound, Review, Idiom, WordChains) report via onFinish callbacks — no blocking awaits anywhere | — |
| 2.5 | Haptic feedback (`navigator.vibrate`) | ⛔ REJECTED | Battery drain on long study sessions. Many students share/borrow phones, vibration kills perceived battery life | — |

## 3. Animations

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 3.1 | `motion/react` everywhere | ✅ DONE | Used throughout | — |
| 3.2 | Page transitions with `AnimatePresence` | ✅ DONE | Exit/enter animations on route change | — |
| 3.3 | XP bar smooth fill | ✅ DONE | `PetCompanion.tsx` — `width` with 0.6s ease-out | — |
| 3.4 | Confetti on level-up | ✅ DONE | `useGameState.ts` — canvas-confetti lazy-loaded, 80-150 particles | — |
| 3.5 | 60fps (transform-only) | 🟡 PARTIAL | 4 dashboard progress bars now use `scaleX` (commit `1c42645`). Podium reveals in `QuickPlayMonitor.tsx:1225/1302/1346` left as-is — fire once, tiny elements, "rise from floor" effect is intentional | — |
| 3.6 | Skeleton screens (vs spinners) | ✅ DONE | Re-audit 2026-05-19: 23 `animate-pulse` skeletons inlined across `PetEvolutionCard:90-103`, `ReviewQueueCard:79-87`, `DailyMissionsCard:118-130`, `ClassMinuteCard:88-98`, plus others. No shared primitive but each card's bespoke layout matches its loaded shape — better than a generic `<Skeleton>` | — |
| 3.7 | Streak combo fire/lightning | ✅ DONE | `GameHeader.tsx:30-43` four-tier glow (normal/warm/hot/blazing) with pulse and sweeping shine at tier 10+ (commit `181b822`) | — |

## 4. Network & backend

| # | Item | Status | Evidence | Effort |
|---|------|--------|----------|--------|
| 4.1 | Batched Supabase calls | ✅ DONE | `useAuthRestore.ts`, `useClassSwitch.ts`, `useTeacherData.ts` use `Promise.all` / `Promise.allSettled` | — |
| 4.2 | Service worker / PWA / offline | ✅ DONE | `vite.config.ts` VitePWA + Workbox; `src/main.tsx` registers `/sw.js`; manifest configured | — |
| 4.3 | CDN audio (R2) | ✅ DONE | `useAudio.ts` — Cloudflare R2 with Supabase fallback | — |
| 4.4 | Realtime subscriptions with cleanup | ✅ DONE | `useDashboardPolling.ts` — `.channel().on().subscribe()` + unsubscribe on unmount | — |
| 4.5 | Pre-render next question | ✅ DONE | `useAppMiscEffects.ts` effect #12 (commit `46791c9`) preloads the next two upcoming word MP3s as `currentIndex` advances. No images to prefetch — game UI is emoji-based and word data sits in-memory after the vocabulary chunk lands | — |

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
| 6.3 | Tap / correct / level-up SFX | ⛔ REJECTED | Multiple `new Audio()` channels drain battery and stress audio context on cheap Android. Only the wrong-answer buzzer stays | — |
| 6.4 | Music ducking on TTS | ⛔ N/A | Re-checked 2026-05-19: music only renders in `QuickPlayMonitor.tsx` (teacher projector view), every `speak()` call lives in student game views. Music and TTS never play on the same device — nothing to duck | — |

---

## Next time you re-audit

Likely fresh gaps to look for (they aren't problems today, but they show up as the app grows):
- Bundle size creep — re-check `dist/` after big features land
- New images added without `loading="lazy"` or in PNG instead of WebP
- New views that fetch data but don't render a skeleton state
- New animations that touch `width`/`height` instead of `transform`
- Realtime subscriptions added without cleanup on unmount

## What NOT to do (anti-patterns to avoid)
- Don't add a JS animation library on top of `motion/react` — it's already optimal
- Don't switch from React 19 / Vite — already top-tier
- Don't make a native iOS/Android app — PWA + service worker already covers offline
- Don't add haptic feedback or extra SFX channels — rejected for battery reasons (see TL;DR)

---

## How to use this file
1. Before any release, re-run the audit (just ask Claude: "audit performance against `docs/performance-polish-todo.md`")
2. When you finish an item, change 🔴/🟡 → ✅ and add evidence
3. When you spot a new gap, add a new row
4. Date the audit at the top
