# Voca Family Roadmap — 6 Subjects to Plan

> Forward-looking planning for the next batch of subject expansions
> beyond English vocabulary. Six subjects prioritized by the founder
> 2026-04-28: **Economics, Anatomy, Psychology, Finance, Civics,
> Bagrut.**
>
> This is a planning document, not a code change. It captures the
> content scope, sourcing strategy, engineering implications, and
> launch order so future implementation work has a clear blueprint
> before the first line of code is written.

## Why these six (strategic fit)

| Subject | Why it's a priority |
|---|---|
| **VocaEconomics** | Core high-school subject worldwide. Pure-vocab heavy (definitions). High teacher demand because traditional economics textbooks are dense and students struggle with terminology. |
| **VocaAnatomy** | Pre-med + biology classes. Visual + label-heavy — a natural fit for the existing matching/spelling game modes. Bonus: same English-Hebrew-Arabic triad we already do for vocabulary. |
| **VocaPsychology** | High-school + AP psych. Theory-heavy, perfect for Classic + True/False modes. Underserved by current edtech — most psych apps are quiz-only, not gamified. |
| **VocaFinance** | High-school personal finance courses are growing globally; many US states now require them. Vocabulary-rich (interest, equity, leverage). Adjacent to VocaEconomics — could share content lift. |
| **VocaCivics** | Universal middle/high-school subject. Government, law, rights — pure definition memorization. Strong demand from teachers per Tier 1 audit. |
| **VocaBagrut** | Israeli matriculation exam prep — captive audience of every Israeli high-schooler. Premium-price-sensitive (parents pay for private tutoring already). |

Three of the six (Economics, Finance, Civics) overlap heavily — same
"social studies / business" vocabulary family. Plan content sourcing
together, ship as a related cluster.

Two of the six (Anatomy, Psychology) are the science-adjacent
cluster — labs + theory.

VocaBagrut is its own beast — it's not a SUBJECT, it's a TEST PREP
product covering English + Hebrew + Math + Tanakh + History
matriculation vocabulary. Treat it as a "bundle" Voca that re-uses
content from the others.

## Per-subject content scope

### 1. VocaEconomics 💼

- **Target levels:** A1 (intro), A2 (intermediate), B1 (advanced)
- **Word count target:** ~600 terms (matches current English Set 1
  size) split into 3 sets:
  - Set 1 (200 terms): demand, supply, market, inflation, GDP
  - Set 2 (200 terms): elasticity, equilibrium, monopoly, fiscal policy
  - Set 3 (200 terms): macroeconomics, IS-LM, comparative advantage
- **Translations needed:** EN + HE + AR (same triad as English)
- **Sentence examples:** YES — economics terms are easier learned in
  context ("Inflation rose 3% last quarter…")
- **Image asset:** Optional — supply/demand curves are visually
  iconic, would boost retention but not required for v1

### 2. VocaAnatomy ⚕️

- **Target levels:** Beginner (organs), Intermediate (systems),
  Advanced (cellular)
- **Word count target:** ~500 terms
  - Set 1 (150 terms): heart, lung, brain, kidney, muscle
  - Set 2 (200 terms): atrium, ventricle, cerebellum, neuron
  - Set 3 (150 terms): mitochondria, endoplasmic reticulum, Krebs cycle
- **Translations needed:** EN + HE + AR (med students learn in
  multiple languages anyway)
- **Sentence examples:** OPTIONAL — anatomy is more
  term-definition than contextual
- **Image asset:** **REQUIRED for v1** — anatomy without diagrams is
  useless. Need labeled body-system illustrations. Sourcing
  challenge — Wikimedia Commons has CC-licensed anatomy SVGs.

### 3. VocaPsychology 🧠

- **Target levels:** Intro, AP, Clinical
- **Word count target:** ~400 terms
  - Set 1 (150 terms): cognition, behaviour, conditioning, memory
  - Set 2 (150 terms): cognitive dissonance, schema, classical/operant
  - Set 3 (100 terms): DSM-V categories, neurotransmitter names
- **Translations needed:** EN + HE + AR
- **Sentence examples:** **STRONGLY YES** — most psych terms are
  defined by example ("Bystander effect: when more witnesses, less
  help…")
- **Image asset:** Optional — brain region diagrams useful but not
  blocking
- **Special:** Many "famous experiment" entries (Stanford prison,
  Milgram, Pavlov) — could become a sub-feature: experiment cards
  with study summary instead of just term

### 4. VocaFinance 💰

- **Target levels:** Personal Finance (intro), Investing, Corporate
- **Word count target:** ~400 terms
  - Set 1 (150 terms): budget, interest, debt, credit, savings
  - Set 2 (150 terms): stock, bond, dividend, ETF, capital gains
  - Set 3 (100 terms): EBITDA, leverage, derivatives, options
- **Translations needed:** EN + HE + AR
- **Sentence examples:** YES — finance terms are easier in context
- **Image asset:** Optional
- **Overlap with VocaEconomics:** ~30% term overlap — author together,
  ship together to amortize content cost

### 5. VocaCivics 🏛️

- **Target levels:** Foundational, Government, Law
- **Word count target:** ~500 terms
  - Set 1 (200 terms): democracy, election, vote, parliament,
    constitution
  - Set 2 (200 terms): federalism, judicial review, due process
  - Set 3 (100 terms): habeas corpus, eminent domain, jurisprudence
- **Translations needed:** EN + HE + AR
- **Sentence examples:** YES — civics terms benefit from real-world
  examples
- **Image asset:** Optional — flag images, government chart diagrams
- **Localization risk:** "Federal", "Senate", etc. mean different
  things in different countries — may need country-specific sets
  (US-civics vs UK-civics vs Israeli-civics) in v2

### 6. VocaBagrut 📑

- **Special status:** This is NOT a single-subject Voca — it's a
  **test prep bundle** covering matriculation-relevant vocabulary
  from multiple subjects.
- **Composition:**
  - English Bagrut vocabulary (subset of existing English app)
  - Hebrew composition vocabulary (overlap with VocaHebrew)
  - Math definitions (overlap with VocaMath)
  - History Bagrut terms (overlap with VocaHistory)
  - Tanakh / Bible Bagrut content (separate Voca or sub-feature)
- **Content sourcing:** Bagrut question banks are public — past
  exam papers from Israeli education websites. Vocabulary
  extracted from those.
- **Pricing implication:** Premium pricing (parents pay for Bagrut
  tutoring already; this is a substitute). Could justify 79-99 NIS/mo
  per student vs. 39 NIS/mo for general Voca.
- **NOT to be claimed:** Don't say "official Bagrut" or any MoE-aligned
  language. Position as "Bagrut prep" — a study aid, not a curriculum.

## Engineering plan — generalize Word → StudyCard

The current `Word` interface in `src/data/vocabulary.ts:6` has:

```ts
interface Word {
  id: number;
  english: string;       // the term
  hebrew: string;        // term in Hebrew
  arabic: string;        // term in Arabic
  russian?: string;
  level: "Set 1" | "Set 2" | "Set 3" | "Custom";
  imageUrl?: string;
  sentence?: string;
  example?: string;
  recProd?: "Rec" | "Prod";
}
```

To support the 6 new Vocas, generalize to:

```ts
interface StudyCard {
  id: number;
  subject: SubjectId;     // 'english' | 'economics' | 'anatomy' | …
  term: string;           // the thing to learn (was 'english')
  definition?: string;    // explicit definition (NEW — needed for
                          // econ/civics/psych where the "term" alone
                          // doesn't tell you what it means)
  translations: {
    he?: string;
    ar?: string;
    ru?: string;
  };
  level: string;          // per-subject set name
  imageUrl?: string;
  sentence?: string;      // example in context
  diagram?: string;       // NEW — for anatomy
  metadata?: {            // NEW — subject-specific extras
    formula?: string;     // VocaMath
    experiment?: string;  // VocaPsychology
    case?: string;        // VocaCivics (legal cases)
  };
}
```

Backward compatibility: keep `Word` as a TypeScript alias for
`StudyCard & { subject: 'english' }` so existing English-only code
keeps working. Migrate piecemeal.

### Engine generalizations

| Component | Change needed |
|---|---|
| `vocabulary.ts` | Split into per-subject files (`english.ts`, `economics.ts`, …). Lazy-load only the subjects the teacher uses. |
| `useVocabularyLazy.ts` | Generalize to `useStudyCardLazy(subject: SubjectId)` |
| Game modes | Most work as-is. Spelling mode needs the term to be Roman alphabet (works for English/anatomy; not for VocaHebrew). Per-subject mode-allowlist. |
| Audio | Anatomy/economics terms need TTS just like English. Reuse the existing custom-word audio pipeline. |
| OCR | Works as-is — extracts any printed text. |
| AI Sentence Builder | Generalize prompt to take `subject` parameter; sentences scale by subject context. |
| Quick Play | Works as-is — game-mode-agnostic. |

**Engine effort estimate:** ~1 week of refactoring to generalize the
Word type + per-subject lazy-load + per-subject mode allowlist.

## Content sourcing strategy

| Source | Coverage | Cost |
|---|---|---|
| **AI-assisted authoring** (Claude/GPT) | All subjects | ~$0.05/word × 3,000 words = $150 |
| **Open textbooks (OER)** | Economics, Civics, Psych | $0 — Creative Commons licensed |
| **Wikimedia Commons** | Anatomy diagrams | $0 |
| **Past Bagrut exams** (public) | VocaBagrut content | $0 |
| **Subject-matter teacher review** | All — quality gate | 5-10 hrs/subject × 200 NIS/hr = ~1,500 NIS/subject |

**Total content sourcing budget per subject:** ~2,000-3,000 NIS
(translations + teacher review). Six subjects = ~15,000 NIS one-off.

## Launch order recommendation

| Order | Subject | Reasoning |
|---|---|---|
| 1 | **VocaEconomics** | Largest subject + 30% overlap with VocaFinance gives compound content lift |
| 2 | **VocaFinance** | Ships with VocaEconomics — same content batch |
| 3 | **VocaCivics** | Same family (social studies) — author by same teacher reviewer |
| 4 | **VocaPsychology** | Switch to science-adjacent cluster |
| 5 | **VocaAnatomy** | Anatomy needs diagram sourcing — leave for last in the cluster |
| 6 | **VocaBagrut** | Bundle launch AFTER subject Vocas exist — re-uses their content |

**Total elapsed time** (1 founder, part-time): ~6 months end-to-end.

## Pricing model for the family

Current proposed Vocaband pricing (from `docs/GO-TO-MARKET.md`):
- Free / Basic 15 NIS / Pro 39 NIS

Voca-family pricing options:

| Approach | Pro | Con |
|---|---|---|
| **Bundle: one subscription unlocks all subjects** | Highest LTV per teacher; "use everything we ship" | Hard to price — 39 NIS/mo for 6 subjects feels too cheap |
| **Per-subject Pro** | Easy to communicate; teachers buy what they teach | Customer support overhead; multiple SKUs |
| **Subject Pack pricing** | 39 NIS/mo Pro covers English. Each additional subject = +10-15 NIS/mo | Best of both; matches teacher-by-teacher subject pickup |

**Recommendation:** Subject Pack pricing. English Pro at 39 NIS, each
additional Voca at +10 NIS/mo (so 4 subjects = 69 NIS/mo). Bagrut as a
premium add-on at +29 NIS/mo (test-prep market tolerates it).

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| **Localization complexity** — civics/economics/finance vary by country | v1: ship US-context. v2: country-specific sets via the existing per-subject Set 1/2/3 system. |
| **Anatomy diagram licensing** | Stick to Wikimedia Commons CC-BY only. Audit licensing before any image enters production. |
| **VocaBagrut MoE risk** | Don't claim MoE alignment. Position as "Bagrut prep study aid" — a third-party tool, not curriculum. |
| **Content quality at AI-author scale** | Every set must pass teacher review before launch. Budget 5-10 hrs/subject reviewer time. |
| **Pricing confusion across subjects** | Limit to 2 SKUs visible at any time on the page (Free + Pro), with subject add-ons listed inside the Pro flow. |

## What NOT to put on the landing page yet

These six are PLANNED, not committed. The current landing roadmap
section already shows 5 generic Voca tiles with "Coming Soon"
badges — that's the right level of public commitment. **Do not
update the landing page** to list these specific 6 until at least 2
are within 8 weeks of shipping. Premature roadmap = broken promise.

## Next concrete step

When you're ready to start, the FIRST commit should be:

1. Create the `StudyCard` TypeScript interface in `src/core/studyCard.ts`
2. Migrate one Word-using consumer (e.g. `MasteryHeatmap`) to accept
   `StudyCard` instead of `Word`
3. Verify English still works end-to-end

That's a 1-day pure-refactor commit with zero behaviour change. Once
it lands, every subsequent subject ships against the new shape.

## Status

| Item | Status |
|---|---|
| Strategic priorities (which 6) | ✅ Decided 2026-04-28 |
| Content scope per subject | ✅ This doc |
| Engine generalization plan | ✅ This doc |
| Content sourcing strategy | ✅ This doc |
| Pricing model | ⏳ Tentative — needs validation with first paying teachers |
| Launch order | ✅ Recommended |
| First refactor commit (StudyCard interface) | ⏳ Not started |
