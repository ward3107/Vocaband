# Vocaband — Claude Code project memory

> This file is read automatically by Claude Code at the start of every
> session.  It's the canonical "what is this project and how do we work
> in it" briefing.  Keep it lean — rich detail lives in `docs/` and is
> pulled in on demand.

---

## 1. Product overview

**Vocaband** is an English vocabulary app for Israeli schools (grades 4–9).
Core audience: English-language teachers + their students, with translations
into **Hebrew** and **Arabic** so the UI fits the country's two main first
languages.  Curriculum alignment: the Israeli Ministry of Education English
curriculum's vocabulary sets (**Set 1 / Set 2 / Set 3** — formerly called
"Bands", now renamed everywhere in UI copy; internal data type still uses
`"Set 1" | "Set 2" | "Set 3" | "Custom"` in `src/data/vocabulary.ts`).

Gameplay loop:
- Teacher creates a class (gets a join code) → creates assignments (pick
  words from Set 1/2/3 or upload custom lists) → assigns modes.
- Students log in with the class code (or via Google OAuth) → see
  assignments → play 10 different game modes on those words → earn XP,
  streaks, avatars, titles, frames, shop items.
- Teacher watches live-challenge leaderboards + post-hoc analytics.

---

## 2. Stack + deployment topology

### Frontend
- React 19 + TypeScript + Vite (client) + SSR entry for social meta tags
- Tailwind CSS (utility-first; no custom CSS files except `src/index.css`)
- motion/react for animations (Framer Motion successor)
- lucide-react for icons
- Supabase JS client (auth + DB + storage)
- socket.io-client for real-time (live challenge, quick play)

### Backend — split across two services

**Cloudflare Worker** (`worker/index.ts`, deployed via `wrangler deploy`)
- Serves the static SPA (from `dist/client/`)
- Proxies `/api/*` and `/socket.io/*` to the Render backend at
  `https://api.vocaband.com`
- Same-origin from the browser's view (no CORS preflight)

**Render service** (`server.ts`, Node + Express + socket.io)
- REST endpoints at `/api/*` (health, translate, OCR, AI sentences, …)
- WebSocket server on `/socket.io/` for live challenge + quick play
- User is on the **Starter** tier → no cold starts, single instance
- Do NOT use Redis for now — single instance means in-memory state is fine

### Database — Supabase (Postgres + RLS + Storage)
- Tables: `users`, `classes`, `assignments`, `progress`, `student_profiles`,
  `teacher_profiles`, `quick_play_sessions`, `consent_log`, `word_attempts`
- Row-level security policies per role (teacher / student / admin)
- Storage buckets: `sound/` (word audio, keyed by word id), `motivational/`
  (74 praise phrase MP3s keyed by phrase key)

### Health check
- `https://api.vocaband.com/api/health` (NOT `/health` — common mistake)

---

## 3. Architecture map (where things live)

```
src/
  App.tsx                      — ~5 800 lines, the giant orchestrator.
                                 Auth flow, view routing, socket state,
                                 back-button trap, retention + booster
                                 wiring.  We're slowly extracting views
                                 out of it, but keep additions surgical.
  core/
    supabase.ts                — client init, type definitions
                                 (AppUser, ClassData, AssignmentData,
                                 ProgressData), row-to-domain mappers
    views.ts                   — the `View` and `ShopTab` string unions
                                 — import these instead of redeclaring
                                 as `string` (widening bugs)
    types.ts                   — SOCKET_EVENTS constants +
                                 LeaderboardEntry, JoinChallengePayload
  constants/
    game.ts                    — XP economy, shop catalogue, retention
                                 constants, pet milestones, CLASS_AVATARS
                                 pool, title-style map.  Single source
                                 of truth for all game numbers.
    avatars.ts                 — all emoji avatar categories + unlock XP
  hooks/
    useAudio.ts                — word TTS + motivational audio, Howler
    useRetention.ts            — daily chest, weekly challenge, comeback,
                                 limited rotation, pet milestone claims
    useBoosters.ts             — xp_booster, weekend_warrior,
                                 streak_freeze, lucky_charm, focus_mode
    useGameState.ts            — shared game state (dead code today,
                                 but kept as future extraction target)
    useTeacherActions.ts       — handleCreateClass, handleDeleteClass,
                                 approval/assignment helpers
    useLanguage.tsx            — EN / HE / AR language state + dir/RTL
  components/
    DemoMode.tsx               — standalone demo experience for prospective
                                 teachers.  Uses a 100-word Set-1 slice
                                 from ALL_WORDS.
    ClassCard.tsx              — teacher dashboard's per-class card
    OAuthButton.tsx            — Google sign-in with sessionStorage +
                                 localStorage intended-class-code
    FloatingButtons.tsx        — share-my-level (FB/WA/IG/TT) + optional
                                 back-to-top.  Accepts `shareLevel` prop.
    dashboard/                 — Student/Teacher dashboard sub-components
      StudentTopBar.tsx        — Shop CTA + Logout (Privacy removed per
                                 user request)
      StudentGreetingCard.tsx  — hero with big avatar + XP roll-up
      RetentionStrip.tsx       — daily/weekly/comeback/limited cards
      ActiveBoostersStrip.tsx  — active-booster chips under retention
      PetCompanion.tsx         — floating pet bubble with claim button
      EditClassModal.tsx       — rename + avatar picker for teachers
  views/
    StudentDashboardView.tsx   — the student home, composes the above
    TeacherDashboardView.tsx   — teacher home
    ShopView.tsx               — big file; Arcade Lobby hub + every
                                 category sheet (eggs, avatars, frames,
                                 titles, themes, powerups, boosters) +
                                 cinematic egg-opening
    GameModeSelectionView.tsx  — post-assignment mode picker
    GameModeIntroView.tsx      — "Here's how to play" per-mode intro
    GameActiveView.tsx         — the actual game screens
    GameFinishedView.tsx       — results + XP bonuses
    LiveChallengeView.tsx      — teacher's podium view
    QuickPlayStudentView.tsx   — no-account QR join for students
  data/
    vocabulary.ts              — ALL_WORDS — 9159 word objects with
                                 English + Hebrew + Arabic + Set 1/2/3
    sentence-bank.ts           — pre-written sentences for the
                                 Sentence Builder mode
supabase/
  schema.sql                   — baseline schema (idempotent — every
                                 CREATE POLICY has DROP IF EXISTS)
  migrations/                  — incremental timestamped migrations
                                 (see §6 for which haven't been applied)
scripts/
  generate-audio.ts            — regenerate word MP3s (9000+, ~1 hour)
  generate-motivational.ts     — regenerate 99 praise-phrase MP3s
  upload-audio.ts              — push audio to Supabase storage
  upload-motivational.ts       — push motivational MP3s
server.ts                      — Render Express + socket.io backend
worker/index.ts                — Cloudflare Worker proxy
```

---

## 4. Conventions

### UI design language
- **"Big cards over lists"** — every shop category, every assignment
  card, every retention card is a large gradient card with a frosted
  emoji medallion + name + subtitle + CTA.  Avoid cramped grids of
  small tiles.
- **Gradient palette** — indigo→violet→fuchsia (hero), fuchsia→pink→
  rose (shop / share), amber→orange→rose (XP / daily), emerald→teal
  (progress / completion), stone-900 (high-contrast CTAs).
- **Each item gets its own gradient** — TITLE_STYLES, BOOSTER_STYLES,
  POWERUP_STYLES, MODE_GRADIENTS in their owning files.  When adding
  a new item, add its gradient to the same map.
- **Animations**: `motion/react`, `whileHover={{ scale: 1.02 }}`
  `whileTap={{ scale: 0.97 }}`.  No CSS keyframes.
- **Shadows**: `shadow-lg shadow-<color>-500/20` on hero cards,
  `shadow-sm` on subtle ones.
- **Touch targets**: every pressable element has
  `type="button"` + `style={{ touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent' }}` so mobile taps feel
  immediate.

### Code conventions
- **Comments explain WHY, not what.** Prefer a paragraph above a
  tricky block over inline line comments.
- **Keep new components under ~200 lines.**  Extract when longer.
- **Don't add backwards-compat shims** for removed code.  Delete
  cleanly.
- **Don't add runtime `console.log`s** except as intentional
  debugging (see "Mode-selection click diagnostics" in commits —
  those are deliberate).
- **Tailwind only** — no inline styles except for `touchAction` and
  other DOM-specific properties that Tailwind can't express.
- **Translations** — everything user-facing with Hebrew + Arabic
  copy goes in the component's `Record<Language, …>` map (en/he/ar).
- **Import shared types from `core/`** — never redeclare `View` or
  `ShopTab` locally (it widens the type to `string`).

### RTL
- `useLanguage()` exposes `isRTL`, `textAlign`, `dir`.  Every layout
  that can host Hebrew/Arabic must respect these — `flex-row-reverse`
  when `isRTL`, `text-right` via `textAlign`, `dir={dir}` on the root.

---

## 5. Active workstream — `claude/fix-mobile-back-button-q3Fmc`

This branch has 12 commits ahead of `main`.  All are shipped / pushed
unless noted.  Most recent first:

| Commit | What shipped |
|---|---|
| `042e24a` | Demo had 0 words bug (wrong Set filter), Band→Set rename, mode-click debug logs, live-podium socket warning banner |
| `4c42d6d` | Made `supabase/schema.sql` idempotent — every CREATE POLICY now has a DROP IF EXISTS guard |
| `2ef448b` | Removed Privacy button from StudentTopBar; demo polished (big mode cards, Arcade-Lobby-styled shop); white-page fallback when `view='live-challenge'` but no selectedClass |
| `e3e87ea` | Teachers can rename a class + pick a curated avatar (non-destructive; students/assignments/progress preserved). Migration `20260424_add_class_avatar.sql` |
| `1cc85f5` | Boosters actually do something — `useBoosters` hook + xp multiplier + streak-freeze + lucky-charm wired into finish-game. `ActiveBoostersStrip` on dashboard |
| `a403016` | Demo mode tightened — 100-word pool, single shop entry, explainer stripped (belongs on landing) |
| `e188568` | Shop categories + greeting card redesigned with big hero cards, per-title signature styling |
| `d9eea56` | Assignment replay cap (5 max → locks), share-my-level, shop back chip, sign-out on class-not-found banner |
| `c045309` | Shop redesigned as Arcade Lobby with egg-opening cinematic |
| `9f40b7d` | Economy rebalance + retention system + sturdier class switch |
| `5cbb1a4` | Demo mode redesigned as the product's sales card |
| `128c458` | Shop eggs tab + 3D-feeling avatar cards |

---

## 6. Pending operator actions (NOT yet done)

These are things the human needs to do — no code change will cover them:

1. **Run the class-avatar migration**
   ```sql
   ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS avatar TEXT;
   ```
   Paste into Supabase → SQL editor.  The teacher UPDATE policy from
   `20260402_add_teacher_class_rls.sql` already covers the new column.

2. **(Optional) UptimeRobot ping** — not critical since they're on
   Render Starter (no cold starts), but still a good belt-and-suspenders.

3. **Regenerate + re-upload motivational audio** if phrase audio is
   still mismatched after prior spot-fixes:
   ```bash
   npx tsx scripts/generate-motivational.ts
   npx tsx scripts/upload-motivational.ts   # needs .env.local with service_role key
   ```

---

## 7. Open issues (diagnosis status)

### Live challenge podium — students don't appear
- **Status:** root cause was socket-server reachability.  User is on
  Render Starter (no cold starts) → should be reliable now.
- **New signal:** LiveChallengeView now shows a prominent amber
  banner when the socket is disconnected, so the teacher sees WHY
  the podium is empty.  Previously silent.
- **Next step:** if banner still appears after user is on Starter,
  check `wrangler tail` + Render logs on teacher's screen.

### Modes not clickable / flash but no navigation
- **Status:** unreproduced in code.  Happens on specific student
  devices.
- **New signal:** added console.log trail in GameModeSelectionView's
  onClick so `[Mode Selection] Tapped mode: <id>` etc. is visible in
  DevTools.  Three possible console signatures (see commit message).
- **Next step:** user to do Chrome remote USB-debug a phone,
  capture console when a non-clickable mode is tapped, report
  which signature shows.

### Audio file mismatch (word voices + motivational phrases)
- **Status:** code is correct (phrase keys in PHRASES array match
  generator script exactly).  Uploaded files have wrong content.
- **Cause theory:** vocabulary IDs were renumbered after audio was
  generated, or files were uploaded under wrong names.
- **Fix:** regenerate via the scripts above (user has Node.js — can
  run locally or in GitHub Codespaces).

### Live backend reachability from teacher device
- **Status:** `/health` 404'd for user — they tried `/health`
  but the real endpoint is `/api/health`.  Needs re-test.

---

## 8. Shared definitions — don't redeclare these

| What | Where |
|---|---|
| `View` and `ShopTab` unions | `src/core/views.ts` |
| `AppUser`, `ClassData`, `AssignmentData`, `ProgressData`, `mapClass`, `mapAssignment`, `mapProgress` | `src/core/supabase.ts` |
| `SOCKET_EVENTS`, `LeaderboardEntry`, `JoinChallengePayload`, `ObserveChallengePayload`, `UpdateScorePayload` | `src/core/types.ts` |
| `GameMode`, `XP_TITLES`, `PET_MILESTONES`, `MYSTERY_EGGS`, `CLASS_AVATAR_GROUPS`, `TITLE_STYLES` | `src/constants/game.ts` |
| `Language`, `useLanguage` | `src/hooks/useLanguage.tsx` |
| RLS policies for classes | migration `20260402_add_teacher_class_rls.sql` |

---

## 9. Environment variables

Required at build time (Vite):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_SOCKET_URL` — socket.io target (empty string / `/` in prod so the
  Worker proxies to Render)

Required at runtime on the Render backend:
- `SUPABASE_SERVICE_ROLE_KEY` — admin key for SECURITY DEFINER paths
- `GOOGLE_CLOUD_API_KEY` — Gemini for OCR + sentence generation

Never commit `.env.local` — it holds the service-role key.

---

## 10. Session continuity tips for future sessions

- To resume exactly where we left off: `claude --continue` (no summary)
- To start fresh but catch up fast: this file + `git log --oneline -15`
- Major feature work should update this file's §5 (workstream) + §6
  (pending operator actions) + §7 (open issues) in the same commit as
  the code change, so the next session sees an accurate picture.
