# Future Plan: AI Translation for Custom Words

> **Status**: Planned — not yet implemented
> **Created**: 2026-03-28
> **Priority**: Medium — implement when custom word usage grows

## Problem

When teachers paste/OCR/upload words that aren't in the 2,067-word vocabulary bank, `handleAddUnmatchedAsCustom()` (App.tsx:1045) creates Word objects with **empty hebrew and arabic fields**. This breaks games — Matching shows blank cards, Flashcards/Reverse/True-False display empty translations. There is currently **no AI or translation API** integrated.

## Goal

Auto-translate custom words (English → Hebrew + Arabic) and **store translations in a shared DB cache** so every teacher benefits from past translations — the same word is never translated twice.

---

## Chosen approach: Google Cloud Translation API (v2 Basic)

- Virtually free at school scale (500K chars/month free tier = ~31,000 words/month)
- Best Hebrew translation quality (largest training corpus)
- Simplest integration — single REST call, no prompt engineering
- DPA available, processor-only, no training on API data — safe for Amendment 13
- Already has precedent in the project (`translate_band2.py` used Google Translate)

**Optional future upgrade**: Add Claude API (Haiku) for context-aware translations and auto-generated example sentences for Sentence Builder mode (~$0.02/month).

---

## Implementation Steps

### Step 1. Add `translation_cache` table in Supabase

**File**: `supabase/schema.sql`

This is the **shared translation store** — every translated word is saved here. When any teacher adds "volcano", all future teachers who add "volcano" get the cached translation instantly (no API call).

```sql
CREATE TABLE IF NOT EXISTS public.translation_cache (
  english    TEXT PRIMARY KEY,                                -- normalized lowercase English word/phrase
  hebrew     TEXT NOT NULL DEFAULT '',
  arabic     TEXT NOT NULL DEFAULT '',
  source     TEXT NOT NULL DEFAULT 'google'                   -- 'google' | 'manual'
    CHECK (source IN ('google', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_translation_cache_english
  ON public.translation_cache (english);

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translation_cache_select" ON public.translation_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "translation_cache_upsert" ON public.translation_cache
  FOR INSERT WITH CHECK (public.is_teacher());

CREATE POLICY "translation_cache_update" ON public.translation_cache
  FOR UPDATE USING (public.is_teacher());
```

**Cache priority**: `source = 'manual'` (teacher-corrected) always takes precedence over `source = 'google'`. The server will not overwrite manual corrections.

**How it saves cost**:
- Teacher A translates "volcano" → Google API call → saved to `translation_cache`
- Teacher B later adds "volcano" → cache hit → **zero API calls**, instant result
- Over time the cache grows, API usage drops toward zero

### Normalization & variation handling

The cache key (`english` column) is **always stored normalized** — lowercase, trimmed, single-spaced. "Volcano", "VOLCANO", and "volcano" all resolve to the same cache row.

**English variations** (e.g. "run" / "running" / "ran"):
- Each form is cached separately — they have different Hebrew/Arabic translations
- "running" → Hebrew "רץ/רצה" (present tense) is NOT the same as "run" → "לרוץ" (infinitive)
- `extractRootWord()` from `vocabulary-matching.ts` is used for word family *matching*, but NOT for cache keys

**Hebrew handling**:
- Google returns the most common translation (usually masculine singular)
- Teachers can edit in the review UI (e.g. add feminine form)
- Niqqud (vowel points) preserved in stored translations — `normalizeText()` only strips them for search comparisons

**Arabic handling**:
- Google returns standard MSA without diacritics
- Definite article "ال" preserved as-is
- Diacritics (harakat) preserved if present

**Ambiguous words** (e.g. "bank" = financial OR river):
- One translation per English word (Google's default)
- Teacher manual corrections override for everyone
- Full disambiguation (multiple meanings) is a future LLM enhancement

### Step 2. Add server-side `POST /api/translate` endpoint

**File**: `server.ts`

```
POST /api/translate
Headers: Authorization: Bearer <supabase-jwt>
Body: { words: string[] }
Response: { translations: { english: string, hebrew: string, arabic: string, cached: boolean }[] }
```

**Flow**:
1. Validate JWT → confirm caller is a teacher
2. Validate input: max 50 words, each max 100 chars, reject control characters
3. **Normalize all words**: `word.toLowerCase().trim().replace(/\s+/g, ' ')`
4. **Batch-query `translation_cache`**: `SELECT * FROM translation_cache WHERE english IN (...)`
5. Split into `cachedWords` and `uncachedWords`
6. For `uncachedWords` only: call Google Cloud Translation v2 batch endpoint
7. **Save new translations**: `INSERT ... ON CONFLICT (english) DO UPDATE SET ... WHERE source != 'manual'`
8. Return combined results with `cached: true/false` per word

**Rate limiting**: 10 req/min per user (reuse `createSocketRateLimiter` from `src/server-utils.ts`)

### Step 3. Install dependency & configure env

```bash
npm install @google-cloud/translate
```

- `.env.example` — add `GOOGLE_TRANSLATE_API_KEY=`
- `render.yaml` — add `GOOGLE_TRANSLATE_API_KEY` env var

### Step 4. Modify `handleAddUnmatchedAsCustom()` in App.tsx

**File**: `src/App.tsx` (lines 1045-1065)

**New flow**:
1. Teacher clicks "Add N as Custom"
2. Show loading: "Translating N words..."
3. Call `POST /api/translate` with unmatched English words
4. Show **review table**: English | Hebrew (editable) | Arabic (editable)
5. Pre-fill with translations; teacher can correct any cell
6. "Confirm & Add" saves words with translations
7. If teacher edited → save correction to cache with `source: 'manual'`

### Step 5. Add teacher review/edit UI

**File**: `src/App.tsx` (paste dialog area, lines 3959-4023)

- 3-column table: **English** (read-only) | **Hebrew** (editable) | **Arabic** (editable)
- "cached" badge vs "AI" badge per row
- "Confirm & Add" and "Skip" buttons

### Step 6. Update privacy compliance

- `src/privacy-config.ts` — Add Google Cloud Translation to `THIRD_PARTY_REGISTRY`
- `PRIVACY_CHECKLIST.md` — Document the new data flow
- Bump `PRIVACY_POLICY_VERSION`

```ts
{
  name: "Google Cloud Translation",
  purpose: "Auto-translate custom vocabulary words to Hebrew and Arabic",
  dataCategories: ["English vocabulary words (no personal data)"],
  processorOnly: true,
  hostingRegion: "global",
  endpoint: "translation.googleapis.com",
  notes: "Only vocabulary words are sent; no student or teacher personal data"
}
```

---

## Files to modify

| File | Change |
|------|--------|
| `supabase/schema.sql` | Add `translation_cache` table with RLS policies |
| `server.ts` | Add `POST /api/translate` endpoint |
| `src/App.tsx` | Modify custom word flow + add review table UI |
| `src/server-utils.ts` | Reuse rate limiter for translate endpoint |
| `src/privacy-config.ts` | Add Google Cloud Translation to registry |
| `PRIVACY_CHECKLIST.md` | Document new data flow |
| `render.yaml` | Add `GOOGLE_TRANSLATE_API_KEY` env var |
| `package.json` | Add `@google-cloud/translate` |
| `.env.example` | Add `GOOGLE_TRANSLATE_API_KEY` |

---

## Verification checklist

- [ ] Translate endpoint with mocked Google API — cache-hit skips API, cache-miss calls API and saves
- [ ] Translate "volcano" twice → second call returns `cached: true`
- [ ] Teacher edits translation → saved as `source: 'manual'` → future lookups return corrected version
- [ ] Unauthenticated and student requests rejected
- [ ] Paste unknown words → loading → review table → edit → confirm → words have translations
- [ ] Only English vocabulary words sent to Google (no PII)
