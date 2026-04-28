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

---

## 11. Parked future plans

- **Multi-subject expansion** (Tanakh / Geography / Hebrew-as-L2 / Sciences).
  Engine is mostly subject-agnostic — generalizing `Word → StudyCard` is
  ~1 week of work and 6× the addressable market.  Defer until paywall is
  landed and English-teacher revenue is meaningful.

---

## 12. Quick Play / Live Play — debugging cheat sheet

If teachers report "I started a Live Play, students appear on the
podium but their scores never tick" or "I can't kick a student" or
"only one student appears even though my whole class joined", almost
every regression we've seen so far traces to one of these four
gotchas.  Read this BEFORE re-deriving anything from `server.ts` and
`useQuickPlaySocket.ts`.

### A. Two hook instances of `useQuickPlaySocket`

`useQuickPlaySocket()` is mounted in BOTH:
- `src/App.tsx` (around line 653) — provides the score-emit channel
  consumed by `emitScoreUpdate`
- `src/views/QuickPlayStudentView.tsx` (around line 83) — owns the
  click handler that calls `joinAsStudent`

Each instance has its own `clientIdRef`.  When the student clicks
Join, only the **QuickPlayStudentView** instance's ref is updated by
`clientIdForJoin(nickname)`.  App.tsx's instance keeps the pre-join
id in its ref.  When scores fire, they go through App.tsx's instance
→ stale clientId → server's owner-mismatch check rejects.

**Symptom on the server:** `[QP SCORE owner-mismatch] socketOwnsClient=A claimedClient=B`
where A and B are different valid UUIDs (BOTH non-`<none>`).

**Fix:** `updateScore` in `useQuickPlaySocket.ts` must read the
clientId from `sessionStorage` (the source of truth) on every emit,
NOT from `clientIdRef.current`.  Both hook instances share the
tab-scoped storage so they always agree on "what id did we just
join with".  Don't revert this without first refactoring the app to
expose a single hook instance via context.

### B. clientId persistence is sessionStorage, NOT localStorage

`vocaband_qp_client_id` and `vocaband_qp_client_id_nickname` live in
`sessionStorage` — per-tab.  This is deliberate:

- `localStorage` is shared across every tab on the same origin.  Two
  students on the same iPad or two test tabs in incognito would all
  read back the same cached id, and the server's
  `state.students.set(clientId, …)` would collapse them into one
  podium row.  Symptom: "I had 5 students join from 5 tabs and only
  one shows on the teacher's podium."
- `sessionStorage` survives refreshes within the same tab (so
  reconnect/replay works) but a separate tab — even in the same
  browser — gets a fresh id and joins as its own row.

**Side effect, by design:** closing the tab and reopening counts as
a new student.  For Quick Play this is correct because the live
session usually doesn't outlive the tab anyway.

If you ever switch back to localStorage to "fix" the side effect,
you reintroduce the multi-tab collapse bug.  Don't.

### C. UI advance must wait for server-confirmed JOIN

The hook exposes `joinedSessionCode: string | null` — set when the
server's `JOINED` reply arrives, cleared on `KICKED`,
`SESSION_ENDED`, or any `STUDENT_JOIN`-scoped error.

`QuickPlayStudentView` stashes the post-join setup in a
`pendingJoinRef` callback and only fires it from a `useEffect`
watching `joinedSessionCode`.  If the server rejects the join
(`nickname_taken`, `session_inactive`, kicked-clientId-replay,
`rate_limited`), the existing `lastError` toast surfaces and the
ref is cleared — the student stays on the join form instead of
"playing" a phantom session.

**Symptom if this is reverted:** server logs show
`[QP SCORE owner-mismatch] socketOwnsClient=<none>` (because no
JOIN ever registered the socket), client console shows
`[QP updateScore] emit` lines that go nowhere, and the user
swears they joined successfully (UI advanced optimistically).

### D. OAuth students need the auth-restore guard

`src/App.tsx`'s `restoreSession` early-returns when
`quickPlaySessionParam` is in the URL.  Without it, an
OAuth-signed-in student who scans a Live Play QR is yanked back to
their dashboard before they ever see the join form.  The QR flow
treats them like a guest for the duration — they type a nickname,
become `isGuest=true` after the join handler calls `setUser(guestUser)`,
and re-authenticate after the live session ends.

This guard mirrors the existing ones at `App.tsx:1421`
(`if (!quickPlaySessionParam) setView("public-landing")`) and
`App.tsx:1782` (`if (loading && !quickPlaySessionParam)`).  Don't
remove it.

### Quick triage checklist

When live-play scores aren't ticking, in order:

1. **`fly logs -a vocaband`** — look for `[QP SCORE accept]`
   (good) vs `[QP SCORE owner-mismatch]` (bad) lines.  The
   `socketOwnsClient` value tells you which gotcha: `<none>` →
   gotcha C (UI advance race) or D (auth restore yanked them);
   non-`<none>` differs from `claimedClient` → gotcha A (dual
   hook instances out of sync).
2. **Student DevTools console** — confirm `[QP updateScore] emit`
   fires with the SAME clientId you see at JOIN.  If different
   → gotcha A.  If never fires → check whether `quickPlayActiveSession`
   is set and `QUICKPLAY_V2` is on.
3. **Multiple tabs same browser** — `sessionStorage` per-tab means
   different clientIds; verify tabs don't share one.
4. **Same nickname in two tabs** — server rejects with
   `nickname_taken`.  This is correct — the join screen should
   stay put with a toast.  If the UI advanced anyway, gotcha C
   regressed.

---

## 13. Supabase call patterns — cost-conscious cheat sheet

Every `supabase.from(...).select(...)`, `.insert(...)`, `.update(...)`,
`.delete(...)`, and `.rpc(...)` is **one HTTP request**.  Supabase JS
does not pipeline, coalesce, or batch on the client side.  If you
want fewer Supabase calls, you batch yourself or move the work into
a server-side RPC that does multiple ops in one round trip.

### What's already optimized (don't undo)

| Hot path | Optimization |
|---|---|
| Progress writes after a game | Batched via `save_progress_batch` RPC (migration `20260518_save_progress_batch.sql`).  Instead of one INSERT per word, the array is sent in a single round trip and the RPC does the bulk insert.  |
| Audio MP3 fetches (`/storage/v1/object/public/sound/<id>.mp3`) | Public bucket = cacheable.  Cloudflare caches at the edge — only the FIRST fetch of each MP3 hits Supabase egress; every subsequent fetch is free. |
| Motivational MP3s (`/storage/v1/object/public/motivational/*.mp3`) | Same as above — public bucket, edge-cached. |
| Class lookup by code | Server-side rate limit 30/min/user inside `class_lookup_by_code` RPC (migration `20260505_class_lookup_fix_ambiguous_column.sql`).  A buggy client retry loop can't blow up the request count.  |
| Auth session cache | The Supabase JS client caches the session in localStorage.  `supabase.auth.getSession()` is a local read, no network — call it freely.  |

### Volume estimate (typical Live Play session)

- 30 students × 30 words × 5 modes ≈ **4,500 storage GETs** for word
  audio, dropping to ~30 unique URLs after Cloudflare caches them.
- 30 × 1 = **30 concurrent realtime websocket connections** (1 per
  student tab).  Realtime is billed by concurrent connections, not
  per-message.
- 30 students × ~3 RPCs per join (`class_lookup_by_code`,
  `get_or_create_student_profile_oauth`, `save_progress_batch`)
  ≈ **90 RPCs** total per session.

The audio fetches dominate; the RPCs are negligible by comparison.

### Patterns to AVOID

- **No `setInterval` polling of Supabase.**  Use Realtime
  subscriptions or React Query with `staleTime` so a re-render
  doesn't trigger a network call.  Polling at 5s × 30 students
  for an hour is 21,600 wasted requests.
- **Don't call `supabase.auth.getUser()` on every render.**  It
  re-fetches over the network.  Use `getSession()` for the
  cached JWT-only read; reserve `getUser()` for "I really need to
  re-validate the token against the server" cases.
- **Don't re-fetch teacher classes / student assignments on every
  dashboard mount** if state already has them.  The auth-restore
  path already loads them once; trust the state and let it
  stale-revalidate via Realtime.
- **Don't add fallback retry loops without rate-limit awareness.**
  If an RPC has a server-side rate limit (like
  `class_lookup_by_code`), a client-side retry on failure can
  trigger the limit and create a stuck loop.  Surface the error
  to the user instead.

### When you actually want to batch

If a future feature triggers a high-frequency write pattern (e.g. a
shared class chat, fast-tap-counter game), the playbook is:

1. Buffer events in a `useRef`-backed array on the client.
2. Flush the buffer every 1–2 seconds OR when it reaches a size
   cap, whichever comes first.
3. Send the buffer as a single argument to a `_batch` RPC that
   does the multiple ops server-side.

Example precedent: `save_progress_batch` RPC.  Mirror its shape if
you need to roll a new batched endpoint.

---

## 14. Granting teacher access — three independent gates

Three separate Supabase tables/columns gate what a teacher can do.
You have to set them all if you want a brand-new teacher to have
full feature access.  All edits go in **Supabase Dashboard → SQL
Editor**.

| Gate | Table / column | What it controls |
|---|---|---|
| Sign-up eligibility | `public.teacher_allowlist` (email) | Whether someone is allowed to sign up as a teacher.  RLS on `public.users` insert calls `is_teacher_allowed(email)`. |
| Role flag | `public.users.role = 'teacher'` | Set automatically on first sign-up if email is in `teacher_allowlist`.  **OCR access is gated on this row alone — no separate OCR allowlist.** |
| AI sentences | `public.ai_allowlist` (email) | Extra gate on top of `role='teacher'`.  Controls the AI Sentence Builder button in the assignment wizard's Step 3. |

### Standard onboarding (do BEFORE the teacher first signs in)

```sql
-- Replace teacher@school.edu with the real email; keep it lowercase
INSERT INTO public.teacher_allowlist (email)
VALUES (lower('teacher@school.edu')) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.ai_allowlist (email)
VALUES (lower('teacher@school.edu')) ON CONFLICT (email) DO NOTHING;
```

After both rows exist, the teacher signs in with Google → role is set
to `teacher` automatically → OCR + AI both work.

### Bulk add

```sql
INSERT INTO public.teacher_allowlist (email) VALUES
  (lower('alice@school.edu')),
  (lower('bob@school.edu')),
  (lower('carol@school.edu'))
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.ai_allowlist (email) VALUES
  (lower('alice@school.edu')),
  (lower('bob@school.edu')),
  (lower('carol@school.edu'))
ON CONFLICT (email) DO NOTHING;
```

### Promoting an already-signed-up student to teacher

If a user OAuth'd in before being allowlisted, they got auto-routed
to `role='student'`.  Promote them:

```sql
-- 1. Add the email to both allowlists (as above).
-- 2. Update the existing users row.
UPDATE public.users
SET role = 'teacher'
WHERE lower(email) = lower('teacher@school.edu');
```

They then need to sign out and back in for the JWT to refresh with
the new role claim.

### Verifying access

```sql
-- All three should return one row each for a fully-onboarded teacher.
SELECT email FROM public.teacher_allowlist WHERE lower(email) = lower('teacher@school.edu');
SELECT email FROM public.ai_allowlist        WHERE lower(email) = lower('teacher@school.edu');
SELECT id, email, role FROM public.users     WHERE lower(email) = lower('teacher@school.edu');
```

After sign-in, confirm AI works by opening the assignment wizard
and watching the Fly logs:

```
[features] aiSentences=true for teacher@school.edu
```

If you see `aiSentences=false: <email> is not in ai_allowlist`,
you missed step 2.

### Revoking access

```sql
-- AI only (keep them as a teacher otherwise)
DELETE FROM public.ai_allowlist WHERE lower(email) = lower('teacher@school.edu');

-- Block future sign-ups with this email (does NOT touch existing accounts)
DELETE FROM public.teacher_allowlist WHERE lower(email) = lower('teacher@school.edu');

-- Demote an existing teacher row back to student
UPDATE public.users SET role = 'student'
WHERE lower(email) = lower('teacher@school.edu');
```

### Common gotchas

- **Email casing.**  Both tables are plain TEXT comparisons —
  `Teacher@School.edu` ≠ `teacher@school.edu`.  Always insert with
  `lower(...)` and the verify queries above also use `lower(...)`.
- **OCR has no separate allowlist.**  If a teacher's role is set
  correctly, OCR works.  No additional row to add.
- **`ai_allowlist` table missing?**  The migration file is
  `supabase/migrations/20260417120000_ai_sentence_builder.sql` —
  if you're on a fresh project that hasn't applied it yet, the AI
  features endpoint logs `ai_allowlist table missing`.  Run the
  migration first.

---

## 15. Custom-word audio pipeline

When a teacher adds words that are NOT in the built-in 9,159-word
vocabulary (paste, OCR, manual entry), each gets a synthetic numeric
ID — usually `Date.now()`-based or negative — and we generate audio
for it on the fly so students hear a natural voice instead of the
robotic browser-TTS fallback.

### The flow

1. Teacher saves an assignment with custom words.  The client calls
   `requestCustomWordAudio(words)` in `src/utils/requestCustomWordAudio.ts`
   — **fire-and-forget**, never awaited.  The teacher's UI doesn't
   block on audio generation; the assignment is saved instantly.
2. That helper POSTs to `server.ts:1536` (`/api/tts/custom-words`)
   with `{ words: [{ id, english }, ...] }` and the teacher's JWT.
3. Server (Fly.io):
   - Verifies the JWT and confirms `users.role = 'teacher'`.
   - Reads `GOOGLE_AI_API_KEY` (must be set on Fly).
   - Processes words in batches of 5 (parallel).  For each word:
     - Skips if `<id>.mp3` already exists in the `sound/` storage
       bucket (idempotent — safe to call twice).
     - Calls Google Cloud Neural2 TTS via `synthesizeSpeechMp3()`.
     - Uploads to `sound/<id>.mp3` with `upsert: true`.
4. Returns `{ generated, skipped, failed, total }`.  Logged at
   `[TTS] <email>: generated=N skipped=N failed=N`.

### Where the data lives

| Asset | Location |
|---|---|
| Word metadata (English + translations) | `assignments.wordIds` array, plus your custom-words table if you store inflated word objects per-class |
| Audio file | Supabase Storage, bucket `sound/`, key `<id>.mp3` |

The two are **loosely coupled** — the audio file is just at a
predictable URL based on the ID, no foreign key.  If audio is
missing for any reason, `useAudio.ts` falls back to
`window.speechSynthesis` automatically (line 322).

### Timing

| Custom words in assignment | Approximate generation time |
|---|---|
| 5 | ~1 second |
| 30 | ~3 seconds |
| 100 | ~10 seconds |
| 500 (max per request) | ~50 seconds |

Each Google Neural2 TTS call is ~200-500ms.  Batched 5 in parallel.
Teacher never waits — the request runs in the background while they
move on.

### Failure modes — student always hears something

| What fails | What student hears |
|---|---|
| `GOOGLE_AI_API_KEY` not set on Fly | Browser TTS forever for those words |
| Google TTS rate-limit on a batch | That batch falls through to browser TTS, others succeed |
| Storage upload fails | Browser TTS for that word |
| Teacher not in `users.role='teacher'` | Request rejected (403) — should not happen if onboarding done correctly |
| Network blip from teacher → Fly | `requestCustomWordAudio` swallows it; browser TTS for the entire set |

The fallback chain in `useAudio.ts` means students never hear
silence — only quality varies.

### Things to keep in mind

- **Hard cap of 500 words per request.**  Bigger payloads get
  truncated server-side.  If you ever ship a "1000-word import"
  feature, batch the calls client-side.
- **The endpoint is teacher-only.**  Quick Play guests can't call
  it — that's why Quick Play sentences come from local templates
  not from the AI sentence endpoint.  See the architecture-split
  note in the Quick Play debugging cheat sheet (§12).
- **`sound/` bucket migration.**  When you migrate Supabase
  projects, custom-word MP3s migrate alongside the built-in ones
  via `scripts/migrate-storage.ts`.  Same bucket, same key shape.

---

