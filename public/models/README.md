# 3D pet models

The student dashboard's **Pet3DCard** renders the pet as a spinnable 3D
model (Google `<model-viewer>`). Models are chosen **per evolution stage**.

## Add a model for a stage

1. Drop a `.glb` here, in `public/models/pets/` (create the folder), e.g.
   `public/models/pets/phoenix.glb`.
2. Map the stage to it in `src/constants/petModels.ts`:
   ```ts
   export const PET_STAGE_MODELS: Record<string, string> = {
     Egg: PET_PLACEHOLDER_MODEL,
     Ascended: "/models/pets/phoenix.glb",
   };
   ```
   Keys are the `PET_MILESTONES` stage **display names**
   (`Egg`, `Hatchling`, `Fox Kit`, `Eagle`, `Dragon`, `Unicorn`, `Mythic`,
   `Ascended`). Stages without an entry fall back to `pet-placeholder.glb`.

## File requirements

- **glTF Binary** (`.glb`), one self-contained file.
- Keep it lean: aim for **≤ ~1.5 MB** and a sensible poly count (these load
  on student phones / Chromebooks). Run it through
  [gltf-transform](https://gltf.report/) to compress if needed.
- A rigged model with an embedded animation clip **autoplays** — that's the
  "real-time bones" effect (e.g. a flapping phoenix). No code needed.
- Center the model near the origin and a ~1–2 unit scale so the default
  camera frames it well.

`pet-placeholder.glb` is the generated colored egg used as the fallback.
