# Quick Play / Live Play — Debugging Cheat Sheet

If teachers report "I started a Live Play, students appear on the podium but their scores never tick" or "I can't kick a student" or "only one student appears even though my whole class joined", almost every regression traces to one of these four gotchas. Read this BEFORE re-deriving anything from `server.ts` and `useQuickPlaySocket.ts`.

---

## A. Two hook instances of `useQuickPlaySocket`

`useQuickPlaySocket()` is mounted in BOTH:
- `src/App.tsx` (~line 653) — provides the score-emit channel consumed by `emitScoreUpdate`
- `src/views/QuickPlayStudentView.tsx` (~line 83) — owns the click handler that calls `joinAsStudent`

Each instance has its own `clientIdRef`. When the student clicks Join, only the **QuickPlayStudentView** instance's ref is updated by `clientIdForJoin(nickname)`. App.tsx's instance keeps the pre-join id in its ref. When scores fire, they go through App.tsx's instance → stale clientId → server's owner-mismatch check rejects.

**Symptom on server:** `[QP SCORE owner-mismatch] socketOwnsClient=A claimedClient=B` where A and B are different valid UUIDs.

**Fix:** `updateScore` in `useQuickPlaySocket.ts` must read the clientId from `sessionStorage` (the source of truth) on every emit, NOT from `clientIdRef.current`. Both hook instances share the tab-scoped storage so they always agree.

---

## B. clientId persistence is sessionStorage, NOT localStorage

`vocaband_qp_client_id` and `vocaband_qp_client_id_nickname` live in `sessionStorage` — per-tab. This is deliberate:

- `localStorage` is shared across every tab. Two students on the same iPad would read back the same cached id, and `state.students.set(clientId, …)` would collapse them into one podium row. Symptom: "5 students joined, only one shows."
- `sessionStorage` survives refreshes within the same tab but a separate tab gets a fresh id and joins as its own row.

**Side effect, by design:** closing the tab and reopening counts as a new student. For Quick Play this is correct because the live session usually doesn't outlive the tab.

If you switch back to localStorage to "fix" this, you reintroduce the multi-tab collapse bug. Don't.

---

## C. UI advance must wait for server-confirmed JOIN

The hook exposes `joinedSessionCode: string | null` — set when the server's `JOINED` reply arrives, cleared on `KICKED`, `SESSION_ENDED`, or error.

`QuickPlayStudentView` stashes the post-join setup in a `pendingJoinRef` callback and only fires it from a `useEffect` watching `joinedSessionCode`. If the server rejects (`nickname_taken`, `session_inactive`, etc.), the toast surfaces and the student stays on the join form.

**Symptom if reverted:** server logs show `[QP SCORE owner-mismatch] socketOwnsClient=<none>` (no JOIN registered), client console shows emit lines that go nowhere, and user swears they joined successfully (UI advanced optimistically).

---

## D. OAuth students need the auth-restore guard

`src/App.tsx`'s `restoreSession` early-returns when `quickPlaySessionParam` is in the URL. Without it, an OAuth-signed-in student who scans a Live Play QR is yanked back to their dashboard before they see the join form. The QR flow treats them like a guest for the duration.

This guard mirrors the ones at `App.tsx:1421` and `App.tsx:1782`. Don't remove it.

---

## Quick triage checklist

When live-play scores aren't ticking, in order:

1. **`fly logs -a vocaband`** — look for `[QP SCORE accept]` (good) vs `[QP SCORE owner-mismatch]` (bad). The `socketOwnsClient` value tells you which gotcha.
2. **Student DevTools console** — confirm `[QP updateScore] emit` fires with the SAME clientId you see at JOIN.
3. **Multiple tabs same browser** — `sessionStorage` per-tab means different clientIds; verify tabs don't share one.
4. **Same nickname in two tabs** — server rejects with `nickname_taken`. This is correct — the join screen should stay put with a toast.
