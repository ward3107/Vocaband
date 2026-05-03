# Supabase Call Patterns — Cost-Conscious Guide

Every `supabase.from(...).select()`, `.insert()`, `.update()`, `.delete()`, and `.rpc()` is **one HTTP request**. Supabase JS does not pipeline, coalesce, or batch. If you want fewer calls, you batch yourself or move work into a server-side RPC.

---

## What's already optimized (don't undo)

| Hot path | Optimization |
|---|---|
| Progress writes after a game | Batched via `save_progress_batch` RPC (migration `20260518_save_progress_batch.sql`). Array sent in one round trip, RPC does bulk insert. |
| Audio MP3 fetches (`/storage/v1/object/public/sound/<id>.mp3`) | Public bucket = cacheable. Cloudflare caches at edge — only FIRST fetch hits Supabase egress. |
| Motivational MP3s | Same — public bucket, edge-cached. |
| Class lookup by code | Server-side rate limit 30/min/user inside `class_lookup_by_code` RPC. Buggy retry loops can't blow up requests. |
| Auth session cache | Supabase JS client caches session in localStorage. `getSession()` is local — call freely. |

---

## Volume estimate (typical Live Play session)

- 30 students × 30 words × 5 modes ≈ **4,500 storage GETs** for word audio, dropping to ~30 unique URLs after Cloudflare caches.
- 30 × 1 = **30 concurrent realtime websocket connections**. Billed by concurrent connections, not per-message.
- 30 students × ~3 RPCs per join ≈ **90 RPCs** total per session.

Audio fetches dominate; RPCs are negligible.

---

## Patterns to AVOID

- **No `setInterval` polling of Supabase.** Use Realtime subscriptions or React Query with `staleTime`. Polling at 5s × 30 students for an hour = 21,600 wasted requests.
- **Don't call `supabase.auth.getUser()` on every render.** It re-fetches over network. Use `getSession()` for cached JWT-only read.
- **Don't re-fetch teacher classes / student assignments on every dashboard mount** if state already has them. Trust the state and let it stale-revalidate via Realtime.
- **Don't add fallback retry loops without rate-limit awareness.** If an RPC has server-side rate limits, client-side retry can trigger the limit and create a stuck loop.

---

## When you actually want to batch

If a future feature triggers high-frequency writes (e.g., shared class chat, fast-tap game):

1. Buffer events in a `useRef`-backed array on the client.
2. Flush every 1–2 seconds OR when reaching a size cap.
3. Send buffer as single argument to a `_batch` RPC that does multiple ops server-side.

Example precedent: `save_progress_batch` RPC. Mirror its shape.
