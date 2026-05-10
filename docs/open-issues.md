# Open Issues

Tracking known issues with their diagnosis status.

---

## VocaHebrew — Hebrew-native Quick Play (Phase 2)

**Status:** Code shipped 2026-05-10. Hebrew teachers now get `HebrewQuickPlaySetupView` (lemma picker by `HEBREW_PACKS`, 4 Hebrew modes, success screen with code + share). Bootstrap hook (`useQuickPlayUrlBootstrap`) and `QuickPlayStudentView` branch on `subject==='hebrew'` and load `HEBREW_LEMMAS` instead of `ALL_WORDS`. App.tsx call site passes `p_subject: 'hebrew'` to the RPC.

**Blocker — operator action required:** apply migration `supabase/migrations/20260510120000_quick_play_subject.sql`. It adds `quick_play_sessions.subject` and recreates `create_quick_play_session` with a `p_subject` parameter. Until applied, Hebrew QP throws "unknown parameter p_subject" on session create — the teacher sees a "Failed to create session" toast and the feature won't function.

**Next step (after migration applies):** smoke-test the QR-scan flow end-to-end on a phone — verify mode selection routes to `HebrewModeSelectionView` and the 4 Hebrew games (niqqud, shoresh, synonym, listening) load with the correct lemmas.

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
