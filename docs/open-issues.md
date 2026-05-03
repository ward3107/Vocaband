# Open Issues

Tracking known issues with their diagnosis status.

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
