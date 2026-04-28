# Database / network cost audit — 2026-04-28

Companion to `docs/security-audit-2026-04-28.md`.  Where the security
audit asked "what could leak or be forged", this audit asks "what are
we paying for that we don't need to be paying for".

Scope:
- Every call site that hits Supabase (REST, RPC, Realtime, Storage,
  Auth API).
- Polling loops, refetch-on-mount patterns, repeat lookups.
- `select('*')` vs narrowed column lists.
- Auth API misuse (`getUser` vs `getSession`).

Out of scope (already optimized; see CLAUDE.md §13):
- `save_progress_batch` RPC — game-end writes batched, not per-word.
- Audio MP3 fetches — public bucket, edge-cached.
- `class_lookup_by_code` RPC — server-side rate-limited.
- `useDashboardPolling` — flipped to Realtime + 5-min fallback in a
  prior commit.
- Session caching — `getSession()` reads localStorage, no network.

## Severity scale

| Severity | Definition |
|---|---|
| HIGH | >5 000 wasted requests/month at the user's current ~30 daily-active count, OR a single hot path that scales linearly with concurrent students. |
| MED | 500–5 000 wasted requests/month, OR adds latency on a critical-path render. |
| LOW | <500 wasted requests/month and no UX impact. |

---

## HIGH-severity findings

### H-1. `RewardInboxCard` calls `supabase.auth.getUser()` on every mount

**Location:** `src/components/dashboard/RewardInboxCard.tsx:161`

```ts
const { data: { user } } = await supabase.auth.getUser();
const uid = user?.id;
```

This is inside the realtime-channel IIFE — runs once per mount, but
the dashboard re-mounts every time the student navigates back from
shop / game / settings.

`getUser()` is a NETWORK call to Supabase Auth (validates the JWT
against the server).  `getSession()` is a LOCAL read (just decodes
the cached JWT in localStorage).  We have neither use case here:
the parent (`StudentDashboardView`) already has the `user.uid` —
it threads `user` through as a prop.

**Cost:** ~30 students × ~10 dashboard mounts/day × 30 days
= **9 000 wasted Auth API calls/month**.  Auth API is rate-limited
per project; burning these is also burning headroom.

**Fix:** Add a `userUid: string` prop to `RewardInboxCardProps` and
pass `user.uid` from both render sites in `StudentDashboardView`.
Drop the `getUser()` call entirely.

**Status:** APPLIED (this commit).

---

## LOW-severity findings (worth fixing later, not urgent)

### L-1. `select('*')` on `student_profiles`

**Location:** `src/App.tsx:1129, 1239` (and similar fetches).

The student-profile reads pull every column even though the consumers
only need `equipped_avatar`, `equipped_frame`, `equipped_title`,
`xp`, `streak`, `badges`.  Wider rows = more bytes over the wire,
slower JSON parse on flaky mobile data.

**Cost:** Negligible per call.  Becomes meaningful only on classroom-
scale concurrent reads (30 students opening the dashboard at the
same moment after the morning bell).

**Fix:** Replace `select('*')` with the explicit column list in the
two student-profile fetch sites.

**Status:** Not applied — wait until other student-profile fields
stabilize so we don't have to keep editing the column list.

---

### L-2. Double class lookup during student login class-switch

**Location:** `src/App.tsx:1070-1100`.

When a returning student logs in and is being moved to a different
class than their last session, we call `class_lookup_by_code` once to
validate the new code, then again inside the profile-update path.
The second call is redundant — the first call's result could be
threaded forward.

**Cost:** One extra RPC per login that triggers a class switch.
Class switches are rare (~1% of logins) so this is well under 100
calls/month.

**Fix:** Capture the first lookup's class id in a local variable
and reuse it for the profile update.

**Status:** Not applied — low impact and the refactor touches
auth-restore code that's been the source of past regressions; not
worth the risk right now.

---

## Areas verified to be already-optimized (don't touch)

| Subsystem | What's good |
|---|---|
| `useDashboardPolling` | Realtime-first; falls back to 5-min poll only on `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`. |
| `RewardInboxCard` polling | Same Realtime-first pattern (its `getUser` call is the only weak spot — see H-1). |
| `save_progress_batch` | Single RPC for an entire game's worth of word attempts; replaces N inserts. |
| `useAudio` | Browser TTS fallback so storage-fetch failures cost zero round-trips. |
| Session retrieval | `getSession()` reads from localStorage; no auth-API hit. |
| `class_lookup_by_code` | Server-side 30/min/user rate limit blocks runaway client retries. |

## Methodology

- Grep across `src/` for `supabase.from(`, `supabase.rpc(`,
  `supabase.auth.`, `supabase.channel(`, `supabase.storage`.
- Cross-referenced each call site against React lifecycle (mount,
  re-render, polling loop).
- Counted potential per-user-per-day frequency × ~30 active users ×
  30 days.
- Flagged anything where a cheaper local read could replace a
  network call.

## Verification

After H-1 fix:
1. Open student dashboard, check Network tab → no `auth/v1/user`
   request (only the realtime websocket frames).
2. Navigate dashboard → shop → dashboard several times → still no
   `auth/v1/user` request.
3. Confirm reward toast still appears when teacher grants a reward
   from another tab — Realtime channel still subscribed correctly
   without the `getUser` call.

## Effort + ship order

| Finding | Severity | Effort | Status |
|---|---|---|---|
| H-1 RewardInboxCard getUser | HIGH | 5 min | Applied 2026-04-28 |
| L-1 narrow student_profiles select | LOW | 15 min | Deferred |
| L-2 double class lookup | LOW | 30 min | Deferred (regression risk) |
