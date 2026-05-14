# Shop redesign — design plan

**Status:** Decisions locked 2026-05-14, awaiting one final scope
question on the Featured Game Mode 2× XP. See bottom.
**Branch:** `claude/shop-redesign-plan`

---

## 1. Goal

The student-facing shop is too many screens deep and not fully
translated. A Hebrew or Arabic student sees translated chrome over
English content. This plan covers **two interlocked redesigns**:

1. **Information architecture** — collapse the 4-screen tap-tap-tap
   path into a single browseable shop.
2. **Translation infrastructure** — i18n the entire item catalogue so
   Hebrew + Arabic students see Hebrew + Arabic item names and
   descriptions, not English ones.

Both ship together. Doing only one is incomplete.

---

## 2. Current state — pain points (from audit 2026-05-14)

### IA pain

| Today | Problem |
|---|---|
| Dashboard → "Shop" button → **Hub** (portal of 7 tiles) → category tab → grid → buy | **4 screens** to spend XP on one avatar. |
| Hub hero = "Drop of the Week"; Dashboard ALSO has the same card | Duplicate entry — student taps it on Dashboard, lands in Hub, sees it again, gets confused. |
| Avatars tab has nested unlock tiers (Free → Tier 1 → Tier 2 …) + a separate "Featured" section | Two parallel browse models inside one tab. |
| 7 tabs split Boosters (24h buffs) from Power-ups (in-game consumables) | Same mental category for a student ("things that help me"); they have to read subtitles to tell them apart. |
| Egg opening adds a full-screen cinematic modal on top of the shop sheet | Modal-on-modal. Adds delight, but adds a layer too. |

### Translation pain

| Today | Status |
|---|---|
| `src/locales/student/shop.ts` (chrome strings — buttons, headers, errors) | ✅ 42 keys × EN/HE/AR. Complete. |
| `ShopView.tsx` hardcoded English | ❌ 11 strings: 3 unlocked-X toasts, 6 booster confirmations, "← Back to dashboard", "Shop hub", "Dashboard", "Included for free", "Unlock with XP", 2 hero category descriptions. |
| `game.ts` item catalogue — names + descriptions | ❌ ~100 strings, **all English**, no locale maps. 30 avatar names, 13 theme names, 6 mystery egg name+desc pairs, 3 power-up name+desc pairs, 4 booster name+desc pairs, 10 frame names, 16 title names, 14 unlock-tier labels, 8 weekly-rotation taglines. |

A Hebrew teacher demoing the shop to a fourth-grader has to translate
"Dragon Egg, opens at 200 XP" out loud. That's a real adoption blocker.

---

## 3. Proposed redesign — single-screen marketplace

Inspired by Roblox / Minecraft marketplace patterns: one screen, big
horizontal carousels per category, kid-friendly flick navigation, no
tab system. The Hub disappears as a concept; "Shop" goes straight to
the marketplace.

### Wireframe (mobile, ~390px wide)

```
┌──────────────────────────────────────┐
│ ←      🛍 SHOP            💰 2,450   │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ 🎯 SPOTLIGHT (dynamic — §3a)     │ │
│ │ ┌────┐ Almost yours!             │ │
│ │ │ 🧙 │ Wizard avatar             │ │
│ │ │    │ 50 XP to unlock           │ │
│ │ └────┘ [  PLAY TO EARN  ]        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 🥚 EGGS                          →   │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐                │
│ │⭐││🌟││🥚││💎││🎁│   (scroll)     │
│ └──┘└──┘└──┘└──┘└──┘                │
│                                      │
│ 🎭 AVATARS                       →   │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐                │
│ │🐲││🦅││🐺││🦄││🧙│   (scroll)     │
│ └──┘└──┘└──┘└──┘└──┘                │
│ Unlocked 5 / 30  ━━━━━━○────         │
│                                      │
│ ⚡ POWER-UPS                     →   │
│   ◉ While playing  ○ Always on       │
│ ┌──┐┌──┐┌──┐                        │
│ │⏭ ││🎯││💡│                        │
│ └──┘└──┘└──┘                        │
│                                      │
│ 🎨 THEMES                        →   │
│ [horizontal preview strip]           │
│                                      │
│ 👑 FRAMES & TITLES               →   │
│ ...                                  │
└──────────────────────────────────────┘
```

### Key changes vs today

1. **No Hub.** "Shop" button on Dashboard opens directly into this
   screen.
   **Drop of the Week is removed entirely** — replaced by the
   dynamic Spotlight (§3a). The `LIMITED_ROTATION` constant in
   `game.ts` and its 8 weekly taglines go away.
2. **Categories collapse from 7 → 5**: Eggs · Avatars · Power-ups
   (merged with Boosters via internal toggle) · Themes · Frames &
   Titles (merged — both are cosmetic decorations on the name/avatar).
3. **Horizontal carousels per section.** Tap "→" on a section header
   to expand into a fullscreen vertical grid for that category. So:
   "I want a new avatar" = 2 taps (Shop → Avatar card). "I want to
   browse all 30 avatars" = 3 taps (Shop → Avatars header arrow → grid).
4. **No nested unlock tiers inside avatars.** The avatar carousel
   shows ALL avatars; locked ones render dimmed with an unlock-XP
   badge. Tapping a locked avatar opens a "you need 200 XP" toast.
   No tiers collapse, no scrolling past locked sections.
5. **Buy = single tap with confirmation.** Avatar carousel item has
   an inline "Equip" or "Buy for 200 XP" button right under the
   thumbnail. No detail modal.
6. **Egg cinematic stays** — that's good delight, just on demand
   (tap egg → cinematic). Doesn't affect IA depth.

### What this DOES NOT change

- Catalogue contents (same avatars, same eggs, same boosters).
- Pricing and XP economy.
- Server-side purchase RPCs.
- Egg opening sequence.

---

## 3a. Spotlight — the dynamic hero slot

Replaces the static "Drop of the Week" with a smart priority engine.
On every render of the Marketplace hero, evaluate these in order and
show the first one that matches:

| Priority | Condition | Card content | CTA |
|---|---|---|---|
| **1** | `featuredMode` is set for current ISO week AND student hasn't already earned 200+ XP in that mode this week | "**Double XP this week!** Play *Sentence Builder* for 2× rewards." | `PLAY NOW` → opens GameModeSelectionView pre-selected |
| **2** | Student is < 100 XP from the next avatar tier unlock | "**Almost yours!** *Wizard* — 50 XP away." (preview of locked avatar) | `PLAY TO EARN` → opens GameModeSelectionView |
| **3** | Daily Chest unclaimed for today | "**Today's chest is waiting** — open it for free XP." | `OPEN` → triggers existing useRetention hook |
| **4** | Student has a `pinnedShopItemId` saved + can't afford it yet | "**Saving for *Galaxy Frame*** — 120 / 200 XP" (progress bar) | `PLAY TO EARN` |
| **5** | Fallback — pick highest-priced unowned item from a category the student owns least | "**Try this:** *Fire Theme* — 180 XP" | `BUY` (if affordable) or `PLAY TO EARN` |

### Implementation surface

- New file `src/components/shop/Spotlight.tsx` (~120 lines) — the
  priority engine + card renderer.
- New hook `src/hooks/usePinnedShopItem.ts` — localStorage-backed
  `(pinnedId, pin, unpin)` triplet. **No backend change** — pin
  state lives on the device. Acceptable: if a kid switches devices,
  they re-pin (rare).
- New constant `FEATURED_MODE` in `src/constants/game.ts` —
  either a hardcoded string (manually rotated by operator) OR a
  weekly rotation function `featuredModeForWeek(date)` similar to
  the existing weekly-drop logic. See §7 question.
- Spotlight reads from existing `useRetention()`, the AppUser xp
  field, and the new pin hook. No new server endpoints.

### Pin affordance

Every locked item in every carousel grows a small **📌 / 📍**
icon in the corner. Tap = "Save this for later" → writes to
localStorage → Spotlight starts showing the progress bar. Tap again
to unpin. Only one item can be pinned at a time.

---

## 3b. What gets deleted

Code that goes away with the Hub + Drop of the Week removal:

- `ShopView.tsx:884-915` — Hub hero block, trending rail, portal
  grid (~75 lines).
- `game.ts` `LIMITED_ROTATION` constant + 8 weekly taglines + the
  weekly-pick function (~40 lines).
- `StudentDashboardView.tsx` weekly-drop card (or repurpose as the
  Spotlight preview on Dashboard — decision in §7).
- The `'hub'` value in the `ShopTab` union (probably kill the union
  entirely if categories are all on one screen).

---

## 4. Translation infrastructure proposal

The item-catalogue strings need a home that scales. Three options:

### Option A — co-locate i18n maps in `game.ts`

```ts
export const PREMIUM_AVATARS = [
  { id: 'dragon', emoji: '🐲', name: { en: 'Dragon', he: 'דרקון', ar: 'تنين' }, ... },
  ...
];
```

**Pros:** one file, easy diff, locale data sits next to the item.
**Cons:** mixing two concerns; `game.ts` is already 400+ lines.

### Option B — separate locale file per catalogue section

`src/locales/student/shop-catalog.ts`:
```ts
export const avatarNamesT: Record<Language, Record<AvatarId, string>> = {
  en: { dragon: 'Dragon', eagle: 'Eagle', ... },
  he: { dragon: 'דרקון', eagle: 'נשר', ... },
  ar: { dragon: 'تنين', eagle: 'نسر', ... },
};
export const themeNamesT: ...
export const eggNamesT: ...
```

**Pros:** matches existing pattern (`src/locales/student/*.ts`). Easy
to hand off a single file to a Hebrew/Arabic translator. Doesn't
touch `game.ts` structure.
**Cons:** lookup at render: `avatarNamesT[lang][avatar.id]` instead of
`avatar.name`.

### Option C — generate via AI at build time

Run a script that calls Gemini once to translate all catalogue
strings, persists to `shop-catalog.ts`. Human review for tone.

**Pros:** fastest path to coverage.
**Cons:** quality risk for kid-facing copy. Hebrew title "GOATed"
should not literally become "כמו עז".

**Recommendation: Option B + Option C as a starter for the FIRST
draft, then human review.** The Hebrew/Arabic strings need a native
speaker to polish before shipping anyway.

---

## 5. Files that will change

### New
- `src/locales/student/shop-catalog.ts` — i18n maps for all item
  names + descriptions across PREMIUM_AVATARS, THEMES, MYSTERY_EGGS,
  POWER_UP_DEFS, BOOSTERS_DEFS, NAME_FRAMES, NAME_TITLES,
  AVATAR_CATEGORY_UNLOCKS, LIMITED_ROTATION.
- `src/views/ShopMarketplaceView.tsx` (or replace `ShopView.tsx`
  contents) — the new single-screen marketplace.
- `src/components/shop/CategoryCarousel.tsx` — horizontal-scroll
  section component reused by every category.
- `src/views/ShopCategoryGridView.tsx` — fullscreen grid that opens
  when a student taps the section "→".

### Edits
- `src/views/ShopView.tsx` — rewrite. Likely shrink from 1118 lines
  to ~400.
- `src/constants/game.ts` — items get a stable `id` field if they
  don't have one yet (so the locale map can key on it).
- `src/locales/student/shop.ts` — add the 11 hardcoded ShopView
  strings (toasts, navigation labels, pricing labels) as new keys
  with EN/HE/AR.
- `src/views/StudentDashboardView.tsx:297,346` — remove the
  `setShopTab('hub')` call (no more hub). Just `setView('shop')`.
- `src/core/views.ts` — drop the `ShopTab` union, or keep it for
  the optional fullscreen category grid view only.

### Deleted
- Hub-specific code in `ShopView.tsx:884-915` (hero block + trending
  rail + portal grid) — ~75 lines.
- `LIMITED_ROTATION` constant + weekly-rotation logic in `game.ts`
  — ~40 lines.
- The `'hub'` tab and likely the entire `ShopTab` union in
  `src/core/views.ts`.

---

## 6. Implementation phases (all in ONE PR per user direction)

| Phase | Deliverable |
|---|---|
| **1. Catalogue i18n extract** | Create `shop-catalog.ts` with the English strings extracted from `game.ts`. Wire ShopView to read from the map. |
| **2. AI-draft HE + AR for catalogue** | Run a Gemini script over `shop-catalog.ts`. Commit raw output for later native-speaker polish. |
| **3. New marketplace layout** | `ShopMarketplaceView` + `CategoryCarousel`. Drop the Hub. Wire Dashboard's Shop button to open it. |
| **4. Spotlight engine** | `Spotlight.tsx` with 5-tier priority logic + `usePinnedShopItem` + `FEATURED_MODE` config + pin icons on locked items. |
| **5. Locked-avatar inline state** | Replace nested tiers with dim + XP badge. |
| **6. Boosters + Power-ups merge** | Single section with internal toggle. |
| **7. Cleanup** | Remove dead Hub code, `LIMITED_ROTATION`, `ShopTab` union. |

---

## 7. Decisions (locked) + remaining question

### Locked
- **Translations:** AI-draft HE + AR first via Gemini script, native
  polish later (operator task).
- **Shipping:** all 7 phases in one PR.
- **Hero slot:** Spotlight priority engine combining Featured Game
  Mode 2× XP + Almost Unlocked + Daily Chest + Save for X.
- **Drop of the Week:** removed entirely. The Spotlight engine is
  the only hero.
- **Dashboard ↔ Marketplace duplication:** Dashboard keeps its
  existing Daily Chest card. Marketplace gets the full Spotlight
  engine. No duplicated weekly-drop card.

### Remaining question — Featured Mode 2× XP

The Spotlight's #1 priority is "Play *Sentence Builder* this week
for 2× XP." If we promise 2× XP we have to deliver it.

| Option | Scope | Risk |
|---|---|---|
| **A. Frontend marketing only** — card says "Featured: Sentence Builder" without an XP multiplier. Real XP unchanged. | +0 backend lines | Promise mismatch if copy ever says "2×" |
| **B. Real 2× XP, frontend-multiplied** — XP grants on the client get multiplied if mode === FEATURED_MODE. | +5 frontend lines | Trivially gameable — student edits the request |
| **C. Real 2× XP, server-enforced** — server checks `mode + ISO_week` against a multiplier table on every XP grant. | +30 backend lines, 1 new column or constant on Fly.io | Most work, only safe option for a real promise |

Recommendation: **C**, because the whole point of the new hero is
pedagogical credibility. A teacher who sees "2× XP this week" needs
that to be real, or it undermines trust. The work is bounded:
~30 lines in `server.ts` near the existing XP grant endpoint, plus a
`FEATURED_MODE_THIS_WEEK` constant.

Open question to confirm before coding starts: **A, B, or C?**
