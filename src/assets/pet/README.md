# Pet evolution Lottie files

Drop one Lottie JSON per evolution stage here and that stage's pet on the
student dashboard swaps from its emoji to the animated character. Stages
**without** a file keep their emoji — the pet never disappears.

## Filename convention

`src/assets/pet/{stageKey}.json`, where `stageKey` is the lowercase key
`CharacterStage` uses (see `STAGE_KEY` in `CharacterStage.tsx`):

| PET_MILESTONES.stage | file |
|---|---|
| Egg | `egg.json` |
| Hatchling | `hatchling.json` |
| Fox Kit | `fox.json` |
| Eagle | `eagle.json` |
| Dragon | `dragon.json` |
| Unicorn | `unicorn.json` |
| Mythic | `mythic.json` |
| Ascended | `ascended.json` |

## File requirements

- ~200×200 viewport, **≤ 200 KB** each (run through the LottieFiles optimizer).
- Clean-looping `idle` segment (optional `happy` / `sad` segments are fine —
  only the default loop is played today).
- For visual consistency, source all 8 from one designer / pack (CC0).

`PetLottie.tsx` lazy-loads only the current stage's file via
`import.meta.glob`, so adding files here costs nothing until that stage is
reached, and a missing or malformed file silently falls back to the emoji.
