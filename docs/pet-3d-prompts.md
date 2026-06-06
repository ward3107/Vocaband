# Vocaband pets — 3D build & evolution spec

Exhaustive briefs for generating the 8 student pets as **rigged, game-ready 3D
models** that plug straight into the XP-evolution system. Written for text/
image-to-3D tools (Meshy, Tripo3D, Luma Genie, Rodin/Hyper3D) plus a finishing
pass in Blender for the rig and clips.

The pets are the single source of "I'm levelling up" feedback. They are not
static props — they **grow within a tier, charge up, then burst into the next
species**. Every model must therefore satisfy the **Universal Build Contract**
below *and* its own per-pet brief.

> Source of truth in code:
> - Appearance + evolution → `PET_MILESTONES` (`src/constants/game.ts`) rendered by `src/components/arcade/CharacterStage.tsx`
> - Mood/expression → `usePetEvolution` + `petMoodFor` (`src/hooks/usePetEvolution.ts`)
> - Asset slot → `src/assets/pet/{stageKey}.json` today (Lottie); 3D swaps the loader in `PetLottie.tsx` for a GLB renderer.

---

## The 8 stages (XP ladder)

| # | stageKey | Name | XP to reach | In-app glow disc | Reward |
|---|----------|------|-------------|------------------|--------|
| 1 | `egg` | Egg | 0 | cream → pale stone | Start |
| 2 | `hatchling` | Hatchling | 100 | warm yellow → amber | +50 XP |
| 3 | `fox` | Fox Kit | 300 | orange → amber | Fox avatar |
| 4 | `eagle` | Eagle | 700 | sky blue → indigo | +150 XP |
| 5 | `dragon` | Dragon | 1500 | fuchsia → violet | Gold frame |
| 6 | `unicorn` | Unicorn | 3000 | pink → purple | "Living Legend" title |
| 7 | `mythic` | Mythic | 6000 | deep violet → indigo | Unicorn avatar |
| 8 | `ascended` | Ascended (Phoenix) | 12000 | warm gold → rose | Holographic frame |

Evolution is **one-way and discrete** — the species changes too much to morph
one mesh, so deliver **8 separate rigged GLBs** that hand off through a shared
glowing-orb silhouette (see "Evolution continuity").

---

## Universal Build Contract (every pet must satisfy)

### A. Format, scale, topology
- **glTF 2.0 / GLB**, Y-up, facing **+Z**, centered at world origin, feet/base on the ground plane (Y=0) so a scale-from-zero pivots from the floor.
- **Normalize every pet to the same on-screen height** at scale 1.0 (target ~1.8 units tall, widest silhouette ~1.4 units). The app renders them all in one 96–112 px slot, so a "big" dragon and a "small" egg must occupy the same bounding box.
- Quad-dominant, clean deforming edge loops around eyes/mouth/joints. Triangle budget (mobile-first): egg ≤ 6k, hatchling/fox ≤ 14k, eagle/dragon/unicorn ≤ 22k, mythic/ascended ≤ 30k.
- **One** non-overlapping UV set. Watertight where possible; no interior faces.

### B. Materials (PBR metal–rough)
- Per pet: **BaseColor + Normal + ORM (occ/rough/metal) + Emissive**. 2K maps (1K for egg).
- **Emissive is mandatory** on every pet — it is what the app ramps to show "charging up to evolve" (horn, eyes, gem, ember, cracks all live on the emissive map). Author emissive so the model reads fine at intensity 0 and dramatic at intensity 1.
- Keep one material slot where possible (atlas), max two (body + glow/FX).
- Stylized PBR: soft toy/clay surfaces, gentle subsurface look on fur/skin, crisp speculars on eyes and gems. No photoreal pores.

### C. Rig (so every in-app move is possible)
Single skeleton, A-pose, symmetric, named bones:
```
root (at floor) → hips → spine_01 → spine_02 → neck → head → jaw
  head → eye_L, eye_R (aim)         (blink + look-at)
  head → ear/horn_L, ear/horn_R     (chain of 1–2)
  spine_02 → wing/arm_L, wing/arm_R (2–3 each; "arm" for fox, "wing" for eagle/dragon/phoenix)
  hips → leg_L, leg_R               (2 each)
  hips → tail_01 → tail_02 → tail_03 (→ tail_04 for fox/dragon/phoenix)
```
- **root** is the uniform-scale handle the app drives (1.0 → 1.4 growth, 0 → 1.3 evolution overshoot). All animation must look correct under uniform scale of root.
- Tail / ears / wings get enough bones for secondary follow-through (the idle and tap clips rely on it).

### D. Blendshapes / morph targets (drive mood + speech)
Mood today is a separate face badge; in 3D, put it on the pet itself so neglect reads on the body:
- `mood_happy`, `mood_neutral`, `mood_sad`, `mood_very_sad` — eyes + brow + mouth, mapped 1:1 to `petMoodFor()`.
- `blink`, `mouth_open` (lip-sync the idle speech bubbles), `cheek_puff` (giggle).
- `eye_wide` (evolution reveal "wow").

### E. Animation clips (named exactly; the app already calls for these)
| Clip | Type | ~Length | Purpose / current code hook |
|------|------|---------|------------------------------|
| `idle` | loop | per-pet | The stage's resting motion — see each brief; mirrors `STAGE_IDLE` in `CharacterStage.tsx`. |
| `tap_happy` | one-shot | 0.25s | Squash-stretch bounce on tap (today: `scale 1→1.18→1`). |
| `giggle` | one-shot | 0.5s | Triple-tap delight: wiggle + `cheek_puff` + ears/tail flick (today: rotate wiggle + fanfare). |
| `charge` | loop | 1.5s | "About to evolve" — subtle tremble + emissive pulse; app plays it as XP nears the next tier (halo low→mid→high). |
| `evolve_out` | one-shot | 0.6s | Curl/collapse into the glowing orb, root scale → ~0.1 (today: collapse to ball before confetti). |
| `evolve_in` | one-shot | 0.5s | Burst-reveal from orb, root scale `0 → 1.3 → 1` overshoot, triumphant pose, `eye_wide` (today: confetti reveal). |
| `celebrate` | one-shot | 1.0s | Reward-claim flourish for the 🎁 Claim button. |
| `idle_sad` | loop | per-pet | Droopier idle for `very-sad` mood so low engagement is visible body-wide. |

All loops must seam-match frame 0 = frame N. Provide a **frozen frame-0 pose**
that still looks characterful (reduced-motion users see only this).

### F. Growth within a tier (XP 1.0 → 1.4)
- Inside one stage the app scales **root uniformly 1.0 → 1.4** as XP climbs to the next threshold. Model must not stretch or clip at +40% — uniform only, no morph.
- Expose **`emissive_intensity` 0 → 1**; the app ramps it with the charge halo (none → low → mid → high pulse) so the pet visibly powers up.
- **Accessory attach empties** (named nodes, no geo): `acc_top`, `acc_front_L`, `acc_front_R`, `acc_back`. The app pins its milestone sparkles/stars/flames (✨ ⭐ 🔥) to these in 3D instead of floating 2D emoji. Egg and Ascended opt out of accessories by design — still include the empties.

### G. Evolution continuity (seamless hand-off)
- `evolve_out` must **end** on a neutral, featureless **glowing sphere** ~0.6 units across, centered at chest height, palette `#fde047 / #fbbf24 / #f472b6 / #22d3ee` (the in-app confetti colors).
- The next pet's `evolve_in` must **start** from that identical sphere. Cross-fading GLB N's last frame into GLB N+1's first frame should look like one continuous burst.
- Keep a **consistent "soul" tell** across all 8 (e.g. a small inner warm-gold core glow) so the student reads it as the *same companion* growing up, not 8 unrelated toys.

### H. Delivery checklist (per pet)
- `*.glb` (Draco/meshopt compressed, target < 600 KB), textures embedded.
- All clips in E, blendshapes in D, attach empties in F.
- A 512px turntable PNG + a frame-0 thumbnail.
- Same world scale + origin as siblings (drop all 8 in one scene → identical heights).

---

## Shared prompt header (paste before every per-pet prompt)

```
Cute stylized 3D collectible creature for a children's educational mobile game,
ages 9–15. Chibi proportions, oversized friendly glossy eyes, smooth rounded
soft-toy forms, warm and approachable, premium mobile-game polish (think modern
collectible-pet game). One character, centered, full body, symmetric A-pose,
feet/base on the ground plane, facing camera. Game-ready: quad-dominant clean
topology, single non-overlapping UV, PBR metal-rough (BaseColor/Normal/ORM/
Emissive), rig-friendly. Soft studio key light + gentle [GLOW] rim light,
subtle inner warm-gold core glow (the pet's "soul"). Transparent background,
no ground shadow plane, no text, no props. Part of one cohesive 8-stage
evolution set — same cuteness level, same scale, same finish across all.
```

---

## 1. 🥚 Egg — `egg`  ·  glow: cream → pale stone

**Concept:** the dormant companion. Clean by design (no accessories), but
*alive* — light breathes inside it.

**Geometry:** a single smooth ovoid, slightly wider at the base, resting upright
with a barely-flattened bottom so it sits without a stand. A faint spiral seam
of hairline cracks runs around the upper third. No limbs, no face.

**Materials:** porcelain/eggshell base, cream → pale-stone (`#efeae3 → #d8cfc4`)
vertical gradient, soft satin roughness, very light speckling. **Emissive:** the
crack seam + a soft glow leaking through a translucent shell band (warm gold
core read through 6–10% subsurface). At `emissive_intensity 1` the cracks blaze
and a heartbeat pulse shows the silhouette of a curled creature inside.

**`idle`:** a slow rocking wobble — tip ~4° left, ~4° right, settle, then **rest
~3.4 s** before the next rock (matches the egg's delayed-loop idle). Add a faint
breathing scale (±1%) and an inner-light heartbeat every ~2 s.

**`charge`:** cracks brighten and widen slightly, light pulses faster, the whole
shell trembles — it's about to hatch.

**`evolve_out`:** cracks split into a bright lattice, shell becomes translucent,
collapses inward into the glowing orb.

**`tap_happy`:** a cute jiggle + a brighter inner blip (no face to bounce).
**Mood:** expressed only by inner-light color/tempo (happy = warm bright steady;
very-sad = dim, slow, cool).

**Prompt:**
```
[shared header, GLOW = soft cream-to-stone]
A glossy dormant creature egg standing upright, smooth porcelain ovoid, cream
to pale-stone gradient shell with faint speckles and a satin sheen. A spiral
seam of hairline cracks across the upper third leaks soft warm golden light
from inside, hinting at a curled-up creature. Calm, mysterious, full of
promise. Minimal and clean — no limbs, no face, no accessories. Emissive crack
seam and a translucent glowing band.
```

---

## 2. 🐣 Hatchling — `hatchling`  ·  glow: warm yellow → amber

**Concept:** just born, bursting with joy, still wearing its broken shell.

**Geometry:** a round fuzzy chick body (head ≈ body, classic chibi), tiny stubby
wings, two little orange feet, a small triangular beak, oversized sparkling eyes.
A **cracked eggshell "diaper"** around its lower half plus 1–2 broken shell
shards as part of the mesh (not props — so it stays a single GLB). Soft down tufts
on the crown.

**Materials:** fuzzy lemon-yellow down (`#ffe06a`) with soft subsurface, matte
orange beak/feet (`#ff9f1c`), glossy dark eyes with a big catchlight, eggshell
shards reuse the egg's cream material. **Emissive:** tiny eye sparkle + faint
cheek blush glow; ramps to a happy aura at intensity 1.

**`idle`:** a continuous happy **side-to-side sway** (~3° each way, ~1.8 s),
down tufts and wing-stubs lagging behind (secondary motion), occasional blink.

**`tap_happy`:** full-body squash-stretch hop + chirp mouth-open.
**`giggle`:** rapid wiggle, `cheek_puff`, wing-stubs flap, one shell shard
hops. **`evolve_in`:** bursts up out of the orb shaking off shell dust, wings
thrown wide. **Mood very-sad:** ears/tuft droop, sits deeper into shell, beak
turns down (`mood_very_sad`).

**Prompt:**
```
[shared header, GLOW = warm yellow-amber]
A tiny newly-hatched fluffy baby chick, round chibi body, soft fuzzy lemon-
yellow down, oversized sparkling eyes with big catchlights, small triangular
orange beak, little orange feet, stubby wings. Sitting half inside a cracked
cream eggshell with one or two broken shell shards beside it. Joyful open-beak
smile, blushing cheeks, pure delight.
```

---

## 3. 🦊 Fox Kit — `fox`  ·  glow: orange → amber

**Concept:** the first "real" pet — a playful, springy cub.

**Geometry:** chibi fox cub sitting upright, big head, perky triangular ears
(inner-ear pink), oversized curious eyes, tiny black nose, soft round cheeks,
small front paws, and a **big bushy white-tipped tail** (4-bone chain — the star
of the idle). Fluffy fur silhouette (sculpted clumps, not strand cards, for
mobile).

**Materials:** orange-and-cream fur (`#ff8c42` back, `#fff3e6` belly/tail-tip/
muzzle), matte black nose/paw pads, glossy amber eyes. **Emissive:** eye
catchlight + faint tail-tip glow that the charge state lights up.

**`idle`:** a springy **hop/bob in place** (~10% vertical, ~1.1 s, ease-in-out)
with the bushy tail swishing on a delay and ears bouncing — energetic and cute
(mirrors the fox's bouncy idle).

**`tap_happy`:** bigger pounce-bounce + tail wag flick.
**`giggle`:** spin-wiggle, tongue-out `cheek_puff`, tail thrashes happily.
**`evolve_in`:** pops from the orb mid-pounce, tail flaring.
**Accessories:** `acc_top` over head, `acc_front_L/R` at paws for milestone
sparkles. **Mood very-sad:** ears flatten, tail curls around feet, eyes
half-lidded.

**Prompt:**
```
[shared header, GLOW = orange-amber]
An adorable baby fox cub sitting playfully, chibi proportions, big head, large
curious glossy amber eyes, perky triangular ears with pink inner fur, tiny black
nose, soft round cheeks, fluffy orange-and-cream fur, cream belly and muzzle,
and a big bushy tail with a white tip curled near its paws. Cheeky friendly
expression, energetic and lovable.
```

---

## 4. 🦅 Eagle — `eagle`  ·  glow: sky blue → indigo

**Concept:** the pet learns to fly — proud, heroic, uplifting.

**Geometry:** a young eagle in a confident perched pose, chest puffed, **wings
slightly raised** (3-bone wings — central to the idle flap), layered sculpted
feather planes (not individual feathers), golden hooked beak, sharp-but-kind
amber eyes with a small "brow" feather, golden talons gripping nothing (floats
in-app), tail fan of 3–4 feathers.

**Materials:** brown-and-white plumage (`#6b4f3a` body, `#f5f0e6` head/neck) with
**sky-blue iridescent feather tips** (`#7cc4ff`), golden beak/talons (`#f6b73c`,
low metalness for stylized gold), glossy eyes. **Emissive:** feather-tip rim +
eye glint; charge lights the tips electric.

**`idle`:** a **chest/wing compress-then-expand "flap-breathe"** (scaleX 1 →
0.92 → 1.05 → 1, ~0.9 s) reinterpreted as wings dipping and lifting with the
chest, head doing a tiny eagle bob, tail feathers fanning slightly.

**`tap_happy`:** a single proud wing-snap + screech mouth-open.
**`giggle`:** ruffles all feathers, shakes, tail fans wide.
**`evolve_in`:** explodes from the orb wings-spread, downbeat of wind.
**Accessories:** `acc_back` between shoulders, `acc_top` above head.
**Mood very-sad:** wings drop, head sinks into shoulders, feathers droop.

**Prompt:**
```
[shared header, GLOW = sky blue-indigo]
A young heroic eagle in a proud perched pose, chest puffed out, wings slightly
raised mid-flap, layered brown-and-white stylized feathers with sky-blue
iridescent feather tips, a golden hooked beak, golden talons, sharp but kind
amber eyes with a small brow feather, fanned tail. Noble, confident, uplifting.
```

---

## 5. 🐉 Dragon — `dragon`  ·  glow: fuchsia → violet

**Concept:** mythic territory begins — a plump, lovable baby dragon.

**Geometry:** rounded chibi dragon standing on two stubby legs, big belly, short
neck, oversized friendly eyes, two small rounded horns, tiny **membranous wings**
(2-bone), little clawed hands, a stubby **4-bone tail** with a soft spade tip,
small back ridges/scutes. Slightly open mouth showing a tiny tooth.

**Materials:** iridescent violet-and-fuchsia scales (`#9b5de5 → #f15bb5`) with a
pearlescent sheen (low metal, high spec), softer belly plates (`#ffd6f2`),
membrane wings semi-translucent pink, glossy eyes. **Emissive:** a **warm glow in
the throat/mouth** (the breath), horn tips, eye glint — charge makes the throat
glow build like it's about to breathe.

**`idle`:** a slow **hover-bob with a gentle tilt** (y 0 → -6%, rotate ±2°,
~2.4 s) — feet just off the ground, wings doing slow lazy beats, tail trailing,
the occasional puff of glow from the mouth.

**`tap_happy`:** a happy little hop + a tiny harmless flame/spark puff.
**`giggle`:** flaps wings fast, wobbles, sneeze-puffs a spark.
**`evolve_in`:** bursts from orb wings-out with a breath flash.
**Accessories:** `acc_top` between horns, `acc_back` at wing base.
**Mood very-sad:** wings fold, throat glow dims, sits down, tail still.

**Prompt:**
```
[shared header, GLOW = fuchsia-violet]
A cute plump baby dragon standing on stubby legs, rounded chibi body, big belly,
iridescent violet-to-fuchsia pearlescent scales, soft pink belly plates, two
small rounded horns, tiny semi-translucent membranous wings, little clawed
hands, a short spade-tipped tail, small back ridges. Big friendly eyes, a soft
warm glow in its open mouth as if about to puff a tiny harmless flame.
Mischievous and lovable.
```

---

## 6. 🦄 Unicorn — `unicorn`  ·  glow: pink → purple

**Concept:** legend tier — graceful, magical, dreamy.

**Geometry:** a chibi unicorn foal standing daintily, soft rounded body, slender
(but stubby-cute) legs with tiny hooves, large gentle eyes with long lashes, a
**flowing pearlescent mane and tail** (3–4 bone chains for graceful float), and a
single **spiral horn**. Small fetlock tufts. Optional tiny translucent pastel
wings off (keep classic unicorn unless you want alicorn).

**Materials:** soft white pearlescent coat (`#fdfdff` with faint iridescence),
pastel **pink-to-purple mane/tail** (`#ffafd2 → #c79bff`), **iridescent rainbow
horn** (the hero emissive element), rose hooves, glossy violet eyes.
**Emissive:** horn glow + sparkle motes + a soft body rim; charge spins the
horn's rainbow brighter.

**`idle`:** a **slow, graceful vertical float** (y -4% → +4%, ~3.2 s) — mane and
tail drifting weightlessly, horn shimmering, an occasional slow blink and a
floating sparkle.

**`tap_happy`:** a light prance + horn sparkle burst.
**`giggle`:** a playful head-toss, mane flares, sparkles scatter.
**`evolve_in`:** rises from the orb on a swirl of sparkles, horn igniting.
**Accessories:** `acc_top` at horn tip, `acc_front_L/R` at hooves.
**Mood very-sad:** head lowers, mane hangs flat, horn dims, sparkles stop.

**Prompt:**
```
[shared header, GLOW = pink-purple]
A magical baby unicorn foal standing daintily, soft rounded pearlescent white
coat with faint iridescence, large gentle eyes with long lashes, a single
glowing iridescent rainbow spiral horn, a flowing pastel pink-to-purple
pearlescent mane and tail floating weightlessly, tiny rose hooves, delicate
sparkles drifting around it. Dreamy, graceful, enchanting.
```

---

## 7. 🔮 Mythic — `mythic`  ·  glow: deep violet → indigo

**Concept:** ascends past animal form — a cosmic spirit sealed in a living
crystal. Premium, otherworldly.

**Geometry:** a small ethereal **spirit creature** (a wisp-like fox/dragon
hybrid — big eyes, trailing tails of energy, no solid legs) floating **inside a
faceted translucent crystal orb**. The orb is the outer body; the spirit is read
through it. A ring of small orbiting crystal shards hovers around it.

**Materials:** crystal shell — deep violet/indigo glass (`#5b2a86 → #3a2d7a`),
high transmission/translucency, sharp facet speculars. Inner spirit — **galaxy
emissive**: swirling nebula, stars, constellations (`#7b2ff7`, `#22d3ee`
accents) on the emissive map, animated via a scrolling UV/flipbook if your
pipeline allows; otherwise baked with a slow shader pan. **Emissive** is the
whole point here — author the interior to glow, charge intensifies the nebula
churn.

**`idle`:** a **slow float with a breathing pulse** (y 0 → -5%, scale 1 → 1.04,
~2.8 s) — orb rotating gently, inner galaxy swirling, shard ring counter-
rotating, faint twinkles.

**`tap_happy`:** orb pulses bright, shards jolt outward and snap back.
**`giggle`:** rapid happy spin, nebula flares colors, shards orbit fast.
**`evolve_in`:** the orb forms around the spirit out of the burst, shards
assembling. **Accessories:** opt-out by default (its shard ring is its own
flourish) — still include empties. **Mood very-sad:** interior dims to faint
embers, orb darkens, shards droop closer and stop.

**Prompt:**
```
[shared header, GLOW = deep violet-indigo]
A celestial mythic spirit creature sealed inside a faceted translucent crystal
orb. A small ethereal wisp-like fox-dragon hybrid with big glowing eyes and
trailing energy tails floats inside, read through deep violet-to-indigo crystal
glass. The interior swirls with a glowing galaxy — nebula, stars and tiny
constellations in violet and cyan. A ring of small crystal shards orbits the
orb. Mystical, premium, otherworldly, radiant from within.
```

---

## 8. ✨ Ascended — `ascended` (Phoenix)  ·  glow: warm gold → rose

**Concept:** the final form and the payoff of 12,000 XP — a radiant phoenix of
light. Awe-inspiring yet still the same warm companion. (Code already renders
rising 🔥 particles for this stage, so the canonical form is a phoenix.)

**Geometry:** a majestic phoenix, **wings spread wide** (3–4 bone wings, large
trailing primaries), an elegant crested head, long flowing **fire tail feathers**
(4-bone chain), talons tucked. Feathers are sculpted flame-shaped planes. A soft
**halo ring** of light above/behind the head.

**Materials:** plumage glowing **gold-to-rose** (`#ffd166 → #ff6b9d`), the body
mostly **emissive** (it *is* light), with darker ember cores at feather bases for
contrast. Halo + wingtip embers fully emissive. Holographic shimmer sheen on the
wings (thin-film look). This pet sits near `emissive_intensity 1` even at rest;
charge pushes it to a blinding bloom.

**`idle`:** a **majestic radiant sway + pulse** (rotate ±3°, scale 1 → 1.06,
~3.6 s) — wings doing slow powerful beats, fire tail rippling upward, **three
ember particles rising in sequence** from the body (wire to a particle emitter or
the `acc_top`/`acc_back` empties so the app's existing flame beat is matched),
halo slowly rotating.

**`tap_happy`:** wings snap wide, a flare of light + ember burst.
**`giggle`:** joyful flutter, embers swirl, halo flares rainbow-gold.
**`evolve_in`:** ignites out of the orb in a pillar of fire, wings unfurling —
the single most dramatic reveal of the set (this is the top of the ladder).
**`celebrate`:** a full radiant bloom for the final claim.
**Accessories:** opt-out (its embers are built in) — include empties anyway.
**Mood very-sad:** flames bank low to embers, wings lower, halo dims to a thin
ring — still glowing, never fully dark (it's the apex pet).

**Prompt:**
```
[shared header, GLOW = warm gold-rose]
A majestic ascended phoenix of living light, the ultimate evolution. Wings
spread wide with long trailing flame-shaped feathers glowing gold to rose, an
elegant crested head, a long rippling fire tail, talons tucked, and a soft
rotating halo ring of light behind its head. Drifting golden ember particles
rise around it, holographic shimmer on the wings, radiant from within. Awe-
inspiring and powerful yet warm and friendly — the same companion, ascended.
```

---

## Production notes

- **Consistency first.** Generate all 8 in one session with the shared header and, where the tool supports it, a fixed **style seed / reference image** so proportions and "cuteness level" match. They must read as one creature growing up.
- **Then rig + clip in Blender** (or your DCC): the AI gives you the mesh; the rig, blendshapes, attach empties, and the named clips in §E are a finishing pass. AI-generated topology usually needs a retopo/decimate for the budgets in §A.
- **Palette anchors** (from the app's confetti + glow discs): `#fde047`, `#fbbf24`, `#f472b6`, `#22d3ee` for bursts; each stage's glow color for its rim light.
- **App integration:** swap the Lottie loader in `src/components/arcade/PetLottie.tsx` for a lightweight GLB renderer (`<model-viewer>` or a small three.js/R3F canvas), keep the same `stageKey` filenames (`egg.glb` … `ascended.glb`), and drive `root` scale + `emissive_intensity` + the clip names from `CharacterStage.tsx`. Missing GLB must still fall back to the emoji — never let the pet disappear.
