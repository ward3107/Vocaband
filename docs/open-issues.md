# Open Issues

Tracking known issues with their diagnosis status.

---

## Perf — Supabase + lucide hoisted onto the every-page entry chunk (2026-06-03) — ✅ FIXED 2026-06-09

**Status:** Fixed. Entry static closure cut **132 kB gz → 66 kB gz (−50 %)**.
Full diagnosis in `docs/perf-audit-2026-06-03.md`.

**Root cause (confirmed against real build output):** not the `manualChunks`
*names* but rolldown's own placement pass overriding them for shared modules:
- React's CJS core (`react/cjs/react.production.js`) was tied to its first
  ESM importer — the `lucide` chunk — so the entry imported React **from
  lucide** and dragged all the icons (~19 kB gz) onto the cold landing.
- Vite's `__vitePreload` helper got parked inside the `supabase` chunk, so
  the entry (which does dynamic imports) imported the helper **from supabase**
  and dragged all 200 kB / ~51 kB gz of supabase-js static.
The `manualChunks` function form is only a naming hint and can't override this.

**Fix:** migrated `rollupOptions.output` from the `manualChunks` function to
rolldown's `codeSplitting.groups` (real placement authority). React core now
lands in `react-vendor`, the preload helper gets its own `vite-preload` chunk,
and supabase/lucide stay dynamic-only. All prior splits preserved (vocabulary
/ vocabulary-hebrew / sentry / supabase stable names; lucide stays a single
chunk — no ~291-icon explosion; motion still auto-splits off the landing).

**Guardrail:** `npm run check:entry-closure` (`scripts/check-entry-closure.mjs`)
asserts no forbidden vendor re-hoists and the closure stays under an 80 kB gz
budget. Verified it fails on the pre-fix build and passes on the fix. Not yet
wired into CI — that touches `.github/` (protected); wire the step into the
build workflow when an owner can approve.

---

## Feature — School Manager (principal) Console (2026-05-25)

**Status:** Shipped on `claude/compassionate-goldberg-qNWvm`. Read-only
school-principal role + a full sidebar console (Overview · Teachers · Classes ·
Engagement) with `recharts` graphs and click-through teacher/class drill-downs,
EN/HE/AR + RTL.

Two migrations, **both applied + verified on prod (`vocaband-eu`)**:
- `20260623000000_school_manager.sql` — `schools` table, `users.school_id`,
  `role='manager'`, school-scoped RLS (`is_manager` / `manager_school` /
  `manager_classes` + the `_select` policy clauses preserving the live anon-block
  and QUICK_PLAY branches).
- `20260623000001_manager_console.sql` — aggregate RPCs `manager_overview`
  (totals + roster + 14-day series + classes), `manager_engagement` (30-day
  trend / games / day-of-week / modes), `manager_teacher_detail`,
  `manager_class_detail`. Detail RPCs verify the teacher/class is in the
  caller's school (foreign ⇒ `{"error":"not_in_school"}`, validated).

Frontend: `hasManagerAccess` + `school_id` on `AppUser`, typed RPC fetchers,
`src/views/ManagerConsoleView.tsx`, routing via the `manager-dashboard` view.
The v1 `ManagerDashboardView` was replaced by the console. Login reuses the
existing teacher card — a manager is distinguished purely by `role`.

**Provisioning quirk (by design):** a principal's first sign-in mints a
`role='teacher'` row (a `users` row can't exist before their `auth.uid()`
does), so the operator flips `role='manager'` + sets `school_id` *after* that
first login. Full steps in `docs/teacher-access.md` → "Granting school-manager
access". Never use `role='admin'` as a shortcut — admin reads every school.

**Next steps / follow-ups (none blocking):**
- Provision a real principal to use it live (school name + principal email +
  teacher emails).
- Optional deeper pen-test with a real manager token:
  `MANAGER_JWT=… OTHER_SCHOOL_CLASS_CODE=… OTHER_SCHOOL_TEACHER_UID=… OTHER_SCHOOL_CLASS_ID=… ./scripts/security-pen-test.sh`
  (anon checks 9c/9d run in CI already).
- `avg_score` surfaces on the raw 0–1000 game scale; consider normalizing to a
  percentage in the UI.
- No automated tests yet for the console RPCs or the routing branch.

---

## Quick Play — student-side UX findings (2026-05-19)

**Status:** Logged from a session-long walkthrough with the operator. Several pain points were observed in real classrooms over the last 2 weeks. Top 5 items shipping in the same session that logged this; the rest are queued.

Items marked **(top-5)** are landing on `claude/quick-play-game-flow-2rpPk`. Everything else is a backlog candidate.

### A. Before the student is in the game

- **Friendly error screens for dead sessions** **(top-5)** — `session_not_found` / `session_inactive` today surface as a toast over an empty join form; students see the toast briefly and then a blank page. Need a full-page friendly screen: "🎮 This game already ended. Ask your teacher for a new code." + back button. Path: `src/views/QuickPlayStudentView.tsx:120-139`.
- **Camera permission denied flow** — Browser default error after they decline. Need a screen showing how to re-grant camera permission, per OS (iOS Safari vs Android Chrome).
- **In-app browser detection (Facebook/Instagram/TikTok WebView)** — Already exists for the main app via `InAppBrowserWarning.tsx`. Verify it fires on Quick Play join URL too; localStorage isolation in those browsers silently breaks resume + clientId persistence.
- **Two QR codes on the board** — A student scanning the wrong one joins the wrong leaderboard with no indication. The join screen should show the **class name + teacher avatar**, not just the session code.
- **Keyboard covers the input on small Android screens** — `quick-play-name-input` should `scrollIntoView` on focus + the Continue button should be sticky.
- **Autocorrect changes their name** — Add `autoCorrect="off" spellCheck="false"` to the input. `autoCapitalize="words"` is already set.
- **Same-name collision** — Today's check is server-confirm-after-tap. Add a live "✅ Available / ⚠️ Taken" check while typing. Tradeoff: extra socket roundtrips; could debounce.
- **Avatar grid has no "more below" indicator** — Kids think there are only 6 avatars because the grid scrolls inside the card.
- **Avatar selected-state is too subtle** — Add a thicker ring + checkmark + small bounce so they know which one is picked.
- **No "edit name" link on later steps** — Once they tap Continue from the name form, they can't go back to fix a typo without losing avatar/language selection.

### B. The "join → game" gap

- **No "Get Ready" / "You're In" confirmation** **(top-5)** — Today: tap language → tiny network round-trip → game suddenly appears. Kids panic in that gap. Need a 1-screen handshake: name + avatar + "Tap to start playing" CTA. The tap doubles as the iOS audio unlock gesture.
- **iOS Safari audio autoplay gate** **(top-5)** — `useAudio.ts` has no explicit "tap to unlock" path. First word doesn't speak on iOS until the student has tapped something audio-related, but our first audio call can fire from a setTimeout. Add `primeAudio()` exported from `useAudio.ts` and call it from the Get Ready button.
- **Volume off / silent mode** — Show a "🔇 Can't hear anything? Turn off silent mode" tip on the Get Ready screen.
- **Headphones unplug mid-game** — Audio routes to phone speaker; classroom hears the question through the device. Detect device-change with the Audio API + show "🎧 Plug headphones back in?".
- **Real waiting room (when a teacher-start gate exists)** — Current Quick Play has no "teacher must press start" — kids who join can play immediately. If we add teacher-controlled-start later (good idea for live classroom), a waiting room becomes necessary: my avatar + name + "12 students joined, waiting for teacher to start the game 🎮".

### C. During gameplay

- **No in-game help button** **(top-5)** — Many kids freeze when stuck and don't know how to ask. Add a floating 🆘 button bottom-right that opens: "I can't hear the word" (replays audio + volume tip), "The game looks frozen" (forces reconnect), "I can't read this" (toggles translation), "Show my teacher" (raises flag on teacher dashboard).
- **Visible correct/wrong feedback boost** — Today's feedback in `GameActiveView.tsx` is a border colour change + framer animation. For 9–13yo, kids need bigger payoff: confetti on correct + a floating "+10 XP!" particle. On wrong: red shake + correct answer highlighted + word re-spoken. Touches every game mode component, so it's a multi-day sweep — not for this session.
- **Drag-and-drop fights with page scroll** — Sentence Builder + matching modes on mobile. Add `touch-action: none` to draggables + lock body scroll during gameplay.
- **Double-tap zoom + long-press context menu** — Disable for game surfaces via `touch-action: manipulation` + `user-select: none` + `-webkit-touch-callout: none`. Already partially done; audit every game mode.
- **No progress visibility** — "Question 3 of 10" + a progress bar at the top of every mode. Some modes have it, some don't.
- **No streak indicator** — Add 🔥 streak counter that grows visually at 3/5/10 in a row.
- **Mid-game phone-call / notification interruption** — On `visibilitychange`, pause timers + show a "Paused — tap to resume" overlay.
- **Battery saver throttles animation** — Detect via Battery API where available; reduce animation budget gracefully.
- **Screen rotation mid-question** — Lock to portrait via `screen.orientation.lock('portrait')` where supported (Android Chrome).

### D. After the game / re-entry

- **End-of-game "what now?" gap** — Today: final scoreboard. Need: "🎉 You scored 240 XP — 3rd of 24 students" + "Play again" + "Back to home" + an optional **Words to practice 📚** list of 3-5 misses with translations.
- **Resume card behaves badly when session has ended** — `userIsActiveGuest` branch in `QuickPlayStudentView.tsx:406-473` shows "Welcome back" + Continue Playing button even when the session no longer exists; the rejoin attempt fails silently. Should detect session-dead from the socket's `lastError` and offer "Scan a new QR" instead.
- **Sharing scores** — Generate a result image (avatar + score, no name) the kid can save / share. Privacy-conscious: never include the real name.

### E. Always-on safety nets

- **Replace tech-speak errors with kid-speak** — Audit every `showToast(...)` call in the quick-play path. WebSocket 1006 → "📡 The internet went away. Tap to try again." `Failed to fetch` → "🤔 Couldn't reach the game. Are you on Wi-Fi?"
- **Locale gaps** — Several quick-play strings in `QuickPlayStudentView.tsx` are hard-coded English ("Reconnecting…", "Couldn't join the session", placeholder texts). Audit and add to `src/locales/student/`. 9yo Hebrew or Arabic speaker who sees "Connecting…" is lost.
- **First-time onboarding card** — 1-screen tutorial the very first time a kid plays (localStorage flag) — "Tap the word that matches", "Listen with 🔊", "Drag tiles to build a sentence" + a "Got it!" button.
- **Accessibility** — OpenDyslexic font option, never colour-alone for right/wrong (we use ✓/✗ today — good), respect `prefers-reduced-motion`, `rem`/`em` for body text so OS text-size settings work, aria-labels on every emoji-only button.

### F. Device / school edge cases

- **iPad landscape layout** — Designed for portrait phones; landscape iPad wastes space. Add `min-width: 768px` layout with bigger cards + side-by-side leaderboard.
- **Old Android (Chrome ≤ 90)** — Some CSS / JS features fail silently. Add a "Please update your browser" detection.
- **Chromebook keyboard/trackpad** — Schools love them. Add 1/2/3/4 keyboard shortcuts for answer choices, Enter to continue, Space to replay audio.
- **iPhone low-power mode** — Animations throttled. Detect via `prefers-reduced-motion` (which low-power triggers on iOS).
- **Safari private mode** — localStorage wiped on tab close. Detect via `storage` API and warn.
- **School Wi-Fi WebSocket block** — Some school networks block WS or specific domains. Add a "Network Diagnostic" button on the teacher dashboard that reports whether students can reach `api.vocaband.com` + which exact endpoint fails.
- **Shared device (siblings, classroom Chromebook)** — A "Switch player" button on the join screen that clears the name + avatar but keeps the session URL.
- **Late joiners** — Today they get the same shuffled word list. Decide: do they start from the beginning (everyone ahead of them) or jump to the current word? Make it a teacher option.
- **Teacher leaves device unattended** — After 15 min of no teacher activity, students see "Your teacher seems to be away. The game will pause until they come back."

### Engineering top-5 shipping in this branch

1. **Friendly full-page error screens** for dead sessions.
2. **iOS audio unlock + "Get Ready" intro screen** between language pick and game.
3. **Floating "🆘 Help" button** during Quick Play (join flow + during gameplay).
4. **Better "right/wrong" feedback + score animation** — deferred (touches every game mode component; multi-day).
5. **Real waiting room** — deferred (current Quick Play has no teacher-start gate; would land alongside that feature).

---

## Feature — Interactive worksheet attempts (Phase 2)

**Status:** ✅ SHIPPED 2026-05-13. End-to-end loop: mint → solve → submit → teacher reads results.

What landed:
- `worksheet_attempts` table + `submit_worksheet_attempt` RPC + RLS scoping reads to the worksheet owner (`20260605000000_worksheet_attempts.sql`).
- Daily pg_cron job that purges expired interactive_worksheets so the table doesn't grow forever (`20260605000001_purge_expired_worksheets.sql`).
- Solver gained a name-entry gate, per-question answer capture (quiz: given/correct/is_correct; matching: mistakes_count), and a "Sent to your teacher" confirmation on finish.
- New `WorksheetAttemptsView` mounted from a "Worksheet Results" tile on the English teacher dashboard (suppressed on the VocaHebrew dashboard).
- Share button surfaces in WorksheetView, Create Assignment (ReviewStep), Quick Play Setup (inherits ReviewStep), and Bagrut Editor.
- `ShareWorksheetDialog` extracted from FreeResourcesView to a reusable component with an inline SVG QR code for projection.

Known follow-ups, none blocking:
- No tests yet for the submission RPC or the dashboard read path.
- ✅ Bagrut share — graceful fallback closed 2026-05-19. `BagrutEditorView` now (a) surfaces the actual list of dropped words inline above the editor (amber banner, capped at 20 with "+ N more"), so the omission is visible on mobile where the share button's tooltip wouldn't fire, and (b) adds a "Copy as text" button next to "Share online" that emits a numbered plain-text drill of the full source list (mapped + unmapped) for paste-into-WhatsApp / Google Classroom use, including the fully-custom-list case where the interactive solver is unavailable.
- ✅ Cold-load lag on first navigation closed 2026-05-19 — `TeacherDashboardView` now idle-prefetches the `WorksheetAttemptsView` chunk on mount (gated on `onWorksheetResultsClick`, so Hebrew teachers without the tile don't pay the bytes). Vite dedups the dynamic import with `MiscViewSections`' `lazyWithRetry` mount, so the second call resolves instantly.

---

## Security — F3: cap `progress.score` against client inflation

**Status:** ✅ SHIPPED to prod 2026-05-13 as migration `20260606_f3_progress_score_cap.sql`.

`save_student_progress` was a SECURITY DEFINER RPC that wrote the caller's `p_score` verbatim — a logged-in student could replay it with `p_score = 999_999_999` and the upsert lands. The matching `progress_update` / `progress_insert` RLS policies enforced ownership and monotonic-increase but not an upper bound. The existing table CHECK `progress_score_check (score BETWEEN 0 AND 1000)` would have caught absurd values, but only by raising a generic constraint error — not a clean reject path.

Migration adds:
- **RPC clamp**: `p_score := GREATEST(0, LEAST(1000, p_score))` — matches the table CHECK exactly so the clamp / policies / column constraint are all in lockstep.
- **`progress_insert` WITH CHECK**: adds `score BETWEEN 0 AND 1000`.
- **`progress_update` WITH CHECK**: adds `score <= 1000` on top of the existing monotonic-increase rule.

Closes the final finding from the 2026-05-12 pen-test. F1 + F2 + F3 are all live.

---

## Security — F2: lock self-writable game-state columns on `public.users`

**Status:** ✅ SHIPPED to prod 2026-05-13. RPCs (`award_progress_xp`, `award_self_badge`, `consume_power_up`) live as migration `20260603_f2_game_state_rpcs.sql`. React refactor (4 sites) merged in PR #597. Trigger live as `20260604_f2_lock_game_state_columns.sql` + INVOKER hotfix in `20260605_f2_trigger_invoker_fix.sql` (PR #605).  Companion finding to F1 which shipped 2026-05-12 as migration `20260602_lock_users_plan_columns.sql`.

**The detailed implementation plan that used to fill this section is
deleted — it had gone stale enough to be dangerous.** A 2026-06-11
re-verification against `main` confirmed all six rollout steps
are complete, including the final fallback-removal step: the three RPCs are
live and called from the current React sites (`useGameFinish.ts`,
`useAwardBadge.ts`, `GameView.tsx`/`PowerUpToolbar.tsx`,
`ShopMarketplaceView.tsx` via `purchase_item`), the column-lock trigger is
live in its SECURITY INVOKER form (the 20260605 hotfix — the original
DEFINER version's `current_user` bypass made the lock dead code), and
pen-test checks 17–21 cover the four direct-UPDATE attacks.

⚠️ Do NOT re-implement the original plan that used to live in this section:
its RPC signatures (`p_streak`, ±200 cap) and its SECURITY DEFINER trigger
SQL no longer match prod (`p_new_streak`, ±300 cap, INVOKER) — shipping it
verbatim would break live game saves and silently disable the lock.

---

## Beat-Kahoot Roadmap (drafted 2026-05-12)

Strategic roadmap for making Vocaband structurally beat Kahoot in Israeli schools. Grouped by tier — top tiers ship soonest. Discovery notes precede each item.

### Already shipped (verified in code)

- **Personalized review** — `supabase/migrations/20260423_add_word_attempts.sql` tracks every word attempt per student. `TopStrugglingWords.tsx` surfaces this to teachers.
- **Spaced repetition** — `supabase/migrations/20260507205628_spaced_repetition.sql` provides `review_schedule`, `count_due_reviews`, `get_due_reviews`, `record_review_result`, `schedule_review_words`. Wired through `useDueReviews.ts` → `ReviewQueueCard.tsx` → `ReviewGame.tsx`. Full SRS already live.
- **QR / nickname join** — Quick Play already exists.
- **Curriculum labelling structure** — `Set 1 / Set 2 / Set 3 / Custom` type already in place across the codebase.
- **Class Minute — daily 60-second drill** (PR #587, follow-up class-switch race fix #588, shipped 2026-05-12; tile re-enabled in prod 2026-05-19) — `ClassMinuteCard.tsx` dashboard tile + `?play=class-minute` teacher share link via `ShareClassLinkModal`. SRS-first word source, falls back to assignments then `SET_2_WORDS`. Saves with `mode='class-minute'`; dashboard derives `doneToday` + streak from `studentProgress` with no extra round-trip. The card now renders unflagged on both the legacy and STRUCTURE_UX render branches of `StudentDashboardView.tsx`, gated only on the `onStartClassMinute` callback (wired from `StudentDashboardSection.tsx`). `ReviewQueueCard` is also unflagged on the same wiring.
- **Hot Seat — single-device pass-around mode** (PR #589, shipped 2026-05-12) — `HotSeatView.tsx` owns setup → interstitial → question → podium phases. Reuses Classic-style multi-choice mechanics, in-memory scoring (no DB writes — players aren't logged-in students). v1 uses `SET_2_WORDS` only; per-assignment word picker is a deferred v2. Tile is gated `!isHebrew` (mirrors Vocabagrut precedent).

These items are DONE. Don't rebuild them — surface and market them.

---

### Tier 1 — Ship next (small scope, big leverage)

**1. Printable PDF certificate** — ✅ SHIPPED 2026-05-12 (v1) / 2026-05-13 (v2).
- v1 (`CertificateModal.tsx`) — A4-portrait certificate with student name, class, date, games-played + avg-score. Printer-icon button in the per-student Gradebook row. `html2pdf.js` lazy-loaded so the heavy chain stays out of the Gradebook chunk. EN/HE/AR with proper RTL.
- v2 — adds **words-mastered** count (distinct word_ids the student has answered correctly ≥ `MASTERY_THRESHOLD` (5) times across all modes combined). Derived client-side from the existing `get_class_mastery` RPC data already in memory — no new server round-trip. Stat hides itself when 0 so brand-new students don't get a depressing "0 words mastered" headline.
- Follow-up candidates: "Print certificate" button on the end-of-unit screen (currently only in the Gradebook); per-student certificate-history list so teachers can re-print past achievements; MoE-set label on the certificate.

**Class Minute** and **Hot Seat** shipped 2026-05-12 — see "Already shipped" section above.

---

### Tier 2 — Distribution moats

**4. WhatsApp-first homework links — REJECTED 2026-05-19**
- Decided not to ship.  Existing share-link flow (commits 829bcae +
  594fc76) is the floor; no "Send on WhatsApp" primary button planned.
- Original framing kept below for the historical record / future-you:
  Audit existing share-link flow.  Verify: does the WhatsApp deep-link
  include `?assignment=<id>` and auto-open the right view?  Add: "Send
  homework on WhatsApp" primary button on every assignment-created
  success screen.  Add: opens with localized pre-filled message ("Your
  English homework: {link}") in HE/AR/EN.
- Original ETA: 1 evening.
- Original why: Israel = WhatsApp country.

**5. Parent Weekly Report (Friday email)**
- New Supabase Edge Function: scheduled Friday 16:00 IL time
- Pulls each student's week stats: words learned, accuracy, class rank, streak
- Sends to `parent_email` field on `users` (needs new column + opt-in flow)
- Localized HE/AR/EN template
- ETA: 1 week (needs email infra decision: Resend already wired per `docs/RESEND-SMTP-SETUP.md` — reuse it)
- Why: parents become unpaid sales channel; Kahoot has zero parent surface

**6. School-vs-school tournaments**
- New table `tournaments(id, name, school_a, school_b, starts_at, ends_at, word_set)`
- New view: real-time scoreboard combining both schools' scores
- Teacher creates → invites other school by code → 1-week window
- Leverages existing live-challenge socket layer
- ETA: 1–2 weeks
- Why: newsworthy; principal-level engagement; press story potential

---

### Tier 3 — Network / UX moats

**7. Offline-first PWA + LAN mode**

*Phase 1 + 2 shipped on `claude/finish-offline-pwa-30XWz` (2026-05-17):*
- Force-install gate — full-screen first-visit modal + per-session banner. Installed PWAs on iOS sidestep the 7-day storage eviction. See `src/components/PwaInstallGate.tsx`.
- 2G / data-saver fallback — `useAudio` skips MP3 fetch on slow connections and routes to `speechSynthesis`. See `src/hooks/useEffectiveConnection.ts`.
- Assignment audio precache — idle-time `fetch()` of MP3s for the active assignment's words; SW's CacheFirst rule writes them to `vocaband-word-audio`. Skipped on 2G. See `src/hooks/useAssignmentPrecache.ts`.
- In-app browser warning — UA-based detection of Instagram/FB/WhatsApp/TikTok WebViews where SWs silently break. Android intent:// jump to Chrome; iOS shows Share-menu instructions + copy-link. See `src/components/InAppBrowserWarning.tsx`.
- SWR-cache the student-dashboard assignment refresh — `useDashboardPolling` now wraps the `get_assignments_for_class` RPC in `cachedRead` so offline students see their assignments. See `src/hooks/useDashboardPolling.ts`.
- `navigator.storage.persist()` requested on boot — Chrome auto-grants for installed PWAs. See `src/utils/persistStorage.ts`.

*Deferred (Phase 3 + Capacitor — need real-device testing):*
- IndexedDB queue + Workbox Background Sync — skipped because both saveQueue and BackgroundSync would replay the same writes when reconnecting; `progress` table has no idempotency key → duplicate score rows. Requires either a `local_id` unique constraint or picking one mechanism. See `docs/open-issues.md` discussion.
- LAN-mode Live Challenge (WebRTC datachannels with simple-peer) — ~500 LOC + needs two real devices to validate the NAT-traversal/ICE handshake; can't be verified in a sandbox.
- Capacitor wrapper for App Store / Play Store — only triggers when schools start asking for an "official app."
- Per-word in-game checkpointing — defensive, modifies the hot save path; defer until the existing saveQueue's loss-on-tab-crash window proves to be a real problem.

**8. QR-join speed claim**
- Already exists — task is marketing, not engineering
- Add side-by-side demo on landing page: "Vocaband: 3 seconds. Kahoot: 12 seconds."
- ETA: half a day (marketing + measurement)

---

### Tier 4 — Foundational / legal

**9. MoE alignment without copying (legal track)**
- Hire 2–3 Israeli English teachers as paid consultants to classify the existing Vocaband word bank into Set 1 / Set 2 / Set 3 buckets using their professional judgment based on the publicly-available MoE "Framework for English Language Teaching"
- Document methodology on the About page: *"Vocaband's word levels are independently classified by experienced Israeli English teachers, aligned to the MoE Framework for English Language Teaching."*
- Language audit on the site: use "aligned with" / "matches the level of"; never "official MoE list" or "MoE-approved"
- 1-hour consult with an Israeli IP lawyer (~₪1500) before publishing the claim — confirm: (a) referencing the Framework by name, (b) using "Set 1/2/3" terminology, (c) liability boundary
- ETA: 3–4 weeks (mostly operator track, not engineering)
- Why: defensible curriculum claim; the words themselves stay our IP

**10. Hebrew + Arabic as a feature, not a setting**
- Default the student app to native language detected from class metadata
- Word translations always visible on the answer screen (not gated behind a tap)
- Reports + parent emails in HE/AR by default; EN only on request
- Audit every new feature for `useLanguage().isRTL` correctness
- Hire one native-Arabic-speaking teacher consultant for translation review
- ETA: 1–2 weeks engineering + ongoing translation contract
- Why: Arab-Israeli school market is underserved and Kahoot ignores it

---

### Tier 5 — Explicitly out of scope (per 2026-05-12 decision)

- Voice / pronunciation mode — skipped
- Free for Israeli public schools — rejected (no free tier)
- MoE pilot pursuit — deferred

---

### Suggested next move (post-Hot-Seat ship)

1. **Smoke-test the three features that just shipped on production** — Class Minute student tile + teacher share link + Hot Seat. None have been seen running by a human end-to-end.
2. **Printable PDF Certificate** — smallest remaining Tier-1, A4 layout, reuses the html2pdf pipeline. 1 evening.

---

## VocaHebrew — Hebrew-native Quick Play (Phase 2)

**Status:** Code shipped 2026-05-10. Hebrew teachers now get `HebrewQuickPlaySetupView` (lemma picker by `HEBREW_PACKS`, 4 Hebrew modes, success screen with code + share). Bootstrap hook (`useQuickPlayUrlBootstrap`) and `QuickPlayStudentView` branch on `subject==='hebrew'` and load `HEBREW_LEMMAS` instead of `ALL_WORDS`. App.tsx call site passes `p_subject: 'hebrew'` to the RPC.

**Blocker — operator action required:** apply migration `supabase/migrations/20260510120000_quick_play_subject.sql`. It adds `quick_play_sessions.subject` and recreates `create_quick_play_session` with a `p_subject` parameter. Until applied, Hebrew QP throws "unknown parameter p_subject" on session create — the teacher sees a "Failed to create session" toast and the feature won't function.

**Next step (after migration applies):** smoke-test the QR-scan flow end-to-end on a phone — verify mode selection routes to `HebrewModeSelectionView` and the 4 Hebrew games (niqqud, shoresh, synonym, listening) load with the correct lemmas.

---

## VocaHebrew — assignment wizard architecture decision

**Status:** RESOLVED-BY-DESIGN 2026-05-10. `HebrewAssignmentWizard` stays as a parallel setup view, NOT folded into `CreateAssignmentWizard`/`SetupWizard`.

**Reasoning:** Same architecture as the user-shipped `HebrewQuickPlaySetupView` — Hebrew-native picker UI (lemma tiles, niqqud display, HEBREW_PACKS filter chips) that projects to Word shape downstream. Folding into SetupWizard's `WordPicker` would require a `Word | HebrewLemma` union type rippling through 617 lines of three step components. The user-facing "one wizard" promise is met at entry (`CreateAssignmentView` routes by subject) and at persistence (`handleSaveAssignment` handles both). The parallel SETUP-UI files are correct architecture, not duplication debt.

**The "no parallel files" rule still applies to launcher + routing surfaces** (TeacherQuickActions, dashboard tile grid, route guards) — that's where folding genuinely reduces cost. Setup views with different data corpora are legitimately different surfaces.

---

## VocaHebrew — worksheet builder stop-gap

**Status:** `HebrewWorksheetView` shipped 2026-05-10 — single-template printable (word list with niqqud + EN/AR translations, RTL, html2pdf export). App.tsx routes Hebrew classes to it from the dashboard's Worksheet tile.

**Next step:** Fold into `FreeResourcesView` (3614 lines, 14 PDF templates) so all worksheet types — bingo, scramble, fill-blank, etc. — work for Hebrew. Multi-commit refactor: picker accepts `HebrewLemma` source → layout generators parametric on data shape → RTL render passes.

---

## VocaHebrew — Class Show stop-gap

**Status:** `HebrewClassShowView` shipped 2026-05-10 — full-screen RTL projector with 2 modes (niqqud reveal, translation reveal). App.tsx routes Hebrew classes to it from the Class Show tile.

**Next step:** Fold into `ClassShowView` (234 lines, 6 English-shaped modes) so all classroom modes — Classic / Listening / Reverse / Fill-Blank / True-False / Flashcards — work for Hebrew with the right vocabulary shape.

---

## VocaHebrew — Live Challenge

**Status:** Coming-soon guards added 2026-05-10 to both `live-challenge` and `live-challenge-class-select` routes — Hebrew teachers see `HebrewComingSoonView` with proper RTL chrome instead of the English socket session.

**Next step:** Real Hebrew Live Challenge needs websocket session that carries `subject` flag (mirror of the `quick_play_subject` migration), Hebrew-aware leaderboard render, Hebrew student-side play surface. Multi-session work.

---

## VocaHebrew — Hebrew TTS pipeline

**Status:** `useAudio.ts` accepts `{ subject: 'hebrew' }` config (2026-05-10). Reads from `sound-hebrew/<id>.mp3` Supabase bucket; falls back to browser SpeechSynthesis with iOS Carmit / Google he-IL voice when MP3 missing. Lang-namespaced cache so Hebrew lemmaId 1 doesn't collide with English wordId 1.

**Blocker — operator action required:** generate the actual MP3s. Recommended pipeline: pre-niqqud each Hebrew lemma via Dicta-Nakdan, then Azure HilaNeural or Google Cloud TTS Wavenet, upload to Supabase Storage at `sound-hebrew/<lemmaId>.mp3`. Mirror of `scripts/generate-audio.ts` for Hebrew. Until MP3s land, Hebrew students hear the browser's built-in voice (acceptable but inconsistent across devices).

---

## VocaHebrew — Hebrew Class Show null-class fallback

**Status:** Phase 1 (2026-05-10) widened the gate at `view === "class-show"` to fire on `activeVoca === "hebrew"` even when `selectedClass` is null. `HebrewClassShowView` already exists and now receives a null-safe `className`.

**Next step:** Verify `HebrewClassShowView` handles `className === null` gracefully (no class label in the projector header is acceptable); if not, accept a fallback string.

---

## Live challenge podium — students don't appear

**Status:** Root cause was socket-server reachability. User is on Fly.io Starter (no cold starts) → should be reliable now.

**New signal:** LiveChallengeView shows prominent amber banner when socket is disconnected, so teacher sees WHY podium is empty. Previously silent.

**Next step:** If banner still appears, check `wrangler tail` + Fly logs.

---

## Modes not clickable / flash but no navigation

**Status:** Unreproduced in code. Happens on specific student devices.

**New signal:** Added console.log trail in GameModeSelectionView's onClick so `[Mode Selection] Tapped mode: <id>` visible in DevTools. Three possible console signatures (see commit message).

**Next step:** User to Chrome remote USB-debug a phone, capture console when non-clickable mode tapped, report which signature shows.

---

## Audio file mismatch (word voices + motivational phrases)

**Status:** Code is correct (phrase keys in PHRASES array match generator script exactly). Uploaded files have wrong content.

**Cause theory:** Vocabulary IDs were renumbered after audio was generated, or files uploaded under wrong names.

**Fix:** Regenerate via scripts (user has Node.js — can run locally or in GitHub Codespaces). See `docs/operator-tasks.md`.

---

## Live backend reachability from teacher device

**Status:** `/health` 404'd for user — they tried `/health` but real endpoint is `/api/health`. Needs re-test.
