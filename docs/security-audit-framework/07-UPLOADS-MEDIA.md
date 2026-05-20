# 07 — Uploads, OCR, Camera, Audio Pipeline

> File-upload surface + media generation. The classic XSS / RCE vector
> for SaaS — but Vocaband has narrowed it well.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Multer config (size, type, count) | GOOD — 15MB, image-only MIME allowlist, 1 file (server.ts:466-477) | Low | LOW | HIGH |
| In-memory storage (no temp files) | GOOD — `multer.memoryStorage()` | Low | INFO | HIGH |
| MIME spoofing risk | MODERATE — relies on `file.mimetype` (browser-supplied) | Medium | LOW | HIGH |
| Image content scanning | NOT IMPLEMENTED — no malware/EXIF strip | Medium | LOW | HIGH |
| Camera permissions (`Permissions-Policy: camera=(self)`) | GOOD — server.ts:424 | Low | INFO | HIGH |
| TTS pipeline (audio mp3 generation) | GOOD — server-only, server.ts:2070 | Low | INFO | HIGH |
| Audio-pack ZIP streaming (Worker) | MODERATE — see module 04 | Medium | MODERATE | HIGH |
| User-uploaded file storage in DB | NOT APPLICABLE — no `bytea` columns; uploads transit to LLM only | Low | INFO | HIGH |
| Worksheet generation (PDF/Word) | NEEDS REVIEW — AI output rendered into documents (see module 06) | Medium | MODERATE | LOW |

**Overall:** GOOD (76/100). The smart choice — *don't store user
uploads* — eliminates most classical risks.

---

## 2. Attack surface mapping

| Surface | Notes |
|---|---|
| `/api/ocr` POST (multer) | image → Gemini Vision; result returned, never stored |
| `/api/tts/custom-words` POST | text → Google TTS → MP3 to Supabase Storage |
| `InPageCamera.tsx` (getUserMedia) | local capture; submits to `/api/ocr` |
| `WorksheetShareCard.tsx` | renders QR SVG via `dangerouslySetInnerHTML` (self-generated, safe) |
| `/api/audio-pack` (Worker) | streams ZIP of MP3s from Supabase Storage |
| Worksheet PDF/Word export | server-generated; renders AI output into doc |

---

## 3. Offensive analysis

### A. Multer MIME spoofing

The filter (server.ts:469-476) checks `file.mimetype`, which is the
**browser-supplied** type. An attacker can upload `evil.html` with
`Content-Type: image/png` and pass the check. The downstream call to
Gemini Vision will reject non-image content (it's a vision model), so
the abuse window is "uploaded file in server memory for the duration
of the call". With `memoryStorage()`, the file is GC'd when the
request ends — no disk persistence.

**Mitigation depth.**
- Add `file-type` magic-bytes verification on the buffer before
  forwarding to Gemini. Three lines:

  ```ts
  const ft = await fileTypeFromBuffer(file.buffer);
  if (!ft?.mime?.startsWith('image/')) {
    return res.status(415).json({ error: 'Not an image' });
  }
  ```

**Severity.** LOW today (Gemini rejects), MODERATE if you ever store
the file.

### B. Polyglot files (PDF+JS, SVG+XML)

Vocaband doesn't accept PDFs or SVGs as user uploads. The OCR endpoint
allows `image/heic`/`image/heif` (server.ts:471) — these have known
metadata-parser CVEs over the years. **Mitigation:** verify the
multer-using library doesn't load EXIF — or strip EXIF before forwarding
(libvips is overkill; for OCR you don't need EXIF anyway).

### C. ZIP bomb at the edge

`worker/index.ts:174-217` builds a ZIP from up to 200 Supabase fetches.
If a single MP3 is huge (a corrupt upload, or a malicious one if the
TTS endpoint is ever compromised), the Worker would OOM. Mitigations:

- TTS upload path is server-controlled (no user direct write to the
  `sound/` bucket); verify Supabase Storage RLS denies anon writes.
- Add a max-per-file size check before yielding to `client-zip`.

### D. Camera + microphone over-permission

`Permissions-Policy: camera=(self), microphone=(self)` (server.ts:424)
restricts to Vocaband origin. Good. `microphone` is allowed — verify
this is used (TTS reading-aloud doesn't need mic; only the speech-
recognition game does). If unused, drop to `microphone=()`.

### E. Worksheet generation (AI output → document)

If the worksheet generator (`src/worksheet/` from `ls` output) uses
HTML templates and interpolates AI strings, that's a stored-XSS sink.
**Action:** read `src/worksheet/` and confirm template engine escapes
by default (handlebars `{{var}}` is safe; `{{{var}}}` is not).

### F. Camera permission spoofing on iOS Safari

iOS Safari surfaces camera prompts at the page boundary; PWA install
context can re-prompt unexpectedly. UX issue, not security; flag for
mobile review.

### G. Custom audio uploads

`docs/custom-audio-pipeline.md` (referenced in CLAUDE.md) describes
the pipeline. Verify:
- Who can trigger TTS generation?
- Is the resulting MP3 path predictable (enables enumeration)?
- Is the MP3 bucket public-read (per worker/index.ts:197 — yes)?

A public bucket of generated MP3s is acceptable (they're vocab words,
not PII), but if any path ever derives from a teacher-supplied string
without normalisation, name-collisions or path traversal become live.

---

## 4. Blue-team controls

| Control | Status | Priority |
|---|---|---|
| Multer 15MB cap | ✅ | — |
| MIME allowlist (image/*) | ✅ | — |
| `memoryStorage` (no temp) | ✅ | — |
| Magic-byte verification | ❌ | P2 |
| EXIF strip | ❌ | P2 |
| `microphone=()` if game unused | ❌ | P3 |
| Worksheet template escape audit | ❌ | P1 |
| Audio-pack max-per-file budget | ❌ | P2 |

---

## 5. Testing strategy

| Test | Auto? |
|---|---|
| Upload `evil.html` with `image/png` MIME — rejected by magic-byte check | Auto |
| Upload 20MB image — rejected by multer | Auto |
| Upload HEIC with malformed EXIF (CVE corpus) — server doesn't crash | Manual |
| Worksheet generation rejects `<script>` in AI output | Auto |
| `getUserMedia` requested in non-allowed origin — denied | Manual |
| Audio-pack with traversal `id=..%2Fevil.mp3` — denied | Auto |

---

## 6. Architecture review

- **Don't store** is the right pattern; preserve.
- Multer `memoryStorage` is fine at current scale (15MB × low concurrency).
  If concurrency grows, consider `multer-s3` or streaming to LLM
  directly without buffering.
- Generated MP3s in public bucket: re-derive content-addressed names
  (hash of input text) to prevent name collisions and enumeration.

---

## 7. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| Multer reject rate > 20% | enumeration / abuse | P2 |
| OCR endpoint p95 > 30s | LLM degradation | P2 |
| TTS endpoint cost / day > $5 | abuse | P2 |
| Audio-pack request rate > baseline ×5 | abuse | P1 |

---

## 8. Incident response

- **Suspected upload-based RCE:** revert any recent Multer/file
  pipeline changes; pause the OCR endpoint via feature flag; rotate
  Gemini key.
- **Storage bucket exposure:** review Supabase Storage RLS;
  emergency-public off; investigate path scheme.

---

## 9. Edge cases

- **Student takes a photo in poor light → OCR returns garbage** —
  UX, not security.
- **iPad lockscreen captures the photo mid-flight** — no impact.
- **Network interrupted mid-upload** — multer aborts; nothing
  persisted.
- **Heic on older iPhones** — server accepts; Gemini Vision handles.

---

## 10. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| Upload reject rate | <10% | 10-30% | >30% |
| OCR success rate | >95% | 80-95% | <80% |
| TTS daily cost | <$3 | $3-20 | >$20 |

---

## 11. Self-critique

- The biggest blind spot is the worksheet generator — we did not read
  it. If AI text reaches a non-React rendering path (PDFkit, docx,
  raw HTML for print), retest module 06 controls there.
- We assumed the custom-audio MP3 bucket is public — confirm in
  Supabase Storage policies.
