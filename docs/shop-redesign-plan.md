# Shop redesign — design plan

**Status:** Draft for review · 2026-05-14
**Branch:** `claude/shop-redesign-plan`
**Out of scope until approved:** any code changes.

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
│ │ 🔥 THIS WEEK ONLY                │ │
│ │ ┌────┐ Galaxy Frame              │ │
│ │ │ 🌌 │ 200 XP                    │ │
│ │ └────┘ [  CLAIM →  ]             │ │
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
   screen. Drop of the Week appears here (and on Dashboard, but with a
   visual link that takes you to the highlighted card, not a separate
   landing).
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

### Deleted (probably)
- Hub-specific code in `ShopView.tsx:884-915` (hero block + trending
  rail + portal grid).
- DropOfTheWeek duplication — keep on Dashboard only OR keep on
  Marketplace only (decision needed, see §7).

---

## 6. Implementation phases

| Phase | Deliverable | Reviewable? |
|---|---|---|
| **1. Catalogue i18n maps (EN-only)** | Create `shop-catalog.ts` with the English strings extracted from `game.ts`. Wire ShopView to read from the map. No visual change. | TypeScript check + roster of strings ready for translator. |
| **2. AI-draft HE + AR for catalogue** | Run a Gemini script over `shop-catalog.ts`. Commit raw output as `he-draft` / `ar-draft`. | Native speaker review (operator task). |
| **3. New marketplace layout** | `ShopMarketplaceView` + `CategoryCarousel`. Drop the Hub. Wire dashboard. | Visual review on staging. |
| **4. Locked-avatar inline state** | Replace nested tiers with dim + XP badge. | Visual review. |
| **5. Boosters + Power-ups merge** | Single section with internal toggle. | Visual review. |
| **6. Cleanup** | Remove dead Hub code, old `shopTab` union if unused. | Type-check. |

Each phase is its own PR. Shipping phase 1 alone is already a win
(translation infrastructure in place even if marketplace IA waits).

---

## 7. Open questions

1. **Drop of the Week placement** — only on Dashboard? Only on
   Marketplace? Both? (Today: both, which is the duplication problem.)
2. **AI-draft translations vs hold for native speaker** — ship the
   AI draft and iterate, or block phase 3 until a native pass exists?
3. **Existing purchases mid-redesign** — if a student already owns
   the Dragon avatar under the old IA, do they need to re-equip after
   the redesign lands? (Probably no — store stays the same, just the
   UI changes.)
4. **Frames + Titles merge** — they're both name decorations, but
   they look very different (frame = avatar border, title = small text
   under name). Merge into one section "Decorations" or keep as two?
5. **Phase 1 alone** (translation infrastructure, no IA changes)
   shipped as the first PR while we discuss IA — or hold everything
   together?
6. **Naming** — "Shop" stays, or rename to "Market" / "Store" / Hebrew
   "חנות" / Arabic "متجر"? (Just the i18n key value.)
