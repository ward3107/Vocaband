# Open Issues

Tracking known issues with their diagnosis status.

---

## Beat-Kahoot Roadmap (drafted 2026-05-12)

Strategic roadmap for making Vocaband structurally beat Kahoot in Israeli schools. Grouped by tier — top tiers ship soonest. Discovery notes precede each item.

### Already shipped (verified in code)

- **Personalized review** — `supabase/migrations/20260423_add_word_attempts.sql` tracks every word attempt per student. `TopStrugglingWords.tsx` surfaces this to teachers.
- **Spaced repetition** — `supabase/migrations/20260507205628_spaced_repetition.sql` provides `review_schedule`, `count_due_reviews`, `get_due_reviews`, `record_review_result`, `schedule_review_words`. Wired through `useDueReviews.ts` → `ReviewQueueCard.tsx` → `ReviewGame.tsx`. Full SRS already live.
- **QR / nickname join** — Quick Play already exists.
- **Curriculum labelling structure** — `Set 1 / Set 2 / Set 3 / Custom` type already in place across the codebase.
- **Class Minute — daily 60-second drill** (PR #587, follow-up class-switch race fix #588, shipped 2026-05-12) — `ClassMinuteCard.tsx` dashboard tile + `?play=class-minute` teacher share link via `ShareClassLinkModal`. SRS-first word source, falls back to assignments then `SET_2_WORDS`. Saves with `mode='class-minute'`; dashboard derives `doneToday` + streak from `studentProgress` with no extra round-trip. KNOWN GAP: only renders on the STRUCTURE_UX dashboard branch (which is feature-flagged OFF) — needs porting to the legacy branch for production visibility. Same gap applies to `ReviewQueueCard`.
- **Hot Seat — single-device pass-around mode** (PR #589, shipped 2026-05-12) — `HotSeatView.tsx` owns setup → interstitial → question → podium phases. Reuses Classic-style multi-choice mechanics, in-memory scoring (no DB writes — players aren't logged-in students). v1 uses `SET_2_WORDS` only; per-assignment word picker is a deferred v2. Tile is gated `!isHebrew` (mirrors Vocabagrut precedent).

These items are DONE. Don't rebuild them — surface and market them.

---

### Tier 1 — Ship next (small scope, big leverage)

**1. Printable PDF certificate (basic)**
- Reuse the existing `html2pdf` pipeline used by `HebrewWorksheetView`
- New file: `src/views/certificates/StudentCertificate.tsx` — A4 layout, student name, class, date, "X words mastered", MoE-set label
- "Print certificate" button on the student profile (teacher view) + end-of-unit
- ETA: 1 evening for v1
- Why now: fridge marketing, parent word-of-mouth, no new infra

**Class Minute** and **Hot Seat** shipped 2026-05-12 — see "Already shipped" section above.

---

### Tier 2 — Distribution moats

**4. WhatsApp-first homework links**
- Audit existing share-link flow (commits 829bcae + 594fc76 added per-assignment share + WhatsApp fix). Verify: does the WhatsApp deep-link include `?assignment=<id>` and auto-open the right view?
- Add: "Send homework on WhatsApp" primary button on every assignment-created success screen
- Add: opens with localized pre-filled message ("Your English homework: {link}") in HE/AR/EN
- ETA: 1 evening to audit + polish
- Why: Israel = WhatsApp country; this is the friction killer

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
- Service worker pre-caches SPA shell + active assignment's words + their MP3s
- IndexedDB queue for `progress` writes when offline → flushes via Background Sync
- LAN-mode for Live Challenge: WebRTC datachannels with teacher device as host, no internet required for live podium
- Connection-aware: `navigator.connection.effectiveType === '2g'` → skip MP3s, fall back to `speechSynthesis`
- ETA: 3–4 weeks (real architectural lift)
- Why: structural moat; market as "works when Wi-Fi doesn't"

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

1. **Smoke-test the three features that just shipped on production** — Class Minute card + teacher share link + Hot Seat. None have been seen running by a human. The legacy-branch bug for the Class Minute card (rendered on STRUCTURE_UX branch only) is the most likely real-world breakage.
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
