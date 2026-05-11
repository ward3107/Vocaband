# Open Issues

Tracking known issues with their diagnosis status.

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
