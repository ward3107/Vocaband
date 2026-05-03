# AI Lesson Builder — Plan

> **Status:** Spec / not yet built. This doc captures the design we
> agreed on in early-May 2026 so it survives session resets. Pick it
> up by phase whenever ready.

## What it is

A new teacher-side feature that turns any topic into a complete
vocabulary lesson package using AI. Three independent stages chained
together:

```
[Stage 1] Topic → Vocabulary list
[Stage 2] Vocabulary → Reading text (story / dialogue / news / letter / etc.)
[Stage 3] Text + Vocabulary → Comprehension questions (4 types)
```

Each stage runs **independently**. Teacher can stop after Stage 1 and
just use the words, or chain all three for a full printable lesson
with reading + comprehension.

The lesson bundle (words + text + questions) is reusable across:
- **Class Show** — words go into the source picker; new "Reading mode" displays the text + walks through questions on the projector
- **Worksheet (Print)** — two new sheet types: "Reading + Glossary" and "Comprehension"
- **Topic pack** — words save as a reusable pack
- **Assignment** (Phase 4) — push the whole lesson to students' phones as a multi-step assignment

---

## Stage 1 — Topic → Vocabulary

### Inputs (what the teacher fills in)

| Field | Required | Options |
|---|---|---|
| Topic | ✓ | free text — e.g. `weather`, `food at a restaurant`, `feelings`, `school subjects`, `Roman empire` |
| Level | ✓ | dropdown — Beginner (A1) / Elementary (A2) / Intermediate (B1) / Upper-Int (B2). Or grade-mapped: 4-5 / 6-7 / 8-9 |
| Number of words | ✓ | 10 / 20 / 30 / 50 |
| Word types | optional | checkboxes — Nouns · Verbs · Adjectives · Mixed (default Mixed) |
| Examples to anchor | optional | free text — e.g. *"like 'sunny, cloudy, windy'…"* — gives the AI a style cue |
| Skip Set 1/2/3 duplicates | optional toggle | default **ON** so AI doesn't propose words already in the curriculum |

### Output (what AI returns)

For each word: **English + Hebrew + Arabic + (optional) sample sentence**.

Curriculum words that happen to match (e.g. AI proposes "sun" which
is already in Set 1) are mapped to the existing `Word` object so they
pick up the official translation + audio file.

### UX surface

- New **AI Generate** tile inside `WordPicker` — 4th tile next to Topic Packs / Saved Groups / OCR
- Click → modal with the form above + "✨ Generate words" button
- ~3-5s loading spinner
- Preview grid: each word as a card with a checkbox + ✏️ edit translation + 🔄 swap word
- Teacher curates → "Add N words to my list" → words flow into selectedWords

---

## Stage 2 — Vocabulary → Reading text

### Inputs

| Field | Required | Options |
|---|---|---|
| Words to use | ✓ | inherited from Stage 1 (or selected from current list) |
| Genre | ✓ | Story · Dialogue · News article · Letter/Email · Description · Diary entry |
| Length | ✓ | Short (~80 words) · Medium (~150) · Long (~250) |
| Tense | optional | Present · Past · Mixed |
| Setting / character hint | optional | free text — *"a kid going on a school trip to the zoo"* |

### Output

A passage that naturally uses the target vocabulary, with target
words **bolded**. Below the text: a small glossary linking each
highlighted word to its translation.

### Teacher controls

- **Regenerate** — fresh draft, same params
- **Make it shorter / longer**
- **Make it harder / easier**
- **Edit manually** — opens an inline editor

### UX surface

- "Add reading text" button after Stage 1 completes
- Modal with the form
- Big readable preview (16pt) with target words bolded
- Glossary table beneath
- Floating action bar: Regenerate / Make harder / Edit / Save

---

## Stage 3 — Text + Vocabulary → Comprehension questions

### Inputs

| Field | Required | Notes |
|---|---|---|
| Text | ✓ | inherited from Stage 2 |
| Word list | ✓ | inherited from Stage 1 |
| Question types | ✓ | checkboxes — pick which to include (see types below) |
| Count per type | ✓ | 3 / 5 / 10 each |

### Question types (v1 ships 4 of these)

| Type | What it tests | Example |
|---|---|---|
| **Multiple choice** (4 options) | Understanding | "Where did the boy go?" |
| **True / False** | Detail recall | "The boy was afraid of the lion." |
| **Fill-in-the-blank** | Vocabulary in context | "The girl wore a ___ dress." |
| **Open-ended** | Comprehension | "Why was the family sad?" |
| Vocabulary matching | Word → translation | match column |
| Synonym / antonym | Word relations | "Find a synonym for *brave* in the text." |
| Word formation | Grammar | "Write the noun form of *happy*." |

**Recommendation for v1:** Multiple choice + True/False + Fill-blank
+ Open-ended (the four most common ESL question types). Add the
others in v2 once teachers ask.

### Output

Structured JSON per question:
```ts
{
  type: 'multi-choice' | 'true-false' | 'fill-blank' | 'open-ended',
  prompt: string,
  options?: string[],     // multi-choice only
  correctAnswer: string,
  explanation?: string,   // for the answer key
}
```

### Teacher controls

- ✏️ edit per question
- 🔄 regenerate one question
- 🗑 delete

---

## Where the lesson lands

| Destination | Renders as |
|---|---|
| **Class Show source picker** | Words available as a source |
| **Class Show "Reading mode"** (NEW) | Projects the text on screen, then walks through questions one-by-one with existing Reveal/Skip/Next controls |
| **Worksheet "Reading + Glossary" sheet** (NEW) | Prints the passage with target words highlighted + translation key |
| **Worksheet "Comprehension" sheet** (NEW) | Prints questions in print-friendly layout + answer key |
| **Topic pack** | Words save as a reusable pack alongside built-in topic packs |
| **Assignment** (Phase 4) | Push the full bundle (text → questions) to students' phones as a multi-step assignment |

---

## Backend architecture

Three new endpoints on Fly.io (`server.ts`):

```
POST /api/ai-generate-words
POST /api/ai-generate-text
POST /api/ai-generate-questions
```

All three:
- Gated by the existing `ai_allowlist` table (same gate AI Sentence Builder uses — see `CLAUDE.md §14`)
- Rate-limited **30 requests / hour / teacher** (Gemini Flash is cheap but not free)
- Call **Gemini 2.0 Flash** with structured prompts (`responseSchema` for type safety)
- Return JSON, log `[AI <stage>] <email>: topic=...` for observability
- 30-second timeout (matches Worker timeout)

**Optional cost cap:** monthly limit of N requests/teacher (e.g. 500/mo) tracked in `users.ai_monthly_count` + a reset cron. Add only if Gemini bills get noisy.

---

## Storage strategy

### Phase 1-3 — ephemeral (client-side state only)

The lesson bundle exists only in component state until the teacher
saves it as a worksheet / assignment / topic pack. Closing the tab
loses unsaved work. Cheap to ship; teachers re-generate if they
want it again.

### Phase 4 — Supabase `ai_lessons` table

```sql
CREATE TABLE public.ai_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid UUID REFERENCES public.users(uid) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  level TEXT NOT NULL,                -- 'A1' | 'A2' | 'B1' | 'B2'
  words JSONB NOT NULL,               -- [{english, hebrew, arabic, sentence?}]
  reading_text TEXT,                  -- nullable; only populated if Stage 2 was run
  questions JSONB,                    -- nullable; only populated if Stage 3 was run
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: teacher sees only their own lessons
CREATE POLICY ai_lessons_owner ON public.ai_lessons
  FOR ALL TO authenticated
  USING (user_uid = (SELECT auth.uid()));
```

Plus a Lesson Library page (new view in the teacher dashboard) where
the teacher browses their saved bundles, re-uses them, edits, deletes.

---

## Frontend components

| Component | Purpose | Lines (est) |
|---|---|---|
| `AiLessonBuilderTile.tsx` | Entry point — purple-gradient card on dashboard, alongside Class Show / Worksheet / Quick Play | ~50 |
| `AiLessonBuilderModal.tsx` | Stepper modal (1·2·3·4·5·6 progress), houses the whole flow | ~300 |
| `AiVocabularyStep.tsx` | Stage 1 form + curate grid | ~200 |
| `AiTextStep.tsx` | Stage 2 form + text preview panel | ~200 |
| `AiQuestionsStep.tsx` | Stage 3 form + question review list | ~250 |
| `AiLessonFinalStep.tsx` | "Lesson ready" summary + 4 destination buttons | ~100 |
| `ReadingModeProjector.tsx` (Class Show extension) | Shows text on screen, then walks through questions | ~150 |
| `ReadingSheet.tsx` (Worksheet extension) | Print-friendly text + glossary | ~80 |
| `ComprehensionSheet.tsx` (Worksheet extension) | Print-friendly questions + answer key | ~120 |

Plus a top-level **AI Lesson Library** view in Phase 4 (~250 lines).

i18n: new locale file `src/locales/student/ai-lesson-builder.ts` with
EN/HE/AR for every UI string (form labels, button text, status
messages, error toasts).

---

## Phasing + effort

| Phase | What ships | Hours |
|---|---|---|
| **1** | Vocabulary generator inside WordPicker (Stage 1 only) — new `/api/ai-generate-words` endpoint, AI tile, modal, curate grid, integration with WordPicker | 6-8 |
| **2** | Reading-text generator (Stage 2) — new endpoint, "Reading" worksheet sheet type, Class Show "Reading mode", text preview/edit panel | 8-10 |
| **3** | Question generator (Stage 3) — new endpoint, 4 question types, "Comprehension" worksheet sheet type, question review list, integration with Class Show projector | 10-15 |
| **4** | Lesson Library — `ai_lessons` Supabase table + RLS, Library view, save/edit/reuse, push-as-assignment | 6-8 |
| **Total** | | **30-41 hr** |

### Phasing recommendation

**Ship Phase 1 first** as a small testable PR. Behind a feature flag
(`VITE_AI_LESSONS=true`) so it can be rolled to a single pilot
teacher before exposing to everyone. Watch usage:

- Teachers love it → ship Phase 2, then 3, then 4 over subsequent sessions
- Teachers shrug → save weeks of work; Phase 1 alone is still useful

Don't try to ship all four at once. Each phase is independent and
deliverable; chaining them in one PR multiplies regression risk.

---

## Items to confirm before building Phase 1

These are decisions to lock in **before** I write code:

1. **Field set for Stage 1.** Confirm the 6 fields above (topic / level / count / types / examples / skip-curriculum-duplicates). Add or remove anything?
2. **Default level.** Should it auto-pick based on the teacher's class assignments (e.g. mostly Set 2 → default A2)? Or always start blank?
3. **Pre-translated.** AI returns translations directly (faster, but quality varies)? Or AI returns English-only and the existing `onTranslateBatch` pipeline fills in HE/AR (slower but consistent with existing translation layer)? **Recommendation:** AI returns translations directly; teacher reviews/edits via the existing translation pipeline if needed.
4. **Where the words land.** Directly into `selectedWords` (one click → done) or into a "review tray" the teacher can curate first? **Recommendation:** review tray with checkboxes — quality control matters more than speed.
5. **Save-as-pack.** Should the Stage 1 result include a "Save these as a topic pack" button? **Recommendation:** yes — frees the teacher to reuse the same word set across multiple assignments without re-running the AI.

---

## Operator items (when Phase 1 ships)

- Add `VITE_AI_LESSONS=true` to Cloudflare Workers env var (build-time flag)
- Confirm `ai_allowlist` table has the pilot teacher(s) (per CLAUDE.md §14)
- Set up a `GEMINI_API_KEY` secret on Fly: `fly secrets set GEMINI_API_KEY=... -a vocaband` (or reuse existing key if `GOOGLE_CLOUD_API_KEY` already covers Gemini)
- Optional: add a Cloudflare Workers AI Gateway in front of Gemini if you want centralized cost dashboards / caching / rate limiting at the edge — but not required for v1.

---

## Out of scope (for v1)

- Image generation per word (would need a separate image API, +cost). Keep emoji avatars from existing icon set.
- Audio narration of the reading text (TTS exists for individual words; full-passage narration is a separate build — could use Google Cloud Neural2 TTS but adds latency + storage).
- Difficulty grading — teacher picks the level; AI doesn't auto-detect students' actual readiness.
- Multi-language reading (the text is always in **English**; vocabulary translations stay in HE/AR as today).
- Sharing lessons across teachers (each teacher's library is private; cross-teacher sharing is its own feature).

---

## Why this matters

Today, teachers who want a complete reading + vocabulary + comprehension
lesson on a specific topic have to:
1. Build the word list manually (paste, OCR, or curate from sets)
2. Find or write a passage themselves
3. Hand-write comprehension questions

That's 30-60 minutes per lesson. With AI Lesson Builder it drops to
**60 seconds for the AI + ~5 minutes for teacher review/edit**. Across
20 lessons a year, that's the difference between "teachers love this"
and "teachers don't have time."

Plus: it raises Vocaband from "vocab game" to "AI-powered lesson
platform" — a category move that justifies higher pricing and unlocks
school-wide licenses.
