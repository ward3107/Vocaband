// 3D pet models per evolution stage.
//
// The student dashboard's Pet3DCard shows a spinnable 3D model of the pet.
// To give a stage its own model: drop a .glb into public/models/pets/ and map
// the PET_MILESTONES stage display name to its URL below. Stages without an
// entry fall back to the placeholder egg, so the card always shows a 3D pet.
//
// model-viewer autoplays a model's embedded (skeletal) animation, so a rigged
// .glb — e.g. an animated phoenix for "Ascended" — needs no extra code: add
// the file and one line here.

export const PET_PLACEHOLDER_MODEL = "/models/pet-placeholder.glb";

export const PET_STAGE_MODELS: Record<string, string> = {
  Egg: PET_PLACEHOLDER_MODEL,
  // Hatchling: "/models/pets/hatchling.glb",
  // "Fox Kit": "/models/pets/fox.glb",
  // Eagle:     "/models/pets/eagle.glb",
  // Dragon:    "/models/pets/dragon.glb",
  // Unicorn:   "/models/pets/unicorn.glb",
  // Mythic:    "/models/pets/mythic.glb",
  // Ascended:  "/models/pets/phoenix.glb",
};

/** Resolve the 3D model URL for a pet stage (PET_MILESTONES display name). */
export function petModelFor(stage: string): string {
  return PET_STAGE_MODELS[stage] ?? PET_PLACEHOLDER_MODEL;
}
