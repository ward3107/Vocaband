# Vocaband — Claude Code project memory

> This file is read automatically by Claude Code at the start of every session. Keep it lean — rich detail lives in `docs/`.

---

## `!resume` — pick up where we left off

When the user types **`!resume`** at the start of a session (or asks "what was I working on"), do this in one pass:

1. Read `docs/operator-tasks.md` — what's pending on the human side (lawyer, pen-test, MoE, etc.)
2. Read `docs/open-issues.md` — what's pending on the engineering side
3. Run `git log --oneline origin/main -10` and `git branch -r --no-merged origin/main` — what shipped recently and what's pushed but unmerged
4. Reply with a 5-bullet summary in this order: **last commits → unmerged branches → operator pending → engineering pending → suggested next move**

Don't read the full archive (`docs/session-history-*.md`) unless asked — too noisy for a resume.

---

## Product overview

**Vocaband** is an English vocabulary app for Israeli schools (grades 4–9). Core audience: English-language teachers + their students, with translations into **Hebrew** and **Arabic**. Curriculum alignment: Israeli Ministry of Education vocabulary sets (**Set 1 / Set 2 / Set 3** — internal data type uses `"Set 1" | "Set 2" | "Set 3" | "Custom"`).

Gameplay loop:
- Teacher creates class → creates assignments (pick words or upload custom lists) → assigns modes
- Students log in with class code (or Google OAuth) → play 10 game modes → earn XP, streaks, avatars, titles
- Teacher watches live-challenge leaderboards + analytics

---

## Stack + deployment

**Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + motion/react + Supabase JS + socket.io-client

**Backend:**
- **Cloudflare Worker** (`worker/index.ts`) — serves static SPA, proxies `/api/*` and `/socket.io/*` to Fly.io
- **Fly.io** (`server.ts`) — REST endpoints + WebSocket server for live challenge + quick play

**Database:** Supabase (Postgres + RLS + Storage), EU (Frankfurt) region. Custom domain: `auth.vocaband.com`

**Health check:** `https://www.vocaband.com/api/health`

---

## Architecture map (key locations)

```
src/
  App.tsx                      — ~5800 lines, the orchestrator. Keep additions surgical.
  core/
    supabase.ts                — client init, type definitions (AppUser, ClassData, etc.)
    views.ts                   — View and ShopTab unions — import these, don't redeclare
    types.ts                   — SOCKET_EVENTS constants
  constants/
    game.ts                    — XP economy, shop catalogue, retention constants
  hooks/
    useAudio.ts                — word TTS + motivational audio
    useRetention.ts            — daily chest, weekly challenge, comeback, booster claims
    useBoosters.ts             — xp_booster, weekend_warrior, streak_freeze, etc.
    useLanguage.tsx            — EN / HE / AR language state + dir/RTL
  components/
    DemoMode.tsx               — standalone demo for prospective teachers
    ClassCard.tsx              — teacher dashboard per-class card
    OAuthButton.tsx            — Google sign-in
    FloatingButtons.tsx        — share-my-level + optional back-to-top
    InPageCamera.tsx           — getUserMedia camera modal for OCR
    PwaInstallBanner.tsx       — mobile install nudge
    TeacherLoginCard.tsx       — Google OAuth + email OTP login
  views/
    StudentDashboardView.tsx   — student home
    TeacherDashboardView.tsx   — teacher home
    ShopView.tsx               — big file; Arcade Lobby + all category sheets
    GameModeSelectionView.tsx  — mode picker
    GameActiveView.tsx         — game screens
    LiveChallengeView.tsx      — teacher podium
    QuickPlayStudentView.tsx   — QR join for students
  data/
    vocabulary.ts              — ALL_WORDS (6482 words). Lazy-load via useVocabularyLazy.
    sentence-bank.ts           — pre-written sentences for Sentence Builder
  locales/                     — i18n files per screen
    student/                   — ALL student-facing screens translated
supabase/
  schema.sql                   — baseline schema (idempotent)
  migrations/                  — incremental migrations (14-digit timestamps)
scripts/
  generate-audio.ts            — regenerate word MP3s
  security-pen-test.sh         — RLS pen-test (4 checks)
server.ts                      — Fly.io Express + socket.io backend
worker/index.ts                — Cloudflare Worker proxy
```

---

## Conventions

### UI design
- **Big cards over lists** — large gradient cards with frosted emoji medallion
- **Gradient palette** — indigo→violet→fuchsia (hero), fuchsia→pink→rose (shop), amber→orange→rose (XP), emerald→teal (progress)
- **Each item gets its own gradient** — add to TITLE_STYLES, BOOSTER_STYLES, etc.
- **Animations:** `motion/react`, `whileHover={{ scale: 1.02 }}` `whileTap={{ scale: 0.97 }}`
- **Shadows:** `shadow-lg shadow-<color>-500/20` on heroes, `shadow-sm` on subtle
- **Touch targets:** `type="button"` + `touchAction: 'manipulation'` + `WebkitTapHighlightColor: 'transparent'`

### Code
- Comments explain WHY, not what
- Keep components under ~200 lines
- No backwards-compat shims — delete cleanly
- Tailwind only — no inline styles except DOM-specific properties
- Translations in `Record<Language, …>` maps (en/he/ar)
- Import shared types from `core/` — never redeclare `View` or `ShopTab`

### RTL
- `useLanguage()` exposes `isRTL`, `textAlign`, `dir`
- Use `flex-row-reverse` when `isRTL`, `text-right` via `textAlign`, `dir={dir}` on root

---

## Shared definitions — don't redeclare these

| What | Where |
|---|---|
| `View` and `ShopTab` unions | `src/core/views.ts` |
| `AppUser`, `ClassData`, `AssignmentData`, `ProgressData` | `src/core/supabase.ts` |
| `SOCKET_EVENTS`, `LeaderboardEntry`, `JoinChallengePayload` | `src/core/types.ts` |
| `GameMode`, `XP_TITLES`, `PET_MILESTONES`, `CLASS_AVATARS` | `src/constants/game.ts` |
| `Language`, `useLanguage` | `src/hooks/useLanguage.tsx` |

---

## Environment variables

**Build time (Vite):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `VITE_SOCKET_URL` — socket.io target (empty in prod)

**Runtime (Fly.io):**
- `SUPABASE_SERVICE_ROLE_KEY` — admin key for SECURITY DEFINER paths
- `GOOGLE_CLOUD_API_KEY` — Gemini for OCR + sentences

Never commit `.env.local`.

---

## Deep-dive reference (moved to docs/)

| Topic | File |
|---|---|
| Quick Play / Live Play debugging | `docs/debugging-quick-play.md` |
| Supabase cost-conscious patterns | `docs/supabase-patterns.md` |
| Granting teacher access | `docs/teacher-access.md` |
| Custom-word audio pipeline | `docs/custom-audio-pipeline.md` |
| Pending operator tasks | `docs/operator-tasks.md` |
| Open issues tracking | `docs/open-issues.md` |
| April 2026 session history | `docs/session-history-2026-04.md` |
| Security overview + pen-test | `docs/SECURITY-OVERVIEW.md` |
| i18n migration pattern | `docs/I18N-MIGRATION.md` |
