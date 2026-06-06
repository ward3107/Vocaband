# Island Mode-Picker with Explorer Pet — Design (Phase 1)

**Date:** 2026-06-06
**Branch context:** `feat/student-hub-redesign`
**Status:** Approved design, ready for implementation planning

---

## Summary

The student mode picker (`src/views/GameModeSelectionView.tsx`) currently renders a
"next-up hero card + quiet list" of game modes. This redesign replaces it with an
**island world**: each mode the teacher assigned becomes an island in a night ocean,
and the student's **pet is the explorer** that travels between them.

This is **Phase 1** of a two-phase effort. Phase 2 (turning the *home* screen into the
same map and retiring the orbital hub) is explicitly out of scope here and will get its
own spec.

### Decisions locked during brainstorming
- **World metaphor:** Island World (islands on a map), not a path or arcade floor.
- **Progression:** Free roam, marked. All assigned islands are tappable from the start;
  done islands are marked, the recommended-next one glows. No hard locking. This matches
  today's behavior — students still play modes in any order.
- **Pet as a game:** Explorer. The pet is the student's token on the map; it sits on the
  recommended-next island and walks to the new one when a mode is finished.
- **Layout:** Scattered archipelago (islands dot an open sea), not a rigid serpentine.
- **Island tap:** Rich bottom sheet (name, difficulty, best score, 3⭐ target, XP reward, Play).
- **Pet tap:** Opens the same `PetCompanion` info/claim card used on the home screen.

---

## Architecture

All new presentational components live in `src/components/arcade/`. `GameModeSelectionView`
remains the container and keeps **all** of its current derivation logic — it only swaps what
it renders (islands instead of hero+list).

### New components

#### `IslandMap`
Owns the ocean + starfield background and the scrollable island field. Vertically scrollable
so it scales from 3 to 13 islands (the teacher's `allowedModes` decides the count).
- **Props:** the island list (see data shape below), the recommended-next id, the pet's
  evolution data (for the traveling pet), and handlers (`onTapIsland`, `onTapPet`).
- **Responsibilities:** compute island positions, render one `ModeIsland` per mode, render
  the `TravelingPet` at the recommended island's coordinates, draw faint connecting routes.

#### `ModeIsland`
A single island medallion. Reuses the existing per-mode `MODE_GRADIENTS`. States:
- `done` — gold star-ring + the mode's earned mastery stars (1–3, from `masteryStars`).
- `next` — glow + gentle pulse (the recommended-next mode).
- `todo` — plain island, tappable.
- `locked` — 🔒, non-interactive. Only occurs for quick-play guests
  (`isQuickPlayGuest && quickPlayCompletedModes.has(id)`), exactly as today.

#### `IslandDetailSheet`
The **rich** bottom sheet that rises when an island is tapped. Shows:
- The mode medallion + name (from `gameModesT`).
- Difficulty stars (`DIFFICULTY_META` / `getModeDifficulty`).
- The student's best score so far (or "none yet").
- The 3⭐ target ("Beat 90% for 3⭐" — matches the existing `masteryStars` threshold).
- The XP reward on finish, sourced from the existing game-completion XP flow. If no clean
  per-mode value is available, show the standard completion award; omit the chip rather than
  invent a number.
- **▶ Play** → calls the existing `launch(id)` (sets mode, closes selection, opens mode intro).

Rendered as a dialog; honors `dir`/`isRTL`.

#### `TravelingPet`
Wraps the existing `CharacterStage` so the map pet is visually identical to the home pet at
its current evolution stage. Positioned at the recommended island's coordinates and animates
between coordinates when the recommended island changes.
- **Tap** → calls `onTapPet`, which opens `PetCompanion` (see wiring below). Reduced-motion:
  no walk animation (snaps), no pulses.

### The pet walk
The recommended-next island id is remembered per assignment in `sessionStorage`
(key includes `activeAssignment.id`). On entering the map, if the stored id differs from the
current recommended id — i.e. the student just finished a mode and came back — the pet
animates from the old island's coordinates to the new glowing island. This is the
"I finished, my pet moved on" payoff. If there's no stored value (first visit), the pet
simply appears on the recommended island. Respects `useReducedMotion`.

### Island layout function
`computeIslandPositions(count)` returns a stable array of `{ xPct, y }` for `count` islands
laid down a scrollable column in alternating left/center/right lanes with deterministic
per-index offsets. **No randomness** — positions must be identical across re-renders so
islands never jump. Order follows today's `stops`: the learn island (Flashcards) first,
then the practice modes.

---

## Data flow

`GameModeSelectionView` keeps its existing computations unchanged:
`allowedModes` filtering, `isCompleted`, `isLocked`, `masteryStars`, the recommended-next
(`recommendedId`/`hero`) logic, the rounds/modes pill, and `launch()`.

It assembles an `islands` array — one entry per filtered mode:

```
{
  id, name, desc,            // id + localized strings (gameModesT)
  emoji/icon, color,         // from modesMeta + MODE_GRADIENTS
  difficulty,                // DIFFICULTY_META[getModeDifficulty(id)]
  completed, locked,         // existing predicates
  mastery,                   // masteryStars(id) → 0..3
  best,                      // best score for the best-score line
  isNext: id === recommendedId
}
```

This array + the pet data go to `IslandMap`. Tapping a non-locked island opens
`IslandDetailSheet`; its Play button calls `launch(id)`. Tapping the pet opens `PetCompanion`.

### Pet-card wiring (new props on `GameModeSelectionView`)
To render `PetCompanion` and the traveling pet, the view needs pet data threaded through
`App.tsx` (the same values `StudentDashboardView` already passes to `PetCompanion` /
`EvolutionRing`):
- `xp`, `displayName`
- `currentPetStage`, `nextPetStage` (from `retention`)
- `claimablePetMilestone` + the `claimPetMilestone` handler
- `evolutionPending`

`GameModeSelectionView` renders its own `PetCompanion` instance with local open/close state,
mirroring the dashboard's pattern.

---

## Visual / theming
- Background: night-ocean gradient with a star layer, keeping continuity with the existing
  `ARCADE_BG` starfield so launching a game still feels continuous.
- Touch targets keep `ARCADE_BUTTON_TOUCH` (type=button, manipulation, no tap highlight).
- Each island keeps its mode's own gradient (CLAUDE.md "each item gets its own gradient").
- Header is unchanged in content: close button + assignment title + the rounds/modes pill.

## i18n / RTL
- Reuse `gameModesT` for mode name/desc.
- Add new sheet strings (best-score label, "Beat 90% for 3⭐", XP-reward label, Play) across
  `en/he/ar/ru`, alongside the existing `QUEST_STRINGS`.
- `IslandMap`, `IslandDetailSheet`, and the header honor `dir`/`isRTL` (mirror lane layout
  is not required — the scatter is symmetric — but text alignment and sheet layout are).

## Accessibility
- Each island is a `<button>` with an aria-label combining mode name + state
  (e.g. "Fill the Blank — recommended next", "Classic — completed, 2 of 3 stars").
- The detail sheet is a dialog with a labelled close affordance.
- All motion (pet walk, island pulse, sheet rise) is gated by `useReducedMotion`.

---

## Scope guardrails

**In scope (Phase 1):**
- Rewrite `GameModeSelectionView` to the island world.
- New components: `IslandMap`, `ModeIsland`, `IslandDetailSheet`, `TravelingPet`,
  `computeIslandPositions`.
- Thread pet props into the view; render `PetCompanion` on pet-tap.
- New i18n strings; RTL + reduced-motion support.

**Out of scope (Phase 2, separate spec):**
- Turning the home screen into the map.
- Retiring the orbital hub. `OrbitalHub`, `EvolutionRing`, and the home `PetCompanion`
  usage are untouched in Phase 1.

---

## Testing / verification
- Visual verification across assignment sizes: 3, ~6, and 13 allowed modes (layout must not
  overlap or jump; scroll works on a phone viewport).
- States: a fresh assignment (nothing done), partial (some done with varied mastery),
  all done (replay round), and a quick-play guest with locked modes.
- Pet walk fires only after completing a mode and returning (sessionStorage transition);
  snaps under reduced motion.
- Pet-tap opens `PetCompanion` and the claim flow works; island-tap → Play launches the
  correct mode and intro.
- RTL pass in Hebrew/Arabic.
