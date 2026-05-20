# 09 — Vocabulary Data & Audio Pipeline

> 6482 words spanning MoE Sets 1/2/3 with HE+AR translations, audio MP3s, sentence bank entries. Lazy-loaded; precached per assignment. Custom audio pipeline via Gemini + R2.
>
> Key files: `src/data/vocabulary.ts`, `src/data/sentence-bank.ts`, `src/hooks/useVocabularyLazy.ts`, `src/hooks/useAudio.ts`, `src/hooks/useAssignmentPrecache.ts`, `scripts/generate-audio.ts`, `docs/custom-audio-pipeline.md`, `docs/r2-migration-runbook.md`.

---

## 1. Purpose of Module

- **What:** Central data source for words, translations, audio, and example sentences. The "content" of the product.
- **Who:** Indirect — consumed by every game mode and the assignment wizard.
- **Why:** Quality and completeness of the dataset is the moat against generic competitors. Pronunciation accuracy is a marketing claim.
- **Criticality:** **S2** — corruption can degrade gameplay across the entire product but doesn't compromise PII.

---

## 2. User Flow Mapping

### 2.1 Lazy load

```
Student starts assignment → useVocabularyLazy fires
→ fetches the slice of ALL_WORDS needed (chunked by set)
→ caches in memory + IndexedDB
→ next assignment in same set: instant
```

### 2.2 Audio playback

```
Game presents word → useAudio.play(word.audioUrl)
→ HTMLAudioElement created or pooled
→ if cached: instant playback
→ if cold: fetch + buffer + play
→ onerror → fallback (TTS) or silent skip
```

### 2.3 Custom audio generation (assignment with custom words)

```
Assignment save → for each custom word without audio:
  → server.ts: gemini.generateAudio(word)
  → upload to R2 (or Supabase Storage)
  → write audio_url to db
→ useAssignmentPrecache pre-fetches these audios to client
```

### 2.4 Sentence bank

```
Sentence Builder mode → for each word, pick a pre-vetted sentence
→ if no pre-vetted: fall back to Gemini generation (with safety prompt)
```

---

## 3. Functional QA Scenarios

| ID            | Scenario                                                | Steps                                              | Expected                                                       | Severity | Priority |
|---------------|---------------------------------------------------------|----------------------------------------------------|-----------------------------------------------------------------|----------|----------|
| VOCAB-FUNC-001 | All 6482 words load eventually                          | Trigger across all sets                            | No duplicates by id; all have `en`, `set`, `audioUrl`           | S2       | P0       |
| VOCAB-FUNC-002 | Every word has HE translation                           | Audit data                                          | 100%                                                            | S3       | P1       |
| VOCAB-FUNC-003 | Every word has AR translation                           | Audit data                                          | 100%                                                            | S3       | P1       |
| VOCAB-FUNC-004 | Audio plays for word                                   | Game round                                          | Sound clear, < 150ms latency from tap                          | S2       | P1       |
| VOCAB-FUNC-005 | Lazy chunk size budget                                  | Network panel inspection                            | < 250KB gz per set                                              | S3       | P2       |
| VOCAB-FUNC-006 | Sentence bank entry per word (where applicable)         | Sentence Builder for set 1                          | Pre-vetted sentence used; no AI fallback for set 1              | S3       | P1       |
| VOCAB-FUNC-007 | Custom word audio generation                            | Add custom word to assignment                       | Audio URL populated within 30s                                 | S2       | P1       |
| VOCAB-FUNC-008 | Custom word sentence generation                          | Sentence Builder for custom word                    | Safe, age-appropriate sentence                                 | S2       | P1       |
| VOCAB-FUNC-009 | Tone of audio voice                                      | Listen                                              | Clear, child-friendly English (UK or US per locale)            | S3       | P2       |
| VOCAB-FUNC-010 | RTL rendering of HE/AR translation                       | Display in game                                     | RTL correct; punctuation correct                                | S3       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                                  | Expected                                                  |
|---------------|--------------------------------------------------------|-----------------------------------------------------------|
| VOCAB-EDGE-001 | Duplicate words across sets                           | Allowed (cross-listing) but normalized                    |
| VOCAB-EDGE-002 | Word with multiple translations (homonym)             | Display primary; tooltip alternates                       |
| VOCAB-EDGE-003 | Audio URL 404                                          | Silent fallback; log                                      |
| VOCAB-EDGE-004 | Word with unusual chars (apostrophes, hyphens)        | Match normalization handles                               |
| VOCAB-EDGE-005 | Sentence bank entry uses word not in dataset          | Filter out at build time                                  |
| VOCAB-EDGE-006 | Empty translation                                      | Show "—" or fallback                                      |

### 4.2 Pipeline edge cases

| ID            | Failure                                                | Expected                                                          |
|---------------|--------------------------------------------------------|-------------------------------------------------------------------|
| VOCAB-EDGE-101 | Gemini generates non-English audio                    | Detect via language metadata; reject                              |
| VOCAB-EDGE-102 | Gemini audio quota exhausted                          | Queue + retry; UI shows pending                                   |
| VOCAB-EDGE-103 | R2 upload fails                                        | Retry 3x; fallback to Supabase Storage                            |
| VOCAB-EDGE-104 | Audio file > 1MB                                       | Reject; regenerate with lower bitrate                             |
| VOCAB-EDGE-105 | Audio file with silence/clipping                      | Validation step before publish                                    |

### 4.3 Performance edge cases

| ID            | Scenario                                       | Expected                                                          |
|---------------|------------------------------------------------|-------------------------------------------------------------------|
| VOCAB-EDGE-201 | Mounting full ALL_WORDS on slow Android       | Lazy-load enforced; first paint < 2s                              |
| VOCAB-EDGE-202 | Audio precache 200 words                       | < 30s on 4G; progress bar                                         |
| VOCAB-EDGE-203 | IndexedDB quota exceeded                       | Evict oldest chunks                                               |

---

## 5. Security QA

| ID           | Attack                                            | Exploit                                                                                 | Expected secure behavior                                                                       |
|--------------|---------------------------------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| VOCAB-SEC-001 | Inject audio file with embedded malware           | Upload via custom audio pipeline                                                       | Server validates MIME, re-encodes via ffmpeg                                                  |
| VOCAB-SEC-002 | Replace audio with offensive content              | Tamper R2 if access leaked                                                              | R2 ACLs restrict write to server identity only                                                |
| VOCAB-SEC-003 | XSS in translation text                            | Curated dataset only; no UGC translations                                              | Verified at data build                                                                         |
| VOCAB-SEC-004 | DoS via custom words generation                    | Loop generation                                                                         | Per-teacher rate limit                                                                         |
| VOCAB-SEC-005 | Privacy: do not log word being looked up by user   | Only aggregate counters                                                                  | Verified                                                                                       |

---

## 6. Accessibility QA

| ID             | Check                                                       | Expected                                                  |
|----------------|-------------------------------------------------------------|-----------------------------------------------------------|
| VOCAB-A11Y-001 | Audio playback respects volume                              | Yes                                                       |
| VOCAB-A11Y-002 | Words rendered with accessible font size                    | ≥ 18px in games                                          |
| VOCAB-A11Y-003 | HE/AR fonts include all glyphs                              | Web font subset audited                                   |
| VOCAB-A11Y-004 | Word emphasis for screen readers                            | `<lang="en">` attributes                                  |

---

## 7. Performance QA

| Metric                                | Target           | Critical    |
|--------------------------------------|------------------|-------------|
| First word data fetch                 | < 600ms          | > 2s        |
| Audio play start                     | < 150ms          | > 500ms     |
| Lazy chunk parse                      | < 100ms (low-end Android) | > 500ms |
| Memory: in-memory vocab cache         | < 25MB           | > 100MB     |
| IndexedDB write per chunk             | < 50ms           | > 250ms     |

---

## 8. Database & Data Integrity QA

| ID           | Check                                                                          | Expected                                                  |
|--------------|--------------------------------------------------------------------------------|-----------------------------------------------------------|
| VOCAB-DB-001 | Word id format consistent                                                       | snake_case or numeric                                     |
| VOCAB-DB-002 | Set field is one of "Set 1" / "Set 2" / "Set 3" / "Custom"                      | Enum                                                      |
| VOCAB-DB-003 | Audio URL points to controlled origin (R2 or Supabase)                          | No third-party                                            |
| VOCAB-DB-004 | Sentence bank references valid word ids                                          | Build-time check                                          |
| VOCAB-DB-005 | Custom words stored separately from canonical dataset                            | Yes                                                       |
| VOCAB-DB-006 | Version field for data updates                                                   | Allow rolling refresh                                     |
| VOCAB-DB-007 | Backup of audio assets to secondary storage                                      | Documented                                                |

---

## 9. API & CDN QA

| ID           | Check                                                                  | Expected                                              |
|--------------|------------------------------------------------------------------------|-------------------------------------------------------|
| VOCAB-API-001 | Audio served with `Cache-Control: public, max-age=31536000, immutable` | Browser caches indefinitely                          |
| VOCAB-API-002 | CORS allows playback from vocaband.com                                  | Yes                                                   |
| VOCAB-API-003 | Range requests supported                                                 | Yes (for audio scrubbing)                            |
| VOCAB-API-004 | HTTPS only                                                              | Yes                                                   |
| VOCAB-API-005 | Service worker caches first 100 most-played words                       | Per pwa strategy                                      |

---

## 10. State Management QA

| ID              | Check                                                                | Expected                                              |
|-----------------|----------------------------------------------------------------------|-------------------------------------------------------|
| VOCAB-STATE-001 | useVocabularyLazy de-dupes concurrent loads                          | Single in-flight per chunk                            |
| VOCAB-STATE-002 | Cached chunks persist across sessions                                | IndexedDB                                             |
| VOCAB-STATE-003 | Audio refs released when no longer needed                            | No leak                                               |

---

## 11. Observability & Monitoring QA

| ID            | Signal                                          | Threshold              | Indicates                          |
|---------------|--------------------------------------------------|------------------------|------------------------------------|
| VOCAB-OBS-001 | Audio 404 rate                                  | > 0.5% → alert         | CDN issue                          |
| VOCAB-OBS-002 | Lazy chunk parse time                            | p95 > 500ms → review   | Perf regression                    |
| VOCAB-OBS-003 | Custom audio generation failure                  | > 5% → alert           | Pipeline issue                     |
| VOCAB-OBS-004 | Data dump version mismatch                      | any → alert            | Stale clients                      |

---

## 12. QA Automation Strategy

| Layer       | Tool         | Coverage                                                       |
|-------------|--------------|----------------------------------------------------------------|
| Unit        | Vitest       | normalizers, chunk loader, audio pool                          |
| Data        | Custom script| ALL_WORDS audit: dupes, missing translations, missing audio    |
| Integration | Supertest    | custom audio pipeline                                           |
| E2E         | Playwright   | full assignment with custom words → audio playable             |
| Perf        | Lighthouse   | Initial chunk budget                                            |

**P0**: ALL_WORDS data audit in CI. **P1**: audio 404 monitoring.

---

## 13. Production Readiness Score (Vocabulary)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 4     | Comprehensive dataset                                                                       |
| Security        | 4     | No UGC; controlled CDN                                                                       |
| Performance     | 4     | Lazy + chunked                                                                              |
| Accessibility   | 3     | Font subsets and `lang` attributes need confirmation                                         |
| Reliability     | 4     | Static + CDN                                                                                |
| Observability   | 2     | Limited                                                                                     |
| Data integrity  | 4     | Build-time audit                                                                            |

**Module readiness: 3.6 / 5.**

---

## 14. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| Audio 404 rate                     | < 0.1%     | 0.1–1%   | > 1%     |
| Missing translations               | 0          | 1–10     | > 10     |
| Lazy chunk parse p95               | < 100ms    | 100–500ms| > 500ms  |
| Custom audio gen success           | ≥ 95%      | 90–95%   | < 90%    |

---

## 15. Self-QA Validation

**Missed initially:**
1. **IndexedDB quota** — added VOCAB-EDGE-203.
2. **Audio quality validation** — added VOCAB-EDGE-105.
3. **Service-worker audio caching** — added VOCAB-API-005.

**Dangerous assumptions:**
- "All audio is pre-generated" — custom words break this.
- "Lazy chunks are small" — confirm with budget on every PR that adds vocabulary.

**Hidden failures:**
- IndexedDB eviction on iOS Safari clears all cached chunks unpredictably; observe.
- Class on Israeli WiFi proxies may strip range requests, breaking audio scrubbing.
