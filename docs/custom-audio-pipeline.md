# Custom-Word Audio Pipeline

When a teacher adds words NOT in the built-in 9,159-word vocabulary (paste, OCR, manual entry), each gets a synthetic numeric ID and we generate audio on the fly so students hear natural voice instead of robotic browser-TTS fallback.

---

## The flow

1. Teacher saves assignment with custom words. Client calls `requestCustomWordAudio(words)` in `src/utils/requestCustomWordAudio.ts` — **fire-and-forget**, never awaited. Teacher's UI doesn't block.
2. Helper POSTs to `server.ts:1536` (`/api/tts/custom-words`) with `{ words: [{ id, english }, ...] }` and teacher's JWT.
3. Server (Fly.io):
   - Verifies JWT and confirms `users.role = 'teacher'`
   - Reads `GOOGLE_AI_API_KEY` (must be set on Fly)
   - Processes words in batches of 5 (parallel). For each:
     - Skips if `<id>.mp3` already exists in `sound/` bucket (idempotent)
     - Calls Google Cloud Neural2 TTS via `synthesizeSpeechMp3()`
     - Uploads to `sound/<id>.mp3` with `upsert: true`
4. Returns `{ generated, skipped, failed, total }`. Logged at `[TTS] <email>: generated=N skipped=N failed=N`.

---

## Where data lives

| Asset | Location |
|---|---|
| Word metadata | `assignments.wordIds` array |
| Audio file | Supabase Storage, bucket `sound/`, key `<id>.mp3` |

Loosely coupled — audio file is at predictable URL based on ID, no foreign key. If missing, `useAudio.ts` falls back to `window.speechSynthesis` automatically (line 322).

---

## Timing

| Custom words | Approx time |
|---|---|
| 5 | ~1 second |
| 30 | ~3 seconds |
| 100 | ~10 seconds |
| 500 (max) | ~50 seconds |

Each Google Neural2 TTS call is ~200-500ms. Batched 5 in parallel. Teacher never waits.

---

## Failure modes — student always hears something

| What fails | What student hears |
|---|---|
| `GOOGLE_AI_API_KEY` not set | Browser TTS forever |
| Google TTS rate-limit | That batch falls through to browser TTS |
| Storage upload fails | Browser TTS for that word |
| Teacher not `role='teacher'` | Request rejected (403) |
| Network blip | `requestCustomWordAudio` swallows; browser TTS for entire set |

Fallback chain in `useAudio.ts` means students never hear silence — only quality varies.

---

## Things to keep in mind

- **Hard cap of 500 words per request.** Bigger payloads truncated server-side.
- **Endpoint is teacher-only.** Quick Play guests can't call it — QP sentences come from local templates.
- **`sound/` bucket migration.** Custom-word MP3s migrate alongside built-in ones via `scripts/migrate-storage.ts`.
