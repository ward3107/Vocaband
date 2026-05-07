# VocaHebrew — MVP Plan

> Plan for the first non-English Voca, prioritized ahead of the
> 6-subject roadmap in `VOCA-FAMILY-ROADMAP.md`. Founder is a Hebrew
> teacher (grades 3–12), so external teacher validation skipped — the
> founder is the domain expert AND the first pilot user.
>
> Direction set 2026-05-07. Path **B (fast MVP, ~2 weeks)** chosen
> over Path A (full school + billing system, ~6 weeks).

---

## Status

| Item | Status |
|---|---|
| Strategic decision (VocaHebrew next, ahead of 6-subject roadmap) | ✅ 2026-05-07 |
| Access model (school-licensed + teacher self-upgrade) | ✅ Decided, deferred to Phase 6 |
| Path A vs B (full system vs fast MVP) | ✅ Path B chosen |
| Pedagogical model (7 pillars, 3 new modes) | ✅ Confirmed by founder |
| Grade range | ✅ 3–12 |
| Content sourcing strategy | ✅ Wiktionary + Academy + MoE |
| MVP build | ⏳ Not started |
| Pilot (founder's own classes) | ⏳ Blocked on MVP |
| School/billing system | ⏳ Phase 6 — not in MVP scope |

---

## The product decision

**VocaHebrew is a "Voca" inside the existing Vocaband platform**, not
a separate product. Teachers log into vocaband.com → pick which Voca
to use → land in subject-specific dashboard. No new domain, no new
Supabase project, no monorepo refactor.

This decision overrides any earlier plans for `vocahebrew.com` or a
standalone fork.

### Why VocaHebrew first (ahead of `VOCA-FAMILY-ROADMAP.md` priorities)

- **Founder teaches Hebrew (grades 3–12)** — built-in domain expert
  + first pilot user, removes the validation phase entirely
- **Lowest engineering risk** — same word/translation/audio pattern
  as English. Swap source language, reuse 6 of 10 game modes
  unchanged.
- **Existing infra fits** — Hebrew TTS already wired (Google Cloud),
  RTL already supported, Hebrew translations already in every
  English word, `wordFamilySuggestions` system maps onto Hebrew
  shoresh families.
- **Largest market in Vocaband's geography** — every Israeli student
  studies Hebrew across more grade levels than English.

---

## Path B — the 2-week MVP scope

**Goal:** founder uses VocaHebrew with own grade 3–12 classes within
2 weeks. No school admin dashboard. No billing. No self-upgrade. No
Voca Picker. Just hardcode `hebrew_enabled = true` on the founder's
account and ship.

### What's IN the MVP

| Layer | Scope |
|---|---|
| **Subject flag** | Add `subject text default 'english'` to `classes`, `assignments`, `study_cards`. Migrations idempotent. Existing data untouched. |
| **Hebrew content** | ~2,000 lemmas seeded (subset of full ~6,000), grades 3–9 first. Tagged with both `shoresh` AND `theme`. |
| **Hebrew audio** | Generate via Google TTS Hebrew voices — reuse `scripts/generate-audio.ts` pattern. |
| **Schema extensions on study_cards** | `shoresh`, `binyan`, `mishkal`, `gender`, `niqqud_form`, `family_id`, `grade`, `theme`. All nullable so English data unaffected. |
| **6 carryover game modes** | Classic, Match, Translate, Listening, Sentence Builder, Quick Play. Direction flips when `subject='hebrew'` (source = Hebrew, target = English). |
| **Founder hardcode** | One-line backend check: `if user.email === FOUNDER_EMAIL, hebrew_enabled = true`. Subject toggle added to founder's dashboard header (English ↔ Hebrew). |

### What's OUT (deferred to Phase 6)

| Deferred item | Why deferred | When |
|---|---|---|
| Schools entity + admin role | No customers besides founder yet | When 2nd school onboards |
| Voca Picker (4-state: licensed/personal/locked/soon) | Founder doesn't need a picker — just a toggle | Phase 6 |
| Stripe / billing / self-upgrade | No revenue path needed for MVP | Phase 6 |
| Niqqud Mode | Founder said "everything is hard" — build basic modes first | Phase 4 follow-up |
| Shoresh Hunt mode | Same | Phase 4 follow-up |
| Binyan Match mode | Same | Phase 4 follow-up |
| Public landing page update (Soon → Live) | Only after pilot validates | Phase 7 |
| Content for grades 10–12 | Seed 3–9 first, expand once MVP works | Phase 4 follow-up |

### What success looks like at end of week 2

- Founder logs into vocaband.com
- Header has "English ↔ Hebrew" toggle
- Switch to Hebrew → dashboard shows Hebrew classes
- Create a Hebrew class, upload a list (or pick from seeded content)
- Students join, play 6 modes against Hebrew words
- Audio works (Hebrew TTS)
- RTL renders correctly throughout

---

## Knowledge model — what VocaHebrew teaches

### The 7 pedagogical pillars (full scope; MVP covers pillars 1–5)

| # | Pillar | Hebrew | Grade band | MVP? |
|---|---|---|---|---|
| 1 | Vocabulary (term ↔ translation) | מילים | 3–12 | ✅ |
| 2 | Word families by shoresh | שורש | 4–12 | ✅ (data tagged, no dedicated mode yet) |
| 3 | Vowel marks | ניקוד | 3–6 (heavy), 7–9 (fading) | ✅ (data tagged, no dedicated mode yet) |
| 4 | Gender + number agreement | מין ומספר | 3–12 | ✅ (data tagged) |
| 5 | Synonyms / antonyms / collocations | נרדפות והפכים | 4–12 | ✅ |
| 6 | Verb conjugation patterns | בניינים | 6–12 | ⏳ Phase 4 follow-up |
| 7 | Construct state | סמיכות | 7–12 | ⏳ Phase 4 follow-up |
| 8 | Idioms + expressions | ניבים וביטויים | 5–12 | ⏳ Phase 4 follow-up |

### Hebrew-native game modes (Phase 4 follow-up)

| Mode | What it does | Grade band |
|---|---|---|
| **Niqqud Mode** | Add vowel marks to consonant skeleton | 3–6 |
| **Shoresh Hunt** | Pick the 3 root letters from a word | 5–9 |
| **Binyan Match** | Given root + tense, conjugate the verb | 7–12 |

Founder said "everything is hard" — so order is: Niqqud first
(serves grades 3–6, biggest student bucket), then Shoresh, then
Binyan.

### Content target

| Grade band | Lemma count | Notes |
|---|---|---|
| 3–4 | ~1,000 | Niqqud-heavy, basic, picture-friendly |
| 5–9 | ~3,000 | Shoresh-organized, MoE word lists |
| 10–12 | ~2,000 | Advanced + literary + biblical-Hebrew-adjacent |
| **Total** | **~6,000 lemmas in ~600 shoresh families** | MVP ships with grades 3–9 only (~4,000 lemmas), expands to 10–12 in Phase 4 follow-up |

For comparison: English corpus is 6,482 words at
`src/data/vocabulary.ts`. Same ballpark.

### Content sources (ranked by usefulness vs. licensing risk)

| Source | Use for | License | Risk |
|---|---|---|---|
| **Academy of the Hebrew Language** (hebrew-academy.org.il) | Shoresh, binyanim, normative spellings | Public, free | Low |
| **Hebrew Wiktionary** | Definitions, shoresh, examples | CC-BY-SA | Low |
| **HSPELL** (open-source spell-check dict) | ~250k word forms with morphology | GPL | Medium — keep data layer separate from app code |
| **MILA Knowledge Center** (Technion) | Annotated corpora, frequency | Research-friendly, commercial varies | Medium |
| **Hebrew Wikipedia dump** | Example sentences, frequency | CC-BY-SA | Low |
| **Israeli MoE curriculum docs** (תכנית לימודים) | Required word lists per grade | Public | Low |
| **CET / מטח** | Textbook-aligned lists | Partnership needed | High value — pursue post-pilot |
| **Even-Shoshan / Rav-Milim** | Reference, NOT redistribution | Commercial | Use for QA only, do not redistribute |
| **Google Cloud TTS Hebrew** | Audio | Pay-per-use | None — already wired |

**MVP sourcing plan:** Wiktionary + Academy + MoE list. Skip
licensed sources. Founder QAs the ~2,000 MVP lemmas.

---

## The deferred Phase 6+ system (full plan, for future reference)

When ready to scale beyond founder, the full access model is:

```
School (customer)
  ├─ licenses N Vocas via plan         ← school admin chooses
  ├─ has many Teachers
  │     └─ each teacher inherits the school's licensed Vocas (free)
  │     └─ each teacher CAN self-upgrade for an extra Voca (paid)
  └─ has many Students
        └─ Student access follows their class's Voca (no separate billing)
```

**Effective Vocas a teacher can use** =
`school.licensed_vocas` ∪ `teacher.personal_vocas`

### Phase 6 data model additions

```sql
-- New table
schools (
  id uuid primary key,
  name text,
  country text default 'IL',
  plan_tier text,
  licensed_vocas text[],   -- ['english', 'hebrew']
  billing_contact_email text
)

-- Teacher additions
alter table teachers add column school_id uuid references schools(id);
alter table teachers add column personal_vocas text[] default '{}';
alter table teachers add column role text default 'teacher';  -- 'teacher' | 'school_admin'
alter table teachers add column subjects_taught text[] default '{english}';
```

### Phase 6 access helper (one place, used everywhere)

```ts
function canTeacherUseVoca(teacher, voca): boolean {
  return teacher.school?.licensed_vocas.includes(voca)
      || teacher.personal_vocas.includes(voca);
}
```

### Phase 6 Voca Picker — 4 states

| State | Visual | Action |
|---|---|---|
| **School-licensed** | Green border, "Included" tag | Use it |
| **Personal upgrade** | Purple border, "Personal" tag | Use it |
| **Locked** | Greyed, "Add for ₪X/mo" CTA | Stripe checkout → adds to `personal_vocas` |
| **Coming soon** | Grey "Soon" pill | Notify-me lead capture |

### Phase 6 pricing sketch (numbers TBD)

| Plan | Buyer | Includes |
|---|---|---|
| Solo teacher | Individual | 1 Voca + add-ons |
| School Starter | ≤10 teachers | 1 Voca, all teachers + students |
| School Standard | Medium school | 2 Vocas |
| School Full Family | Large school | All current + future Vocas |
| Teacher add-on | Teacher | +₪X/mo per extra Voca |

---

## Decisions logged

| Decision | Value |
|---|---|
| Standalone product or sub-product? | Sub-product inside Vocaband |
| Voca Picker now or later? | Later (Phase 6). MVP uses simple subject toggle. |
| Path A (full system) or Path B (fast MVP)? | **B** |
| Founder grade range | 3–12 |
| Pedagogical approach | Both shoresh AND thematic (no tradeoff) |
| Mode build order | Niqqud → Shoresh Hunt → Binyan Match (Phase 4 follow-up) |
| External teacher validation | Skipped — founder is the validator |

## Decisions explicitly deferred (don't re-ask)

- Stripe integration status — check codebase when Phase 6 starts
- Solo vs school-only teacher model — keep both for now
- School onboarding flow — defer until 2nd customer
- Pricing numbers — defer until pilot data exists
- Pilot school recruitment — founder is the pilot, no recruitment needed

---

## Phases (current position: about to start Phase 2)

| Phase | What | Status | Est. |
|---|---|---|---|
| 1 — Content validation | Skipped (founder is validator) | ✅ Skipped | 0 |
| 2 — Schema + content seed | `subject` columns, Hebrew study_cards extensions, ~2,000 seed lemmas | ⏳ Next | ~5 days |
| 3 — Audio pipeline | Hebrew TTS via Google Cloud, audio for ~2,000 lemmas | ⏳ | ~2 days |
| 4 — Game modes (carryover) | Direction flip on 6 modes when `subject='hebrew'` | ⏳ | ~3 days |
| 5 — Founder pilot | Founder uses VocaHebrew with own classes, iterates | ⏳ | 2–4 weeks |
| 4-followup — Hebrew-native modes | Niqqud → Shoresh Hunt → Binyan Match | ⏳ | ~2 weeks |
| 6 — Schools + billing + Voca Picker | Full access model | ⏳ | ~3 weeks (when 2nd customer arrives) |
| 7 — Public launch | Landing page Soon → Live, school admin dashboard | ⏳ | ~1 week |

---

## Next concrete step

When you (or the next Claude session) resume this:

1. Run migration: add `subject text default 'english'` to `classes`,
   `assignments`, `study_cards`. Verify English app still works
   (regression check).
2. Run migration: add Hebrew columns to `study_cards` (`shoresh`,
   `binyan`, `mishkal`, `gender`, `niqqud_form`, `family_id`,
   `grade`, `theme`). All nullable.
3. Build content seed script: scrape Hebrew Wiktionary, group by
   shoresh, output ~2,000 lemmas grades 3–9 to a JSON file.
4. Founder QA pass on the seed.
5. Bulk import to Supabase.

That's Phase 2 — should fit in ~5 days.

---

## Cross-references

- Existing 6-subject roadmap (Economics, Anatomy, Psychology, Finance, Civics, Bagrut): `docs/VOCA-FAMILY-ROADMAP.md`. **VocaHebrew jumps ahead of all six** because the founder teaches it.
- Generic StudyCard refactor proposal: see `VOCA-FAMILY-ROADMAP.md` §"Engineering plan — generalize Word → StudyCard". MVP can defer this generalization and just add Hebrew-specific columns.
- Current English vocabulary: `src/data/vocabulary.ts` (6,482 words).
- Hebrew TTS infra: `scripts/generate-audio.ts` (English baseline — extend for Hebrew voices).
- Landing page Voca Family teaser: `src/components/LandingPage.tsx:1459`.
- Locale strings for VocaHebrew already exist in: `src/locales/student/landing-page.ts:379` (`vocaHebrewName`, `vocaHebrewTag`).

---

## How to resume this plan

Ask Claude: **"resume vocahebrew plan"** or **"!resume"** at the
start of a session. Claude reads this file, the operator/open-issues
docs, and the recent git log, then summarizes where to pick up.
