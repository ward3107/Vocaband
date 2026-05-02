# Selected Features Plan — Track 1 modes + Daily Missions + Pet Evolution

> **Status:** Locked-in scope from May 2026.  Five features picked from
> `docs/PLATFORM-IMPROVEMENT-IDEAS.md` for the next build wave.  Doc
> survives session resets — pick items by section when ready to build.

## What's in scope

Five items, ~4-5 weeks of focused engineering total:

### Track 1 — three new game modes (no AI dependency, ~2-3 weeks)

1. **Word Chains** — given a word, type the next word that starts with the previous word's last letter.  ~3 days.
2. **Speed Round** — 60-second timer, max words answered, no penalty for skip.  ~3 days.
3. **Idiom mode** — match an English idiom to its meaning.  ~1 week (5 days dev + ~50 starter idioms hand-curated in EN/HE/AR).

### Engagement loops (~1-2 weeks each)

4. **Daily Missions** — "Master 5 new words today" + 50 XP bonus.  Drives daily return.  ~3-5 days.
5. **Pet Evolution** — pets have life states (egg → baby → teen → adult).  Studying every day levels them up; missing days makes them sad/decay back.  Builds on the existing pet system.  ~1 week.

---

## 1. Word Chains

### Mechanics

```
[Round 1]
  Show: "apple"  ← target word, last letter highlighted: appl[e]
  Student types: "elephant"
  Validate: starts with 'e' AND exists in ALL_WORDS pool
  Accept → next round

[Round 2]
  Show: "elephant"
  Student types: "tiger"
  Last letter: 't', tiger starts with 't' ✓

…continues until time-out, max-rounds, or student gives up
```

### Rules

- Target word's last letter is **highlighted** in a different color
- Student's typed word must:
  - Start with that letter (case-insensitive)
  - Exist in the current word source (Set 1/2/3, assignment, or custom)
  - Not have been used yet this session (no repeating)
- Audio plays for every accepted word
- Skip button shows a hint (one valid word from the pool)
- Score = chain length × difficulty multiplier

### UI

- Big current word at the top with last letter highlighted
- Input field below with auto-focus
- "Words used" chip strip (last 5 visible) so student can see the chain so far
- Score + max-streak counter top-right
- Skip / End buttons bottom

### Files to create

- `src/components/game/WordChainsGame.tsx` (~250 lines)
- New entry in `GameMode` union (`src/constants/game.ts`)
- Mode card in `GameModeSelectionView`
- Mode intro entry in `mode-intro.ts` locale
- Translations in `game-active.ts` locale (chain-specific strings)

### Files to modify

- `src/views/GameActiveView.tsx` — wire `mode === 'word-chains'` to `WordChainsGame`
- `src/components/dashboard/dashboard helpers` — XP wiring (per-correct + chain bonuses)

### Effort: ~3 days (~15 hours focused)

---

## 2. Speed Round

### Mechanics

- 60-second timer
- Question stream: cycles through Classic-style questions (English → translation, 4 options)
- Student answers as fast as possible
- Wrong answer = -1s penalty (doesn't end the round)
- Skip = no penalty but no points
- Round ends when timer hits 0 OR student hits End

### Scoring

- Base: +1 point per correct answer
- Combo: 3 correct in a row = +1 bonus, 5 in a row = +2 bonus, 10 in a row = +5
- Final score = total points + time-remaining bonus (if they end early after a perfect run)

### UI

- Big countdown timer top-center
- Current question fills the center
- Combo counter bottom-left ("🔥 3 in a row!")
- Score top-right
- "End Round" button bottom-right (saves current score)

### Files to create

- `src/components/game/SpeedRoundGame.tsx` (~200 lines)
- New entry in `GameMode` union
- Mode card + intro + translations

### Files to modify

- `src/views/GameActiveView.tsx` wiring
- Existing `Classic` question generator reused for the question stream

### Effort: ~3 days (~15 hours)

---

## 3. Idiom mode

### Mechanics

- Show an English idiom: "**Break a leg**"
- Show 4 meaning options:
  - Wish someone good luck ✓
  - Cause an injury
  - Run very fast
  - Be in trouble
- Student picks the correct meaning
- Reveal: shows correct answer + a literal-vs-figurative explanation panel
- Optional: "When to use it" sample sentence

### Idiom dataset

~50 starter idioms hand-curated in EN/HE/AR for v1.  Categories:
- Common everyday (kick the bucket, piece of cake, hit the road)
- Animal idioms (let the cat out of the bag, kill two birds with one stone)
- Body idioms (cost an arm and a leg, give a hand)
- Color idioms (feeling blue, see red, green with envy)
- Weather idioms (under the weather, rain on parade)

Each idiom = `{ id, english, meaning_en, meaning_he, meaning_ar, example, category, level }`

Future: AI-generate more via the AI Lesson Builder pipeline.

### Files to create

- `src/data/idioms.ts` (~50 idiom entries with translations)
- `src/components/game/IdiomGame.tsx` (~200 lines)
- New entry in `GameMode` union
- Mode card + intro + translations

### Effort: ~1 week (3 days dev + 2 days idiom curation)

---

## 4. Daily Missions

### Mechanics

Three rotating mission types, refreshed once per **user-local calendar day** (see "Reset boundary" below for the timezone strategy — every mission row is keyed by the user's local date so resets are deterministic across devices):

| Mission | Target | Reward |
|---|---|---|
| **Master N new words** | 5 / 10 / 15 words depending on level | **+50 XP fixed** when target is hit (not per-word) |
| **Play N modes** | 3 / 5 different modes | **+100 XP fixed** when target is hit |
| **Beat your record** | Beat any previous high score | **+200 XP fixed** |
| **All-missions bonus** | Complete all 3 daily missions | **+50 XP fixed** on top |

All rewards are **fixed bonuses paid once on completion** — never per-unit-of-progress. Backend grant logic and the celebration animation must read from the same `xp_reward` column on the `daily_missions` row to stay consistent.

Show in the student dashboard as a "Today's Missions" card with progress bars per mission.

### Storage

- New table: `daily_missions` keyed by `(user_uid, mission_date, mission_type)` where `mission_date` is the **user's local-timezone calendar date** (not UTC).
  ```sql
  CREATE TABLE public.daily_missions (
    user_uid UUID REFERENCES public.users(uid),
    mission_date DATE,           -- user's local date (see Reset boundary)
    mission_type TEXT,           -- 'master_words' | 'play_modes' | 'beat_record'
    target INT,
    progress INT DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    xp_reward INT,               -- fixed; granted once on completed=true
    PRIMARY KEY (user_uid, mission_date, mission_type)
  );
  ```
- RLS: student sees only their own missions

### Reset boundary (timezone strategy)

`mission_date` is the student's **local calendar date at the moment of the action**, not the server's UTC date. To avoid the cross-device duplicate / missed-reset problem the reviewer flagged, we pick **one** of the following before building (decide at implementation time, not split per call site):

- **Option A (preferred): persist a per-user IANA timezone**
  - Add `users.timezone TEXT` (e.g. `"Asia/Jerusalem"`)
  - On first sign-in / dashboard mount, capture `Intl.DateTimeFormat().resolvedOptions().timeZone` and write it back if missing
  - All client + server code derives `mission_date` via that stored zone, so a kid switching from phone (UTC+3 traveling) to laptop (UTC+2 home) still sees the same day's missions
- **Option B (fallback if migration is too costly):** server normalizes `mission_date` from the request's `Intl`-derived offset header per call. Simpler but less robust for kids on dual devices in different timezones.

Whichever path we pick, the rule is: **`mission_date` is computed once per write, in the user's stored zone, and matches the boundary used by the cron / refresh that creates the next day's rows**. No mixing UTC date with local date inside the same flow.

### Push notifications (Phase 2, optional)

- "🎯 Missions reset!  Play 5 minutes today to keep your streak."
- Sent at 4 PM local time (after school, before evening homework) — same timezone source as the reset boundary above

### UI

- New `DailyMissionsCard` on the student dashboard
- Each mission as a row with: emoji icon + title + progress bar + XP reward badge
- Completed missions get a green checkmark + "+{xp_reward} XP" celebration animation, where `xp_reward` is read from the row (so per-mission copy never desyncs from the actual grant)
- "All missions done!" state shows a confetti burst + the fixed all-missions bonus

### Files to create

- `src/components/dashboard/DailyMissionsCard.tsx` (~150 lines)
- `src/hooks/useDailyMissions.ts` — fetches, updates, completes missions (~120 lines)
- `supabase/migrations/<timestamp>_daily_missions.sql` — table + RLS

### Files to modify

- `src/views/StudentDashboardView.tsx` — mount `DailyMissionsCard`
- Existing XP-grant hooks — increment mission progress on each correct answer / mode play

### Effort: ~3-5 days

---

## 5. Pet Evolution

### Mechanics

Pets have **5 life stages**:

| Stage | Days at this stage | Visual |
|---|---|---|
| 🥚 Egg | First 1 day | Wobbly egg with cracks |
| 🐣 Baby | 2-3 days of daily activity | Just-hatched, tiny |
| 🐥 Child | 4-7 days | Small, playful |
| 🐤 Teen | 8-14 days | Half-grown, energetic |
| 🐔 Adult | 15+ days of activity | Full size, can wear accessories |

### Decay

Skipping a study day **decays** the pet by one stage after a 3-day grace period:

- Day 0 of inactivity: pet looks happy
- Day 1: pet looks neutral
- Day 2: pet looks sad
- Day 3+: pet decays to previous stage (5 → 4 → 3 → 2 → 1)
- Pet shown with sad face + "Your pet misses you!" hint to come back

### Storage

Add to `users` table:
```sql
ALTER TABLE public.users
  ADD COLUMN pet_stage INT DEFAULT 1,           -- 1-5
  ADD COLUMN pet_last_active_date DATE,
  ADD COLUMN pet_id INT;                         -- which pet from PET_MILESTONES
```

### Server-side cron (or client-side check on dashboard load)

- On every dashboard mount, check `pet_last_active_date` vs today
- If gap ≥ 3 days, decay one stage per extra day past the grace period
- Update on any successful word completion

### UI

- Existing `PetCompanion` component on student dashboard gets the new stage logic
- Add a tiny "next stage in N days" hint
- Add a "love meter" emoji bar (😢 → 😐 → 🙂 → 😄 → 🤩)
- Celebration animation on stage-up: confetti + "Your pet evolved to Child!"

### Effort: ~1 week (~30-40 hours)

---

## Suggested build order

This minimizes risk and ships value fast:

| Order | Item | Why |
|---|---|---|
| 1 | **Word Chains** | Smallest, simplest, no dependencies.  Validates the new-mode pattern. |
| 2 | **Speed Round** | Reuses Classic question generator — fastest second mode. |
| 3 | **Daily Missions** | Adds retention hook before more game-mode complexity.  Schema migration is the biggest risk; do it early so it bakes in production for a week before more features depend on it. |
| 4 | **Idiom mode** | Hand-curating idioms takes calendar time; can run in parallel with #3 dev. |
| 5 | **Pet Evolution** | Most complex — needs schema migration + decay logic + new graphics.  Saved for last when foundation is solid. |

---

## Operator items as we ship

- **Word Chains / Speed Round:** no operator action.  Pure code.
- **Idiom mode:** ~50 idioms need translation review by a native HE + AR speaker before shipping.  Can pair with the existing translation backlog work.
- **Daily Missions:** Supabase migration.  Apply via SQL editor when shipped.
- **Pet Evolution:** Supabase migration.  May want to backfill `pet_last_active_date` for existing users (default to today minus 3 days so existing pets don't insta-decay on first deploy).

---

## What's NOT in this plan

- Friends + 1-on-1 duels (heavy build, needs sockets)
- Achievement badges (separate system, defer)
- Personal-best tracker (small, can fold into Daily Missions or Speed Round)
- Word of the day (push-notification system needed first)

These stay in `docs/PLATFORM-IMPROVEMENT-IDEAS.md` for later.
